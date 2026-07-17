/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { _electron as electron } from "playwright";
import * as utils from "../helpers/utils";

import type { ConsoleMessage, ElectronApplication, Page } from "playwright";

const execFile = promisify(execFileCallback);
const extensionName = "@xnok/freelens-tofu-controller-extension";
const extensionFolderName = extensionName.replace(/[@/]/g, "-");

async function getMainWindow(app: ElectronApplication, timeout = 50_000): Promise<Page> {
  return new Promise((resolve, reject) => {
    let stdoutBuf = "";
    let settled = false;
    const stdout = app.process().stdout;

    const onData = (chunk: string | Uint8Array) => {
      stdoutBuf += chunk.toString();
    };

    const cleanup = () => {
      stdout?.off("data", onData);
      app.off("window", onWindow);
      app.off("close", onClose);
      clearTimeout(timeoutId);
    };

    const onWindow = (page: Page) => {
      console.log(`Page opened: ${page.url()}`);

      if (page.url().startsWith("https://renderer.freelens.app")) {
        settled = true;
        cleanup();
        console.log(stdoutBuf);
        resolve(page);
      }
    };

    const onClose = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      console.log(stdoutBuf);
      reject(new Error("Freelens closed before opening the main window"));
    };

    app.on("window", onWindow);
    app.on("close", onClose);
    stdout?.on("data", onData);

    const timeoutId = setTimeout(() => {
      settled = true;
      cleanup();
      console.log(stdoutBuf);
      reject(new Error(`Freelens did not open the main window within ${timeout}ms`));
    }, timeout);
  });
}

async function startWithInstalledExtension(extensionPath: string) {
  const freelensIntegrationTestingDir = await mkdtemp(join(tmpdir(), "freelens-integration-testing-"));
  const executablePath = utils.appPaths[process.platform];

  if (!executablePath) {
    throw new Error(`Unsupported platform for integration test: ${process.platform}`);
  }

  process.env.FREELENS_INTEGRATION_TESTING_DIR = freelensIntegrationTestingDir;

  const extensionDir = join(freelensIntegrationTestingDir, "home", ".freelens", "extensions", extensionFolderName);

  await mkdir(extensionDir, { recursive: true });
  try {
    await execFile("tar", ["-xzf", extensionPath, "-C", extensionDir, "--strip-components=1", "package"]);
  } catch (error) {
    throw new Error(`Failed to unpack extension tarball "${extensionPath}" into "${extensionDir}"`, {
      cause: error,
    });
  }

  const app = await electron.launch({
    args: ["--integration-testing"],
    executablePath,
    bypassCSP: true,
    env: {
      FREELENS_INTEGRATION_TESTING_DIR: freelensIntegrationTestingDir,
      LOG_LEVEL: "debug",
      ...process.env,
    },
    timeout: 100_000,
  });

  const cleanupErrors: string[] = [];
  const cleanupInstalledExtension = async () => {
    try {
      await app.close();
    } catch (error) {
      const message = `Failed to close Freelens during integration test cleanup: ${String(error)}`;
      cleanupErrors.push(message);
      console.warn(message, error);
    }

    try {
      await rm(freelensIntegrationTestingDir, { recursive: true, force: true });
    } catch (error) {
      const message = `Failed to remove integration test directory: ${String(error)}`;
      cleanupErrors.push(message);
      console.warn(message, error);
    }
  };

  try {
    const window = await getMainWindow(app);

    return {
      app,
      window,
      cleanup: cleanupInstalledExtension,
      cleanupErrors,
    };
  } catch (error) {
    await cleanupInstalledExtension();

    throw error;
  }
}

