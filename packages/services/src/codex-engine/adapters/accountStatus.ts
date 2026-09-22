import type { CodexStatus, CodexModel, CodexRecord } from "../contract.js";
import { record, text } from "../domain/projection.js";
import type { CodexTransport } from "./transport.js";
export async function readAccountStatus(rpc: CodexTransport): Promise<CodexStatus> {
  await rpc.start();
  const accountResult = await rpc.call("account/read");
  const account = record(accountResult.account);
  const result = await rpc.call("model/list");
  let rateLimits: CodexRecord | undefined;
  let defaults: CodexStatus["defaults"];
  try {
    const config = record((await rpc.call("config/read", { includeLayers: false })).config);
    defaults = {
      model: text(config.model) || undefined,
      effort: text(config.model_reasoning_effort) || undefined,
    };
  } catch {
    /* 旧运行时未提供配置读取时沿用官方模型默认值。 */
  }
  try {
    rateLimits = await rpc.call("account/rateLimits/read");
  } catch {
    /* 未提供额度时不推算。 */
  }
  return {
    connected: rpc.connected,
    runtime: rpc.runtime,
    defaults,
    account:
      typeof account.type === "string"
        ? {
            type: account.type,
            email: text(account.email) || undefined,
            planType: text(account.planType) || undefined,
          }
        : null,
    models: (Array.isArray(result.data) ? result.data : []) as unknown as CodexModel[],
    rateLimits,
    warning:
      account.type && account.type !== "chatgpt"
        ? "当前是 API Key 登录；本客户端仅允许 ChatGPT 订阅任务，请切换登录"
        : undefined,
  };
}
