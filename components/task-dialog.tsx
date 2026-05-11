"use client";

import { useEffect, useState } from "react";
import { today } from "@/lib/dates";
import { useAppStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: Task;
};

export function TaskDialog({ open, onOpenChange, projectId, task }: TaskDialogProps) {
  const createTask = useAppStore((state) => state.createTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const [form, setForm] = useState({
    id: "",
    name: "",
    startDate: today(),
    endDate: today(14),
    totalLabourHours: 0,
    totalValue: 0,
    documentLink: "",
    notes: "",
    assumptions: ""
  });

  useEffect(() => {
    if (!task) return;
    setForm({
      id: task.id,
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      totalLabourHours: task.totalLabourHours,
      totalValue: task.totalValue,
      documentLink: task.documentLink,
      notes: task.notes,
      assumptions: task.assumptions
    });
  }, [task]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={task ? "Edit Task" : "Add Task"} description="Enter task dates and labour. Hours can be entered directly or derived from total value.">
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (task) {
            await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form)
            });
            updateTask(projectId, task.id, form as Partial<Task>);
          } else {
            const response = await fetch(`/api/projects/${projectId}/tasks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form)
            });
            const result = await response.json();
            createTask(projectId, result.task ?? (form as never));
          }
          onOpenChange(false);
        }}
      >
        <div className="grid grid-cols-[160px_1fr] gap-3 max-sm:grid-cols-1">
          <label className="field">Task ID<input required value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} /></label>
          <label className="field">Task Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="field">Start Date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
          <label className="field">End Date<input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="field">Labour Hours<input type="number" min={0} value={form.totalLabourHours} onChange={(event) => setForm({ ...form, totalLabourHours: Number(event.target.value) })} /></label>
          <label className="field">Total Value<input type="number" min={0} value={form.totalValue} onChange={(event) => setForm({ ...form, totalValue: Number(event.target.value) })} /></label>
        </div>
        <label className="field">Document Link<input type="url" value={form.documentLink} onChange={(event) => setForm({ ...form, documentLink: event.target.value })} /></label>
        <label className="field">Notes<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <label className="field">Assumptions<textarea rows={3} value={form.assumptions} onChange={(event) => setForm({ ...form, assumptions: event.target.value })} /></label>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button>
          <button className="btn-primary">{task ? "Save Task" : "Add Task"}</button>
        </div>
      </form>
    </Dialog>
  );
}
