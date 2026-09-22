import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, copyFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { runCommand } from "./spawn-command.mjs";
import { runtimeLayout } from "../packages/desktop/scripts/codex-runtime-layout.mjs";

const root = resolve(import.meta.dirname, "..");
runtimeLayout(process.platform, process.arch);
const mac = process.platform === "darwin";
const version = process.env.CODEX_FOR_ZCODE_VERSION || "0.1.0-alpha.2";
if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version))
  throw new Error("Invalid release version");
if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("Node 24 is required");
const env = {
  ...process.env,
  CODEX_FOR_ZCODE_VERSION: version,
  ZCODE_ENV: "production",
  ZCODE_LOCAL_ARCH: process.arch,
  ZCODE_TARGET_OS: process.platform,
  ZCODE_TARGET_ARCH: process.arch,
  ZCODE_SKIP_REMOTE_ASSETS: "1",
  CSC_IDENTITY_AUTO_DISCOVERY: "false",
};
const run = (command, args) => runCommand(command, args, { cwd: root, env });
const desktop = resolve(root, "packages/desktop");
const app = resolve(desktop, mac ? "dist/mac-arm64/Codex for ZCode.app" : "dist/win-unpacked");
if (mac) {
  const processes = execFileSync("ps", ["-axo", "command="], { encoding: "utf8" });
  if (processes.split("\n").some((line) => line.trim().startsWith(app + "/Contents/MacOS/")))
    throw new Error("Close the app running from the build directory before packaging");
}
if (!process.argv.includes("--reuse-assets"))
  run("pnpm", ["--filter", "@zcode/desktop", "prepare:runtime-assets"]);
else {
  run(process.execPath, ["packages/desktop/scripts/prepare-codex-runtime.mjs"]);
  if (mac) run(process.execPath, ["packages/desktop/scripts/build-macos-window-bounds.mjs"]);
}
run("pnpm", ["--filter", "@zcode/desktop", "build:no-runtime-assets"]);
// 类型检查会向 out/host 写入未打包 JS，必须在独立构建之前完成。
if (/from\s*["']@zcode\//.test(readFileSync(resolve(desktop, "out/host/index.js"), "utf8")))
  throw new Error(
    "Finish typecheck before packaging, then rebuild: host entry contains unbundled workspace imports",
  );
const electron = resolve(root, "node_modules/electron/dist");
if (!existsSync(electron)) throw new Error("Install Electron before packaging");
const builder = [
  "--filter",
  "@zcode/desktop",
  "exec",
  "electron-builder",
  "--config",
  "electron-builder.config.js",
  `--config.electronDist=${electron}`,
  "--publish",
  "never",
];
run("pnpm", [...builder, "--dir", mac ? "--mac" : "--win", `--${process.arch}`]);
if (mac) {
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
}
run(process.execPath, ["scripts/smoke-codex-package.mjs", app]);
const release = resolve(root, "release-assets");
await mkdir(release, { recursive: true });
const artifact = `Codex-for-ZCode-${version}-${mac ? "macos-arm64.zip" : "windows-x64.exe"}`;
if (mac)
  run("/usr/bin/ditto", [
    "-c",
    "-k",
    "--sequesterRsrc",
    "--keepParent",
    app,
    resolve(release, artifact),
  ]);
else {
  run("pnpm", [
    ...builder,
    "--prepackaged",
    app,
    "--win",
    "nsis",
    "--x64",
    `--config.win.artifactName=${artifact}`,
  ]);
  await copyFile(resolve(desktop, "dist", artifact), resolve(release, artifact));
}
await copyFile(
  resolve(desktop, "dist", "codex-smoke.json"),
  resolve(release, `${process.platform}-${process.arch}-smoke.json`),
);
const hash = createHash("sha256")
  .update(readFileSync(resolve(release, artifact)))
  .digest("hex");
await writeFile(resolve(release, `${artifact}.sha256`), `${hash}  ${artifact}\n`);
console.log(`Built ${artifact}; release assets: ${(await readdir(release)).join(", ")}`);
