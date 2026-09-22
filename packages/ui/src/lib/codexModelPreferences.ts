import type { CodexModel } from "@zcode/services";

export const modelAliasKey = (engine: string, provider: string, modelId: string) =>
  JSON.stringify([engine, provider, modelId]);
export const availableCodexModels = (models: CodexModel[] = []) => models;

export function resolveCodexModel(models: CodexModel[], preferred = "", configured = "") {
  // 明确选择失效时要求重新选择，不能悄悄换模型；无偏好才跟随账号默认值。
  if (preferred) return models.find((model) => model.model === preferred);
  return (
    models.find((model) => model.model === configured) ||
    models.find((model) => model.isDefault) ||
    models[0]
  );
}

export function migrateCodexModelPreferences(persisted: unknown) {
  const state =
    persisted && typeof persisted === "object" ? (persisted as Record<string, unknown>) : {};
  const modelAliases = { ...(state.modelAliases as Record<string, string> | undefined) };
  return {
    ...state,
    defaultModel: typeof state.defaultModel === "string" ? state.defaultModel : "",
    modelAliases,
  };
}
