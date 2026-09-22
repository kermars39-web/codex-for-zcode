import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { CodexService } from "../../packages/services/src/codex-engine/adapters/codexService.js";
import { CodexTaskStore } from "../../packages/services/src/codex-engine/adapters/taskStore.js";
import { validateApprovalResponse } from "../../packages/services/src/codex-engine/domain/approval.js";

async function setup(t: Parameters<Parameters<typeof test>[1]>[0]) {
  const root = await mkdtemp(join(tmpdir(), "zcode-codex-"));
  const workspace = join(root, "中文 验收目录");
  await mkdir(workspace);
  const options = {
    root: join(root, "index"),
    binary: process.execPath,
    args: [fileURLToPath(new URL("./app-server.fixture.mjs", import.meta.url)), root],
  };
  const service = new CodexService(options);
  t.after(() => service.dispose());
  const task = await service.createTask({ workspacePath: workspace, model: "real-model" });
  const wire = async () =>
    (await readFile(join(root, "wire.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
  const until = async (predicate: (p: Awaited<ReturnType<typeof service.readTask>>) => boolean) => {
    for (let i = 0; i < 150; i++) {
      const p = await service.readTask({ taskId: task.id });
      if (predicate(p)) return p;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error("Task did not reach expected state");
  };
  return { root, workspace, service, task, wire, until, options };
}

test("subscription login can be canceled and API-key accounts never start a turn", async (t) => {
  const s = await setup(t);
  const login = await s.service.login({ action: "start" });
  await s.service.login({ action: "cancel", loginId: login.loginId });
  assert.deepEqual((await s.wire()).find((m) => m.method === "account/login/cancel").params, {
    loginId: "test-login",
  });
  await writeFile(join(s.root, "account-type"), "apiKey");
  const status = await s.service.status();
  assert.match(status.warning || "", /API Key/);
  await assert.rejects(s.service.send({ taskId: s.task.id, text: "must not execute" }));
  assert.equal(
    (await s.wire()).some((m) => m.method === "turn/start"),
    false,
  );
});

test("completed event before turn acknowledgement stays completed, and real model is sent", async (t) => {
  const s = await setup(t);
  await s.service.send({ taskId: s.task.id, text: "immediate", model: "real-model" });
  const p = await s.until((p) => p.task.status === "idle");
  assert.equal(p.task.activeTurnId, undefined);
  assert.equal(p.rows.at(-1)?.text, "Finished before acknowledgement");
  const request = (await s.wire()).find((m) => m.method === "turn/start");
  assert.equal(request.params.model, "real-model");
});

for (const method of ["item/commandExecution/requestApproval", "item/fileChange/requestApproval"]) {
  for (const decision of ["accept", "acceptForSession", "decline", "cancel"]) {
    test(`${method} ${decision} is explicit, scoped to the task and used once`, async (t) => {
      const s = await setup(t);
      await s.service.send({ taskId: s.task.id, text: `approval ${method}` });
      const p = await s.until((p) => p.approvals.length === 1);
      await assert.rejects(
        s.service.respond({ taskId: s.task.id, requestId: "old:900", response: { decision } }),
        /过期/,
      );
      const requestId = p.approvals[0]!.id;
      await s.service.respond({ taskId: s.task.id, requestId, response: { decision } });
      await s.until((p) => p.task.status === "idle");
      await assert.rejects(
        s.service.respond({ taskId: s.task.id, requestId, response: { decision } }),
        /过期/,
      );
      assert.deepEqual((await s.wire()).find((m) => m.id === 900).result, { decision });
    });
  }
}

test("process loss expires approvals; restart reads history without replay or stale steering", async (t) => {
  const s = await setup(t);
  await s.service.send({ taskId: s.task.id, text: "approval" });
  const before = await s.until((p) => p.approvals.length === 1);
  await s.service.dispose();
  const next = new CodexService(s.options);
  t.after(() => next.dispose());
  const page = await next.readTask({ taskId: s.task.id });
  assert.equal(page.task.status, "interrupted");
  assert.equal(page.task.activeTurnId, undefined);
  assert.equal(page.approvals.length, 0);
  await assert.rejects(
    next.respond({
      taskId: s.task.id,
      requestId: before.approvals[0]!.id,
      response: { decision: "accept" },
    }),
    /过期/,
  );
  assert.equal((await s.wire()).filter((m) => m.method === "turn/start").length, 1);
  await next.send({ taskId: s.task.id, text: "immediate" });
  assert.equal((await s.wire()).filter((m) => m.method === "turn/steer").length, 0);
});

test("import paginates, excludes running turns, deduplicates concurrent imports and leaves source unchanged", async (t) => {
  const s = await setup(t);
  const turns = Array.from({ length: 251 }, (_, i) => ({
    id: `t-${i}`,
    status: i === 250 ? "inProgress" : "completed",
    items: [{ id: `u-${i}`, type: "userMessage", content: [{ type: "text", text: `中文 ${i}` }] }],
  }));
  const source = { id: "source", name: "历史验收", cwd: s.workspace, turns, updatedAt: 123 };
  await writeFile(join(s.root, "engine.json"), JSON.stringify({ count: 0, threads: { source } }));
  const preview = await s.service.previewImport({ sourceThreadId: "source" });
  assert.equal(preview.rowCount, 250);
  assert.equal(preview.lastTurnId, "t-249");
  const [one, two] = await Promise.all([
    s.service.importSessions({ sourceThreadIds: ["source"] }),
    s.service.importSessions({ sourceThreadIds: ["source"] }),
  ]);
  assert.equal(one[0]?.status, "imported");
  assert.equal(two[0]?.status, "skipped");
  const id = one[0]!.taskId!;
  let page = await s.service.readTask({ taskId: id }),
    rows = page.rows;
  while (page.nextCursor) {
    page = await s.service.readTask({ taskId: id, cursor: page.nextCursor });
    rows = [...page.rows, ...rows];
  }
  assert.deepEqual(
    rows.map((r) => r.text),
    Array.from({ length: 250 }, (_, i) => `中文 ${i}`),
  );
  const after = JSON.parse(await readFile(join(s.root, "engine.json"), "utf8"));
  assert.deepEqual(after.threads.source, source);
  assert.equal(
    (await s.wire()).some((m) => m.method === "turn/start"),
    false,
  );
});

test("compatibility import is a fixed prefix, survives missing project path and reports partial failures", async (t) => {
  const s = await setup(t);
  const source = {
    id: "old",
    name: "兼容历史",
    cwd: join(s.workspace, "不存在"),
    compatibility: true,
    turns: [
      {
        id: "t1",
        status: "completed",
        items: [
          {
            id: "u1",
            type: "userMessage",
            content: [
              { type: "text", text: "Old context" },
              { type: "localImage", path: "/missing-image.png" },
            ],
          },
        ],
      },
    ],
  };
  await writeFile(
    join(s.root, "engine.json"),
    JSON.stringify({ count: 0, threads: { old: source } }),
  );
  const preview = await s.service.previewImport({ sourceThreadId: "old" });
  assert.equal(preview.mode, "contextRebuild");
  assert.ok(preview.warnings.length >= 2);
  const result = await s.service.importSessions({ sourceThreadIds: ["old", "does-not-exist"] });
  assert.equal(result[0]?.status, "imported");
  assert.equal(result[1]?.status, "failed");
  const id = result[0]!.taskId!;
  assert.equal((await s.service.readTask({ taskId: id })).rows[0]?.text, "Old context");
  await s.service.send({ taskId: id, workspacePath: s.workspace, text: "immediate" });
  const page = await s.service.readTask({ taskId: id });
  assert.equal(page.rows.filter((r) => r.text === "Old context").length, 1);
  const start = (await s.wire()).find((m) => m.method === "turn/start");
  assert.match(start.params.additionalContext.imported_history.value, /\.history\.md/);
});

test("permission grants cannot expand requested scope; independent hosts cannot both own a task", async (t) => {
  const s = await setup(t);
  const request = {
    permissions: { network: { enabled: true }, fileSystem: { write: [s.workspace] } },
  };
  assert.deepEqual(
    validateApprovalResponse("item/permissions/requestApproval", request, {
      permissions: {},
      scope: "turn",
    }),
    { permissions: {}, scope: "turn" },
  );
  assert.throws(() =>
    validateApprovalResponse("item/permissions/requestApproval", request, {
      permissions: { fileSystem: { write: ["/"] } },
      scope: "session",
    }),
  );
  const a = new CodexTaskStore(s.options.root),
    b = new CodexTaskStore(s.options.root);
  await a.acquire(s.task.id);
  await assert.rejects(b.acquire(s.task.id), /另一个窗口/);
  await a.releaseAll();
  await b.acquire(s.task.id);
  await b.releaseAll();
});
