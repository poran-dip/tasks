import { newId } from "../lib/ids";
import { PALETTE } from "../lib/palette";
import { resetDueTasks } from "../lib/repeat";
import { defaultData, mergeData } from "../lib/storage";
import type { AppData, Group, Settings, Task } from "../types";

export type TaskFields = Pick<Task, "task" | "note" | "group" | "repeatDays">;

export type Action =
  | { type: "addTask"; id?: string; fields?: Partial<TaskFields> }
  | { type: "updateTask"; id: string; patch: Partial<TaskFields> }
  | { type: "deleteTask"; id: string }
  /** Check or uncheck. Unchecking removes the history entry of that completion. */
  | { type: "toggleTask"; id: string; now: string }
  /** Bring a completed task back but keep its history entry. */
  | { type: "reopenTask"; id: string }
  | { type: "moveTask"; id: string; group: string; beforeId: string | null }
  | { type: "addGroup"; id?: string; name: string; color?: string }
  | {
      type: "updateGroup";
      id: string;
      patch: Partial<Pick<Group, "name" | "color">>;
    }
  | { type: "deleteGroup"; id: string }
  | { type: "moveGroup"; id: string; beforeId: string | null }
  /** Set the order of groups; ids not listed keep their relative order at the end. */
  | { type: "reorderGroups"; ids: string[] }
  /** Apply a drag-and-drop result: visible task ids per group id ("" = Ungrouped). */
  | { type: "applyLayout"; layout: Record<string, string[]> }
  | { type: "clearHistory" }
  | { type: "setSettings"; patch: Partial<Settings> }
  | { type: "import"; data: AppData; mode: "merge" | "replace" }
  | { type: "replace"; data: AppData }
  | { type: "tick"; now: string }
  | { type: "reset" };

function isInLayout(layout: Record<string, string[]>, id: string): boolean {
  return Object.values(layout).some((ids) => ids.includes(id));
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case "addTask": {
      const task: Task = {
        id: action.id ?? newId(),
        task: action.fields?.task ?? "",
        note: action.fields?.note ?? "",
        group: action.fields?.group ?? "",
        repeatDays: action.fields?.repeatDays ?? null,
        completedAt: null,
      };
      return { ...state, tasks: [...state.tasks, task] };
    }

    case "updateTask":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, ...action.patch } : t,
        ),
      };

    case "deleteTask":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };

    case "toggleTask": {
      const task = state.tasks.find((t) => t.id === action.id);
      if (!task) return state;

      if (task.completedAt) {
        const completedAt = task.completedAt;
        return {
          ...state,
          tasks: state.tasks.map((t) =>
            t.id === task.id ? { ...t, completedAt: null } : t,
          ),
          history: state.history.filter(
            (h) => !(h.taskId === task.id && h.completedAt === completedAt),
          ),
        };
      }

      const groupName =
        state.groups.find((g) => g.id === task.group)?.name ?? "";
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, completedAt: action.now } : t,
        ),
        history: [
          {
            id: newId(),
            taskId: task.id,
            task: task.task,
            group: groupName,
            completedAt: action.now,
          },
          ...state.history,
        ],
      };
    }

    case "reopenTask":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, completedAt: null } : t,
        ),
      };

    case "moveTask": {
      const task = state.tasks.find((t) => t.id === action.id);
      if (!task) return state;
      const rest = state.tasks.filter((t) => t.id !== action.id);
      const moved: Task = { ...task, group: action.group };

      let index = rest.length;
      if (action.beforeId && action.beforeId !== action.id) {
        const at = rest.findIndex((t) => t.id === action.beforeId);
        if (at >= 0) index = at;
      } else {
        // append after the last task of the target group
        let last = -1;
        rest.forEach((t, i) => {
          if (t.group === action.group) last = i;
        });
        if (last >= 0) index = last + 1;
      }
      rest.splice(index, 0, moved);
      return { ...state, tasks: rest };
    }

    case "addGroup": {
      const group: Group = {
        id: action.id ?? newId(),
        name: action.name.trim() || "Untitled group",
        color: action.color ?? PALETTE[state.groups.length % PALETTE.length],
      };
      return { ...state, groups: [...state.groups, group] };
    }

    case "updateGroup":
      return {
        ...state,
        groups: state.groups.map((g) => {
          if (g.id !== action.id) return g;
          const name =
            action.patch.name !== undefined
              ? action.patch.name.trim() || g.name
              : g.name;
          return { ...g, ...action.patch, name };
        }),
      };

    case "deleteGroup":
      return {
        ...state,
        groups: state.groups.filter((g) => g.id !== action.id),
        tasks: state.tasks.map((t) =>
          t.group === action.id ? { ...t, group: "" } : t,
        ),
      };

    case "moveGroup": {
      const group = state.groups.find((g) => g.id === action.id);
      if (!group) return state;
      const rest = state.groups.filter((g) => g.id !== action.id);
      let index = rest.length;
      if (action.beforeId) {
        const at = rest.findIndex((g) => g.id === action.beforeId);
        if (at >= 0) index = at;
      }
      rest.splice(index, 0, group);
      return { ...state, groups: rest };
    }

    case "reorderGroups": {
      const byId = new Map(state.groups.map((g) => [g.id, g]));
      const ordered = action.ids.flatMap((id) => {
        const g = byId.get(id);
        byId.delete(id);
        return g ? [g] : [];
      });
      return { ...state, groups: [...ordered, ...byId.values()] };
    }

    case "applyLayout": {
      const byId = new Map(state.tasks.map((t) => [t.id, t]));
      const placed = new Set<string>();
      const next: Task[] = [];
      const keys = ["", ...state.groups.map((g) => g.id)];
      const known = new Set(keys);
      for (const key of keys) {
        for (const id of action.layout[key] ?? []) {
          const t = byId.get(id);
          if (!t || placed.has(id)) continue;
          placed.add(id);
          next.push(t.group === key ? t : { ...t, group: key });
        }
        // Tasks that were not part of the layout (hidden ones) stay with their group.
        for (const t of state.tasks) {
          const home = known.has(t.group) ? t.group : "";
          if (
            home === key &&
            !placed.has(t.id) &&
            !isInLayout(action.layout, t.id)
          ) {
            placed.add(t.id);
            next.push(t);
          }
        }
      }
      for (const t of state.tasks) if (!placed.has(t.id)) next.push(t);
      return { ...state, tasks: next };
    }

    case "clearHistory":
      return { ...state, history: [] };

    case "setSettings":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "import": {
      const next =
        action.mode === "replace" ? action.data : mergeData(state, action.data);
      return { ...next, tasks: resetDueTasks(next.tasks, new Date()) };
    }

    case "replace":
      return {
        ...action.data,
        tasks: resetDueTasks(action.data.tasks, new Date()),
      };

    case "tick": {
      const tasks = resetDueTasks(state.tasks, new Date(action.now));
      return tasks === state.tasks ? state : { ...state, tasks };
    }

    case "reset":
      return defaultData();
  }
}
