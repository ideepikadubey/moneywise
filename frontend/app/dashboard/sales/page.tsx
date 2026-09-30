"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  customer: { _id?: string; name: string; gstin?: string };
  grandTotal: number;
  amountPaid?: number;
  amountDue: number;
  status: "draft" | "unpaid" | "partially_paid" | "paid" | "cancelled";
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function displayStatus(inv: Invoice, today: Date): { label: string; className: string } {
  if (inv.status === "cancelled") return { label: "VOID", className: "bg-slate-100 text-slate-500 line-through" };
  if (inv.status === "draft") return { label: "DRAFT", className: "bg-slate-100 text-slate-500" };
  if (inv.status === "paid") return { label: "PAID", className: "bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold" };
  if (inv.status === "partially_paid") return { label: "PARTIALLY PAID", className: "bg-amber-50 text-amber-700 border border-amber-100 font-semibold" };

  const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
  if (daysBetween(today, due) > 0) return { label: "OVERDUE", className: "bg-red-50 text-red-600 border border-red-100 font-semibold" };
  return { label: "APPROVED", className: "bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold" };
}

const PAYMENT_MODES = [
  { id: "UPI", label: "📱 UPI (GPay / PhonePe / Paytm)" },
  { id: "Bank Transfer", label: "🏦 Bank Transfer (NEFT / IMPS / RTGS)" },
  { id: "Cash", label: "💵 Cash" },
  { id: "Cheque", label: "📑 Cheque" },
  { id: "Card", label: "💳 Debit / Credit Card" },
];

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid" | "overdue">("all");

  // Quick Payment Modal State
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("UPI");
  const [payReference, setPayReference] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  function loadInvoices() {
    setIsLoading(true);
    api
      .get<Invoice[]>("/sales?docType=invoice")
      .then(setInvoices)
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  const today = new Date();

  function openQuickPayModal(inv: Invoice) {
    setPayError(null);
    setPaymentInvoice(inv);
    setPayAmount(String(inv.amountDue));
    setPayMode("UPI");
    setPayReference("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes(`Payment received for ${inv.invoiceNumber}`);
  }

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (!paymentInvoice) return;
    setPayError(null);

    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) {
      setPayError("Please enter a valid received amount");
      return;
    }
    if (amountNum > paymentInvoice.amountDue) {
      setPayError(`Amount cannot exceed the balance due of ₹${paymentInvoice.amountDue.toLocaleString("en-IN")}`);
      return;
    }

    const partyId =
      typeof paymentInvoice.customer === "object" && paymentInvoice.customer?._id
        ? paymentInvoice.customer._id
        : (paymentInvoice.customer as any);

    if (!partyId) {
      setPayError("Customer ID is missing from invoice");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await api.post<{ receiptNumber?: string; message?: string }>("/payments", {
        direction: "in",
        party: partyId,
        amount: amountNum,
        paymentMode: payMode,
        referenceNumber: payReference || undefined,
        paymentDate: payDate ? new Date(payDate) : new Date(),
        notes: payNotes || undefined,
        allocations: [
          {
            invoice: paymentInvoice._id,
            invoiceModel: "SalesInvoice",
            amountAllocated: amountNum,
          },
        ],
      });

      const receipt = res.receiptNumber || "Payment";
      setPaymentInvoice(null);
      setSuccessToast(`Payment of ₹${amountNum.toLocaleString("en-IN")} recorded successfully! (Receipt #${receipt})`);
      setTimeout(() => setSuccessToast(null), 5000);
      loadInvoices();
    } catch (err: any) {
      setPayError(err.message || "Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  const summary = useMemo(() => {
    const open = invoices.filter((i) => i.status !== "cancelled" && i.amountDue > 0);
    const totalOutstanding = open.reduce((s, i) => s + i.amountDue, 0);

    let dueToday = 0;
    let dueWithin30 = 0;
    let overdue = 0;
    let paidDaysTotal = 0;
    let paidCount = 0;

    open.forEach((inv) => {
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const diff = daysBetween(due, today);
      if (diff === 0) dueToday += inv.amountDue;
      else if (diff < 0 && diff >= -30) dueWithin30 += inv.amountDue;
      else if (diff > 0) overdue += inv.amountDue;
    });

    invoices
      .filter((i) => i.status === "paid")
      .forEach((inv) => {
        const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
        paidDaysTotal += Math.max(0, daysBetween(today, due));
        paidCount += 1;
      });

    return {
      totalOutstanding,
      dueToday,
      dueWithin30,
      overdue,
      avgDays: paidCount > 0 ? Math.round(paidDaysTotal / paidCount) : 0,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        inv.invoiceNumber.toLowerCase().includes(search) ||
        (inv.customer?.name && inv.customer.name.toLowerCase().includes(search));

      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const isOverdue = inv.amountDue > 0 && daysBetween(today, due) > 0 && inv.status !== "cancelled";
      const isUnpaid = inv.amountDue > 0 && inv.status !== "cancelled";
      const isPaid = inv.status === "paid";

      let matchesStatus = true;
      if (statusFilter === "unpaid") matchesStatus = isUnpaid;
      if (statusFilter === "paid") matchesStatus = isPaid;
      if (statusFilter === "overdue") matchesStatus = isOverdue;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor sales invoices, receivables, and instantly record payment receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/sales/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
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

      {/* Payment Summary Metrics Strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-xs sm:grid-cols-5">
        <SummaryCell label="Total Outstanding Receivables" value={summary.totalOutstanding} highlight />
        <SummaryCell label="Due Today" value={summary.dueToday} />
        <SummaryCell label="Due Within 30 Days" value={summary.dueWithin30} />
        <SummaryCell label="Overdue Invoices" value={summary.overdue} warn />
        <div className="bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg. Days to Get Paid</p>
          <p className="mt-1.5 text-xl font-bold text-slate-900">{summary.avgDays} Days</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice number or customer name..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "all" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({invoices.length})
          </button>
          <button
            onClick={() => setStatusFilter("unpaid")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "unpaid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unpaid
          </button>
          <button
            onClick={() => setStatusFilter("overdue")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "overdue" ? "bg-white text-red-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Overdue
          </button>
          <button
            onClick={() => setStatusFilter("paid")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "paid" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Paid
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-4 py-3.5">Invoice #</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Due date</th>
                <th className="px-4 py-3.5 text-right">Total Amount</th>
                <th className="px-4 py-3.5 text-right">Balance Due</th>
                <th className="px-5 py-3.5 text-right">Quick Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-6 w-6 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs">Loading sales invoices…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-700">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm ? "Try searching with different terms" : "Create your first sales invoice to get started."}
                    </p>
                  </td>
                </tr>
              )}

              {filteredInvoices.map((inv) => {
                const status = displayStatus(inv, today);
                const hasBalanceDue = inv.amountDue > 0 && inv.status !== "cancelled";

                return (
                  <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Date */}
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Invoice Number */}
                    <td className="px-4 py-3.5 font-semibold text-indigo-600">
                      <Link href={`/dashboard/sales/${inv._id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3.5 text-slate-800 font-medium">{inv.customer?.name || "—"}</td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>

                    {/* Grand Total */}
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                      ₹{inv.grandTotal.toLocaleString("en-IN")}
                    </td>

                    {/* Balance Due */}
                    <td className="px-4 py-3.5 text-right font-semibold">
                      <span className={hasBalanceDue ? "text-amber-600" : "text-emerald-600"}>
                        ₹{inv.amountDue.toLocaleString("en-IN")}
                      </span>
                    </td>

                    {/* Quick Payment Action Column */}
                    <td className="px-5 py-3.5 text-right">
                      {hasBalanceDue ? (
                        <button
                          onClick={() => openQuickPayModal(inv)}
                          title="Record Payment Received"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Record Pay</span>
                        </button>
                      ) : inv.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                          <svg className="h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Paid in Full
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* QUICK PAYMENT DIALOG MODAL */}
      {/* ========================================================= */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/50 backdrop-blur-xs transition-opacity">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-6 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Record Payment Received</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {paymentInvoice.invoiceNumber} • {paymentInvoice.customer?.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPaymentInvoice(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              {/* Due Balance Card */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-200/70">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Invoice</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    ₹{paymentInvoice.grandTotal.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Balance Due</span>
                  <p className="text-base font-extrabold text-amber-600 mt-0.5">
                    ₹{paymentInvoice.amountDue.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Amount Received Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Amount Received (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-semibold">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={paymentInvoice.amountDue}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-9 pr-24 text-base font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(paymentInvoice.amountDue))}
                    className="absolute inset-y-1.5 right-1.5 rounded-lg bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition"
                  >
                    Full Due
                  </button>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "Cash", label: "Cash", icon: "💵" },
                    { id: "UPI", label: "UPI", icon: "📱" },
                    { id: "Bank Transfer", label: "Bank Transfer", icon: "🏦" },
                    { id: "Cheque", label: "Cheque", icon: "📑" },
                    { id: "Card", label: "Card", icon: "💳" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMode(m.id)}
                      className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border transition-all ${
                        payMode === m.id
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

              {/* Reference / Transaction No & Payment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Ref / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="e.g. UPI Ref, UTR..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Optional internal remarks"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Error Message */}
              {payError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{payError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95 disabled:opacity-60"
                >
                  {isSubmittingPayment ? (
                    <span>Recording…</span>
                  ) : (
                    <span>Confirm &amp; Record Payment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-white p-4">
      <p className={`text-[11px] font-bold uppercase tracking-wider ${warn ? "text-red-500" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`mt-1.5 text-xl font-bold ${highlight ? "text-indigo-700" : "text-slate-900"}`}>
        ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}
