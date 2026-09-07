"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface Party {
  _id: string;
  name: string;
  type: "customer" | "supplier" | "both";
  category: "business" | "individual";
  companyName?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  billingAddress?: string;
  currentBalance: number;
}

interface LedgerEntry {
  date: string;
  type: "sales_invoice" | "sales_return" | "purchase_bill" | "purchase_return" | "payment_in" | "payment_out";
  docType: string;
  docId: string;
  voucherNumber: string;
  description: string;
  paymentMode?: string;
  referenceNumber?: string;
  notes?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: "Dr" | "Cr";
}

interface LedgerData {
  party: Party;
  period: {
    from: string | null;
    to: string | null;
  };
  openingBalance: number;
  openingBalanceType: "Dr" | "Cr";
  entries: LedgerEntry[];
  summary: {
    openingBalance: number;
    openingBalanceType: "Dr" | "Cr";
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    closingBalanceType: "Dr" | "Cr";
  };
}

type DatePreset = "all" | "today" | "this_month" | "this_quarter" | "this_fy" | "custom";

function LedgerContent() {
  const searchParams = useSearchParams();
  const initialPartyId = searchParams.get("partyId") || "";

  const { firms, activeFirmId } = useAuth();
  const activeFirm = firms.find((f) => f.firm._id === activeFirmId)?.firm;

  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId);
  const [partyTypeFilter, setPartyTypeFilter] = useState<"all" | "customer" | "supplier">("all");
  const [partySearch, setPartySearch] = useState<string>("");

  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [isLoadingParties, setIsLoadingParties] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all parties
  useEffect(() => {
    setIsLoadingParties(true);
    api
      .get<Party[]>("/parties")
      .then((data) => {
        setParties(data);
        if (!selectedPartyId && data.length > 0) {
          // If no initial party was specified in URL, pick the first party
          setSelectedPartyId(data[0]._id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoadingParties(false));
  }, []);

  // Update selectedPartyId if URL param changes
  useEffect(() => {
    if (initialPartyId) {
      setSelectedPartyId(initialPartyId);
    }
  }, [initialPartyId]);

  // Handle Preset changes
  function handlePresetChange(preset: DatePreset) {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");

    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "today") {
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "this_month") {
      const first = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const last = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDate)}`;
      setFromDate(first);
      setToDate(last);
    } else if (preset === "this_quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const first = `${now.getFullYear()}-${pad(qMonth + 1)}-01`;
      const lastDate = new Date(now.getFullYear(), qMonth + 3, 0).getDate();
      const last = `${now.getFullYear()}-${pad(qMonth + 3)}-${pad(lastDate)}`;
      setFromDate(first);
      setToDate(last);
    } else if (preset === "this_fy") {
      // Indian Financial Year: Apr 1 - Mar 31
      const currentYear = now.getFullYear();
      const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
      const first = `${fyStartYear}-04-01`;
      const last = `${fyStartYear + 1}-03-31`;
      setFromDate(first);
      setToDate(last);
    }
  }

  // Load ledger data when selected party or date range changes
  useEffect(() => {
    if (!selectedPartyId) {
      setLedgerData(null);
      return;
    }

    setIsLoadingLedger(true);
    setError(null);

    const queryParams = new URLSearchParams();
    if (fromDate) queryParams.set("from", fromDate);
    if (toDate) queryParams.set("to", toDate);

    const url = `/reports/ledger/${selectedPartyId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    api
      .get<LedgerData>(url)
      .then((data) => {
        setLedgerData(data);
      })
      .catch((err) => {
        setError(err.message || "Failed to load ledger data");
        setLedgerData(null);
      })
      .finally(() => setIsLoadingLedger(false));
  }, [selectedPartyId, fromDate, toDate]);

  // Filter parties for selector
  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (partyTypeFilter === "customer" && p.type === "supplier") return false;
      if (partyTypeFilter === "supplier" && p.type === "customer") return false;
      if (partySearch.trim()) {
        const query = partySearch.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(query);
        const gstinMatch = p.gstin?.toLowerCase().includes(query);
        const phoneMatch = p.phone?.includes(query) || p.mobile?.includes(query);
        return nameMatch || gstinMatch || phoneMatch;
      }
      return true;
    });
  }, [parties, partyTypeFilter, partySearch]);

  const activeParty = useMemo(() => {
    return parties.find((p) => p._id === selectedPartyId) || ledgerData?.party;
  }, [parties, selectedPartyId, ledgerData]);

  // Export CSV
  function exportCSV() {
    if (!ledgerData) return;

    const rows: string[][] = [
      ["STATEMENT OF ACCOUNT / PARTY LEDGER"],
      ["Firm Name", activeFirm?.name || ""],
      ["Firm GSTIN", activeFirm?.gstin || ""],
      ["Party Name", ledgerData.party.name],
      ["Party GSTIN", ledgerData.party.gstin || ""],
      ["Party Phone", ledgerData.party.phone || ledgerData.party.mobile || ""],
      [
        "Period",
        `${ledgerData.period.from || "Beginning"} to ${
          ledgerData.period.to || new Date().toISOString().slice(0, 10)
        }`,
      ],
      [],
      ["Date", "Voucher #", "Type", "Particulars / Notes", "Payment Mode", "Debit (₹)", "Credit (₹)", "Balance (₹)", "Dr/Cr"],
      [
        ledgerData.period.from || "—",
        "—",
        "Opening Balance",
        "Opening Balance B/F",
        "—",
        ledgerData.openingBalanceType === "Dr" ? ledgerData.openingBalance.toFixed(2) : "0.00",
        ledgerData.openingBalanceType === "Cr" ? ledgerData.openingBalance.toFixed(2) : "0.00",
        ledgerData.openingBalance.toFixed(2),
        ledgerData.openingBalanceType,
      ],
    ];

    ledgerData.entries.forEach((e) => {
      rows.push([
        new Date(e.date).toLocaleDateString("en-IN"),
        `"${e.voucherNumber}"`,
        e.type,
        `"${e.description}${e.notes ? ` - ${e.notes}` : ""}"`,
        e.paymentMode || "—",
        e.debit > 0 ? e.debit.toFixed(2) : "0.00",
        e.credit > 0 ? e.credit.toFixed(2) : "0.00",
        e.runningBalance.toFixed(2),
        e.balanceType,
      ]);
    });

    rows.push([]);
    rows.push([
      "Total",
      "",
      "",
      "",
      "",
      ledgerData.summary.totalDebit.toFixed(2),
      ledgerData.summary.totalCredit.toFixed(2),
      `${ledgerData.summary.closingBalance.toFixed(2)} ${ledgerData.summary.closingBalanceType}`,
      "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const sanitizedPartyName = ledgerData.party.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    link.setAttribute(
      "download",
      `ledger_${sanitizedPartyName}_${fromDate || "all"}_to_${toDate || "now"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Party Ledger &amp; Account Statement</h1>
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              Live Book
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete debit/credit transaction history, invoices, payments, and running balance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeParty && (
            <>
              {activeParty.type !== "supplier" && (
                <Link
                  href={`/dashboard/sales/new?customerId=${activeParty._id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
                >
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Invoice</span>
                </Link>
              )}
              {activeParty.type !== "customer" && (
                <Link
                  href={`/dashboard/purchases/new?supplierId=${activeParty._id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
                >
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Bill</span>
                </Link>
              )}
              <Link
                href={`/dashboard/payments/new?partyId=${activeParty._id}&direction=${
                  activeParty.type === "supplier" ? "out" : "in"
                }`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Record Payment
              </Link>
            </>
          )}

          <button
            onClick={exportCSV}
            disabled={!ledgerData || ledgerData.entries.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs"
            title="Download CSV Spreadsheet"
          >
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            disabled={!ledgerData}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-xs transition"
            title="Print or Save as PDF"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Statement
          </button>
        </div>
      </div>

      {/* Control Bar: Party Selection & Date Filtering */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Party Selection Section */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Customer / Supplier
              </label>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setPartyTypeFilter("all")}
                  className={`rounded-md px-2 py-0.5 transition ${
                    partyTypeFilter === "all" ? "bg-white text-indigo-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setPartyTypeFilter("customer")}
                  className={`rounded-md px-2 py-0.5 transition ${
                    partyTypeFilter === "customer" ? "bg-white text-indigo-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Customers
                </button>
                <button
                  type="button"
                  onClick={() => setPartyTypeFilter("supplier")}
                  className={`rounded-md px-2 py-0.5 transition ${
                    partyTypeFilter === "supplier" ? "bg-white text-indigo-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Suppliers
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Search party by name or GSTIN…"
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                {filteredParties.length === 0 ? (
                  <option value="">No matching parties found</option>
                ) : (
                  filteredParties.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.type === "both" ? "Customer/Supplier" : p.type}) - ₹{Math.abs(p.currentBalance).toLocaleString("en-IN")} {p.currentBalance >= 0 ? "Dr" : "Cr"}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Date Presets and Filters */}
          <div className="lg:col-span-6 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Statement Period
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "this_month", label: "This Month" },
                  { id: "this_quarter", label: "This Quarter" },
                  { id: "this_fy", label: "This FY" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetChange(preset.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    datePreset === preset.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {datePreset === "custom" && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="no-print rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Printable Statement Letterhead (Visible in Print & on Screen) */}
      {ledgerData && (
        <div className="print-only border-b-2 border-slate-800 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
                {activeFirm?.name || "Business Firm"}
              </h1>
              {activeFirm?.gstin && (
                <p className="text-xs font-mono text-slate-600 mt-1">GSTIN: {activeFirm.gstin}</p>
              )}
              {activeFirm?.email && <p className="text-xs text-slate-600">Email: {activeFirm.email}</p>}
              {activeFirm?.phone && <p className="text-xs text-slate-600">Phone: {activeFirm.phone}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-indigo-700 uppercase tracking-wide">
                Statement of Account
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Statement Period:{" "}
                <span className="font-semibold text-slate-800">
                  {fromDate ? new Date(fromDate).toLocaleDateString("en-IN") : "Inception"} —{" "}
                  {toDate ? new Date(toDate).toLocaleDateString("en-IN") : "Present"}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Generated: {new Date().toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Party Details in Print View */}
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-1">
                Account Details For:
              </span>
              <h3 className="text-sm font-bold text-slate-900">{ledgerData.party.name}</h3>
              {ledgerData.party.companyName && (
                <p className="text-slate-600 font-medium">{ledgerData.party.companyName}</p>
              )}
              {ledgerData.party.gstin && (
                <p className="font-mono text-slate-600 mt-0.5">GSTIN: {ledgerData.party.gstin}</p>
              )}
              {ledgerData.party.phone && <p className="text-slate-600">Phone: {ledgerData.party.phone}</p>}
              {ledgerData.party.billingAddress && (
                <p className="text-slate-600 mt-0.5">{ledgerData.party.billingAddress}</p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-1">
                  Statement Summary
                </span>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Opening Balance:</span>
                  <span className="font-semibold">
                    ₹{ledgerData.summary.openingBalance.toLocaleString("en-IN")} {ledgerData.summary.openingBalanceType}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Total Debits:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{ledgerData.summary.totalDebit.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Total Credits:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{ledgerData.summary.totalCredit.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-300 pt-1.5 mt-1 flex justify-between font-bold text-sm">
                <span>Closing Balance:</span>
                <span className={ledgerData.summary.closingBalanceType === "Dr" ? "text-amber-700" : "text-emerald-700"}>
                  ₹{ledgerData.summary.closingBalance.toLocaleString("en-IN")} {ledgerData.summary.closingBalanceType}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen Mode: Party Profile Card & Summary Metrics */}
      {ledgerData && (
        <div className="no-print space-y-4">
          {/* Party Header Banner */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700 text-lg">
                  {ledgerData.party.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{ledgerData.party.name}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                      {ledgerData.party.type}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 capitalize">
                      {ledgerData.party.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    {ledgerData.party.gstin && (
                      <span className="font-mono">GSTIN: {ledgerData.party.gstin}</span>
                    )}
                    {(ledgerData.party.phone || ledgerData.party.mobile) && (
                      <span>Phone: {ledgerData.party.phone || ledgerData.party.mobile}</span>
                    )}
                    {ledgerData.party.email && <span>Email: {ledgerData.party.email}</span>}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <span className="text-xs text-slate-500">Current Net Position</span>
                <span
                  className={`text-sm font-bold ${
                    ledgerData.summary.closingBalanceType === "Dr"
                      ? "text-amber-600"
                      : ledgerData.summary.closingBalance === 0
                      ? "text-slate-600"
                      : "text-blue-600"
                  }`}
                >
                  ₹{ledgerData.summary.closingBalance.toLocaleString("en-IN")}{" "}
                  {ledgerData.summary.closingBalanceType === "Dr" ? "(Receivable)" : "(Payable)"}
                </span>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opening Balance Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Opening Balance
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    ledgerData.summary.openingBalanceType === "Dr"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {ledgerData.summary.openingBalanceType}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-900">
                  ₹{ledgerData.summary.openingBalance.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Balance as of {fromDate ? new Date(fromDate).toLocaleDateString("en-IN") : "beginning"}
              </p>
            </div>

            {/* Total Debit Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Debits (Dr)
                </span>
                <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                  Sales / Outflows
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-900">
                  ₹{ledgerData.summary.totalDebit.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Invoices &amp; Payments to party
              </p>
            </div>

            {/* Total Credit Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Credits (Cr)
                </span>
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  Payments / Bills
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-900">
                  ₹{ledgerData.summary.totalCredit.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Payments received &amp; Purchase bills
              </p>
            </div>

            {/* Closing Balance Card */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Closing Balance
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    ledgerData.summary.closingBalanceType === "Dr"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {ledgerData.summary.closingBalanceType}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-indigo-950">
                  ₹{ledgerData.summary.closingBalance.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-indigo-700">
                {ledgerData.summary.closingBalanceType === "Dr"
                  ? "Party owes you (Receivable)"
                  : "You owe party (Payable)"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="no-print border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Transaction Entries ({ledgerData?.entries.length || 0})
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Chronological Order (Earliest to Latest)
          </span>
        </div>

        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Voucher #</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Particulars &amp; Notes</th>
              <th className="px-4 py-3 text-right">Debit (₹)</th>
              <th className="px-4 py-3 text-right">Credit (₹)</th>
              <th className="px-4 py-3 text-right">Running Balance (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingLedger && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <svg className="h-6 w-6 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Calculating ledger transactions…</span>
                  </div>
                </td>
              </tr>
            )}

            {!isLoadingLedger && (!ledgerData || !selectedPartyId) && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  Select a party above to view their statement of account.
                </td>
              </tr>
            )}

            {!isLoadingLedger && ledgerData && (
              <>
                {/* Opening Balance Row */}
                <tr className="bg-slate-50/70 font-semibold text-slate-700">
                  <td className="px-4 py-3 text-slate-500">
                    {fromDate ? new Date(fromDate).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono">—</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      OPENING
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    Opening Balance Brought Forward
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {ledgerData.openingBalanceType === "Dr" && ledgerData.openingBalance > 0
                      ? `₹${ledgerData.openingBalance.toLocaleString("en-IN")}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {ledgerData.openingBalanceType === "Cr" && ledgerData.openingBalance > 0
                      ? `₹${ledgerData.openingBalance.toLocaleString("en-IN")}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    ₹{ledgerData.openingBalance.toLocaleString("en-IN")}{" "}
                    <span className="text-[10px] text-slate-500">{ledgerData.openingBalanceType}</span>
                  </td>
                </tr>

                {/* No Entries in range message */}
                {ledgerData.entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No transactions recorded for this party in the selected date range.
                    </td>
                  </tr>
                )}

                {/* Dynamic Ledger Rows */}
                {ledgerData.entries.map((entry, index) => {
                  let badgeColor = "bg-slate-100 text-slate-700";
                  let typeLabel: string = entry.type;

                  if (entry.type === "sales_invoice") {
                    badgeColor = "bg-indigo-50 text-indigo-700 border border-indigo-200";
                    typeLabel = "Sales Invoice";
                  } else if (entry.type === "purchase_bill") {
                    badgeColor = "bg-amber-50 text-amber-700 border border-amber-200";
                    typeLabel = "Purchase Bill";
                  } else if (entry.type === "payment_in") {
                    badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                    typeLabel = "Payment Received";
                  } else if (entry.type === "payment_out") {
                    badgeColor = "bg-sky-50 text-sky-700 border border-sky-200";
                    typeLabel = "Payment Made";
                  } else if (entry.type === "sales_return") {
                    badgeColor = "bg-purple-50 text-purple-700 border border-purple-200";
                    typeLabel = "Sales Return";
                  } else if (entry.type === "purchase_return") {
                    badgeColor = "bg-rose-50 text-rose-700 border border-rose-200";
                    typeLabel = "Purchase Return";
                  }

                  let voucherLink = "#";
                  if (entry.type === "sales_invoice" || entry.type === "sales_return") {
                    voucherLink = `/dashboard/sales/${entry.docId}`;
                  } else if (entry.type === "purchase_bill" || entry.type === "purchase_return") {
                    voucherLink = `/dashboard/purchases/${entry.docId}`;
                  } else if (entry.type === "payment_in" || entry.type === "payment_out") {
                    voucherLink = `/dashboard/payments`;
                  }

                  return (
                    <tr key={`${entry.docId}-${index}`} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {new Date(entry.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-medium">
                        <Link
                          href={voucherLink}
                          className="text-indigo-600 hover:text-indigo-900 hover:underline"
                          title="View transaction details"
                        >
                          {entry.voucherNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium">{entry.description}</div>
                        {entry.paymentMode && (
                          <span className="text-[11px] text-slate-400">Mode: {entry.paymentMode}</span>
                        )}
                        {entry.referenceNumber && (
                          <span className="text-[11px] text-slate-400 ml-2">Ref: {entry.referenceNumber}</span>
                        )}
                        {entry.notes && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">{entry.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-800">
                        {entry.debit > 0 ? `₹${entry.debit.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-800">
                        {entry.credit > 0 ? `₹${entry.credit.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">
                        <span
                          className={
                            entry.balanceType === "Dr" ? "text-amber-600 font-bold" : "text-blue-600 font-bold"
                          }
                        >
                          ₹{entry.runningBalance.toLocaleString("en-IN")}{" "}
                          <span className="text-[10px]">{entry.balanceType}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Total / Closing Row */}
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                  <td colSpan={4} className="px-4 py-3 text-right uppercase text-xs tracking-wider">
                    Total Transactions &amp; Closing Balance:
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    ₹{ledgerData.summary.totalDebit.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    ₹{ledgerData.summary.totalCredit.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-base text-indigo-950 font-extrabold">
                    ₹{ledgerData.summary.closingBalance.toLocaleString("en-IN")}{" "}
                    <span className="text-xs">{ledgerData.summary.closingBalanceType}</span>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {/* Print Signatory Footer */}
        {ledgerData && (
          <div className="print-only pt-16 px-6 pb-6 text-xs">
            <div className="flex justify-between items-end">
              <div className="text-slate-500">
                <p>Terms: All balances subject to reconciliation.</p>
                <p>This is a computer generated account statement.</p>
              </div>
              <div className="text-center w-52 border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-800">{activeFirm?.name || "Authorized Signatory"}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Authorized Signatory</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LedgerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading ledger…</div>}>
      <LedgerContent />
    </Suspense>
  );
}
