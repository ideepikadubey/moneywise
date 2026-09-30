"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Product {
  _id: string;
  name: string;
  type?: "product" | "service";
  currentStock: number;
  lowStockThreshold?: number;
  unit: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer?: { name: string; phone?: string };
  amountDue: number;
  total: number;
  dueDate?: string;
  invoiceDate?: string;
  status: string;
}

type NotificationCategory = "all" | "urgent" | "gst" | "stock" | "payments";

export default function NotificationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Load dismissed notifications from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mw_dismissed_notifications");
      if (saved) {
        setDismissedIds(JSON.parse(saved));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, invRes] = await Promise.all([
        api.get<Product[]>("/products"),
        api.get<Invoice[]>("/sales?docType=invoice"),
      ]);
      setProducts(prodRes || []);
      setInvoices(invRes || []);
    } catch (err) {
      console.error("Failed to load notifications data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem("mw_dismissed_notifications", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleClearDismissed = () => {
    setDismissedIds([]);
    try {
      localStorage.removeItem("mw_dismissed_notifications");
    } catch {
      // ignore
    }
  };

  // Compute GST deadlines dynamically based on current date
  const gstAlerts = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    // GSTR-1 is due on 11th of every month (for previous month's sales)
    const gstr1Due = new Date(currentYear, currentMonth, 11);
    // GSTR-3B is due on 20th of every month
    const gstr3bDue = new Date(currentYear, currentMonth, 20);

    const getStatus = (dueDate: Date) => {
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          status: "overdue" as const,
          badge: "Filing Overdue",
          badgeColor: "bg-red-50 text-red-700 border-red-200",
          desc: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`,
          isUrgent: true,
        };
      } else if (diffDays === 0) {
        return {
          status: "due_today" as const,
          badge: "Due Today",
          badgeColor: "bg-red-50 text-red-700 border-red-200 animate-pulse",
          desc: "Filing deadline is today before midnight",
          isUrgent: true,
        };
      } else if (diffDays <= 4) {
        return {
          status: "due_soon" as const,
          badge: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
          badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
          desc: `Due on ${dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
          isUrgent: true,
        };
      } else {
        return {
          status: "upcoming" as const,
          badge: `Due in ${diffDays} days`,
          badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
          desc: `Upcoming on ${dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
          isUrgent: false,
        };
      }
    };

    const gstr1Info = getStatus(gstr1Due);
    const gstr3bInfo = getStatus(gstr3bDue);

    const prevMonthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    return [
      {
        id: `gst-gstr1-${currentYear}-${currentMonth}`,
        title: "GSTR-1 Monthly Return Filing",
        type: "gst",
        subtitle: `Details of Outward Supplies for ${prevMonthName}`,
        dueDate: gstr1Due,
        ...gstr1Info,
        actionLink: "/dashboard/reports",
        actionText: "View GSTR-1 Report",
      },
      {
        id: `gst-gstr3b-${currentYear}-${currentMonth}`,
        title: "GSTR-3B Summary Return & Tax Payment",
        type: "gst",
        subtitle: `Summary return of inward & outward supplies with tax liability for ${prevMonthName}`,
        dueDate: gstr3bDue,
        ...gstr3bInfo,
        actionLink: "/dashboard/reports",
        actionText: "View GSTR-3B Report",
      },
    ];
  }, []);

  // Compute Overdue and Upcoming Invoices
  const overdueInvoices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return invoices
      .filter((inv) => inv.amountDue > 0 && inv.status !== "cancelled" && inv.dueDate)
      .map((inv) => {
        const d = new Date(inv.dueDate!);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = diffDays > 0;
        const isDueSoon = diffDays >= -3 && diffDays <= 0;

        return {
          ...inv,
          diffDays,
          isOverdue,
          isDueSoon,
        };
      })
      .filter((inv) => inv.isOverdue || inv.isDueSoon)
      .sort((a, b) => b.diffDays - a.diffDays);
  }, [invoices]);

  // Compute Low stock and out of stock items (services do not carry inventory)
  const stockAlerts = useMemo(() => {
    return products
      .filter((p) => {
        if (p.type === "service") return false;
        const threshold = p.lowStockThreshold ?? 5;
        return p.currentStock <= threshold;
      })
      .map((p) => {
        const isOut = p.currentStock <= 0;
        return {
          ...p,
          isOut,
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock);
  }, [products]);

  // Combined notifications list
  const allNotifications = useMemo(() => {
    const list: Array<{
      id: string;
      category: "gst" | "payments" | "stock";
      isUrgent: boolean;
      title: string;
      description: string;
      meta?: string;
      badgeText: string;
      badgeColor: string;
      actionLink: string;
      actionText: string;
      icon: "gst" | "payment" | "stock";
    }> = [];

    // GST
    gstAlerts.forEach((g) => {
      list.push({
        id: g.id,
        category: "gst",
        isUrgent: g.isUrgent,
        title: g.title,
        description: `${g.subtitle} — ${g.desc}`,
        badgeText: g.badge,
        badgeColor: g.badgeColor,
        actionLink: g.actionLink,
        actionText: g.actionText,
        icon: "gst",
      });
    });

    // Invoices
    overdueInvoices.forEach((inv) => {
      const isOverdue = inv.diffDays > 0;
      list.push({
        id: `inv-${inv._id}`,
        category: "payments",
        isUrgent: true,
        title: `${isOverdue ? "Payment Overdue" : "Payment Due Soon"}: ${inv.invoiceNumber}`,
        description: `Customer: ${inv.customer?.name || "Cash Customer"} • Balance Due: ₹${inv.amountDue.toLocaleString("en-IN")}`,
        meta: isOverdue ? `Overdue by ${inv.diffDays} day${inv.diffDays === 1 ? "" : "s"}` : `Due in ${Math.abs(inv.diffDays)} days`,
        badgeText: isOverdue ? `₹${inv.amountDue.toLocaleString("en-IN")} Overdue` : "Due Soon",
        badgeColor: isOverdue ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200",
        actionLink: `/dashboard/sales/${inv._id}`,
        actionText: "View / Record Payment",
        icon: "payment",
      });
    });

    // Stock
    stockAlerts.forEach((p) => {
      list.push({
        id: `prod-${p._id}`,
        category: "stock",
        isUrgent: p.isOut,
        title: p.isOut ? `Out of Stock: ${p.name}` : `Low Stock Alert: ${p.name}`,
        description: p.isOut
          ? `Inventory has 0 ${p.unit} remaining. Immediate restocking recommended.`
          : `Only ${p.currentStock} ${p.unit} left (Threshold: ${p.lowStockThreshold ?? 5} ${p.unit}).`,
        badgeText: p.isOut ? "Out of Stock" : `${p.currentStock} ${p.unit} left`,
        badgeColor: p.isOut ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200",
        actionLink: "/dashboard/stock",
        actionText: "Restock / Adjust",
        icon: "stock",
      });
    });

    return list;
  }, [gstAlerts, overdueInvoices, stockAlerts]);

  // Filter based on active tab and dismissed state
  const visibleNotifications = useMemo(() => {
    return allNotifications.filter((n) => {
      if (dismissedIds.includes(n.id)) return false;
      if (activeTab === "all") return true;
      if (activeTab === "urgent") return n.isUrgent;
      if (activeTab === "gst") return n.category === "gst";
      if (activeTab === "payments") return n.category === "payments";
      if (activeTab === "stock") return n.category === "stock";
      return true;
    });
  }, [allNotifications, activeTab, dismissedIds]);

  const totalOverdueAmount = useMemo(() => {
    return overdueInvoices
      .filter((i) => i.diffDays > 0)
      .reduce((sum, i) => sum + i.amountDue, 0);
  }, [overdueInvoices]);

  const urgentCount = allNotifications.filter((n) => n.isUrgent && !dismissedIds.includes(n.id)).length;
  const activeCount = allNotifications.filter((n) => !dismissedIds.includes(n.id)).length;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">Notifications &amp; Compliance Hub</h1>
            {activeCount > 0 && (
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {activeCount} Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time compliance deadlines, inventory warnings, overdue invoices, and business alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dismissedIds.length > 0 && (
            <button
              onClick={handleClearDismissed}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white shadow-xs"
            >
              Restore Dismissed ({dismissedIds.length})
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <svg
              className={`h-3.5 w-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Next GST Deadline */}
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-violet-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-bold uppercase tracking-wider">Next GST Deadline</span>
            <span className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-base font-bold text-slate-900">{gstAlerts[0]?.title.split(" ")[0] || "GSTR-1"}</p>
          <p className="mt-0.5 text-xs font-semibold text-indigo-600">{gstAlerts[0]?.badge || "Upcoming"}</p>
        </div>

        {/* Overdue Invoices */}
        <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50/70 to-rose-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue Invoices</span>
            <span className="rounded-lg bg-red-100 p-1.5 text-red-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-base font-bold text-slate-900">
            {overdueInvoices.length} {overdueInvoices.length === 1 ? "Invoice" : "Invoices"}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-red-600">
            ₹{totalOverdueAmount.toLocaleString("en-IN")} pending
          </p>
        </div>

        {/* Stock Alerts */}
        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-yellow-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Inventory Alerts</span>
            <span className="rounded-lg bg-amber-100 p-1.5 text-amber-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-base font-bold text-slate-900">
            {stockAlerts.length} {stockAlerts.length === 1 ? "Item" : "Items"}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-amber-600">
            {stockAlerts.filter((s) => s.isOut).length} out of stock
          </p>
        </div>

        {/* System & Health */}
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">High Priority</span>
            <span className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-base font-bold text-slate-900">
            {urgentCount} Urgent
          </p>
          <p className="mt-0.5 text-xs font-semibold text-emerald-600">
            {urgentCount === 0 ? "Everything healthy" : "Requires attention"}
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "all"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>All Notifications</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("urgent")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "urgent"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>⚡ High Priority</span>
          {urgentCount > 0 && (
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "urgent" ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}>
              {urgentCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("gst")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "gst"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>🏛️ GST Compliance</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "gst" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
            {gstAlerts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "payments"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>💰 Invoices &amp; Payments</span>
          {overdueInvoices.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "payments" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {overdueInvoices.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("stock")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeTab === "stock"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>📦 Inventory Alerts</span>
          {stockAlerts.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "stock" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {stockAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-slate-500">Checking business alerts &amp; filings…</p>
        </div>
      ) : visibleNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 py-16 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50 mb-3">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900">You&apos;re completely up to date!</h3>
          <p className="max-w-md text-xs text-slate-500 mt-1">
            No active compliance filings pending, low stock items, or overdue invoices in this view.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNotifications.map((notif) => (
            <div
              key={notif.id}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                {/* Category Icon */}
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    notif.icon === "gst"
                      ? "border-indigo-100 bg-indigo-50 text-indigo-600"
                      : notif.icon === "payment"
                      ? "border-red-100 bg-red-50 text-red-600"
                      : "border-amber-100 bg-amber-50 text-amber-600"
                  }`}
                >
                  {notif.icon === "gst" && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                  {notif.icon === "payment" && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {notif.icon === "stock" && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">{notif.title}</h4>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${notif.badgeColor}`}
                    >
                      {notif.badgeText}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{notif.description}</p>
                  {notif.meta && (
                    <p className="mt-0.5 text-[11px] font-medium text-slate-400">{notif.meta}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Link
                  href={notif.actionLink}
                  className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-2xs"
                >
                  {notif.actionText} &rarr;
                </Link>

                <button
                  onClick={() => handleDismiss(notif.id)}
                  title="Dismiss notification"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
