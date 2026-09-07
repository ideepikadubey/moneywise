"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, getActiveFirmId } from "@/lib/api";

interface Member {
  _id: string;
  user: { name: string; email?: string; phone?: string };
  role: string;
  isActive: boolean;
}

const ROLES = ["admin", "accountant", "cashier", "staff"];

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function load() {
    const firmId = getActiveFirmId();
    if (!firmId) return;
    setIsLoading(true);
    api
      .get<Member[]>(`/firms/${firmId}/members`)
      .then(setMembers)
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const firmId = getActiveFirmId();
      await api.post(`/firms/${firmId}/members`, { identifier, role });
      setIdentifier("");
      load();
    } catch (err: any) {
      setError(err.message || "Could not add team member");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(member: Member) {
    const firmId = getActiveFirmId();
    await api.put(`/firms/${firmId}/members/${member._id}`, { isActive: !member.isActive });
    load();
  }

  async function changeRole(member: Member, newRole: string) {
    const firmId = getActiveFirmId();
    await api.put(`/firms/${firmId}/members/${member._id}`, { role: newRole });
    load();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Team &amp; permissions</h1>

      <form onSubmit={handleInvite} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Email or phone</label>
          <input
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="They must already have a MoneyWise account"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="sm:col-span-3 text-sm text-red-600">{error}</p>}
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? "Adding…" : "Add to team"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m._id}>
                <td className="px-4 py-3 font-medium text-slate-800">{m.user.name}</td>
                <td className="px-4 py-3 text-slate-500">{m.user.email || m.user.phone}</td>
                <td className="px-4 py-3">
                  {m.role === "owner" ? (
                    <span className="text-slate-500">owner</span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  {m.role === "owner" ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <button
                      onClick={() => toggleActive(m)}
                      className={`text-xs font-medium ${m.isActive ? "text-red-600 hover:text-red-700" : "text-emerald-600 hover:text-emerald-700"}`}
                    >
                      {m.isActive ? "Disable" : "Enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
