import { useSortable } from "@dnd-kit/react/sortable";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { useEffect, useRef } from "react";
import { formatDay } from "@/lib/dates";
import { reappearDate } from "@/lib/repeat";
import { useStore } from "@/state/context";
import type { Task } from "@/types";
import type { TaskUi } from "./dnd";
import { TaskEditor } from "./TaskEditor";

interface Props {
  task: Task;
  index: number;
  /** Layout key of the group this card is shown in. */
  column: string;
  ui: TaskUi;
}

export function TaskCard({ task, index, column, ui }: Props) {
  if (ui.editingId === task.id) {
    // The editor is not sortable: a disabled sortable would mark the form aria-disabled.
    return (
      <TaskEditor
        task={task}
        isDraft={ui.draftId === task.id}
        onClose={(kept) => {
          ui.setEditingId(null);
          ui.setDraftId(null);
          // The editor unmounts, so hand focus back to where the user came from.
          ui.setFocusTarget(kept ? `task:${task.id}` : `add:${task.group}`);
        }}
      />
    );
  }
  return <SortableTask task={task} index={index} column={column} ui={ui} />;
}

function SortableTask({ task, index, column, ui }: Props) {
  const { dispatch } = useStore();
  const { ref, handleRef, isDragSource } = useSortable({
    id: task.id,
    index,
    group: column,
    type: "task",
    accept: "task",
  });

  const done = task.completedAt !== null;
  const label = task.task || "untitled task";
  const editRef = useRef<HTMLButtonElement>(null);

  const { focusTarget, setFocusTarget } = ui;
  useEffect(() => {
    if (focusTarget === `task:${task.id}`) {
      editRef.current?.focus();
      setFocusTarget(null);
    }
  }, [focusTarget, setFocusTarget, task.id]);

  const toggle = () => {
    dispatch({
      type: "toggleTask",
      id: task.id,
      now: new Date().toISOString(),
    });
    if (!done) ui.onCompleted(task.id, task.task || "Untitled task");
  };

  return (
    <div
      ref={ref}
      className={`group flex items-start gap-2 rounded-lg border border-stone-200 bg-white px-2 py-2 dark:border-neutral-800 dark:bg-neutral-900 ${
        isDragSource ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        ref={handleRef}
        aria-label={`Drag to move ${label}`}
        title="Drag to move"
        className="-my-1 mt-0 cursor-grab touch-none select-none rounded px-1.5 py-1 text-stone-300 hover:text-stone-500 active:cursor-grabbing dark:text-neutral-600"
      >
        ⋮⋮
      </button>
      <input
        type="checkbox"
        name="done"
        checked={done}
        onChange={toggle}
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
        aria-label={`Mark ${label} done`}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`wrap-break-word text-sm ${
            done ? "text-stone-400 line-through dark:text-neutral-500" : ""
          } ${task.task ? "" : "italic text-stone-400 dark:text-neutral-500"}`}
        >
          {task.task || "Untitled task"}
        </div>
        {task.note ? (
          <div className="mt-0.5 wrap-break-word text-xs text-stone-500 dark:text-stone-400">
            {task.note}
          </div>
        ) : null}
        {task.repeatDays ? (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-neutral-800 dark:text-stone-400">
            <span aria-hidden>↻</span>
            every {task.repeatDays === 1 ? "day" : `${task.repeatDays} days`}
            {done && task.completedAt
              ? `, back ${formatDay(reappearDate(task.completedAt, task.repeatDays))}`
              : ""}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        ref={editRef}
        aria-label={`Edit ${label}`}
        title="Edit task"
        onClick={() => ui.setEditingId(task.id)}
        className="rounded p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-neutral-800 dark:hover:text-stone-200"
      >
        <PencilSimpleIcon aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
