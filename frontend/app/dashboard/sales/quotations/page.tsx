"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Doc {
  _id: string;
  docType: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: { name: string };
  grandTotal: number;
  status: string;
}

export default function QuotationsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"quotation" | "sales_order">("quotation");

  useEffect(() => {
    setIsLoading(true);
    api
      .get<Doc[]>(`/sales?docType=${filter}`)
      .then(setDocs)
      .finally(() => setIsLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Quotations &amp; sales orders</h1>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setFilter("quotation")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === "quotation" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              Quotations
            </button>
            <button
              onClick={() => setFilter("sales_order")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === "sales_order" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              Sales orders
            </button>
          </div>
        </div>
        <Link
          href="/dashboard/sales/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && docs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nothing here yet.
                </td>
              </tr>
            )}
            {docs.map((d) => (
              <tr key={d._id}>
                <td className="px-4 py-3 font-medium text-slate-800">{d.invoiceNumber}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(d.invoiceDate).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 text-slate-700">{d.customer?.name}</td>
                <td className="px-4 py-3 text-right text-slate-700">₹{d.grandTotal.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-slate-600">{d.status.replace("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Converting a quotation or order into an invoice (spec screens 25 &amp; 26) isn&apos;t wired up yet — the
        backend has <code className="rounded bg-slate-100 px-1">linkedFromOrder</code> on the invoice model ready
        for it; the next step is a &quot;Convert to invoice&quot; action here that re-posts the same line items with
        <code className="rounded bg-slate-100 px-1">docType: &quot;invoice&quot;</code>.
      </p>
    </div>
  );
}
