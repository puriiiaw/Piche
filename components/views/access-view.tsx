"use client";

import { useEffect, useState, useTransition } from "react";
import { KeyRound, Plus, ShieldCheck, Trash2, UserRound, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createUser, deleteUser, getUsers, resetUserPassword, updateUserProjects } from "@/app/actions/users";
import { useAppStore } from "@/lib/store";

type UserRow = {
  id: string;
  name: string | null;
  username: string | null;
  role: "ADMIN" | "PM" | "VP";
  assignedProjectIds: string[];
  createdAt: Date;
};

type CreateForm = {
  name: string;
  username: string;
  password: string;
  role: "ADMIN" | "PM" | "VP";
  assignedProjectIds: string[];
};

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", PM: "Project Manager", VP: "VP" };
const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-piche-navy text-white",
  PM: "bg-blue-100 text-blue-800",
  VP: "bg-amber-100 text-amber-800",
};

const emptyForm = (): CreateForm => ({
  name: "",
  username: "",
  password: "",
  role: "PM",
  assignedProjectIds: [],
});

export function AccessView({ currentUserId }: { currentUserId: string }) {
  const projects = useAppStore((s) => s.projects);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState<UserRow | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyForm());
  const [resetPw, setResetPw] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data as UserRow[]);
    } catch {
      toast.error("Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createUser(form);
        toast.success(`Account created for ${form.name}.`);
        setShowCreate(false);
        setForm(emptyForm());
        await loadUsers();
      } catch (err: any) {
        toast.error(err.message || "Failed to create user.");
      }
    });
  }

  function handleDelete(user: UserRow) {
    if (!confirm(`Delete account for ${user.name || user.username}? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteUser(user.id);
        toast.success("Account deleted.");
        await loadUsers();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete user.");
      }
    });
  }

  function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!showReset) return;
    startTransition(async () => {
      try {
        await resetUserPassword(showReset.id, resetPw);
        toast.success("Password updated.");
        setShowReset(null);
        setResetPw("");
      } catch (err: any) {
        toast.error(err.message || "Failed to reset password.");
      }
    });
  }

  function toggleProject(id: string) {
    setForm((f) => ({
      ...f,
      assignedProjectIds: f.assignedProjectIds.includes(id)
        ? f.assignedProjectIds.filter((p) => p !== id)
        : [...f.assignedProjectIds, id],
    }));
  }

  return (
    <div className="grid gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Admin only</p>
          <h2 className="text-2xl font-black text-piche-ink">User Access</h2>
          <p className="mt-1 text-sm text-piche-muted">Create and manage accounts for your team.</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowCreate(true); setForm(emptyForm()); }}>
          <Plus size={16} />
          New User
        </button>
      </div>

      {/* User table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm font-semibold text-piche-muted">
            <RefreshCw size={16} className="animate-spin" /> Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-piche-muted">No users yet. Create the first one above.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-piche-line bg-slate-50">
              <tr>
                <th className="px-5 py-3 font-black text-slate-500">User</th>
                <th className="px-5 py-3 font-black text-slate-500">Role</th>
                <th className="px-5 py-3 font-black text-slate-500">Assigned Projects</th>
                <th className="px-5 py-3 font-black text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-piche-line last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-piche-navy text-xs font-black text-white">
                        {(u.name || u.username || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-piche-ink">{u.name || "—"}</div>
                        <div className="text-xs text-piche-muted">@{u.username}</div>
                      </div>
                      {u.id === currentUserId && (
                        <span className="rounded-full bg-piche-gold/20 px-2 py-0.5 text-xs font-black text-piche-goldDark">You</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${ROLE_COLOR[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-piche-muted">
                    {u.role === "PM" ? (
                      u.assignedProjectIds.length === 0
                        ? <span className="text-amber-600 font-semibold">No projects assigned</span>
                        : u.assignedProjectIds.map((pid) => (
                            <span key={pid} className="mr-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {projects.find((p) => p.id === pid)?.name || pid}
                            </span>
                          ))
                    ) : (
                      <span className="text-xs italic">All projects</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="flex items-center gap-1.5 rounded-lg border border-piche-line px-3 py-1.5 text-xs font-bold text-piche-muted hover:border-piche-gold hover:text-piche-goldDark"
                        onClick={() => { setShowReset(u); setResetPw(""); }}
                        title="Reset password"
                      >
                        <KeyRound size={13} /> Reset PW
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          onClick={() => handleDelete(u)}
                          disabled={isPending}
                          title="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create user modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-piche-line px-6 py-5">
              <h3 className="text-lg font-black text-piche-ink">Create Account</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-piche-ink">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="grid gap-4 p-6">
              <label className="field">
                <span>Full Name</span>
                <input
                  type="text"
                  className="input"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Username</span>
                <input
                  type="text"
                  className="input"
                  placeholder="janesmith"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  className="input"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
              </label>

              <div className="field">
                <span>Role</span>
                <div className="flex gap-2">
                  {(["PM", "VP", "ADMIN"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`flex-1 rounded-lg border py-2 text-sm font-black transition ${
                        form.role === r
                          ? "border-piche-gold bg-piche-gold/10 text-piche-goldDark"
                          : "border-piche-line text-slate-500 hover:border-piche-gold/50"
                      }`}
                      onClick={() => setForm((f) => ({ ...f, role: r, assignedProjectIds: [] }))}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-piche-muted">
                  {form.role === "PM" && "Can see and manage only their assigned projects."}
                  {form.role === "VP" && "Read-only access to all projects and the dashboard."}
                  {form.role === "ADMIN" && "Full access: can create users, projects, and manage everything."}
                </p>
              </div>

              {form.role === "PM" && projects.length > 0 && (
                <div className="field">
                  <span>Assign Projects</span>
                  <div className="grid gap-1.5 rounded-lg border border-piche-line p-3">
                    {projects.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={form.assignedProjectIds.includes(p.id)}
                          onChange={() => toggleProject(p.id)}
                          className="h-4 w-4 accent-piche-gold"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset password modal ── */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-piche-line px-6 py-5">
              <h3 className="text-lg font-black text-piche-ink">Reset Password</h3>
              <button onClick={() => setShowReset(null)} className="text-slate-400 hover:text-piche-ink">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleResetSubmit} className="grid gap-4 p-6">
              <p className="text-sm text-piche-muted">
                Setting a new password for <strong>{showReset.name || showReset.username}</strong>.
              </p>
              <label className="field">
                <span>New Password</span>
                <input
                  type="password"
                  className="input"
                  placeholder="Min. 6 characters"
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </label>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowReset(null)}>Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? "Saving…" : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
