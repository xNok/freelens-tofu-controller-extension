# @xnok/freelens-tofu-controller-extension

<!-- markdownlint-disable MD013 -->

[![Home](https://img.shields.io/badge/%F0%9F%8F%A0-freelens.app-02a7a0)](https://freelens.app)
[![GitHub](https://img.shields.io/github/stars/freelensapp/freelens?style=flat&label=GitHub%20%E2%AD%90)](https://github.com/freelensapp/freelens)
[![DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/xNok/freelens-tofu-controller-extension)
[![Release](https://img.shields.io/github/v/release/xNok/freelens-tofu-controller-extension?display_name=tag&sort=semver)](https://github.com/xNok/freelens-tofu-controller-extension)
[![npm](https://img.shields.io/npm/v/@xnok/freelens-tofu-controller-extension.svg)](https://www.npmjs.com/package/@xnok/freelens-tofu-controller-extension)

<!-- markdownlint-enable MD013 -->

This extension is a companion for
[Flux Tofu Controller](https://github.com/flux-iac/tofu-controller) and implements feature parity
with the `tfctl` command line tool for the Freelens application. Features include viewing
Terraform resources, triggering plans, applying plans, viewing plan logs, and unlocking state.

## Requirements

- Kubernetes >= 1.24
- Freelens >= 1.8.0
- Flux Tofu Controller (installed in the cluster)

## API supported

- `infra.contrib.fluxcd.io/v1alpha2` (Terraform)

## Install

To install, open Freelens and go to Extensions (`ctrl`+`shift`+`E` or
`cmd`+`shift`+`E`), and install `@xnok/freelens-tofu-controller-extension`.

or:

Use a following URL in the browser:
[freelens://app/extensions/install/%40xnok%2Ffreelens-tofu-controller-extension](freelens://app/extensions/install/%40xnok%2Ffreelens-tofu-controller-extension)

## Build from the source

You can build the extension using this repository.

### Prerequisites

Use [NVM](https://github.com/nvm-sh/nvm) or
[mise-en-place](https://mise.jdx.dev/) or
[windows-nvm](https://github.com/coreybutler/nvm-windows) to install the
required Node.js version.

From the root of this repository:

```sh
nvm install
# or
mise install
# or
winget install CoreyButler.NVMforWindows
nvm install 24.15.0
nvm use 24.15.0
```

Install Pnpm:

```sh
corepack install
# or
curl -fsSL https://get.pnpm.io/install.sh | sh -
# or
winget install pnpm.pnpm
```

### Build extension

```sh
pnpm i
pnpm build
pnpm pack
```

One script to build then pack the extension to test:

```sh
pnpm pack:dev
```

### Install built extension

The tarball for the extension will be placed in the current directory. In
Freelens, navigate to the Extensions list and provide the path to the tarball
to be loaded, or drag and drop the extension tarball into the Freelens window.
After loading for a moment, the extension should appear in the list of enabled
extensions.

### Check code statically

```sh
pnpm lint:check
```

or

```sh
pnpm trunk:check
```

and

```sh
pnpm build
pnpm knip:check
```

### Testing the extension with unpublished Freelens

In Freelens working repository:

```sh
rm -f *.tgz
pnpm i
pnpm build
pnpm pack -r
```

then for extension:

```sh
echo "overrides:" >> pnpm-workspace.yaml
for i in ../freelens/*.tgz; do
  name=$(tar zxOf $i package/package.json | yq -r .name)
  echo "  \"$name\": $i" >> pnpm-workspace.yaml
done

pnpm clean:node_modules
pnpm build
```

## License

Copyright (c) 2025-2026 Freelens Authors.

[MIT License](https://opensource.org/licenses/MIT)
