import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
if (process.platform !== "darwin" || process.arch !== "arm64") {
  throw new Error("此自用构建只针对 Apple Silicon Mac。");
}
if (Number(process.versions.node.split(".")[0]) < 24)
  throw new Error("需要 Node.js 24 或更新版本。");
const env = {
  ...process.env,
  ZCODE_ENV: "production",
  ZCODE_LOCAL_ARCH: "arm64",
  ZCODE_SKIP_REMOTE_ASSETS: "1",
  CSC_IDENTITY_AUTO_DISCOVERY: "false",
};
const run = (command, args) => execFileSync(command, args, { cwd: root, env, stdio: "inherit" });
const app = resolve(root, "packages/desktop/dist/mac-arm64/Codex for ZCode.app");
const processes = execFileSync("ps", ["-axo", "command="], { encoding: "utf8" });
if (processes.split("\n").some((line) => line.trim().startsWith(app + "/Contents/MacOS/"))) {
  throw new Error("请先退出正在验收的 Codex for ZCode，再重新打包。");
}
if (!process.argv.includes("--reuse-assets")) {
  run("pnpm", ["--filter", "@zcode/desktop", "prepare:runtime-assets"]);
} else {
  run(process.execPath, ["packages/desktop/scripts/prepare-codex-runtime.mjs"]);
  run(process.execPath, ["packages/desktop/scripts/build-macos-window-bounds.mjs"]);
}
run("pnpm", ["--filter", "@zcode/desktop", "build:no-runtime-assets"]);
// typecheck 会向 out/host 写入未打包 JS；并行运行会覆盖 tsup 产物，导致安装包启动失败。
// 检测仍引用 workspace 源包的入口，要求先结束检查再独立构建。
const hostEntry = readFileSync(resolve(root, "packages/desktop/out/host/index.js"), "utf8");
if (/from\s*["']@zcode\//.test(hostEntry)) {
  throw new Error("Host output was overwritten by an unbundled build. Finish typecheck before packaging, then rebuild.");
}
const unpacked = resolve(root, "node_modules/electron/dist");
if (!existsSync(unpacked)) throw new Error("缺少 Electron，请先安装依赖。");
run("pnpm", [
  "--filter",
  "@zcode/desktop",
  "exec",
  "electron-builder",
  "--config",
  "electron-builder.config.js",
  `--config.electronDist=${unpacked}`,
  "--dir",
  "--mac",
  "--arm64",
]);
run("/usr/bin/codesign", [
  "--force",
  "--deep",
  "--sign",
  "-",
  "--entitlements",
  "packages/desktop/build/entitlements.mac.plist",
  app,
]);
run("/usr/bin/codesign", ["--verify", "--deep", "--strict", app]);
console.log(`自用版已构建：${app}`);
