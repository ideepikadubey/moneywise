"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/suppliers",
    label: "Suppliers",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/products",
    label: "Products",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/sales",
    label: "Sales",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/sales/quotations",
    label: "Quotations",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/purchases",
    label: "Purchases",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/stock",
    label: "Stock",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 4h16M4 14h16" />
      </svg>
    ),
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/expenses",
    label: "Expenses",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/ledger",
    label: "Ledger",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, firms, activeFirmId, isLoading, logout, switchFirm } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-slate-50/70 p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/MoneyWise.png"
            alt="MoneyWise"
            width={180}
            height={120}
            priority
            className="h-20 w-auto object-contain drop-shadow-xs"
          />
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mt-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <span>Loading MoneyWise…</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">monitor your money wisely</p>
          <p className="text-[11px] text-slate-400 mt-3 font-medium">
            a product of <span className="font-semibold text-slate-600">The Dynamite Technologies</span>
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // No firm yet -> only allow the firm-setup page through
  if (firms.length === 0 && pathname !== "/dashboard/firm-setup") {
    router.replace("/dashboard/firm-setup");
    return null;
  }

  const activeFirm = firms.find((f) => f.firm._id === activeFirmId)?.firm;

  if (pathname === "/dashboard/firm-setup") {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/70">
      <aside className="no-print flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-md">
        {/* Brand Logo Header */}
        <Link
          href="/dashboard"
          className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-4 hover:bg-slate-50/60 transition group"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-200/80 shadow-xs">
            <Image
              src="/MoneyWise.png"
              alt="MoneyWise"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                MoneyWise
              </span>
              <span className="rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-1.5 py-0.2 text-[8px] font-bold text-indigo-700">
                PRO
              </span>
            </div>
            <span className="text-[9.5px] text-slate-400 font-medium truncate">
              monitor your money wisely
            </span>
          </div>
        </Link>

        {/* Firm Switcher Card */}
        {firms.length > 0 && (
          <div className="border-b border-slate-100 p-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Business</span>
                <Link
                  href="/dashboard/firm-setup"
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  title="Create and add another firm"
                >
                  + Add Firm
                </Link>
              </div>
              <select
                value={activeFirmId || ""}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    router.push("/dashboard/firm-setup");
                  } else {
                    switchFirm(e.target.value);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-none"
              >
                {firms.map((m) => (
                  <option key={m.firm._id} value={m.firm._id}>
                    {m.firm.name}
                  </option>
                ))}
                <option value="__new__">+ Add new business…</option>
              </select>
            </div>
          </div>
        )}

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                  active
                    ? "bg-gradient-to-r from-indigo-50 to-violet-50/40 text-indigo-700 shadow-xs border border-indigo-100/60"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <span className={`transition-colors ${active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="border-t border-slate-100 p-3 bg-slate-50/40">
          <div className="flex items-center justify-between rounded-xl bg-white p-2 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-xs font-bold text-white shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">Logged in</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
              title="Log out"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* The Dynamite Technologies footer */}
        <div className="border-t border-slate-100 px-3 py-2 bg-slate-50/50 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            a product of <span className="font-semibold text-slate-600">The Dynamite Technologies</span>
          </p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col h-screen min-w-0 overflow-hidden">
        {/* Modern Top Navigation Header */}
        <header className="no-print shrink-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">
          {/* Left: Active Firm & Context */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 shadow-xs">
              {activeFirm?.name ? activeFirm.name.charAt(0).toUpperCase() : "F"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">{activeFirm?.name || "My Business"}</h2>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                  Active
                </span>
                <Link
                  href="/dashboard/firm-setup"
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  title="Create and add another firm"
                >
                  + Add Firm
                </Link>
              </div>
              {activeFirm?.gstin && (
                <p className="text-[11px] font-mono text-slate-400">GSTIN: {activeFirm.gstin}</p>
              )}
            </div>
          </div>

          {/* Right: Quick Actions & Icon Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Create Button */}
            <Link
              href="/dashboard/sales/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              title="Create new sales invoice"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Invoice</span>
            </Link>

            {/* Notifications Icon */}
            <Link
              href="/dashboard/notifications"
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                pathname === "/dashboard/notifications"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Notifications &amp; Alerts"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {/* Unread badge dot */}
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600"></span>
              </span>
            </Link>

            {/* Reports Quick Icon */}
            <Link
              href="/dashboard/reports"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                pathname === "/dashboard/reports"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Reports &amp; GST Returns"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </Link>

            {/* Settings Icon */}
            <Link
              href="/dashboard/settings"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                pathname.startsWith("/dashboard/settings")
                  ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Firm Settings &amp; Branding"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />

            {/* User Profile Summary */}
            <div className="flex items-center gap-2 pl-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                <p className="text-[10px] font-medium text-slate-400 capitalize">
                  {firms.find((f) => f.firm._id === activeFirmId)?.role || "Owner"}
                </p>
              </div>
              <button
                onClick={logout}
                className="ml-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                title="Log out"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
          <div className="flex-1">{children}</div>
          <footer className="no-print mt-12 border-t border-slate-200/60 pt-4 pb-2 text-center text-xs text-slate-400">
            <p>
              MoneyWise &bull; monitor your money wisely &bull; a product of{" "}
              <span className="font-semibold text-slate-600">The Dynamite Technologies</span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
