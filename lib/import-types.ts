// Shared types for the schedule import diff flow.
// Used by both the API route (server) and the import wizard (client).

export type FieldDiff<T> = { old: T; new: T; changed: boolean };

export type NewTaskDiff = {
  task_id: string;
  name: string;
  start: string;
  end: string;
  hours: number | null;
  total_value: number | null;
};

export type UpdatedTaskDiff = {
  task_id: string;
  name: FieldDiff<string>;
  start: FieldDiff<string>;
  end: FieldDiff<string>;
  hours: FieldDiff<number | null>;
  total_value: FieldDiff<number | null>;
};

export type RemovedTaskDiff = {
  task_id: string;
  name: string;
  start: string;
  end: string;
  hours: number | null;
};

export type UnchangedTaskDiff = {
  task_id: string;
  name: string;
  start: string;
  end: string;
  hours: number | null;
};

export type DiffResult = {
  mode: "diff";
  fileName: string;
  uploadedAt: string;
  new_tasks: NewTaskDiff[];
  updated_tasks: UpdatedTaskDiff[];
  removed_tasks: RemovedTaskDiff[];
  unchanged_tasks: UnchangedTaskDiff[];
  total_unchanged_count: number;
};
