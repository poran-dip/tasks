import { describe, expect, it } from "vitest";
import { dayStreaks, taskStreak } from "./streaks";

const at = (m: number, d: number, h = 12) =>
  new Date(2026, m, d, h).toISOString();

describe("dayStreaks", () => {
  it("counts consecutive days ending today", () => {
    const r = dayStreaks(
      [at(9, 24), at(9, 25), at(9, 26)],
      new Date(2026, 9, 26, 20),
    );
    expect(r).toEqual({ current: 3, longest: 3 });
  });

  it("keeps the streak alive when today has no completion yet", () => {
    const r = dayStreaks([at(9, 24), at(9, 25)], new Date(2026, 9, 26, 8));
    expect(r.current).toBe(2);
  });

  it("breaks after a missed day and tracks the longest run", () => {
    const r = dayStreaks(
      [at(9, 10), at(9, 11), at(9, 12), at(9, 25)],
      new Date(2026, 9, 26),
    );
    expect(r).toEqual({ current: 1, longest: 3 });
  });

  it("handles empty history and several completions in a day", () => {
    expect(dayStreaks([], new Date())).toEqual({ current: 0, longest: 0 });
    expect(
      dayStreaks([at(9, 26, 9), at(9, 26, 18)], new Date(2026, 9, 26)).current,
    ).toBe(1);
  });
});

describe("taskStreak", () => {
  it("daily task: consecutive days build a streak", () => {
    const r = taskStreak(
      [at(9, 24), at(9, 25), at(9, 26)],
      1,
      new Date(2026, 9, 26, 22),
    );
    expect(r).toEqual({ current: 3, best: 3, total: 3 });
  });

  it("daily task: a missed day resets the streak", () => {
    const r = taskStreak(
      [at(9, 22), at(9, 23), at(9, 26)],
      1,
      new Date(2026, 9, 26, 22),
    );
    expect(r).toEqual({ current: 1, best: 2, total: 3 });
  });

  it("daily task: current drops to 0 once a full day is skipped", () => {
    const r = taskStreak([at(9, 23), at(9, 24)], 1, new Date(2026, 9, 26, 9));
    expect(r.current).toBe(0);
    expect(r.best).toBe(2);
  });

  it("3-day task: completing within the next period continues the streak", () => {
    const r = taskStreak(
      [at(9, 1), at(9, 4), at(9, 8)],
      3,
      new Date(2026, 9, 9),
    );
    expect(r.current).toBe(3);
  });

  it("3-day task: waiting more than a full extra period breaks it", () => {
    const r = taskStreak(
      [at(9, 1), at(9, 4), at(9, 11)],
      3,
      new Date(2026, 9, 11),
    );
    expect(r).toEqual({ current: 1, best: 2, total: 3 });
  });
});
