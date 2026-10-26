import type { Task } from "@/types";
import { addDays } from "./dates";

/**
 * A repeating task comes back at local midnight, `repeatDays` days after the
 * day it was completed. Completing on Monday with repeatDays = 1 means it is
 * back on Tuesday at 00:00, however late on Monday it was done.
 */
export function reappearDate(completedAt: string, repeatDays: number): Date {
  return addDays(new Date(completedAt), repeatDays);
}

export function isDue(task: Task, now: Date): boolean {
  if (!task.completedAt || !task.repeatDays) return false;
  return (
    now.getTime() >= reappearDate(task.completedAt, task.repeatDays).getTime()
  );
}

/** Returns the same array reference when nothing needed to reappear. */
export function resetDueTasks(tasks: Task[], now: Date): Task[] {
  let changed = false;
  const next = tasks.map((t) => {
    if (isDue(t, now)) {
      changed = true;
      return { ...t, completedAt: null };
    }
    return t;
  });
  return changed ? next : tasks;
}
