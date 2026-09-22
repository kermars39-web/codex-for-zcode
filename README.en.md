# Codex for ZCode

**Use your own ChatGPT subscription and the Codex engine inside ZCode.**

[简体中文](README.md) · [Build guide](docs/QUICKSTART.md) · [Roadmap](docs/ROADMAP.md) · [Issues](https://github.com/kermars39-web/codex-for-zcode/issues)

Community derivative of [Z.ai / ZCode](https://github.com/zai-org/ZCode), with a local [Codex App Server](https://learn.chatgpt.com/docs/app-server) adapter. Keep ZCode’s workspace UI while Codex handles authentication, sessions, tool execution, file changes and approvals. The original ZCode engine remains available.

**Source alpha.** Tested locally on Apple Silicon macOS; no notarized installer is published. Windows, Linux and remote Codex are not validated. The built app is named **Codex for ZCode** and uses separate ZCode storage.

## Why

- Continue using a familiar workspace with your own ChatGPT / Codex account.
- Import Desktop history as an independent copy: native fork when supported, explicitly labelled history-based continuation otherwise.
- Use streamed output, command results, diffs, approval requests and task interruption.
- Optionally rename models in the UI without changing the real model ID. Public defaults use your account’s actual model list.

This project is not a network proxy, an API-key reseller or an official OpenAI / Z.ai client. It does not bypass regional availability, grant models or raise limits. Users need their own eligible account and service access. See [authentication](https://learn.chatgpt.com/docs/auth) and [supported regions](https://help.openai.com/en/articles/7947663-chatgpt-supported-countries).

## Build on Apple Silicon macOS

Requires Xcode Command Line Tools, Node **24.14.0** and pnpm **10.33.2**.

```bash
npm install -g @openai/codex@0.155.1
codex login
git clone https://github.com/kermars39-web/codex-for-zcode.git
cd codex-for-zcode
pnpm install --frozen-lockfile
node scripts/build-personal-mac.mjs
```

Output: `packages/desktop/dist/mac-arm64/Codex for ZCode.app`. Open it from Finder, choose a test directory and a model, then submit a small task. See [build and troubleshooting details](docs/QUICKSTART.md).

## Limits and privacy

Codex owns credentials and execution; the UI receives status and events. Approval requests remain explicit, and transport failure does not replay mutating operations. This is not a guarantee of zero network traffic: model requests and configured tools use their respective services. Original ZCode features keep their own behavior, described in [NOTICE](NOTICE.md).

Desktop-exclusive browser tools/connectors, phone control and remote Codex are not implemented. Import does not execute historical commands or synchronize future messages with the original. Very long histories still require an initial Host-side page aggregation.

## Contribute

```bash
pnpm exec tsx --test tests/codex-engine/*.test.ts
pnpm typecheck
pnpm lint
pnpm architecture:check --changed
```

See [contributing](CONTRIBUTING.md), [security](SECURITY.md) and [roadmap](docs/ROADMAP.md). A reproducible bug report or a verified platform contribution helps more than an unsupported compatibility claim. If the project helps you, a Star makes it easier for others to discover.

## Attribution

Based on ZCode **3.14.0**, upstream commit `872ad960de7ec172591f7e1952f7849229f94521`. [Apache-2.0](LICENSE), upstream [NOTICE](NOTICE.md) and [third-party notices](THIRD-PARTY-NOTICES.md) are retained. See [modifications](MODIFICATIONS.md). [OpenAI Codex](https://github.com/openai/codex) is installed separately by the builder. No credentials, personal conversations or Codex executables are committed.
