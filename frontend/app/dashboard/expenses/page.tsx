"use client";

import { useEffect, useState, FormEvent, useMemo } from "react";
import { api } from "@/lib/api";

interface Expense {
  _id: string;
  expenseNumber: string;
  date: string;
  category: string;
  amount: number;
  paymentMode: "cash" | "bank" | "upi" | "card" | "net_banking";
  paidTo?: string;
  referenceNumber?: string;
  notes?: string;
  isRecurring?: boolean;
  frequency?: "one_time" | "daily" | "weekly" | "monthly";
}

interface ExpenseSummary {
  todayTotal: number;
  monthTotal: number;
  totalCount: number;
}

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities (Electricity, Water, Net)",
  "Staff Salaries & Wages",
  "Tea, Snacks & Refreshments",
  "Transport & Fuel",
  "Office Supplies & Stationery",
  "Repair & Maintenance",
  "Marketing & Advertising",
  "Taxes & License Fees",
  "Other / Miscellaneous",
];

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank Transfer" },
  { value: "upi", label: "UPI (GPay / PhonePe / Paytm)" },
  { value: "card", label: "Credit / Debit Card" },
  { value: "net_banking", label: "Net Banking" },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({ todayTotal: 0, monthTotal: 0, totalCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("Tea, Snacks & Refreshments");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<Expense["paymentMode"]>("cash");
  const [paidTo, setPaidTo] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");

  function loadExpenses() {
    setIsLoading(true);
    api
      .get<{ expenses: Expense[]; recurringTemplates: Expense[]; summary: ExpenseSummary }>("/expenses")
      .then((data) => {
        setExpenses(data.expenses || []);
        setRecurringTemplates(data.recurringTemplates || []);
        setSummary(data.summary || { todayTotal: 0, monthTotal: 0, totalCount: 0 });
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadExpenses, []);

  function resetForm() {
    setDate(new Date().toISOString().slice(0, 10));
    setCategory("Tea, Snacks & Refreshments");
    setCustomCategory("");
    setAmount("");
    setPaymentMode("cash");
    setPaidTo("");
    setNotes("");
    setIsRecurring(false);
    setFrequency("daily");
    setShowModal(false);
    setError(null);
  }

  async function handleQuickPost(tmpl: Expense) {
    setError(null);
    try {
      await api.post("/expenses", {
        date: new Date().toISOString().slice(0, 10),
        category: tmpl.category,
        amount: tmpl.amount,
        paymentMode: tmpl.paymentMode,
        paidTo: tmpl.paidTo,
        notes: tmpl.notes ? `${tmpl.notes} (Quick Daily Log)` : "Quick Daily Log",
      });
      setSuccessMessage(`⚡ Recorded today's ${tmpl.category} (₹${tmpl.amount}) with 1 click!`);
      loadExpenses();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Could not post recurring expense");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const finalCategory = category === "Other / Miscellaneous" && customCategory ? customCategory : category;
      await api.post("/expenses", {
        date,
        category: finalCategory,
        amount: Number(amount) || 0,
        paymentMode,
        paidTo: paidTo || undefined,
        notes: notes || undefined,
        isRecurring,
        frequency: isRecurring ? frequency : "one_time",
      });

      setSuccessMessage("Expense recorded successfully!");
      resetForm();
      loadExpenses();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Could not record expense");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string, expNum: string) {
    if (!confirm(`Are you sure you want to delete expense entry "${expNum}"?`)) return;
    try {
      await api.delete(`/expenses/${id}`);
      setSuccessMessage(`Expense "${expNum}" deleted.`);
      loadExpenses();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Could not delete expense");
    }
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const catMatch = e.category.toLowerCase().includes(query);
        const paidMatch = e.paidTo?.toLowerCase().includes(query);
        const noteMatch = e.notes?.toLowerCase().includes(query);
        const numMatch = e.expenseNumber.toLowerCase().includes(query);
        return catMatch || paidMatch || noteMatch || numMatch;
      }
      return true;
    });
  }, [expenses, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Daily Firm Expenses</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track day-to-day business operational expenses, bills, and petty cash</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-xs transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Expense
        </button>
      </div>

      {/* Alert Banner */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          ✓ {successMessage}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          ⚠ {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today&apos;s Expenses</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">₹{summary.todayTotal.toLocaleString("en-IN")}</div>
          <p className="mt-1 text-xs text-slate-400">Total spent today</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">This Month&apos;s Total</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">₹{summary.monthTotal.toLocaleString("en-IN")}</div>
          <p className="mt-1 text-xs text-slate-400">Month-to-date business expenses</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Entries</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{summary.totalCount}</div>
          <p className="mt-1 text-xs text-slate-400">Recorded expense entries</p>
        </div>
      </div>

      {/* Quick Daily Expense Presets Bar */}
      {recurringTemplates.length > 0 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              ⚡ Quick 1-Click Daily Expense Log
            </span>
            <span className="text-[11px] font-medium text-indigo-600">Saved Recurring Expenses</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {recurringTemplates.map((tmpl) => (
              <button
                key={tmpl._id}
                type="button"
                onClick={() => handleQuickPost(tmpl)}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-950 shadow-xs hover:border-indigo-400 hover:bg-indigo-600 hover:text-white transition group"
              >
                <span>+ ₹{tmpl.amount} {tmpl.category}</span>
                {tmpl.paidTo && <span className="opacity-60 text-[11px]">({tmpl.paidTo})</span>}
                <span className="rounded bg-indigo-100 px-1 py-0.2 text-[10px] text-indigo-800 group-hover:bg-white/20 group-hover:text-white uppercase font-mono">
                  {tmpl.frequency || "daily"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search category, paid to, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <svg className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 font-medium">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expense History Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Expense #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Paid To / Recipient</th>
              <th className="px-4 py-3">Payment Mode</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Loading expenses…
                </td>
              </tr>
            )}
            {!isLoading && filteredExpenses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No expense records found. Click &quot;Record Expense&quot; above to add daily firm expenses.
                </td>
              </tr>
            )}
            {filteredExpenses.map((exp) => (
              <tr key={exp._id} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-3 font-semibold text-slate-800">{exp.expenseNumber}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(exp.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 font-medium text-indigo-700">
                  <span className="inline-flex rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs">
                    {exp.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <div>{exp.paidTo || "—"}</div>
                  {exp.notes && <p className="text-xs text-slate-400 line-clamp-1">{exp.notes}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs uppercase font-medium text-slate-600">
                    {exp.paymentMode.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">
                  ₹{exp.amount.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(exp._id, exp.expenseNumber)}
                    className="text-xs font-medium text-slate-400 hover:text-red-600 transition"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Record Daily Firm Expense</h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {category === "Other / Miscellaneous" && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom category name"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-indigo-300 bg-indigo-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    {PAYMENT_MODES.map((pm) => (
                      <option key={pm.value} value={pm.value}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Paid To / Recipient</label>
                  <input
                    type="text"
                    placeholder="e.g. Landlord / Staff / Vendor"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Recurring / Repeating Expense Option */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-indigo-900 select-none">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Save as a Recurring Expense Preset (Fast 1-Click Posting)</span>
                </label>

                {isRecurring && (
                  <div className="pt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-indigo-700 font-medium">Repeat Frequency:</span>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as any)}
                      className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-950 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="daily">Daily (Every Day)</option>
                      <option value="weekly">Weekly (Every Week)</option>
                      <option value="monthly">Monthly (Every Month)</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or receipt reference"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSubmitting ? "Saving…" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
