import type { ICodexService } from "./contract.js";
export async function example(service: ICodexService, workspacePath: string) {
  const { defaults } = await service.status();
  const task = await service.createTask({
    workspacePath,
    model: defaults?.model,
    effort: defaults?.effort,
  });
  return service.readTask({ taskId: task.id });
}
