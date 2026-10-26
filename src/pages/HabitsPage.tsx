import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { dayStreaks, taskStreak } from "@/lib/streaks";
import { useStore } from "@/state/context";

const WEEKS = 53;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface Cell {
  key: string;
  count: number;
  label: string;
}

function cellClass(count: number): string {
  if (count === 0) return "bg-stone-200 dark:bg-neutral-800";
  if (count === 1) return "bg-emerald-200 dark:bg-emerald-900";
  if (count <= 3) return "bg-emerald-400 dark:bg-emerald-700";
  return "bg-emerald-600 dark:bg-emerald-500";
}

export function HabitsPage() {
  const { state } = useStore();
  const [now] = useState(() => new Date());

  const stats = useMemo(() => {
    const all = state.history.map((h) => h.completedAt);
    const perDay = new Map<string, number>();
    for (const c of all) {
      const k = dayKey(new Date(c));
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }
    const repeating = state.tasks
      .filter((t) => t.repeatDays)
      .map((t) => ({
        task: t,
        streak: taskStreak(
          state.history
            .filter((h) => h.taskId === t.id)
            .map((h) => h.completedAt),
          t.repeatDays ?? 1,
          now,
        ),
      }))
      .sort((a, b) => b.streak.current - a.streak.current);
    return { days: dayStreaks(all, now), perDay, repeating, total: all.length };
  }, [state.history, state.tasks, now]);

  const today = startOfDay(now);
  // Columns are weeks (Sunday to Saturday) ending with the current week, like a contribution graph.
  const start = addDays(today, -(7 * (WEEKS - 1) + today.getDay()));
  const weeks: { month: string | null; days: (Cell | null)[] }[] = [];
  let lastMonth = -1;
  let yearTotal = 0;
  for (let w = 0; w < WEEKS; w++) {
    const days: (Cell | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, w * 7 + i);
      if (d > today) {
        days.push(null);
        continue;
      }
      const key = dayKey(d);
      const count = stats.perDay.get(key) ?? 0;
      yearTotal += count;
      days.push({
        key,
        count,
        label: `${d.toDateString()}: ${count} completed`,
      });
    }
    const first = addDays(start, w * 7);
    const showMonth = first.getMonth() !== lastMonth;
    lastMonth = first.getMonth();
    weeks.push({ month: showMonth ? MONTHS[first.getMonth()] : null, days });
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  // Start at the right edge so the most recent weeks are visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const tiles = [
    { label: "Current streak", value: stats.days.current, unit: "days" },
    { label: "Longest streak", value: stats.days.longest, unit: "days" },
    {
      label: "Done today",
      value: stats.perDay.get(dayKey(now)) ?? 0,
      unit: "tasks",
    },
    { label: "All time", value: stats.total, unit: "tasks" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Habit streaks</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          A day counts when you complete at least one task.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-stone-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="text-2xl font-semibold tabular-nums">{t.value}</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              {t.label} <span className="opacity-70">({t.unit})</span>
            </div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">
          {yearTotal} {yearTotal === 1 ? "completion" : "completions"} in the
          last year
        </h2>
        <div className="flex gap-2">
          <div
            aria-hidden="true"
            className="flex shrink-0 flex-col gap-1 pt-5 text-[10px] leading-3.5 text-stone-500 dark:text-stone-400"
          >
            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed list of seven weekday slots
              <div key={i} className="h-3.5">
                {d}
              </div>
            ))}
          </div>
          <div ref={scrollRef} className="overflow-x-auto pb-2">
            <div
              role="img"
              aria-label={`Tasks completed per day over the last year, ${yearTotal} in total`}
              className="flex w-max gap-1"
            >
              {weeks.map((week) => (
                <div
                  key={week.days[0]?.key ?? week.month}
                  className="flex flex-col gap-1"
                >
                  <div className="h-4 text-[10px] leading-4 text-stone-500 dark:text-stone-400">
                    {week.month}
                  </div>
                  {week.days.map((c, i) =>
                    c ? (
                      <div
                        key={c.key}
                        title={c.label}
                        className={`h-3.5 w-3.5 rounded-sm ${cellClass(c.count)}`}
                      />
                    ) : (
                      // biome-ignore lint/suspicious/noArrayIndexKey: placeholder for days after today
                      <div key={`empty-${i}`} className="h-3.5 w-3.5" />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="mt-1 flex items-center justify-end gap-1 text-[10px] text-stone-500 dark:text-stone-400"
        >
          Less
          {[0, 1, 2, 4].map((n) => (
            <div key={n} className={`h-3 w-3 rounded-sm ${cellClass(n)}`} />
          ))}
          More
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Repeating tasks</h2>
        {stats.repeating.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500 dark:border-neutral-700 dark:text-stone-400">
            Set "Repeat after N days" on a task to track its streak here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {stats.repeating.map(({ task, streak }) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-sm ${task.task ? "" : "italic text-stone-400"}`}
                  >
                    {task.task || "Untitled task"}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    every{" "}
                    {task.repeatDays === 1 ? "day" : `${task.repeatDays} days`}{" "}
                    · {streak.total} completion
                    {streak.total === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold tabular-nums">
                    {streak.current}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    best {streak.best}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
