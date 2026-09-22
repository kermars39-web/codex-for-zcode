import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const version = "0.155.1";
if (process.platform !== "darwin" || process.arch !== "arm64") {
  throw new Error("This preview build supports Apple Silicon macOS only.");
}
// npm 的安装前缀可能由 nvm、Homebrew 或用户配置改变，不能依赖维护者机器路径。
let source = process.env.ZCODE_CODEX_NATIVE_BINARY?.trim();
if (!source) {
  const globalRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
  const nativeSuffix = "@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex";
  source = [
    resolve(globalRoot, "@openai/codex/node_modules", nativeSuffix),
    resolve(globalRoot, nativeSuffix),
  ].find((candidate) => existsSync(candidate));
}
if (!source || !existsSync(source)) {
  throw new Error(
    `Install @openai/codex@${version} globally or set ZCODE_CODEX_NATIVE_BINARY to its native executable.`,
  );
}
const actual = execFileSync(source, ["--version"], { encoding: "utf8" }).trim();
if (actual !== `codex-cli ${version}`)
  throw new Error(`Expected Codex ${version}, received ${actual}`);
const target = resolve(import.meta.dirname, "../bundled-codex");
await mkdir(target, { recursive: true });
await copyFile(source, resolve(target, "codex"));
await chmod(resolve(target, "codex"), 0o755);
// Code-mode tools execute through the companion host beside the CLI executable.
const host = resolve(dirname(source), "codex-code-mode-host");
await copyFile(host, resolve(target, "codex-code-mode-host"));
await chmod(resolve(target, "codex-code-mode-host"), 0o755);
const sha256 = createHash("sha256")
  .update(await readFile(source))
  .digest("hex");
const hostSha256 = createHash("sha256")
  .update(await readFile(host))
  .digest("hex");
await writeFile(
  resolve(target, "runtime.json"),
  JSON.stringify(
    { version, sha256, hostSha256, platform: process.platform, arch: process.arch },
    null,
    2,
  ),
);
await copyFile(
  resolve(import.meta.dirname, "../licenses/codex-APACHE-2.0.txt"),
  resolve(target, "LICENSE"),
);
await writeFile(
  resolve(target, "NOTICE.txt"),
  "OpenAI Codex CLI 0.155.1\nSource: https://github.com/openai/codex\nLicense: Apache-2.0\nThis local build reuses the installed native runtime; credentials and configuration are not bundled.\n",
);
console.log(`Prepared Codex ${version} (${sha256.slice(0, 12)})`);
