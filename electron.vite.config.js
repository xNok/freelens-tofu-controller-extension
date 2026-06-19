import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import pluginExternal from "vite-plugin-external";
import sassDts from "vite-plugin-sass-dts";

// vite-plugin-external generates a CJS stub (`module.exports = global.X`) for
// each global. Rolldown's native binary can't statically resolve named imports
// from such stubs on some platforms (e.g. linux-arm64 CI). This plugin emits
// ESM stubs with explicit `default` + named re-exports so rolldown sees them
// statically. Runs `enforce: 'pre'` so its resolveId/load fire before
// vite-plugin-external for the modules listed here.
function freelensGlobalExternals(globals, namedExportsByModule) {
  const PREFIX = "\0freelens-global:";
  return {
    name: "freelens-global-externals",
    enforce: "pre",
    resolveId(source) {
      if (Object.hasOwn(globals, source)) {
        return PREFIX + source;
      }
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return;
      const source = id.slice(PREFIX.length);
      const globalRef = globals[source];
      const names = namedExportsByModule[source] ?? [];
      const named = names.map((n) => `export const ${n} = __mod?.${n};`).join("\n");
      return `const __mod = ${globalRef};\nexport default __mod;\n${named}\n`;
    },
  };
}

const HOST_GLOBALS = {
  "@freelensapp/extensions": "global.LensExtensions",
  mobx: "global.Mobx",
  "mobx-react": "global.MobxReact",
  react: "global.React",
  "react-dom": "global.ReactDom",
  "react-router-dom": "global.ReactRouterDom",
  "react/jsx-runtime": "global.ReactJsxRuntime",
};

const HOST_NAMED_EXPORTS = {
  "@freelensapp/extensions": ["Common", "Main", "Renderer"],
  mobx: [
    "action",
    "autorun",
    "computed",
    "configure",
    "extendObservable",
    "flow",
    "isObservable",
    "isObservableArray",
    "isObservableMap",
    "isObservableObject",
    "makeAutoObservable",
    "makeObservable",
    "observable",
    "reaction",
    "runInAction",
    "toJS",
    "when",
  ],
  "mobx-react": ["Observer", "Provider", "inject", "observer", "useLocalObservable", "useObserver"],
  react: [
    "Children",
    "Component",
    "Fragment",
    "PureComponent",
    "StrictMode",
    "Suspense",
    "cloneElement",
    "createContext",
    "createElement",
    "createRef",
    "forwardRef",
    "isValidElement",
    "lazy",
    "memo",
    "useCallback",
    "useContext",
    "useDebugValue",
    "useDeferredValue",
    "useEffect",
    "useId",
    "useImperativeHandle",
    "useLayoutEffect",
    "useMemo",
    "useReducer",
    "useRef",
    "useState",
    "useSyncExternalStore",
    "useTransition",
    "version",
  ],
  "react-dom": ["createPortal", "findDOMNode", "flushSync", "render", "unmountComponentAtNode", "version"],
  "react-router-dom": [
    "BrowserRouter",
    "HashRouter",
    "Link",
    "MemoryRouter",
    "NavLink",
    "Navigate",
    "Outlet",
    "Route",
    "Router",
    "Routes",
    "generatePath",
    "matchPath",
    "useHistory",
    "useLocation",
    "useNavigate",
    "useParams",
    "useRouteMatch",
    "withRouter",
  ],
  "react/jsx-runtime": ["Fragment", "jsx", "jsxs"],
};

export default defineConfig({
  // main process has full access to Node.js APIs
  main: {
    build: {
      lib: {
        entry: resolve(__dirname, "src/main/index.ts"),
        // Freelens 1.xx extensions are CommonJS modules
        formats: ["cjs"],
      },
      rolldownOptions: {
        output: {
          // silence warning about using `chunk.default` to access the default export
          exports: "named",
          // prefer separate files for each module
          preserveModules: (process.env.VITE_PRESERVE_MODULES ?? "true") === "true",
          preserveModulesRoot: "src/main",
        },
      },
      sourcemap: true,
    },
    oxc: {
      decorator: {
        legacy: true,
        emitDecoratorMetadata: true,
      },
    },
    plugins: [
      react({
        babel: {
          plugins: [
            [
              "@babel/plugin-proposal-decorators",
              {
                version: "2023-05",
              },
            ],
          ],
        },
      }),
      externalizeDepsPlugin({
        // do not bundle modules provided by the host app
        include: ["@freelensapp/extensions", "mobx"],
      }),
      pluginExternal({
        // the modules are provided by the host app as a global variable
        externals: {
          "@freelensapp/extensions": "global.LensExtensions",
          mobx: "global.Mobx",
        },
      }),
    ],
  },
  // renderer process in Freelens can use Node.js modules then it is configured
  // with settings for preload script
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, "src/renderer/index.tsx"),
        // Freelens 1.xx extensions are CommonJS modules
        formats: ["cjs"],
      },
      outDir: "out/renderer",
      rolldownOptions: {
        output: {
          // silence warning about using `chunk.default` to access the default export
          exports: "named",
          // prefer separate files for each module
          preserveModules: (process.env.VITE_PRESERVE_MODULES ?? "true") === "true",
          preserveModulesRoot: "src/renderer",
        },
      },
      sourcemap: true,
    },
    css: {
      modules: {
        localsConvention: "camelCaseOnly",
      },
    },
    oxc: {
      decorator: {
        legacy: true,
        emitDecoratorMetadata: true,
      },
    },
    plugins: [
      freelensGlobalExternals(HOST_GLOBALS, HOST_NAMED_EXPORTS),
      sassDts({
        enabledMode: ["development", "production"],
      }),
      react({
        babel: {
          plugins: [
            [
              "@babel/plugin-proposal-decorators",
              {
                version: "2023-05",
              },
            ],
          ],
        },
      }),
      externalizeDepsPlugin({
        // electron is provided by the host runtime; the host globals above are
        // handled by freelensGlobalExternals (proper ESM stubs).
        include: ["electron"],
      }),
    ],
  },
});
