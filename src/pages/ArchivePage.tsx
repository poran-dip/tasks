import { useConfirm } from "@/components/confirm";
import { formatDateTime, formatDay } from "@/lib/dates";
import { reappearDate } from "@/lib/repeat";
import { useStore } from "@/state/context";

export function ArchivePage() {
  const { state, dispatch } = useStore();
  const confirm = useConfirm();
  const done = state.tasks
    .filter((t) => t.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Archive</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Completed tasks. Repeating ones come back on their own.
          </p>
        </div>
        {done.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              for (const t of done) dispatch({ type: "reopenTask", id: t.id });
            }}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Restore all
          </button>
        ) : null}
      </div>

      {done.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-neutral-700 dark:text-stone-400">
          No completed tasks right now.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {done.map((t) => {
            const group = state.groups.find((g) => g.id === t.group);
            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: group?.color ?? "#94a3b8" }}
                  title={group?.name ?? "Ungrouped"}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`wrap-break-word text-sm ${t.task ? "" : "italic text-stone-400"}`}
                  >
                    {t.task || "Untitled task"}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    Done {t.completedAt ? formatDateTime(t.completedAt) : ""}
                    {t.repeatDays && t.completedAt
                      ? ` · returns ${formatDay(reappearDate(t.completedAt, t.repeatDays))}`
                      : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "reopenTask", id: t.id })}
                  className="rounded px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-neutral-800"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Delete this task?",
                      message: "Its completion history is kept.",
                      confirmLabel: "Delete",
                      destructive: true,
                    });
                    if (ok) {
                      dispatch({ type: "deleteTask", id: t.id });
                    }
                  }}
                  className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
