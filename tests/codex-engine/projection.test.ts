import assert from "node:assert/strict";
import { test } from "node:test";
import {
  projectItem,
  mergeRow,
  projectCompletedTurns,
} from "../../packages/services/src/codex-engine/domain/projection.js";
import { validateApprovalResponse } from "../../packages/services/src/codex-engine/domain/approval.js";

test("Desktop tool media is preserved without printing encoded images or encrypted fields", () => {
  const row = projectItem(
    {
      id: "media",
      type: "functionCallOutput",
      name: "read",
      output: [
        { type: "input_text", text: "可见结果" },
        { type: "input_image", image_url: "data:image/png;base64,AAAA" },
        { type: "encrypted_content", encrypted_content: "hidden-internal-content" },
      ],
    },
    "t",
  );
  assert.equal(row?.output, "可见结果");
  assert.deepEqual(row?.images, ["data:image/png;base64,AAAA"]);
  assert.equal(JSON.stringify(row).includes("hidden-internal-content"), false);
  const search = projectItem(
    { id: "web", type: "webSearch", query: "query", results: [{ title: "result" }] },
    "t",
  );
  assert.match(search?.output || "", /result/);
});

test("completed history excludes running turns and private reasoning", () => {
  const rows = projectCompletedTurns([
    {
      id: "a",
      status: "completed",
      items: [
        { id: "u", type: "userMessage", content: [{ type: "text", text: "原文" }] },
        { id: "r", type: "reasoning", summary: ["可见摘要"], content: ["private"] },
      ],
    },
    {
      id: "b",
      status: "inProgress",
      items: [{ id: "x", type: "agentMessage", text: "unfinished" }],
    },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text, "原文");
  assert.equal(rows[1].text, "可见摘要");
});
test("item completion replaces streaming row without duplicating or reordering", () => {
  const rows = [
    projectItem({ id: "a", type: "agentMessage", text: "first" }, "t")!,
    projectItem({ id: "b", type: "agentMessage", text: "second" }, "t")!,
  ];
  mergeRow(rows, projectItem({ id: "a", type: "agentMessage", text: "complete" }, "t")!);
  assert.deepEqual(
    rows.map((x) => x.text),
    ["complete", "second"],
  );
});
test("command card retains command, result and actual failure", () => {
  const row = projectItem(
    {
      id: "c",
      type: "commandExecution",
      command: "exit 2",
      aggregatedOutput: "failure",
      status: "failed",
    },
    "t",
  )!;
  assert.equal(row.text, "exit 2");
  assert.equal(row.output, "failure");
  assert.equal(row.status, "failed");
});
test("approval validation rejects arbitrary grants and unknown methods", () => {
  assert.throws(() =>
    validateApprovalResponse("item/commandExecution/requestApproval", {}, { decision: "yes" }),
  );
  assert.throws(() => validateApprovalResponse("unknown", {}, { decision: "accept" }));
  assert.throws(() =>
    validateApprovalResponse(
      "item/permissions/requestApproval",
      { permissions: { network: { enabled: false } } },
      { permissions: { network: { enabled: true } }, scope: "turn" },
    ),
  );
  assert.deepEqual(
    validateApprovalResponse("item/commandExecution/requestApproval", {}, { decision: "decline" }),
    { decision: "decline" },
  );
});
