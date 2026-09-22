import { useCallback, useEffect, useRef, useState } from "react";
import type { CodexTask, CodexTaskPage } from "@zcode/services";
import { useServices } from "./useServices.js";

export function useCodexService() {
  return useServices().codexService;
}
export function useCodexTasks() {
  const service = useCodexService();
  const [tasks, setTasks] = useState<CodexTask[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!service) return;
    let disposed = false,
      inFlight = false,
      again = false;
    const refresh = async () => {
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      try {
        const result = await service.listTasks({});
        if (!disposed) {
          setTasks(result);
          setError("");
        }
      } catch (e) {
        if (!disposed) setError(e instanceof Error ? e.message : String(e));
      } finally {
        inFlight = false;
        if (again && !disposed) {
          again = false;
          void refresh();
        }
      }
    };
    void refresh();
    const subscription = service.onDidChange(() => {
      void refresh();
    });
    return () => {
      disposed = true;
      subscription.dispose();
    };
  }, [service]);
  return { tasks, error };
}
export function useCodexTask(taskId?: string) {
  const service = useCodexService();
  const [page, setPage] = useState<CodexTaskPage>();
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!service || !taskId) return;
    const current = generation.current;
    try {
      const result = await service.readTask({ taskId });
      if (current === generation.current) {
        setPage((old) => {
          if (old?.task.id !== taskId) return result;
          if (result.sequence < old.sequence) return old;
          const latestIds = new Set(result.rows.map((r) => `${r.turnId}:${r.id}`));
          const older = old.rows.filter((r) => !latestIds.has(`${r.turnId}:${r.id}`));
          return {
            ...result,
            rows: [...older, ...result.rows],
            nextCursor: older.length ? old.nextCursor : result.nextCursor,
          };
        });
        setError("");
      }
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : String(e));
    }
  }, [service, taskId]);
  useEffect(() => {
    generation.current++;
    setPage(undefined);
    setError("");
    if (!service || !taskId) return;
    let busy = false,
      again = false,
      disposed = false;
    const update = async () => {
      if (busy) {
        again = true;
        return;
      }
      busy = true;
      await refresh();
      busy = false;
      if (again && !disposed) {
        again = false;
        void update();
      }
    };
    void update();
    const sub = service.onDidChange((event) => {
      if (event.type === "disconnected") setError(event.message);
      void update();
    });
    return () => {
      disposed = true;
      generation.current++;
      sub.dispose();
    };
  }, [service, taskId, refresh]);
  const loadOlder = useCallback(async () => {
    if (!service || !taskId || !page?.nextCursor) return;
    const current = generation.current;
    const older = await service.readTask({ taskId, cursor: page.nextCursor });
    if (current !== generation.current) return;
    setPage((old) => {
      if (!old) return older;
      const ids = new Set(old.rows.map((r) => `${r.turnId}:${r.id}`));
      return {
        ...old,
        rows: [...older.rows.filter((r) => !ids.has(`${r.turnId}:${r.id}`)), ...old.rows],
        nextCursor: older.nextCursor,
      };
    });
  }, [service, taskId, page?.nextCursor]);
  return { page, error, refresh, loadOlder };
}
