import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { ROUTES } from "@/lib/routes";
import { NavBar } from "./components/NavBar";
import { ArchivePage } from "./pages/ArchivePage";
import { DataPage } from "./pages/DataPage";
import { HabitsPage } from "./pages/HabitsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { TasksPage } from "./pages/TasksPage";

export default function App() {
  const { pathname } = useLocation();

  // Each page gets its own tab title; the static <title> in index.html stays "Tasks".
  useEffect(() => {
    const route = ROUTES.find((r) => r.to === pathname);
    document.title =
      route && route.to !== "/" ? `${route.label} · Tasks` : "Tasks";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-stone-100">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Routes>
          <Route path="/" element={<TasksPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
