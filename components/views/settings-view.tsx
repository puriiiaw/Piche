"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { projectAreas } from "@/lib/constants";
import { useAppStore } from "@/lib/store";

export function SettingsView() {
  const state = useAppStore();
  const [label, setLabel] = useState("");

  return (
    <>
      <section className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
        <div className="card p-6">
          <h2 className="text-2xl font-black text-piche-ink">Project Areas</h2>
          <p className="mt-1 text-piche-muted">Used for project assignment and dashboard filters.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {projectAreas.map((area) => <span key={area} className="rounded-full border border-piche-line bg-slate-50 px-4 py-2 font-bold">{area}</span>)}
          </div>
        </div>
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-piche-ink">Crew Types</h2>
              <p className="mt-1 text-piche-muted">Global crew categories for allocation planning.</p>
            </div>
            <div className="flex gap-2">
              <input className="input" placeholder="New crew type" value={label} onChange={(event) => setLabel(event.target.value)} />
              <button className="btn-primary" onClick={() => { state.addCrewType(label); setLabel(""); }}><Plus size={16} /> Add</button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {state.crewTypes.map((type) => (
              <span key={type.id} className="inline-flex items-center gap-2 rounded-full border border-piche-line bg-slate-50 py-2 pl-4 pr-2 font-bold">
                {type.label}
                <button className="grid h-7 w-7 place-items-center rounded-full bg-white text-slate-500" onClick={() => state.removeCrewType(type.id)} title="Remove crew type"><Trash2 size={14} /></button>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl font-black text-piche-ink">Import Rules</h2>
        <p className="mt-1 text-piche-muted">These rules match the MVP and will be enforced server-side once Supabase/Postgres is connected.</p>
        <div className="mt-5 grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          <Rule title="Task ID matching" text="Imported rows are matched against existing tasks by Task ID." />
          <Rule title="Labour hours protected" text="Imports update task names and dates, but never overwrite labour hours." />
          <Rule title="Selective review" text="PMs can accept changed rows, new rows, or skip updates before applying." />
          <Rule title="Header detection" text="CSV and Excel uploads auto-map common schedule column names." />
          <Rule title="Skipped export" text="Rejected rows can be exported as CSV for follow-up with the GC." />
          <Rule title="Audit-ready" text="Import batches are stored separately from task data for history and reporting." />
        </div>
      </section>
    </>
  );
}

function Rule({ title, text }: { title: string; text: string }) {
  return <article className="rounded-app border border-piche-line bg-slate-50 p-5"><strong className="text-piche-ink">{title}</strong><p className="mt-2 text-sm text-piche-muted">{text}</p></article>;
}
