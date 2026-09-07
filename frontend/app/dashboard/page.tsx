"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface DuesParty {
  _id: string;
  name: string;
  type: string;
  currentBalance: number;
}

interface SalesInvoice {
  _id: string;
  invoiceDate: string;
  dueDate?: string;
  grandTotal: number;
  amountDue: number;
  status: string;
}

interface PurchaseBill {
  billDate: string;
  grandTotal: number;
}

interface AgingBucket {
  label: string;
  amount: number;
  color: string;
  accentBg: string;
  textColor: string;
}

function monthKey(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "short" });
}

export default function DashboardOverview() {
  const { user, firms, activeFirmId } = useAuth();
  const activeFirm = firms.find((f) => f.firm._id === activeFirmId)?.firm;

  const [dues, setDues] = useState<DuesParty[] | null>(null);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get<DuesParty[]>("/payments/dues").catch(() => []),
      api.get<SalesInvoice[]>("/sales?docType=invoice").catch(() => []),
      api.get<PurchaseBill[]>("/purchases?docType=purchase_invoice").catch(() => []),
    ])
      .then(([d, inv, b]) => {
        setDues(d);
        setInvoices(inv);
        setBills(b);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [activeFirmId]);

  const receivable = dues?.filter((d) => d.currentBalance > 0).reduce((s, d) => s + d.currentBalance, 0) || 0;
  const payable = dues?.filter((d) => d.currentBalance < 0).reduce((s, d) => s + Math.abs(d.currentBalance), 0) || 0;

  // Receivables aging breakdown
  const aging: AgingBucket[] = [
    { label: "Current", amount: 0, color: "from-indigo-500 to-violet-600", accentBg: "bg-indigo-50", textColor: "text-indigo-600" },
    { label: "1-15 Days", amount: 0, color: "from-emerald-400 to-teal-500", accentBg: "bg-emerald-50", textColor: "text-emerald-600" },
    { label: "16-30 Days", amount: 0, color: "from-amber-400 to-orange-500", accentBg: "bg-amber-50", textColor: "text-amber-600" },
    { label: "31-45 Days", amount: 0, color: "from-orange-500 to-rose-500", accentBg: "bg-orange-50", textColor: "text-orange-600" },
    { label: "Above 45 Days", amount: 0, color: "from-rose-500 to-red-600", accentBg: "bg-rose-50", textColor: "text-rose-600" },
  ];

  const today = new Date();
  invoices
    .filter((inv) => inv.amountDue > 0 && inv.status !== "cancelled")
    .forEach((inv) => {
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 0) aging[0].amount += inv.amountDue;
      else if (daysOverdue <= 15) aging[1].amount += inv.amountDue;
      else if (daysOverdue <= 30) aging[2].amount += inv.amountDue;
      else if (daysOverdue <= 45) aging[3].amount += inv.amountDue;
      else aging[4].amount += inv.amountDue;
    });

  // Sales & purchases by month, this fiscal year
  const monthOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const chartData = monthOrder.map((m) => ({ month: m, Sales: 0, Purchases: 0 }));
  invoices.forEach((inv) => {
    const m = monthKey(new Date(inv.invoiceDate));
    const bucket = chartData.find((c) => c.month === m);
    if (bucket) bucket.Sales += inv.grandTotal;
  });
  bills.forEach((b) => {
    const m = monthKey(new Date(b.billDate));
    const bucket = chartData.find((c) => c.month === m);
    if (bucket) bucket.Purchases += b.grandTotal;
  });
  const totalSales = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPurchases = bills.reduce((s, b) => s + b.grandTotal, 0);
  const netRevenue = totalSales - totalPurchases;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        {/* Subtle decorative glow circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-48 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md border border-white/10 mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeFirm?.name || "My Business"}</span>
              <span className="text-white/40">•</span>
              <span>{today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name?.split(" ")[0] || "there"}! ✨
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
              Track multi-firm cashflow, customer receivables, real-time GST liabilities, and inventory from your command center.
            </p>
          </div>

          {/* Banner Quick CTA Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/sales/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02] hover:shadow-indigo-500/50 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Invoice</span>
            </Link>
            <Link
              href="/dashboard/payments/new?direction=in"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all"
            >
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Record Payment</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Receivables Aging - Zoho Style Colorful Pill Strip */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Receivables Aging Analysis (What Customers Owe You)
            </h2>
          </div>
          <Link href="/dashboard/ledger" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
            View Party Statement →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {aging.map((bucket, i) => (
            <div
              key={bucket.label}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Vibrant Top Accent Bar */}
              <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${bucket.color}`} />
              
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[11px] font-extrabold uppercase tracking-wider ${bucket.textColor}`}>
                  {bucket.label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bucket.accentBg} ${bucket.textColor}`}>
                  {i === 0 ? "Not Due" : `Bucket ${i}`}
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  ₹{bucket.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-slate-400 font-medium">
                {i === 0 ? "Upcoming payments" : `Overdue by ${bucket.label}`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sales & Purchases Chart Section */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Revenue &amp; Purchases Breakdown</h2>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                FY 2026-2027
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Month-by-month sales invoices vs. supplier procurement</p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xs" />
              <span className="text-slate-700">Sales Invoiced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-gradient-to-tr from-amber-500 to-orange-400 shadow-xs" />
              <span className="text-slate-700">Purchase Bills</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Chart */}
          <div className="lg:col-span-8 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <Tooltip
                  formatter={(v, name) => [`₹${Number(v).toLocaleString("en-IN")}`, name === "Sales" ? "Sales Invoices" : "Purchases"]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="Sales" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Purchases" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Right Metrics Cards */}
          <div className="lg:col-span-4 flex flex-col justify-center gap-3">
            {/* Total Sales KPI */}
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-purple-50/30 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Total Invoiced Sales</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">
                  ₹
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
                ₹{totalSales.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-indigo-700 font-medium">
                <span>{invoices.length} total invoice{invoices.length === 1 ? "" : "s"} generated</span>
              </div>
            </div>

            {/* Total Receivable KPI */}
            <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Net Receivable (To Collect)</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                  ↓
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-emerald-900 tracking-tight">
                ₹{receivable.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                <span>From active customers with balances</span>
              </div>
            </div>

            {/* Total Purchases KPI */}
            <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-orange-50/30 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Total Purchase Expenses</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white text-xs">
                  🛒
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
                ₹{totalPurchases.toLocaleString("en-IN")}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                <span>{bills.length} purchase bill{bills.length === 1 ? "" : "s"} recorded</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Health Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Payable to Suppliers */}
        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Payable to Suppliers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold text-sm group-hover:scale-110 transition">
              ↑
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            ₹{payable.toLocaleString("en-IN")}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Bills to be settled</span>
            <Link href="/dashboard/payments/new?direction=out" className="font-semibold text-rose-600 hover:underline">
              Pay Bills →
            </Link>
          </div>
        </div>

        {/* Parties with Dues */}
        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Parties with Dues</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 font-bold text-sm group-hover:scale-110 transition">
              👥
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            {dues?.length ?? 0}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Active balances</span>
            <Link href="/dashboard/ledger" className="font-semibold text-violet-600 hover:underline">
              View All Ledgers →
            </Link>
          </div>
        </div>

        {/* Open Invoices */}
        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Unpaid Sales Invoices</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold text-sm group-hover:scale-110 transition">
              📄
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            {invoices.filter((i) => i.amountDue > 0).length}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Awaiting clearance</span>
            <Link href="/dashboard/sales" className="font-semibold text-amber-600 hover:underline">
              View Invoices →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Frequent Actions &amp; Shortcuts
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionTile
            href="/dashboard/sales/new"
            title="Create Sales Invoice"
            description="Generate GST tax invoice or quotation"
            icon="🧾"
            gradient="from-indigo-500 to-indigo-600"
          />
          <QuickActionTile
            href="/dashboard/purchases/new"
            title="Record Purchase Bill"
            description="Add supplier bills and claim input tax credit"
            icon="🛍️"
            gradient="from-amber-500 to-orange-500"
          />
          <QuickActionTile
            href="/dashboard/payments/new?direction=in"
            title="Receive Payment"
            description="Record customer receipt and allocate dues"
            icon="💳"
            gradient="from-emerald-500 to-teal-600"
          />
          <QuickActionTile
            href="/dashboard/payments/new?direction=out"
            title="Pay Supplier Voucher"
            description="Record vendor payout via bank/cash/UPI"
            icon="💸"
            gradient="from-rose-500 to-pink-600"
          />
          <QuickActionTile
            href="/dashboard/ledger"
            title="Party Ledger & Statement"
            description="View full Dr/Cr account statement & export PDF"
            icon="📖"
            gradient="from-purple-500 to-violet-600"
          />
          <QuickActionTile
            href="/dashboard/customers"
            title="Add Customer / Client"
            description="Save party contacts, GSTIN, and opening balances"
            icon="👤"
            gradient="from-sky-500 to-blue-600"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
}

function QuickActionTile({
  href,
  title,
  description,
  icon,
  gradient,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr ${gradient} text-xl text-white shadow-md group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
          {title}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{description}</p>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
