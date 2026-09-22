import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTaskNavigationHistory,
  pushCodexNavEntry,
  pushNavEntry,
  goBack,
  goForward,
} from "../../packages/ui/src/lib/taskNavigationHistory.js";
import {
  groupTranscriptRows,
  workGroupLabel,
} from "../../packages/ui/src/codex/transcriptGroups.js";
import { messagePresentation } from "../../packages/ui/src/codex/messagePresentation.js";
import { buildDesktopOAuthRedirectUriFromEnv } from "../../packages/services/src/oauth/providers/configUtils.js";
import {
  availableCodexModels,
  resolveCodexModel,
  migrateCodexModelPreferences,
  modelAliasKey,
} from "../../packages/ui/src/lib/codexModelPreferences.js";

test("public model preferences retain real choices, optional aliases and drafts", () => {
  const first = { model: "example-model-a", displayName: "Example A", isDefault: true };
  const second = { model: "example-model-b", displayName: "Example B" };
  const models = [first, second] as any;
  assert.deepEqual(availableCodexModels(models), models);
  assert.equal(resolveCodexModel(models)?.model, first.model);
  assert.equal(resolveCodexModel(models, second.model)?.model, second.model);
  assert.equal(resolveCodexModel(models, "missing"), undefined);
  assert.equal(resolveCodexModel(models, "", second.model)?.model, second.model);
  assert.equal(resolveCodexModel([], ""), undefined);
  const draft = { "/project:task": "unsent" },
    selection = { "/project": "old-task" };
  const aliases = { [modelAliasKey("codex", "openai", second.model)]: "My model" };
  const next = migrateCodexModelPreferences({
    drafts: draft,
    selection,
    defaultModel: second.model,
    modelAliases: aliases,
  });
  assert.equal(next.defaultModel, second.model);
  assert.deepEqual(next.modelAliases, aliases);
  assert.equal(next.drafts, draft);
  assert.equal(next.selection, selection);
  assert.deepEqual(migrateCodexModelPreferences({}).modelAliases, {});
  assert.equal(migrateCodexModelPreferences({}).defaultModel, "");
});

test("Personal OAuth returns to its own app and leaves original login routing unchanged", () => {
  const redirect = (scheme?: string) =>
    new URL(
      buildDesktopOAuthRedirectUriFromEnv({ ZCODE_DESKTOP_URL_SCHEME: scheme }),
    ).searchParams.get("redirect");
  assert.equal(redirect("codex-for-zcode"), "codex-for-zcode://oauth/callback");
  assert.equal(redirect(), "zcode://oauth/callback");
  assert.equal(redirect("unknown"), "zcode://oauth/callback");
});

test("Desktop followups become draft suggestions, while code examples retain literal text", () => {
  const directive = '- :codex-followup[继续]{prompt="接着完成"}';
  assert.deepEqual(messagePresentation(directive), [
    { kind: "suggestion", text: "继续", prompt: "接着完成" },
  ]);
  const code = "```text\n" + directive + "\n```";
  assert.deepEqual(messagePresentation(code), [{ kind: "markdown", text: code }]);
});

test("Desktop file citations use native links without losing Chinese paths or surrounding prose", () => {
  for (const prefix of [":", "::", ":::"]) {
    const citation = `${prefix}codex-file-citation{path="/项目/材料 A/说明书.docx" purpose="output"}`;
    const text = `更新后的文档：${citation}\n\n原有说明。`;
    assert.deepEqual(messagePresentation(text), [
      {
        kind: "markdown",
        text: text.replace("codex-file-citation", "zcode-file-citation"),
      },
    ]);
  }
});

