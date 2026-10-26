import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm";
import { dayKey } from "@/lib/dates";
import { exportData, normalizeData, parseJson } from "@/lib/storage";
import { useStore } from "@/state/context";

export function DataPage() {
  const { state, dispatch } = useStore();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const download = () => {
    const blob = new Blob([exportData(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `todos-${dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const data = normalizeData(parseJson(await file.text()));
    if (!data) {
      setMessage({
        ok: false,
        text: "That file is not valid todo JSON. Expected an array of tasks or an export from this app.",
      });
      return;
    }
    if (
      mode === "replace" &&
      !(await confirm({
        title: "Replace everything?",
        message:
          "Your current tasks, groups and history are replaced by the contents of this file.",
        confirmLabel: "Replace",
        destructive: true,
      }))
    )
      return;
    dispatch({ type: "import", data, mode });
    setMessage({
      ok: true,
      text: `${mode === "merge" ? "Merged" : "Loaded"} ${data.tasks.length} task${data.tasks.length === 1 ? "" : "s"}, ${data.groups.length} group${data.groups.length === 1 ? "" : "s"}, ${data.history.length} history entr${data.history.length === 1 ? "y" : "ies"}.`,
    });
  };

  const card =
    "space-y-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";
  const btn =
    "rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Data</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Everything is stored in this browser's localStorage. Nothing leaves
          your computer.
        </p>
      </div>

      <section className={card}>
        <h2 className="text-sm font-semibold">Export</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {state.tasks.length} tasks, {state.groups.length} groups,{" "}
          {state.history.length} history entries.
        </p>
        <button type="button" onClick={download} className={btn}>
          Download JSON
        </button>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold">Import</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Upload an export from this app, or a plain array of tasks like{" "}
          <code className="rounded bg-stone-100 px-1 dark:bg-neutral-800">
            {'[{ "task": "…", "note": "…", "group": "Urgent" }]'}
          </code>
          . Unknown group names are created automatically, and any field may be
          empty.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="import-mode"
              checked={mode === "merge"}
              onChange={() => setMode("merge")}
            />
            Merge with current
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="import-mode"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
            />
            Replace everything
          </label>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept="application/json,.json"
          onChange={onFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={btn}
        >
          Choose JSON file
        </button>
        {message ? (
          <p
            className={`text-sm ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {message.text}
          </p>
        ) : null}
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold">Danger zone</h2>
        <button
          type="button"
          onClick={async () => {
            const ok = await confirm({
              title: "Reset everything?",
              message:
                "All tasks, groups and history are deleted. This cannot be undone.",
              confirmLabel: "Reset everything",
              destructive: true,
            });
            if (ok) {
              dispatch({ type: "reset" });
              setMessage({ ok: true, text: "Everything was reset." });
            }
          }}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          Reset everything
        </button>
      </section>
    </div>
  );
}
