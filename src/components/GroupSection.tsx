import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import type { FormEvent, Ref } from "react";
import { useEffect, useRef, useState } from "react";
import { newId } from "../lib/ids";
import { useStore } from "../state/context";
import type { Group, Task } from "../types";
import { useConfirm } from "./confirm";
import type { TaskUi } from "./dnd";
import { columnKey } from "./dnd";
import { TaskCard } from "./TaskCard";

interface Props {
  /** null renders the built-in "Ungrouped" section. */
  group: Group | null;
  tasks: Task[];
  /** True while a task is being dragged, so empty groups can show a drop hint. */
  taskDragging: boolean;
  ui: TaskUi;
}

interface SortableProps extends Omit<Props, "group"> {
  group: Group;
  index: number;
}

/** A user group; the whole section can be reordered with its header handle. */
export function SortableGroup({ group, index, ...rest }: SortableProps) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: group.id,
    index,
    type: "group",
    accept: "group",
  });
  return (
    <GroupView
      group={group}
      {...rest}
      shellRef={ref}
      handleRef={handleRef}
      dragging={isDragSource}
    />
  );
}

/** The built-in Ungrouped section: not reorderable, but a valid drop target. */
export function UngroupedSection(props: Omit<Props, "group">) {
  return <GroupView group={null} {...props} />;
}

interface ViewProps extends Props {
  shellRef?: Ref<HTMLElement> & Ref<HTMLButtonElement>;
  handleRef?: Ref<HTMLButtonElement>;
  dragging?: boolean;
}

const UNGROUPED_COLOR = "#94a3b8";

function GroupView({
  group,
  tasks,
  taskDragging,
  ui,
  shellRef,
  handleRef,
  dragging,
}: ViewProps) {
  const { dispatch } = useStore();
  const confirm = useConfirm();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const [color, setColor] = useState(group?.color ?? UNGROUPED_COLOR);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) nameRef.current?.focus();
  }, [renaming]);

  const groupId = group?.id ?? "";
  const accent = group?.color ?? UNGROUPED_COLOR;
  const column = columnKey(groupId);
  const { ref: listRef, isDropTarget } = useDroppable({
    id: column,
    type: "column",
    accept: "task",
    collisionPriority: 1,
  });

  const addTask = () => {
    const id = newId();
    dispatch({ type: "addTask", id, fields: { group: groupId } });
    ui.setDraftId(id);
    ui.setEditingId(id);
  };

  const saveGroup = (e: FormEvent) => {
    e.preventDefault();
    if (!group) return;
    dispatch({ type: "updateGroup", id: group.id, patch: { name, color } });
    setRenaming(false);
  };

  const removeGroup = async () => {
    if (!group) return;
    const ok = await confirm({
      title: `Delete "${group.name}"?`,
      message: "Its tasks move to Ungrouped.",
      confirmLabel: "Delete group",
      destructive: true,
    });
    if (ok) {
      dispatch({ type: "deleteGroup", id: group.id });
    }
  };

  const startRename = () => {
    if (!group) return;
    setName(group.name);
    setColor(group.color);
    setRenaming(true);
  };

  return (
    <section
      ref={shellRef}
      className={`rounded-xl border bg-stone-100/60 p-3 dark:bg-neutral-900/40 ${
        isDropTarget && taskDragging
          ? "border-blue-400 ring-2 ring-blue-300 dark:ring-blue-800"
          : "border-stone-200 dark:border-neutral-800"
      } ${dragging ? "opacity-60 shadow-xl" : ""}`}
    >
      {renaming && group ? (
        <form onSubmit={saveGroup} className="mb-2 flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded border border-stone-300 bg-transparent p-0.5 dark:border-neutral-700"
            aria-label="Group color"
          />
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
            placeholder="Group name"
            className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setRenaming(false)}
            className="rounded-md px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
        </form>
      ) : (
        <header className="mb-2 flex items-center gap-2">
          {group ? (
            <button
              type="button"
              ref={handleRef}
              aria-label={`Drag to reorder group ${group.name}`}
              title="Drag to reorder group"
              className="-my-1 cursor-grab touch-none select-none rounded px-1.5 py-1 text-stone-400 hover:text-stone-600 active:cursor-grabbing"
            >
              ⋮⋮
            </button>
          ) : null}
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {group ? group.name : "Ungrouped"}
            <span className="ml-2 font-normal text-stone-500 dark:text-stone-400">
              {tasks.length}
            </span>
          </h2>
          {group ? (
            <>
              <button
                type="button"
                onClick={startRename}
                className="rounded px-2 py-0.5 text-xs text-stone-500 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-neutral-800"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={removeGroup}
                className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete
              </button>
            </>
          ) : null}
        </header>
      )}

      <div ref={listRef} className="min-h-2 space-y-1.5">
        {tasks.map((t, i) => (
          <TaskCard key={t.id} task={t} index={i} column={column} ui={ui} />
        ))}
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 px-3 py-3 text-center text-xs text-stone-500 dark:border-neutral-700 dark:text-stone-400">
            {taskDragging ? "Drop here" : "No tasks"}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={addTask}
        className="mt-3 ml-auto flex w-36 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-blue-800"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          +
        </span>
        Add task
      </button>
    </section>
  );
}
