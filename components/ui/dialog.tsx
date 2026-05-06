"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  wide?: boolean;
};

export function Dialog({ open, title, description, children, onOpenChange, wide }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/45 p-4">
      <div className={`max-h-[calc(100vh-2rem)] w-full overflow-auto rounded-app bg-white p-6 shadow-2xl ${wide ? "max-w-5xl" : "max-w-xl"}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-piche-ink">{title}</h2>
            {description ? <p className="mt-1 text-sm text-piche-muted">{description}</p> : null}
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-app bg-slate-100 text-slate-600" onClick={() => onOpenChange(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
