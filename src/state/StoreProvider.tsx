import type { ReactNode } from "react";
import { useEffect, useMemo, useReducer } from "react";
import { resetDueTasks } from "@/lib/repeat";
import {
  loadData,
  normalizeData,
  parseJson,
  STORAGE_KEY,
  saveData,
} from "@/lib/storage";
import { StoreContext } from "./context";
import { reducer } from "./reducer";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const data = loadData();
    // Repeating tasks whose midnight has passed reappear right at startup.
    return { ...data, tasks: resetDueTasks(data.tasks, new Date()) };
  });

  useEffect(() => {
    saveData(state);
  }, [state]);

  useEffect(() => {
    const tick = () =>
      dispatch({ type: "tick", now: new Date().toISOString() });
    const interval = window.setInterval(tick, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const data = normalizeData(parseJson(e.newValue));
      if (data) dispatch({ type: "replace", data });
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
