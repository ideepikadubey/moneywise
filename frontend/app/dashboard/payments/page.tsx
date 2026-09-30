"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Payment {
  _id: string;
  receiptNumber: string;
  direction: "in" | "out";
  party: { _id?: string; name: string };
  amount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNumber?: string;
  notes?: string;
}

interface DuesParty {
  _id: string;
  name: string;
  type: string;
  currentBalance: number;
}

const PAYMENT_MODES = [
  { id: "Cash", label: "Cash", icon: "💵" },
  { id: "UPI", label: "UPI", icon: "📱" },
  { id: "Bank Transfer", label: "Bank Transfer", icon: "🏦" },
  { id: "Cheque", label: "Cheque", icon: "📑" },
  { id: "Card", label: "Card", icon: "💳" },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dues, setDues] = useState<DuesParty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editMode, setEditMode] = useState("Cash");
  const [editRef, setEditRef] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Payment State
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadData() {
    setIsLoading(true);
    Promise.all([api.get<Payment[]>("/payments"), api.get<DuesParty[]>("/payments/dues")])
      .then(([p, d]) => {
        setPayments(p);
        setDues(d);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  function openEditModal(p: Payment) {
    setEditError(null);
    setEditingPayment(p);
    setEditMode(p.paymentMode || "Cash");
    setEditRef(p.referenceNumber || "");
    setEditDate(p.paymentDate ? new Date(p.paymentDate).toISOString().slice(0, 10) : "");
    setEditNotes(p.notes || "");
  }

  async function handleUpdatePayment(e: FormEvent) {
    e.preventDefault();
    if (!editingPayment) return;
    setEditError(null);
    setIsUpdating(true);
    try {
      await api.put(`/payments/${editingPayment._id}`, {
        paymentMode: editMode,
        referenceNumber: editRef || undefined,
        paymentDate: editDate ? new Date(editDate) : undefined,
        notes: editNotes || undefined,
      });
      setEditingPayment(null);
      setSuccessToast(`Payment #${editingPayment.receiptNumber} updated successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
      loadData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update payment");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeletePayment() {
    if (!deletingPayment) return;
    setIsDeleting(true);
    try {
      await api.delete(`/payments/${deletingPayment._id}`);
      setDeletingPayment(null);
      setSuccessToast(`Payment #${deletingPayment.receiptNumber} deleted and ledger reversed!`);
      setTimeout(() => setSuccessToast(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete payment");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track customer receipts, vendor payments, and ledger settlements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/payments/new?direction=in"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <span>+ Receive Payment</span>
          </Link>
          <Link
            href="/dashboard/payments/new?direction=out"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition"
          >
            <span>- Pay Supplier</span>
          </Link>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
              ✓
            </span>
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Outstanding Dues Summary */}
      {dues.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Outstanding Dues &amp; Receivables</h2>
            <Link href="/dashboard/ledger" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Open Full Ledger Statement →
            </Link>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {dues.map((d) => (
              <div key={d._id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-800 font-semibold">{d.name}</span>
                <div className="flex items-center gap-3">
                  <span className={d.currentBalance > 0 ? "font-semibold text-amber-600 text-xs" : "font-semibold text-slate-600 text-xs"}>
                    {d.currentBalance > 0 ? "owes you " : "you owe "}₹{Math.abs(d.currentBalance).toLocaleString("en-IN")}
                  </span>
                  <Link
                    href={`/dashboard/ledger?partyId=${d._id}`}
                    className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    Statement
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments History Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Receipt / PMT #</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Party</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Payment Mode</th>
                <th className="px-4 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading payments…
                  </td>
                </tr>
              )}
              {!isLoading && payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No payment records yet.
                  </td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{p.receiptNumber}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3.5 text-slate-800 font-medium">
                    {p.party?.name ? (
                      <Link
                        href={`/dashboard/ledger?partyId=${(p.party as any)._id || ""}`}
                        className="text-indigo-600 hover:underline"
                        title="View Ledger Statement"
                      >
                        {p.party.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        p.direction === "in"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                    >
                      {p.direction === "in" ? "Received" : "Paid Out"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-700 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <span>{p.paymentMode === "Cash" ? "💵" : p.paymentMode === "UPI" ? "📱" : p.paymentMode === "Cheque" ? "📑" : "🏦"}</span>
                      <span>{p.paymentMode}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(p)}
                        title="Edit Payment Mode / Details"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => setDeletingPayment(p)}
                        title="Delete / Reverse Payment"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EDIT PAYMENT MODAL                                        */}
      {/* ========================================================= */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Payment Details</h3>
                <p className="text-xs text-slate-500">{editingPayment.receiptNumber} • ₹{editingPayment.amount.toLocaleString("en-IN")}</p>
              </div>
              <button onClick={() => setEditingPayment(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePayment} className="mt-4 space-y-4">
              {/* Payment Mode Selector Cards */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditMode(m.id)}
                      className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border transition-all ${
                        editMode === m.id
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs ring-2 ring-emerald-500/20"
                          : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-base">{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Ref / UTR / Cheque #
                </label>
                <input
                  type="text"
                  value={editRef}
                  onChange={(e) => setEditRef(e.target.value)}
                  placeholder="Optional reference / transaction ID"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Notes
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {editError && <p className="text-xs text-red-600 font-medium">{editError}</p>}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isUpdating ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE PAYMENT MODAL                                      */}
      {/* ========================================================= */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900">Delete Payment #{deletingPayment.receiptNumber}?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Deleting this payment will automatically restore the unpaid invoice balance and update the customer ledger.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingPayment(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePayment}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "Deleting…" : "Yes, Delete & Reverse"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
