import type { CodexRecord } from "../contract.js";
import { record, text } from "./projection.js";

function isSubset(grant: unknown, requested: unknown): boolean {
  if (grant === null || grant === false || grant === undefined) return true;
  if (Array.isArray(grant))
    return (
      Array.isArray(requested) &&
      grant.every((g) => requested.some((r) => JSON.stringify(g) === JSON.stringify(r)))
    );
  if (typeof grant !== "object") return grant === requested;
  return Object.entries(record(grant)).every(([key, value]) =>
    isSubset(value, record(requested)[key]),
  );
}
export function validateApprovalResponse(
  method: string,
  params: CodexRecord,
  response: CodexRecord,
): CodexRecord {
  if (
    ["item/commandExecution/requestApproval", "item/fileChange/requestApproval"].includes(method)
  ) {
    const allowed = ["accept", "acceptForSession", "decline", "cancel"];
    if (!allowed.includes(text(response.decision))) throw new Error("无效的审批选择");
    const advertised = params.availableDecisions;
    if (Array.isArray(advertised) && !advertised.includes(response.decision))
      throw new Error("此请求不支持该授权范围");
    return { decision: response.decision };
  }
  if (method === "item/permissions/requestApproval") {
    if (
      !["turn", "session"].includes(text(response.scope)) ||
      !isSubset(response.permissions, params.permissions)
    )
      throw new Error("授权超出本次请求的范围");
    return { permissions: record(response.permissions), scope: response.scope };
  }
  if (method === "item/tool/requestUserInput") {
    const answers = record(response.answers);
    const questions = Array.isArray(params.questions) ? params.questions.map(record) : [];
    if (Object.keys(answers).some((id) => !questions.some((q) => q.id === id)))
      throw new Error("回答与问题不匹配");
    for (const answer of Object.values(answers))
      if (
        !Array.isArray(record(answer).answers) ||
        !(record(answer).answers as unknown[]).every((x) => typeof x === "string")
      )
        throw new Error("回答格式错误");
    return { answers };
  }
  if (method === "mcpServer/elicitation/request") {
    if (!["accept", "decline", "cancel"].includes(text(response.action)))
      throw new Error("无效的工具表单响应");
    return {
      action: response.action,
      content: response.action === "accept" ? (response.content ?? null) : null,
      _meta: null,
    };
  }
  throw new Error("此请求类型尚不支持，未授予权限");
}
