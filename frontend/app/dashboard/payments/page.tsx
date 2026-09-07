"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Payment {
  _id: string;
  receiptNumber: string;
  direction: "in" | "out";
  party: { name: string };
  amount: number;
  paymentDate: string;
  paymentMode: string;
}

interface DuesParty {
  _id: string;
  name: string;
  type: string;
  currentBalance: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dues, setDues] = useState<DuesParty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<Payment[]>("/payments"), api.get<DuesParty[]>("/payments/dues")])
      .then(([p, d]) => {
        setPayments(p);
        setDues(d);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/payments/new?direction=in"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Receive payment
          </Link>
          <Link
            href="/dashboard/payments/new?direction=out"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Pay supplier
          </Link>
        </div>
      </div>

      {dues.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Outstanding dues</h2>
            <Link href="/dashboard/ledger" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              Open Full Ledger →
            </Link>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {dues.map((d) => (
              <div key={d._id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700 font-medium">{d.name}</span>
                <div className="flex items-center gap-3">
                  <span className={d.currentBalance > 0 ? "font-medium text-amber-600" : "font-medium text-slate-500"}>
                    {d.currentBalance > 0 ? "owes you " : "you owe "}₹{Math.abs(d.currentBalance).toLocaleString("en-IN")}
                  </span>
                  <Link
                    href={`/dashboard/ledger?partyId=${d._id}`}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition"
                  >
                    Statement
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Receipt #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Party</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!isLoading && payments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No payments recorded yet.</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.receiptNumber}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 text-slate-700 font-medium">
                  {p.party?.name ? (
                    <Link
                      href={`/dashboard/ledger?partyId=${(p.party as any)._id || ""}`}
                      className="text-indigo-600 hover:underline hover:text-indigo-900"
                      title="View Party Ledger"
                    >
                      {p.party.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={p.direction === "in" ? "text-emerald-600" : "text-amber-600"}>
                    {p.direction === "in" ? "Received" : "Paid out"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{p.paymentMode}</td>
                <td className="px-4 py-3 text-right text-slate-700 font-semibold">₹{p.amount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
