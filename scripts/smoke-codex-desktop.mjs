// CI-only packaged startup check; it never launches into the maintainer's desktop or account.
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
if (process.env.CI !== "true")
  throw new Error("Desktop startup smoke runs only on an isolated CI runner");
const app = resolve(process.argv[2]);
const home = await mkdtemp(join(tmpdir(), "codex-desktop-smoke-"));
const accountHome = join(home, "empty-codex");
await mkdir(accountHome);
const child = spawn(app, [], {
  env: {
    ...process.env,
    ZCODE_DESKTOP_HOME_DIR: home,
    ZCODE_DATA_BASE_DIR: home,
    CODEX_HOME: accountHome,
  },
  stdio: "ignore",
});
const deadline = Date.now() + 90000;
let ready = false;
let spawnError;
child.on("error", (error) => {
  spawnError = error;
});
try {
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null)
      throw new Error(`Packaged desktop exited early: ${child.exitCode}`);
    const startupError = await readFile(join(home, "startup-errors.log"), "utf8").catch(() => "");
    if (startupError) throw new Error(startupError);
    const logsDir = join(home, ".zcode/v2/logs");
    const files = await readdir(logsDir).catch(() => []);
    const logs = (
      await Promise.all(
        files
          .filter((name) => name.endsWith(".log"))
          .map((name) => readFile(join(logsDir, name), "utf8")),
      )
    ).join("\n");
    if (
      /Startup preparation failed|Host utility process exited unexpectedly|render-process-gone/.test(
        logs,
      )
    )
      throw new Error("Packaged desktop reported a startup failure");
    if (logs.includes("perf_app_start reported") && /\[rpc:call\] setting\.get OK/.test(logs)) {
      ready = true;
      break;
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  if (!ready) throw new Error("Desktop renderer/Host readiness was not observed in 90 seconds");
  const reportPath = resolve("release-assets", `${process.platform}-${process.arch}-smoke.json`);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  report.desktopStartup = "PASS";
  report.desktopEvidence =
    "renderer app-start event and Host setting RPC completed with isolated app data";
  if (process.platform === "win32") report.nsisInstall = "PASS";
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  // Only the process tree created by this smoke test belongs to this cleanup.
  if (child.pid && child.exitCode === null) {
    if (process.platform === "win32")
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
}
