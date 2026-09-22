import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  runtimeLayout,
  stageCodexRuntime,
} from "../../packages/desktop/scripts/codex-runtime-layout.mjs";

test("native runtime preserves Windows sandbox helpers, search and package-relative layout", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-runtime-"));
  try {
    const layout = runtimeLayout("win32", "x64");
    const source = join(root, "source");
    for (const file of layout.files) {
      await mkdir(dirname(join(source, file)), { recursive: true });
      await writeFile(join(source, file), file);
    }
    await writeFile(
      join(source, "codex-package.json"),
      JSON.stringify({
        layoutVersion: 1,
        version: "0.155.1",
        target: layout.target,
        entrypoint: "bin/codex.exe",
        resourcesDir: "codex-resources",
        pathDir: "codex-path",
      }),
    );
    await writeFile(join(source, "auth.json"), "DO_NOT_COPY");
    const dest = join(root, "dest");
    await stageCodexRuntime({ source, destination: dest, platform: "win32", arch: "x64" });
    assert.equal(
      await readFile(join(dest, "codex-resources/codex-command-runner.exe"), "utf8"),
      "codex-resources/codex-command-runner.exe",
    );
    await assert.rejects(readFile(join(dest, "auth.json")), { code: "ENOENT" });
    await rm(join(source, "codex-resources/codex-windows-sandbox-setup.exe"));
    await assert.rejects(
      stageCodexRuntime({ source, destination: dest, platform: "win32", arch: "x64" }),
      /codex-windows-sandbox-setup/,
    );
    assert.equal(await readFile(join(dest, "bin/codex.exe"), "utf8"), "bin/codex.exe");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unsupported targets and wrong runtime metadata fail closed", async () => {
  assert.throws(() => runtimeLayout("linux", "x64"), /Unsupported/);
  assert.throws(() => runtimeLayout("win32", "arm64"), /Unsupported/);
  assert.equal(runtimeLayout("darwin", "arm64").entrypoint, "bin/codex");
  const root = await mkdtemp(join(tmpdir(), "codex-layout-"));
  try {
    await writeFile(join(root, "codex-package.json"), JSON.stringify({ version: "wrong" }));
    await assert.rejects(
      stageCodexRuntime({
        source: root,
        destination: join(root, "out"),
        platform: "darwin",
        arch: "arm64",
      }),
      /metadata/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
