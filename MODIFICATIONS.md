# Modifications / 修改说明

Community derivative of [zai-org/ZCode](https://github.com/zai-org/ZCode), based on version 3.14.0, commit `872ad960de7ec172591f7e1952f7849229f94521`. Upstream history and attributions are retained. This is not an official Z.ai or OpenAI release.

Added local Codex App Server services and contracts; streaming task UI and approvals; independent history import; native transcript and composer integration; optional model display aliases; isolated application identity and packaging. New adapter tests, bilingual documentation and a public CI workflow accompany these changes.

Existing files changed from the upstream baseline are listed below and carry modification notices where their format permits. New implementation primarily lives in `packages/services/src/codex-engine`, `packages/ui/src/codex` and `tests/codex-engine`.

- `.gitignore`
- `README.en.md`
- `README.md`
- `architecture-policy.yaml`
- `packages/client/src/remoteServiceAccess.ts`
- `packages/desktop/electron-builder.config.js`
- `packages/desktop/package.json`
- `packages/desktop/scripts/build-macos-window-bounds.mjs`
- `packages/desktop/scripts/build-metadata.mjs`
- `packages/desktop/scripts/desktop-product-identity.mjs`
- `packages/desktop/scripts/prepare-runtime-assets.mjs`
- `packages/desktop/src/host/index.ts`
- `packages/desktop/src/main/desktopChromiumHardwareAccelerationBootstrap.ts`
- `packages/desktop/src/main/desktopDataBaseDirBootstrap.ts`
- `packages/desktop/src/main/desktopDeepLinkUrl.ts`
- `packages/desktop/src/main/desktopFinderOpenFolderWorkflow.ts`
- `packages/desktop/src/main/desktopOAuthDeepLink.ts`
- `packages/desktop/src/main/desktopRuntimeEnv.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/renderer/src/remoteWorkspaceSessionServices.ts`
- `packages/desktop/tsup.config.ts`
- `packages/services/src/accessor.ts`
- `packages/services/src/index.ts`
- `packages/services/src/node.ts`
- `packages/services/src/oauth/providers/configUtils.ts`
- `packages/services/src/paths.ts`
- `packages/ui/src/LexicalChatInput.tsx`
- `packages/ui/src/Root.tsx`
- `packages/ui/src/SortableWorkspaceSidebar.tsx`
- `packages/ui/src/WorkspaceHeader.tsx`
- `packages/ui/src/WorkspaceSidebar.tsx`
- `packages/ui/src/WorkspaceSidebarItem.tsx`
- `packages/ui/src/app-shell/WorkspaceShellLayout.tsx`
- `packages/ui/src/app-shell/types.ts`
- `packages/ui/src/app-shell/useWorkspaceTaskNavigation.ts`
- `packages/ui/src/lib/taskNavigationHistory.ts`
- `packages/ui/src/prompt-editor/ChatPromptEditor.tsx`
- `packages/ui/src/root/useRootWorkspaceActions.ts`
- `packages/ui/src/store/zcodeSessionStoreNavigation.ts`
- `packages/ui/src/store/zcodeSessionStoreTypes.ts`
- `NOTICE.md`