describe("extensions page tests", () => {
  let app: ElectronApplication;
  let window: Page;
  let cleanup: undefined | (() => Promise<void>);
  let cleanupErrors: string[] = [];
  const errorLogs: string[] = [];
  const processErrorLogs: string[] = [];
  const outputErrorPattern = /\[out\]\s*error:/i;
  const ansiEscapePattern = /\u001b\[[0-9;]*m/g;
  let processOutputBuffer = "";
  let restoreProcessOutputHooks: undefined | (() => void);

  const collectOutputErrors = (chunk: string | Uint8Array) => {
    const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    processOutputBuffer += text;

    // Keep buffer bounded while preserving enough tail to match split patterns across chunks.
    if (processOutputBuffer.length > 200_000) {
      processOutputBuffer = processOutputBuffer.slice(-20_000);
    }

    const normalizedOutput = processOutputBuffer.replaceAll(ansiEscapePattern, "");

    if (outputErrorPattern.test(normalizedOutput)) {
      processErrorLogs.push(normalizedOutput.trim());
      processOutputBuffer = "";
    }
  };

  const logger = (msg: ConsoleMessage) => {
    const text = msg.text();
    const normalizedText = text.replaceAll(ansiEscapePattern, "");

    console.log(text);

    // Some app logs are emitted as "log" messages, so inspect both console type and message content.
    if (msg.type() === "error" || outputErrorPattern.test(normalizedText)) {
      errorLogs.push(`[${msg.type()}] ${normalizedText}`);
    }
  };

  beforeAll(
    async () => {
      // The workflow sets EXTENSION_PATH from `find`, and upstream's integration test
      // harness also supports comma-separated extension lists, so normalize to the first
      // packed archive path for this single-extension compatibility check.
      const extensionPath = process.env.EXTENSION_PATH?.split(",")
        .map((path) => path.trim())
        .filter(Boolean)[0];

      const originalStdoutWrite = process.stdout.write.bind(process.stdout);
      const originalStderrWrite = process.stderr.write.bind(process.stderr);

      process.stdout.write = ((chunk, encoding, cb) => {
        collectOutputErrors(chunk);

        return originalStdoutWrite(chunk, encoding as never, cb as never);
      }) as typeof process.stdout.write;

      process.stderr.write = ((chunk, encoding, cb) => {
        collectOutputErrors(chunk);

        return originalStderrWrite(chunk, encoding as never, cb as never);
      }) as typeof process.stderr.write;

      restoreProcessOutputHooks = () => {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
      };

      if (!extensionPath) {
        throw new Error("EXTENSION_PATH must be set");
      }

      // Freelens main currently times out while installing this local tarball via the
      // extensions page, so preinstall it into the test profile and verify discovery.
      ({ window, cleanup, app, cleanupErrors } = await startWithInstalledExtension(extensionPath));
      window.on("console", logger);
      console.log("await utils.clickWelcomeButton");
      await utils.clickWelcomeButton(window);
    },
    10 * 60 * 1000,
  );

  afterAll(
    async () => {
      // Keep listeners active through cleanup to catch late shutdown errors in CI logs.
      await cleanup?.();
      window.off("console", logger);
      restoreProcessOutputHooks?.();
      expect([...errorLogs, ...processErrorLogs, ...cleanupErrors]).toEqual([]);
    },
    10 * 60 * 1000,
  );

  it(
    "loads the preinstalled extension and persists its preferences",
    async () => {
      // `startWithInstalledExtension()` launches Electron and waits up to 50s for the
      // main window, then the preinstalled extension still needs to be discovered and its
      // preferences UI exercised, so 10 minutes matches the generous afterAll timeout.
      console.log("await app.evaluate navigate-to-extensions");
      await app.evaluate(async ({ app }) => {
        await app.applicationMenu
          ?.getMenuItemById(process.platform === "darwin" ? "mac" : "file")
          ?.submenu?.getMenuItemById("navigate-to-extensions")
          ?.click();
      });

      console.log('await window.waitForSelector div[class*="installed-extensions-module__extensionName--"]');
      const installedExtensionName = await (
        await window.waitForSelector('div[class*="installed-extensions-module__extensionName--"]')
      ).textContent();
      expect(installedExtensionName).toBe(extensionName);

      const installedExtensionState = await (
        await window.waitForSelector('div[class*="installed-extensions-module__enabled--"]')
      ).textContent();
      expect(installedExtensionState).toBe("Enabled");

      console.log("await app.evaluate navigate-to-preferences");
      await app.evaluate(async ({ app }) => {
        await app.applicationMenu
          ?.getMenuItemById(process.platform === "darwin" ? "mac" : "file")
          ?.submenu?.getMenuItemById("navigate-to-preferences")
          ?.click();
      });

      await window.getByText("Tofu Controller", { exact: true }).waitFor();
      const namespaceInput = window.getByPlaceholder("flux-system");
      await namespaceInput.waitFor();
      await namespaceInput.fill("tofu-system");
      expect(await namespaceInput.inputValue()).toBe("tofu-system");

      console.log("await app.evaluate navigate-to-extensions");
      await app.evaluate(async ({ app }) => {
        await app.applicationMenu
          ?.getMenuItemById(process.platform === "darwin" ? "mac" : "file")
          ?.submenu?.getMenuItemById("navigate-to-extensions")
          ?.click();
      });

      console.log("await app.evaluate navigate-to-preferences");
      await app.evaluate(async ({ app }) => {
        await app.applicationMenu
          ?.getMenuItemById(process.platform === "darwin" ? "mac" : "file")
          ?.submenu?.getMenuItemById("navigate-to-preferences")
          ?.click();
      });

      await namespaceInput.waitFor();
      expect(await namespaceInput.inputValue()).toBe("tofu-system");
      expect([...errorLogs, ...processErrorLogs]).toEqual([]);
    },
    100 * 60 * 1000,
  );
});
