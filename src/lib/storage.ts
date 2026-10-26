import type { AppData, Group, HistoryEntry, Task } from "@/types";
import { newId } from "./ids";
import { PALETTE } from "./palette";

export const STORAGE_KEY = "tasks:v1";

export function defaultData(): AppData {
  return {
    version: 1,
    groups: [
      { id: newId(), name: "Immediate", color: PALETTE[0] },
      { id: newId(), name: "Urgent", color: PALETTE[1] },
      { id: newId(), name: "Relaxed", color: PALETTE[2] },
    ],
    tasks: [],
    history: [],
    settings: { hideCompleted: true },
  };
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function validIso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function repeatValue(v: unknown): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 1
    ? Math.floor(n)
    : null;
}

/**
 * Accepts either a full export ({ groups, tasks, history, settings }) or a plain
 * array of tasks. A task's `group` may be a group id or a group name; unknown names create new groups. Every task field may be empty.
 */
export function normalizeData(raw: unknown): AppData | null {
  let rawGroups: unknown[] = [];
  let rawTasks: unknown[];
  let rawHistory: unknown[] = [];
  let rawSettings: unknown = {};

  if (Array.isArray(raw)) {
    rawTasks = raw;
  } else if (isRecord(raw) && Array.isArray(raw.tasks)) {
    rawTasks = raw.tasks;
    if (Array.isArray(raw.groups)) rawGroups = raw.groups;
    if (Array.isArray(raw.history)) rawHistory = raw.history;
    rawSettings = raw.settings;
  } else {
    return null;
  }

  const groups: Group[] = [];
  const groupIds = new Set<string>();
  for (const g of rawGroups) {
    if (!isRecord(g)) continue;
    const name = str(g.name).trim();
    if (!name) continue;
    let id = str(g.id);
    if (!id || groupIds.has(id)) id = newId();
    groupIds.add(id);
    const color = /^#[0-9a-f]{6}$/i.test(str(g.color))
      ? str(g.color)
      : PALETTE[groups.length % PALETTE.length];
    groups.push({ id, name, color });
  }

  const resolveGroup = (value: unknown): string => {
    const s = str(value).trim();
    if (!s) return "";
    const byId = groups.find((g) => g.id === s);
    if (byId) return byId.id;
    const byName = groups.find((g) => g.name.toLowerCase() === s.toLowerCase());
    if (byName) return byName.id;
    const created: Group = {
      id: newId(),
      name: s,
      color: PALETTE[groups.length % PALETTE.length],
    };
    groups.push(created);
    return created.id;
  };

  const tasks: Task[] = [];
  const taskIds = new Set<string>();
  for (const t of rawTasks) {
    if (!isRecord(t)) continue;
    let id = str(t.id);
    if (!id || taskIds.has(id)) id = newId();
    taskIds.add(id);
    tasks.push({
      id,
      task: str(t.task),
      note: str(t.note),
      group: resolveGroup(t.group),
      repeatDays: repeatValue(t.repeatDays),
      completedAt: validIso(t.completedAt),
    });
  }

  const history: HistoryEntry[] = [];
  const historyIds = new Set<string>();
  for (const h of rawHistory) {
    if (!isRecord(h)) continue;
    const completedAt = validIso(h.completedAt);
    if (!completedAt) continue;
    let id = str(h.id);
    if (!id || historyIds.has(id)) id = newId();
    historyIds.add(id);
    history.push({
      id,
      taskId: str(h.taskId),
      task: str(h.task),
      group: str(h.group),
      completedAt,
    });
  }

  const hideCompleted =
    isRecord(rawSettings) && typeof rawSettings.hideCompleted === "boolean"
      ? rawSettings.hideCompleted
      : true;

  return { version: 1, groups, tasks, history, settings: { hideCompleted } };
}

/** Adds the incoming groups, tasks and history to the current data. Existing ids are kept untouched. */
export function mergeData(current: AppData, incoming: AppData): AppData {
  const groups = [...current.groups];
  const groupMap = new Map<string, string>();
  for (const g of incoming.groups) {
    const existing =
      groups.find((x) => x.id === g.id) ??
      groups.find((x) => x.name.toLowerCase() === g.name.toLowerCase());
    if (existing) {
      groupMap.set(g.id, existing.id);
    } else {
      groups.push(g);
      groupMap.set(g.id, g.id);
    }
  }

  const taskIds = new Set(current.tasks.map((t) => t.id));
  const tasks = [...current.tasks];
  for (const t of incoming.tasks) {
    if (taskIds.has(t.id)) continue;
    tasks.push({ ...t, group: t.group ? (groupMap.get(t.group) ?? "") : "" });
  }

  const historyIds = new Set(current.history.map((h) => h.id));
  const history = [
    ...current.history,
    ...incoming.history.filter((h) => !historyIds.has(h.id)),
  ].sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return { ...current, groups, tasks, history };
}

export function exportData(data: AppData): string {
  return JSON.stringify(
    { ...data, exportedAt: new Date().toISOString() },
    null,
    2,
  );
}

export function loadData(): AppData {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text) {
      const data = normalizeData(parseJson(text));
      if (data) return data;
    }
  } catch {
    // storage unavailable, fall through to defaults
  }
  return defaultData();
}

export function saveData(data: AppData): void {
  try {
    const text = JSON.stringify(data);
    if (localStorage.getItem(STORAGE_KEY) !== text)
      localStorage.setItem(STORAGE_KEY, text);
  } catch {
    // storage full or unavailable; the app keeps working in memory
  }
}
