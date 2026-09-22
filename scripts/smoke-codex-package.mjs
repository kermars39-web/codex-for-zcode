import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { access, mkdtemp, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { runtimeLayout, CODEX_VERSION } from "../packages/desktop/scripts/codex-runtime-layout.mjs";

const app = resolve(process.argv[2]);
const resources = resolve(app, process.platform === "darwin" ? "Contents/Resources" : "resources");
const runtime = resolve(resources, "codex");
const layout = runtimeLayout(process.platform, process.arch);
for (const file of [
  ...layout.files,
  "codex-package.json",
  "LICENSE",
  "NOTICE.txt",
  "codex-NOTICE.txt",
  "codex-THIRD-PARTY.txt",
])
  await access(resolve(runtime, file));
for (const file of [
  "app.asar",
  "glm/zcode.cjs",
  "THIRD-PARTY-NOTICES.md",
  "licenses/electron/LICENSE",
  "licenses/electron/LICENSES.chromium.html",
])
  await access(resolve(resources, file));
const forbidden =
  /^(?:auth\.json|config\.toml|sessions|session_index\.jsonl|\.codex|\.local-evidence|startup-errors\.log)$/;
async function inspect(directory) {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    if (forbidden.test(file.name)) throw new Error(`Forbidden user data in package: ${file.name}`);
    if (file.isDirectory()) await inspect(resolve(directory, file.name));
  }
}
await inspect(resources);
const binary = resolve(runtime, layout.entrypoint);
const version = execFileSync(binary, ["--version"], { encoding: "utf8", windowsHide: true }).trim();
if (version !== `codex-cli ${CODEX_VERSION}`)
  throw new Error(`Unexpected packaged runtime ${version}`);
const home = await mkdtemp(join(tmpdir(), "codex-package-smoke-"));
let child;
try {
  // 独立空登录目录：只握手和读取未登录状态，不访问维护者账号、不发送模型请求。
  child = spawn(binary, ["app-server", "--stdio"], {
    env: { ...process.env, CODEX_HOME: home },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stderr.on("data", () => {});
  await new Promise((done, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Packaged Codex handshake timed out")),
      30000,
    );
    const lines = createInterface({ input: child.stdout });
    const fail = (error) => {
      clearTimeout(timeout);
      lines.close();
      reject(error);
    };
    child.once("error", fail);
    child.once("exit", (code) => fail(new Error(`Codex exited before handshake: ${code}`)));
    lines.on("line", (line) => {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      if (msg.error) return fail(new Error(`Codex RPC rejected ${JSON.stringify(msg.error)}`));
      if (msg.id === 1) {
        if (!msg.result?.userAgent) return fail(new Error("Invalid initialize response"));
        child.stdin.write(JSON.stringify({ method: "initialized", params: {} }) + "\n");
        child.stdin.write(
          JSON.stringify({ id: 2, method: "account/read", params: { refreshToken: false } }) + "\n",
        );
      } else if (msg.id === 2) {
        if (msg.result?.account)
          return fail(new Error("Unexpected account in clean package smoke"));
        clearTimeout(timeout);
        lines.close();
        done();
      }
    });
    child.stdin.write(
      JSON.stringify({
        id: 1,
        method: "initialize",
        params: {
          clientInfo: { name: "codex_for_zcode_smoke", version: "0.1.0" },
          capabilities: { experimentalApi: true },
        },
      }) + "\n",
    );
  });
  const packageMetadata = JSON.parse(
    await readFile(resolve(runtime, "codex-package.json"), "utf8"),
  );
  const report = {
    platform: process.platform,
    arch: process.arch,
    codexVersion: CODEX_VERSION,
    target: packageMetadata.target,
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    packageAssets: "PASS",
    emptyAccountHandshake: "PASS",
    realSubscriptionExecution: "NOT_TESTED",
    completedAt: new Date().toISOString(),
  };
  await writeFile(
    resolve(import.meta.dirname, "../packages/desktop/dist/codex-smoke.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  if (child && child.exitCode === null) {
    const exited = new Promise((done) => child.once("exit", done));
    child.kill();
    await exited;
  }
  await rm(home, { recursive: true, force: true });
}
