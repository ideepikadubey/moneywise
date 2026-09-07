"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Product {
  _id: string;
  name: string;
  currentStock: number;
  lowStockThreshold?: number;
  unit: string;
}
interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer: { name: string };
  amountDue: number;
  dueDate?: string;
  status: string;
}

export default function NotificationsPage() {
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [overdue, setOverdue] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Product[]>("/products?lowStock=true"),
      api.get<Invoice[]>("/sales?docType=invoice"),
    ])
      .then(([products, invoices]) => {
        setLowStock(products);
        const today = new Date();
        setOverdue(
          invoices.filter(
            (inv) => inv.amountDue > 0 && inv.dueDate && new Date(inv.dueDate) < today && inv.status !== "cancelled"
          )
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      {!isLoading && lowStock.length === 0 && overdue.length === 0 && (
        <p className="text-sm text-slate-500">You&apos;re all caught up — no alerts right now.</p>
      )}

      {overdue.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-800">Overdue payments ({overdue.length})</h2>
          <div className="mt-2 space-y-1.5">
            {overdue.map((inv) => (
              <Link
                key={inv._id}
                href="/dashboard/sales"
                className="flex items-center justify-between text-sm text-red-700 hover:underline"
              >
                <span>
                  {inv.invoiceNumber} — {inv.customer?.name}
                </span>
                <span className="font-medium">₹{inv.amountDue.toLocaleString("en-IN")}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {lowStock.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-800">Low stock ({lowStock.length})</h2>
          <div className="mt-2 space-y-1.5">
            {lowStock.map((p) => (
              <Link
                key={p._id}
                href="/dashboard/stock"
                className="flex items-center justify-between text-sm text-amber-700 hover:underline"
              >
                <span>{p.name}</span>
                <span className="font-medium">
                  {p.currentStock} {p.unit} left
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-slate-500">
        GST filing reminders and expiry alerts (spec screen 19) need a scheduled job — the natural place is a daily
        cron on the backend that checks GST due dates and <code className="rounded bg-slate-100 px-1">StockMovement</code> batch
        expiry dates and writes to a notifications collection, rather than computing everything client-side like this
        page currently does.
      </p>
    </div>
  );
}