test("file citation adaptation preserves literal examples, malformed markers and escaped paths", () => {
  const citation = ':codex-file-citation{path="/项目/材料.docx" purpose="output"}';
  for (const text of [
    `\`${citation}\``,
    `\`\`\`text\n${citation}\n\`\`\``,
    `~~~\n${citation}\n~~~`,
    `<code>${citation}</code>`,
    ':codex-file-citation{path="/未完成',
    ':codex-file-citation{purpose="output"}',
    ':codex-file-citation{path=""}',
    ':codex-file-citation{path="/材料.docx" invalid}',
  ])
    assert.deepEqual(messagePresentation(text), [{ kind: "markdown", text }]);
  const escaped = String.raw`::codex-file-citation{path="/项目/含\"引号.docx" purpose="output"}`;
  assert.deepEqual(messagePresentation(`${escaped} 和 ${citation}`), [
    {
      kind: "markdown",
      text: `${escaped} 和 ${citation}`.replaceAll("codex-file-citation", "zcode-file-citation"),
    },
  ]);
});

test("home and Codex history share back/forward with original tasks without changing engine", () => {
  let history = pushCodexNavEntry(createTaskNavigationHistory(), "/项目", "__codex_draft__");
  history = pushCodexNavEntry(history, "/项目", "imported");
  history = pushNavEntry(history, "/项目", "original");
  const back = goBack(history)!;
  assert.equal(back.entry.kind, "task");
  assert.equal((back.entry as any).engineKind, "codex");
  assert.equal((goBack(back.history)!.entry as any).taskId, "__codex_draft__");
  assert.equal((goForward(back.history)!.entry as any).taskId, "original");
});

test("same task id in different engines remains a different navigation target", () => {
  let history = pushNavEntry(createTaskNavigationHistory(), "/项目", "same");
  history = pushCodexNavEntry(history, "/项目", "same");
  assert.equal(history.entries.length, 2);
  assert.equal(pushCodexNavEntry(history, "/项目", "same"), history);
});

test("collapsing consecutive work keeps every visible record in its original order", () => {
  const rows: any[] = [
    { id: "u", turnId: "a", kind: "user", text: "请求" },
    { id: "r", turnId: "a", kind: "reasoning", text: "摘要" },
    { id: "t", turnId: "a", kind: "tool", text: "命令", status: "failed" },
    { id: "a", turnId: "a", kind: "assistant", text: "正文" },
    { id: "d", turnId: "a", kind: "diff", text: "修改" },
    { id: "t2", turnId: "b", kind: "tool", text: "下一轮" },
  ];
  const grouped = groupTranscriptRows(rows);
  assert.deepEqual(
    grouped.flatMap((g) => g.rows),
    rows,
  );
  assert.equal(grouped[1].rows.length, 2);
  assert.equal(grouped.at(-1)!.rows.length, 1);
});

test("native history folds interim updates, preserves final answers and every original row", () => {
  const rows: any[] = [
    { id: "u1", turnId: "one", kind: "user", text: "请求" },
    { id: "a1", turnId: "one", kind: "assistant", text: "正在检查" },
    { id: "t1", turnId: "one", kind: "tool", text: "命令", status: "completed" },
    { id: "a2", turnId: "one", kind: "assistant", text: "检查完成" },
    { id: "u2", turnId: "two", kind: "user", text: "继续" },
    { id: "t2", turnId: "two", kind: "tool", text: "待审批", status: "inProgress" },
    { id: "a3", turnId: "two", kind: "assistant", text: "等待确认" },
  ];
  const groups = groupTranscriptRows(rows);
  assert.deepEqual(
    groups.flatMap((group) => group.rows),
    rows,
  );
  assert.deepEqual(
    groups.filter((group) => !group.work).flatMap((group) => group.rows.map((row) => row.id)),
    ["u1", "a2", "u2", "a3"],
  );
  assert.equal(groups[1]!.rows.length, 2);
  assert.equal(workGroupLabel(groups[1]!.rows), "已工作");
  assert.equal(workGroupLabel(groups[4]!.rows), "正在工作");
  for (const [status, label] of [
    ["failed", "已工作 · 有失败记录"],
    ["declined", "已工作 · 有拒绝记录"],
    ["interrupted", "已停止"],
  ]) {
    assert.equal(workGroupLabel([{ ...rows[2], status }]), label);
  }
});
