"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Bill {
  _id: string;
  billNumber: string;
  billDate: string;
  supplier: { name: string };
  grandTotal: number;
  amountDue: number;
  status: string;
}

export default function PurchasesPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<Bill[]>("/purchases?docType=purchase_invoice")
      .then(setBills)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Purchase bills</h1>
        <Link
          href="/dashboard/purchases/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New purchase bill
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Bill #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Due</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!isLoading && bills.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No purchase bills yet.</td></tr>
            )}
            {bills.map((b) => (
              <tr key={b._id}>
                <td className="px-4 py-3 font-medium text-slate-800">{b.billNumber}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(b.billDate).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 text-slate-700">{b.supplier?.name}</td>
                <td className="px-4 py-3 text-right text-slate-700">₹{b.grandTotal.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-right text-slate-700">₹{b.amountDue.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-slate-600">{b.status.replace("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
