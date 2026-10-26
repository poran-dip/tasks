export interface Group {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  task: string;
  note: string;
  /** Group id, or "" for ungrouped. */
  group: string;
  /** Reappears this many days after completion (at local midnight), or null. */
  repeatDays: number | null;
  /** ISO timestamp while the task is completed, otherwise null. */
  completedAt: string | null;
}

export interface HistoryEntry {
  id: string;
  taskId: string;
  /** Snapshot of the task text at completion time. */
  task: string;
  /** Snapshot of the group name at completion time. */
  group: string;
  completedAt: string;
}

export interface Settings {
  hideCompleted: boolean;
}

export interface AppData {
  version: 1;
  groups: Group[];
  tasks: Task[];
  history: HistoryEntry[];
  settings: Settings;
}
