/** Shared UI state for the task list, owned by TasksPage. */
export interface TaskUi {
  editingId: string | null;
  /** Id of a task that was just created and has not been saved yet. */
  draftId: string | null;
  setEditingId: (id: string | null) => void;
  setDraftId: (id: string | null) => void;
  /** Element to focus once it renders: "task:<id>" (Edit button) or "add:<groupId>" (Add task button). */
  focusTarget: string | null;
  setFocusTarget: (target: string | null) => void;
  onCompleted: (taskId: string, label: string) => void;
}

/** Droppable/layout key for a group's task list. "" (Ungrouped) is stored as "none". */
export const columnKey = (groupId: string) => `col:${groupId || "none"}`;
export const groupIdOf = (key: string) => {
  const id = key.slice(4);
  return id === "none" ? "" : id;
};
