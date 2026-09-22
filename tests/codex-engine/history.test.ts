import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readRollout } from "../../packages/services/src/codex-engine/adapters/rolloutReader.js";

test("JSONL import preserves paired tools and excludes unfinished turn without writing source", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zcode-history-"));
  const path = join(dir, "fixture.jsonl");
  const lines = [
    { type: "session_meta", payload: { id: "source", cwd: dir, source: "vscode" } },
    { type: "event_msg", payload: { type: "task_started", turn_id: "t1" } },
    {
      type: "response_item",
      payload: { type: "message", role: "user", content: [{ type: "input_text", text: "原文" }] },
    },
    {
      type: "response_item",
      payload: { type: "function_call", name: "exec", call_id: "c", arguments: "echo ok" },
    },
    {
      type: "response_item",
      payload: { type: "function_call_output", call_id: "c", output: "ok" },
    },
    {
      type: "response_item",
      payload: {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "完成" }],
      },
    },
    { type: "event_msg", payload: { type: "task_complete", turn_id: "t1" } },
    { type: "event_msg", payload: { type: "task_started", turn_id: "t2" } },
    {
      type: "response_item",
      payload: { type: "message", role: "user", content: [{ type: "input_text", text: "未完成" }] },
    },
  ];
  const original = lines.map((x) => JSON.stringify(x)).join("\n") + '\n{"type":';
  await writeFile(path, original);
  try {
    const result = await readRollout(path);
    assert.deepEqual(
      result.rows.map((r) => r.text),
      ["原文", "echo ok", "完成"],
    );
    assert.equal(result.rows[1].output, "ok");
    assert.equal(result.lastTurnId, "t1");
    assert.equal(await readFile(path, "utf8"), original);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
