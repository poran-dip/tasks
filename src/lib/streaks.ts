import { dayNumber } from "./dates";

export interface DayStreaks {
  current: number;
  longest: number;
}

/**
 * Streaks of consecutive calendar days with at least one completion.
 * The current streak stays alive through today even if nothing is done yet.
 */
export function dayStreaks(completedAts: string[], now: Date): DayStreaks {
  const days = [
    ...new Set(completedAts.map((c) => dayNumber(new Date(c)))),
  ].sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] - days[i - 1] === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const set = new Set(days);
  const today = dayNumber(now);
  let cursor: number | null = set.has(today)
    ? today
    : set.has(today - 1)
      ? today - 1
      : null;
  let current = 0;
  while (cursor !== null && set.has(cursor)) {
    current++;
    cursor--;
  }
  return { current, longest };
}

export interface TaskStreak {
  current: number;
  best: number;
  total: number;
}

/**
 * Streak for a repeating task. Each completion has to land in the period after
 * the task reappeared: between `repeatDays` and `2 * repeatDays - 1` days after
 * the previous completion. Anything later breaks the streak.
 */
export function taskStreak(
  completedAts: string[],
  repeatDays: number,
  now: Date,
): TaskStreak {
  const nums = completedAts
    .map((c) => dayNumber(new Date(c)))
    .sort((a, b) => a - b);
  if (nums.length === 0) return { current: 0, best: 0, total: 0 };

  let run = 1;
  let best = 1;
  for (let i = 1; i < nums.length; i++) {
    const gap = nums[i] - nums[i - 1];
    if (gap < repeatDays) {
      // same period (e.g. re-completed after a restore), no change
    } else if (gap < repeatDays * 2) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
  }

  const alive = dayNumber(now) - nums[nums.length - 1] < repeatDays * 2;
  return { current: alive ? run : 0, best, total: nums.length };
}
