import { describe, expect, it } from "vitest";
import { normalizeData } from "../lib/storage";
import type { AppData } from "../types";
import { reducer } from "./reducer";

const empty = (): AppData => ({
  version: 1,
  groups: [],
  tasks: [],
  history: [],
  settings: { hideCompleted: true },
});

describe("reducer", () => {
  it("accepts empty task, note and group", () => {
    const s = reducer(empty(), { type: "addTask" });
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]).toMatchObject({
      task: "",
      note: "",
      group: "",
      repeatDays: null,
      completedAt: null,
    });
  });

  it("completing records history; unchecking removes that entry", () => {
    let s = reducer(empty(), {
      type: "addTask",
      id: "a",
      fields: { task: "Apply" },
    });
    s = reducer(s, {
      type: "toggleTask",
      id: "a",
      now: "2026-10-26T10:00:00.000Z",
    });
    expect(s.tasks[0].completedAt).toBe("2026-10-26T10:00:00.000Z");
    expect(s.history).toHaveLength(1);
    expect(s.history[0]).toMatchObject({ taskId: "a", task: "Apply" });
    s = reducer(s, { type: "toggleTask", id: "a", now: "ignored" });
    expect(s.tasks[0].completedAt).toBeNull();
    expect(s.history).toHaveLength(0);
  });

  it("reopening keeps the history entry", () => {
    let s = reducer(empty(), { type: "addTask", id: "a" });
    s = reducer(s, {
      type: "toggleTask",
      id: "a",
      now: "2026-10-26T10:00:00.000Z",
    });
    s = reducer(s, { type: "reopenTask", id: "a" });
    expect(s.tasks[0].completedAt).toBeNull();
    expect(s.history).toHaveLength(1);
  });

  it("a repeating task reappears on tick but history stays", () => {
    let s = reducer(empty(), {
      type: "addTask",
      id: "a",
      fields: { repeatDays: 1 },
    });
    const done = new Date(2026, 9, 26, 22).toISOString();
    s = reducer(s, { type: "toggleTask", id: "a", now: done });
    s = reducer(s, {
      type: "tick",
      now: new Date(2026, 9, 26, 23, 59).toISOString(),
    });
    expect(s.tasks[0].completedAt).toBe(done);
    s = reducer(s, {
      type: "tick",
      now: new Date(2026, 9, 27, 0, 1).toISOString(),
    });
    expect(s.tasks[0].completedAt).toBeNull();
    expect(s.history).toHaveLength(1);
  });

  it("moves tasks between groups and before a target", () => {
    let s = reducer(empty(), { type: "addGroup", id: "g1", name: "A" });
    s = reducer(s, { type: "addGroup", id: "g2", name: "B" });
    for (const id of ["t1", "t2", "t3"])
      s = reducer(s, { type: "addTask", id, fields: { group: "g1" } });
    s = reducer(s, { type: "moveTask", id: "t3", group: "g2", beforeId: null });
    expect(s.tasks.find((t) => t.id === "t3")?.group).toBe("g2");
    s = reducer(s, { type: "moveTask", id: "t3", group: "g1", beforeId: "t1" });
    expect(s.tasks.map((t) => t.id)).toEqual(["t3", "t1", "t2"]);
  });

  it("deleting a group ungroups its tasks and reordering groups works", () => {
    let s = reducer(empty(), { type: "addGroup", id: "g1", name: "A" });
    s = reducer(s, { type: "addGroup", id: "g2", name: "B" });
    s = reducer(s, { type: "addTask", id: "t", fields: { group: "g1" } });
    s = reducer(s, { type: "moveGroup", id: "g2", beforeId: "g1" });
    expect(s.groups.map((g) => g.id)).toEqual(["g2", "g1"]);
    s = reducer(s, { type: "deleteGroup", id: "g1" });
    expect(s.tasks[0].group).toBe("");
  });
});

describe("import", () => {
  it("reads the old todo.html format (urgency as group name)", () => {
    const data = normalizeData([
      { id: "a", urgency: "immediate", task: "One", note: "n" },
      { id: "b", urgency: "Immediate", task: "Two" },
      { id: "c", urgency: "", task: "" },
    ]);
    expect(data).not.toBeNull();
    expect(data?.groups.map((g) => g.name)).toEqual(["immediate"]);
    expect(data?.tasks.map((t) => t.group === data.groups[0].id)).toEqual([
      true,
      true,
      false,
    ]);
    expect(data?.tasks[2]).toMatchObject({ task: "", note: "", group: "" });
  });

  it("merge maps groups by name and skips existing ids", () => {
    let s = reducer(empty(), { type: "addGroup", id: "g1", name: "Urgent" });
    s = reducer(s, { type: "addTask", id: "a", fields: { group: "g1" } });
    const incoming = normalizeData([
      { id: "a", group: "Urgent", task: "dup" },
      { id: "b", group: "urgent", task: "new" },
    ]);
    expect(incoming).not.toBeNull();
    if (!incoming) return;
    s = reducer(s, { type: "import", data: incoming, mode: "merge" });
    expect(s.tasks.map((t) => t.id)).toEqual(["a", "b"]);
    expect(s.groups).toHaveLength(1);
    expect(s.tasks[1].group).toBe("g1");
  });

  it("rejects unrelated JSON", () => {
    expect(normalizeData({ hello: "world" })).toBeNull();
    expect(normalizeData("nope")).toBeNull();
  });
});

describe("drag-and-drop layout", () => {
  const base = (): AppData => ({
    ...empty(),
    groups: [
      { id: "a", name: "A", color: "#000" },
      { id: "b", name: "B", color: "#000" },
    ],
    tasks: [
      {
        id: "1",
        task: "",
        note: "",
        group: "a",
        repeatDays: null,
        completedAt: null,
      },
      {
        id: "2",
        task: "",
        note: "",
        group: "a",
        repeatDays: null,
        completedAt: null,
      },
      {
        id: "3",
        task: "",
        note: "",
        group: "b",
        repeatDays: null,
        completedAt: null,
      },
      {
        id: "h",
        task: "",
        note: "",
        group: "a",
        repeatDays: null,
        completedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  });

  it("moves tasks across groups and keeps hidden tasks with their group", () => {
    const next = reducer(base(), {
      type: "applyLayout",
      layout: { "": [], a: ["2"], b: ["3", "1"] },
    });
    const view = next.tasks.map((t) => `${t.group}:${t.id}`);
    expect(view).toEqual(["a:2", "a:h", "b:3", "b:1"]);
  });

  it("reorders groups", () => {
    const next = reducer(base(), { type: "reorderGroups", ids: ["b", "a"] });
    expect(next.groups.map((g) => g.id)).toEqual(["b", "a"]);
  });
});
