import type { ICodexService } from "./contract.js";
import { CodexService, type CodexServiceOptions } from "./adapters/codexService.js";
const instances = new Map<string, CodexService>();
/** 同一 Local Host 的 workspace 服务集合复用一个进程所有者。 */
export function getCodexService(options: CodexServiceOptions): ICodexService {
  let instance = instances.get(options.root);
  if (!instance) {
    instance = new CodexService(options);
    instances.set(options.root, instance);
  }
  return instance;
}
export async function disposeCodexServices(): Promise<void> {
  await Promise.all([...instances.values()].map((service) => service.dispose()));
  instances.clear();
}
