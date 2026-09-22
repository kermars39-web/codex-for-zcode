// Backward-compatible source-preview build entry.
if (process.platform !== "darwin" || process.arch !== "arm64")
  throw new Error("Use build-codex-desktop.mjs on Windows x64");
await import("./build-codex-desktop.mjs");
