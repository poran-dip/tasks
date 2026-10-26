import { Navigate, Route, Routes } from "react-router";
import { NavBar } from "./components/NavBar";
import { ArchivePage } from "./pages/ArchivePage";
import { DataPage } from "./pages/DataPage";
import { HabitsPage } from "./pages/HabitsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { TasksPage } from "./pages/TasksPage";

export default function App() {
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
