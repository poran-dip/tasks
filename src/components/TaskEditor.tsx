import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/state/context";
import type { Task } from "@/types";
import { useConfirm } from "./confirm";

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-950";

interface Props {
  task: Task;
  isDraft: boolean;
  /** `kept` is false when the task no longer exists (deleted or a cancelled draft). */
  onClose: (kept: boolean) => void;
}

export function TaskEditor({ task, isDraft, onClose }: Props) {
  const { dispatch } = useStore();
  const confirm = useConfirm();
  const [text, setText] = useState(task.task);
  const [note, setNote] = useState(task.note);
  const [repeat, setRepeat] = useState(
    task.repeatDays ? String(task.repeatDays) : "",
  );
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(repeat);
    dispatch({
      type: "updateTask",
      id: task.id,
      patch: {
        task: text.trim(),
        note: note.trim(),
        repeatDays: repeat.trim() !== "" && n >= 1 ? Math.floor(n) : null,
      },
    });
    onClose(true);
  };

  const cancel = () => {
    if (isDraft) dispatch({ type: "deleteTask", id: task.id });
    onClose(!isDraft);
  };

  const remove = async () => {
    if (
      !isDraft &&
      !(await confirm({
        title: "Delete this task?",
        confirmLabel: "Delete",
        destructive: true,
      }))
    )
      return;
    dispatch({ type: "deleteTask", id: task.id });
    onClose(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") cancel();
  };

  return (
    <form
      onSubmit={save}
      onKeyDown={onKeyDown}
      className="space-y-2 rounded-lg border border-blue-400 bg-white p-3 dark:border-blue-700 dark:bg-neutral-900"
    >
      <input
        ref={textRef}
        className={inputCls}
        placeholder="Task"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        className={inputCls}
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          Repeat after
          <input
            type="number"
            min={1}
            step={1}
            className={`${inputCls} w-16!`}
            placeholder="-"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
          days
        </label>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={remove}
          aria-label="Delete task"
          title="Delete task"
          className="ml-auto rounded-md p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        >
          <TrashIcon aria-hidden="true" size={18} />
        </button>
      </div>
    </form>
  );
}
