"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  customer: { name: string };
  grandTotal: number;
  amountDue: number;
  status: "draft" | "unpaid" | "partially_paid" | "paid" | "cancelled";
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// Maps our internal status + due date to the Zoho-style label shown on screen.
// "unpaid" becomes either APPROVED or OVERDUE depending on the due date,
// mirroring how Zoho derives Overdue from Approved + a passed due date.
function displayStatus(inv: Invoice, today: Date): { label: string; className: string } {
  if (inv.status === "cancelled") return { label: "VOID", className: "bg-slate-100 text-slate-500 line-through" };
  if (inv.status === "draft") return { label: "DRAFT", className: "bg-slate-100 text-slate-500" };
  if (inv.status === "paid") return { label: "PAID", className: "bg-emerald-50 text-emerald-700" };
  if (inv.status === "partially_paid") return { label: "PARTIALLY PAID", className: "bg-emerald-50 text-emerald-700" };

  const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
  if (daysBetween(today, due) > 0) return { label: "OVERDUE", className: "bg-red-50 text-red-600" };
  return { label: "APPROVED", className: "bg-indigo-50 text-indigo-700" };
}

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<Invoice[]>("/sales?docType=invoice")
      .then(setInvoices)
      .finally(() => setIsLoading(false));
  }, []);

  const today = new Date();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">All Invoices</h1>
        <Link
          href="/dashboard/sales/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New
        </Link>
      </div>

      {/* Payment summary strip, Zoho-style */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-5">
        <SummaryCell label="Total Outstanding Receivables" value={summary.totalOutstanding} highlight />
        <SummaryCell label="Due Today" value={summary.dueToday} />
        <SummaryCell label="Due Within 30 Days" value={summary.dueWithin30} />
        <SummaryCell label="Overdue Invoice" value={summary.overdue} warn />
        <div className="bg-white p-4">
          <p className="text-xs font-medium text-slate-400">Avg. Days to Get Paid</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{summary.avgDays} Days</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Balance due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No invoices yet.
                </td>
              </tr>
            )}
            {invoices.map((inv) => {
              const status = displayStatus(inv, today);
              return (
                <tr key={inv._id}>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(inv.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-medium text-indigo-600">
                    <Link href={`/dashboard/sales/${inv._id}`} className="hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{inv.customer?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">₹{inv.grandTotal.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    ₹{inv.amountDue.toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
      <p className={`text-xs font-medium ${warn ? "text-red-500" : "text-slate-400"}`}>{label.toUpperCase()}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? "text-indigo-700" : "text-slate-900"}`}>
        ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}
