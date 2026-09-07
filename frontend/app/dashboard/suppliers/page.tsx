"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Party {
  _id: string;
  name: string;
  gstin?: string;
  phone?: string;
  currentBalance: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function load() {
    setIsLoading(true);
    api
      .get<Party[]>("/parties?type=supplier")
      .then(setSuppliers)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/parties", { name, type: "supplier", gstin: gstin || undefined, phone: phone || undefined });
      setName("");
      setGstin("");
      setPhone("");
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message || "Could not add supplier");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Suppliers</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "Add supplier"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">GSTIN</label>
            <input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          {error && <p className="sm:col-span-3 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-3">
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
              {isSubmitting ? "Saving…" : "Save supplier"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">GSTIN</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Balance you owe</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!isLoading && suppliers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No suppliers yet.</td></tr>
            )}
            {suppliers.map((s) => (
              <tr key={s._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                <td className="px-4 py-3 text-slate-500">{s.gstin || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{s.phone || "—"}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-700">
                  ₹{Math.abs(s.currentBalance).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/ledger?partyId=${s._id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Ledger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
