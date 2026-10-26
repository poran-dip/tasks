import { describe, expect, it } from "vitest";
import type { Task } from "@/types";
import { isDue, reappearDate, resetDueTasks } from "./repeat";

const task = (over: Partial<Task>): Task => ({
  id: "t",
  task: "x",
  note: "",
  group: "",
  repeatDays: null,
  completedAt: null,
  ...over,
});

describe("repeat", () => {
  const doneLate = new Date(2026, 9, 26, 23, 50).toISOString();

  it("daily task reappears at the next local midnight", () => {
    expect(reappearDate(doneLate, 1).getTime()).toBe(
      new Date(2026, 9, 27, 0, 0).getTime(),
    );
  });

  it("X-day task reappears at midnight X days later", () => {
    expect(reappearDate(doneLate, 3).getTime()).toBe(
      new Date(2026, 9, 29, 0, 0).getTime(),
    );
  });

  it("is not due before midnight and due at midnight", () => {
    const t = task({ repeatDays: 1, completedAt: doneLate });
    expect(isDue(t, new Date(2026, 9, 26, 23, 59, 59))).toBe(false);
    expect(isDue(t, new Date(2026, 9, 27, 0, 0, 0))).toBe(true);
  });

  it("never resets non-repeating or open tasks", () => {
    expect(isDue(task({ completedAt: doneLate }), new Date(2030, 0, 1))).toBe(
      false,
    );
    expect(isDue(task({ repeatDays: 1 }), new Date(2030, 0, 1))).toBe(false);
  });

  it("resetDueTasks clears completedAt and keeps the array when nothing is due", () => {
    const tasks = [task({ id: "a", repeatDays: 1, completedAt: doneLate })];
    expect(resetDueTasks(tasks, new Date(2026, 9, 26, 23, 59))).toBe(tasks);
    const next = resetDueTasks(tasks, new Date(2026, 9, 28));
    expect(next[0].completedAt).toBeNull();
  });
});
