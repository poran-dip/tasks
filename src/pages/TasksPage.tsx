import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { TaskUi } from "@/components/dnd";
import { columnKey, groupIdOf } from "@/components/dnd";
import { SortableGroup, UngroupedSection } from "@/components/GroupSection";
import { useStore } from "@/state/context";

export function TasksPage() {
  const { state, dispatch } = useStore();
  const { groups, tasks, settings } = state;

  /** Layout shown while a task is being dragged; null otherwise. */
  const [preview, setPreview] = useState<Record<string, string[]> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [newGroup, setNewGroup] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const ui: TaskUi = {
    editingId,
    draftId,
    setEditingId,
    setDraftId,
    onCompleted: (id, label) => setToast({ id, label }),
  };

  const total = tasks.length;
  const done = tasks.filter((t) => t.completedAt).length;

  const baseLayout = useMemo(() => {
    const visible = settings.hideCompleted
      ? tasks.filter((t) => !t.completedAt)
      : tasks;
    const layout: Record<string, string[]> = { [columnKey("")]: [] };
    for (const g of groups) layout[columnKey(g.id)] = [];
    for (const t of visible) {
      const key = columnKey(
        groups.some((g) => g.id === t.group) ? t.group : "",
      );
      layout[key].push(t.id);
    }
    return layout;
  }, [tasks, groups, settings.hideCompleted]);

  const layout = preview ?? baseLayout;
  const taskDragging = preview !== null;
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const tasksIn = (groupId: string) =>
    (layout[columnKey(groupId)] ?? []).flatMap((id) => {
      const t = taskById.get(id);
      return t ? [t] : [];
    });

  const ungrouped = tasksIn("");

  const ungroupedSection = (
    <UngroupedSection tasks={ungrouped} taskDragging={taskDragging} ui={ui} />
  );

  const addGroup = (e: FormEvent) => {
    e.preventDefault();
    if (!newGroup.trim()) return;
    dispatch({ type: "addGroup", name: newGroup });
    setNewGroup("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Tasks</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {total === 0 ? "Nothing here yet" : `${done} of ${total} done`}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: "setSettings",
                patch: { hideCompleted: !settings.hideCompleted },
              })
            }
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {settings.hideCompleted ? "Show completed" : "Hide completed"}
          </button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-neutral-800">
          <div
            className="h-full bg-blue-600 transition-[width]"
            style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <DragDropProvider
        onDragStart={(event) => {
          if (event.operation.source?.type === "task") setPreview(baseLayout);
        }}
        onDragOver={(event) => {
          if (event.operation.source?.type !== "task") return;
          setPreview((p) => (p ? move(p, event) : p));
        }}
        onDragEnd={(event) => {
          const type = event.operation.source?.type;
          if (type === "task") {
            if (!event.canceled && preview) {
              const next = move(preview, event);
              const byId: Record<string, string[]> = {};
              for (const [key, ids] of Object.entries(next)) {
                byId[groupIdOf(key)] = ids.map(String);
              }
              dispatch({ type: "applyLayout", layout: byId });
            }
            setPreview(null);
          } else if (type === "group" && !event.canceled) {
            dispatch({
              type: "reorderGroups",
              ids: move(
                groups.map((g) => g.id),
                event,
              ).map(String),
            });
          }
        }}
      >
        {ungrouped.length > 0 ? ungroupedSection : null}

        {groups.map((g, i) => (
          <SortableGroup
            key={g.id}
            group={g}
            index={i}
            tasks={tasksIn(g.id)}
            taskDragging={taskDragging}
            ui={ui}
          />
        ))}
        {/* Empty Ungrouped only appears below the groups while dragging, so nothing above shifts. */}
        {ungrouped.length === 0 && taskDragging ? ungroupedSection : null}
      </DragDropProvider>

      <form onSubmit={addGroup} className="flex gap-2">
        <input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          placeholder="New group (e.g. ML Syllabus, Job Hunting)"
          className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-neutral-900 dark:hover:bg-stone-300"
        >
          Add group
        </button>
      </form>

      {toast ? (
        <div className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-neutral-900">
          <span className="truncate">Completed: {toast.label}</span>
          <button
            type="button"
            onClick={() => {
              dispatch({
                type: "toggleTask",
                id: toast.id,
                now: new Date().toISOString(),
              });
              setToast(null);
            }}
            className="font-semibold underline"
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
