import { useMemo } from "react";
import { useConfirm } from "@/components/confirm";
import { dayKey, formatDay, formatTime } from "@/lib/dates";
import { useStore } from "@/state/context";

export function HistoryPage() {
  const { state, dispatch } = useStore();
  const confirm = useConfirm();

  const days = useMemo(() => {
    const sorted = [...state.history].sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt),
    );
    const out: { key: string; date: Date; items: typeof sorted }[] = [];
    for (const h of sorted) {
      const date = new Date(h.completedAt);
      const key = dayKey(date);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(h);
      else out.push({ key, date, items: [h] });
    }
    return out;
  }, [state.history]);

  const colorFor = (name: string) =>
    state.groups.find((g) => g.name === name)?.color ?? "#94a3b8";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">History</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {state.history.length} completion
            {state.history.length === 1 ? "" : "s"} recorded
          </p>
        </div>
        {state.history.length > 0 ? (
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: "Clear the whole history?",
                message:
                  "Every recorded completion is deleted and streaks reset.",
                confirmLabel: "Clear history",
                destructive: true,
              });
              if (ok) {
                dispatch({ type: "clearHistory" });
              }
            }}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-neutral-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            Clear history
          </button>
        ) : null}
      </div>

      {days.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-neutral-700 dark:text-stone-400">
          Completed tasks will show up here with the time you checked them off.
        </p>
      ) : (
        days.map((d) => (
          <section key={d.key}>
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              {formatDay(d.date)} · {d.items.length}
            </h2>
            <ul className="space-y-1">
              {d.items.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <span className="w-16 shrink-0 text-xs tabular-nums text-stone-500 dark:text-stone-400">
                    {formatTime(h.completedAt)}
                  </span>
                  <span
                    className={`min-w-0 flex-1 wrap-break-word ${h.task ? "" : "italic text-stone-400"}`}
                  >
                    {h.task || "Untitled task"}
                  </span>
                  {h.group ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: colorFor(h.group) }}
                      />
                      {h.group}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
