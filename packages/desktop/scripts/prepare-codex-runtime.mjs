import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runCommandAndReadStdout } from "../../../scripts/spawn-command.mjs";
import { CODEX_VERSION, runtimeLayout, stageCodexRuntime } from "./codex-runtime-layout.mjs";

const layout = runtimeLayout(process.platform, process.arch);
let source = process.env.ZCODE_CODEX_NATIVE_BINARY?.trim();
if (!source) {
  const globalRoot = runCommandAndReadStdout("npm", ["root", "-g"]).trim();
  const suffix = `${layout.packageName}/vendor/${layout.target}/${layout.entrypoint}`;
  source = [
    resolve(globalRoot, "@openai/codex/node_modules", suffix),
    resolve(globalRoot, suffix),
  ].find(existsSync);
}
if (!source || !existsSync(source))
  throw new Error(
    `Install @openai/codex@${CODEX_VERSION} globally or set ZCODE_CODEX_NATIVE_BINARY to its native executable.`,
  );
const actual = execFileSync(source, ["--version"], { encoding: "utf8", windowsHide: true }).trim();
if (actual !== `codex-cli ${CODEX_VERSION}`)
  throw new Error(`Expected Codex ${CODEX_VERSION}, received ${actual}`);
const target = resolve(import.meta.dirname, "../bundled-codex");
await stageCodexRuntime({
  source: resolve(dirname(source), ".."),
  destination: target,
  platform: process.platform,
  arch: process.arch,
});
await copyFile(
  resolve(import.meta.dirname, "../licenses/codex-APACHE-2.0.txt"),
  resolve(target, "LICENSE"),
);
await writeFile(
  resolve(target, "NOTICE.txt"),
  `OpenAI Codex CLI ${CODEX_VERSION}\nSource: https://github.com/openai/codex\nLicense: Apache-2.0\nOfficial native package layout and bundled resource notices are retained. Credentials and configuration are not bundled.\n`,
);
console.log(`Prepared Codex ${CODEX_VERSION} for ${layout.target}`);
