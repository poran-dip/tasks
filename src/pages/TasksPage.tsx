import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TaskUi } from "@/components/dnd";
import { columnKey, groupIdOf } from "@/components/dnd";
import { SortableGroup, UngroupedSection } from "@/components/GroupSection";
import { newId } from "@/lib/ids";
import { useStore } from "@/state/context";

export function TasksPage() {
  const { state, dispatch } = useStore();
  const { groups, tasks, settings } = state;

  /** Layout shown while a task is being dragged; null otherwise. */
  const [preview, setPreview] = useState<Record<string, string[]> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    id: string;
    label: string;
    focusUndo: boolean;
  } | null>(null);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** True while the pointer is in the empty space left or right of the list. */
  const [outside, setOutside] = useState(false);
  const outsideRef = useRef(false);
  const setOutsideBoth = (value: boolean) => {
    outsideRef.current = value;
    setOutside(value);
  };
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);

  // With completed tasks hidden the card vanishes, so keep keyboard focus on something useful.
  useEffect(() => {
    if (toast?.focusUndo) undoRef.current?.focus();
  }, [toast]);

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
    newGroupId,
    setNewGroupId,
    focusTarget,
    setFocusTarget,
    onCompleted: (id, label) =>
      setToast({ id, label, focusUndo: settings.hideCompleted }),
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
    <UngroupedSection
      tasks={ungrouped}
      taskDragging={taskDragging}
      hot={outside}
      ui={ui}
    />
  );

  const addGroup = () => {
    const id = newId();
    dispatch({ type: "addGroup", id, name: "Untitled group" });
    setNewGroupId(id);
  };

  return (
    <div ref={rootRef} className="space-y-4 pb-20">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Tasks</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {total === 0 ? "Nothing here yet" : `${done} of ${total} done`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <button
              type="button"
              onClick={addGroup}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-blue-800"
            >
              Add group
            </button>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Tasks completed"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-neutral-800"
        >
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
        onDragMove={(event) => {
          if (event.operation.source?.type !== "task") return;
          const main = rootRef.current
            ?.closest("main")
            ?.getBoundingClientRect();
          const x = event.operation.position.current.x;
          setOutsideBoth(main ? x < main.left || x > main.right : false);
        }}
        onDragOver={(event) => {
          if (event.operation.source?.type !== "task") return;
          setPreview((p) => (p ? move(p, event) : p));
        }}
        onDragEnd={(event) => {
          const type = event.operation.source?.type;
          if (type === "task") {
            if (!event.canceled && preview) {
              let next = move(preview, event);
              if (outsideRef.current) {
                // Released beside the list: send the task to Ungrouped.
                const id = String(event.operation.source?.id);
                const none = columnKey("");
                next = Object.fromEntries(
                  Object.entries(next).map(([key, ids]) => [
                    key,
                    ids.map(String).filter((x) => x !== id),
                  ]),
                );
                next[none] = [...next[none], id];
              }
              const byId: Record<string, string[]> = {};
              for (const [key, ids] of Object.entries(next)) {
                byId[groupIdOf(key)] = ids.map(String);
              }
              dispatch({ type: "applyLayout", layout: byId });
            }
            setPreview(null);
            setOutsideBoth(false);
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
        {ungrouped.length > 0 || taskDragging ? ungroupedSection : null}

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
      </DragDropProvider>

      {/* Always mounted so screen readers announce the toast when it appears. */}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4"
      >
        {toast ? (
          <div className="pointer-events-auto flex w-fit max-w-full items-center gap-3 rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-neutral-900">
            <span className="truncate">Completed: {toast.label}</span>
            <button
              type="button"
              ref={undoRef}
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
    </div>
  );
}
