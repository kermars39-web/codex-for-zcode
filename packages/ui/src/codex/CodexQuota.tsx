import type { CodexRecord } from "@zcode/services";
const object = (v: unknown): CodexRecord =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as CodexRecord) : {};
export function CodexQuota({ limits }: { limits: CodexRecord }) {
  const grouped = object(limits.rateLimitsByLimitId);
  const snapshots = Object.keys(grouped).length
    ? Object.entries(grouped)
    : [["Codex", limits.rateLimits]];
  return (
    <details className="mt-3">
      <summary>订阅额度详情</summary>
      <div className="mt-2 space-y-2">
        {snapshots.map(([name, raw]) => {
          const snapshot = object(raw);
          return (
            <div key={String(name)}>
              <p className="font-medium">{String(snapshot.limitName || name)}</p>
              {[snapshot.primary, snapshot.secondary].filter(Boolean).map((rawWindow, i) => {
                const window = object(rawWindow),
                  duration = Number(window.windowDurationMins);
                const label =
                  duration >= 1440
                    ? `${duration / 1440} 天`
                    : duration > 0
                      ? `${duration / 60} 小时`
                      : "额度窗口";
                return (
                  <p key={i} className="text-ui-xs text-foreground-subtle">
                    {label}：
                    {typeof window.usedPercent === "number"
                      ? `剩余 ${Math.max(0, Math.min(100, 100 - window.usedPercent)).toFixed(0)}%`
                      : "暂不可用"}
                    {typeof window.resetsAt === "number"
                      ? ` · ${new Date(window.resetsAt * 1000).toLocaleString()} 重置`
                      : ""}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    </details>
  );
}
