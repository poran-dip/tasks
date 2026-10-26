import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConfirmFn, ConfirmOptions } from "./confirm";
import { ConfirmContext } from "./confirm";

interface Pending {
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      // A newer request replaces one that is still open.
      pendingRef.current?.resolve(false);
      const next: Pending = { options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (pending && dialog && !dialog.open) {
      // returnValue survives between openings, so clear it or Escape would reuse the last answer.
      dialog.returnValue = "";
      dialog.showModal();
    }
  }, [pending]);

  const onClose = () => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.resolve(dialogRef.current?.returnValue === "confirm");
  };

  const options = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the click only closes on the backdrop; Escape and the Cancel button are the keyboard paths */}
      <dialog
        ref={dialogRef}
        onClose={onClose}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-stone-200 bg-white p-0 text-stone-900 shadow-xl backdrop:bg-black/50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-stone-100"
      >
        {options ? (
          <form method="dialog" className="space-y-5 p-5">
            <div className="space-y-1.5">
              <h2 id="confirm-title" className="text-base font-semibold">
                {options.title}
              </h2>
              {options.message ? (
                <p
                  id="confirm-message"
                  className="text-sm text-stone-600 dark:text-stone-400"
                >
                  {options.message}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                value="cancel"
                className="rounded-md border border-stone-300 px-3.5 py-2 text-sm hover:bg-stone-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="submit"
                value="confirm"
                className={`rounded-md px-3.5 py-2 text-sm font-semibold text-white ${
                  options.destructive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}
