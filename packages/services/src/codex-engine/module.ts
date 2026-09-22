export const codexEngineModule = {
  id: "codex-engine",
  requires: ["rpc"],
  provides: ["codex-engine"],
  publicEntrypoints: ["contract.ts", "node.ts"],
} as const;
