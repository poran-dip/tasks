import { NavLink } from "react-router";
import { useStore } from "@/state/context";

const links = [
  { to: "/", label: "Tasks" },
  { to: "/archive", label: "Archive" },
  { to: "/history", label: "History" },
  { to: "/streaks", label: "Streaks" },
  { to: "/data", label: "Data" },
];

export function NavBar() {
  const { state } = useStore();
  const archived = state.tasks.filter((t) => t.completedAt).length;

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 py-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end
            className={({ isActive }) =>
              `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-neutral-900"
                  : "text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-neutral-800"
              }`
            }
          >
            {l.label}
            {l.to === "/archive" && archived > 0 ? (
              <span className="ml-1.5 rounded-full bg-stone-300 px-1.5 text-xs text-stone-800 dark:bg-neutral-700 dark:text-stone-200">
                {archived}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
