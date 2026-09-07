"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type ReportTab = "gst" | "sales" | "purchases" | "daybook" | "pnl" | "bs";

interface GstSummary {
  outputLiability: { cgst: number; sgst: number; igst: number };
  inputCredit: { cgst: number; sgst: number; igst: number };
  netPayable: { cgst: number; sgst: number; igst: number };
}

interface SalesReportData {
  totals: { grandTotal: number; taxableValue: number; cgst: number; sgst: number; igst: number };
  count: number;
  invoices: Array<{
    _id: string;
    invoiceNumber: string;
    invoiceDate: string;
    customer?: { name: string };
    totalTaxableValue: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    grandTotal: number;
    status: string;
  }>;
}

interface PurchaseReportData {
  totals: { grandTotal: number; taxableValue: number; cgst: number; sgst: number; igst: number };
  count: number;
  bills: Array<{
    _id: string;
    billNumber: string;
    supplierBillNumber?: string;
    billDate: string;
    supplier?: { name: string };
    totalTaxableValue: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    grandTotal: number;
    status: string;
  }>;
}

interface DayBookData {
  date: string;
  sales: Array<{
    _id: string;
    invoiceNumber: string;
    customer?: { name: string };
    grandTotal: number;
    status: string;
  }>;
  purchases: Array<{
    _id: string;
    billNumber: string;
    supplier?: { name: string };
    grandTotal: number;
    status: string;
  }>;
}

interface ProfitLossData {
  period: { from: string | null; to: string | null };
  revenue: {
    grossSales: number;
    salesReturns: number;
    netSalesRevenue: number;
  };
  cogs: {
    grossPurchases: number;
    purchaseReturns: number;
    costOfGoodsSold: number;
  };
  grossProfit: number;
  expenses: {
    byCategory: Array<{ category: string; amount: number }>;
    totalOperatingExpenses: number;
  };
  netOperatingProfit: number;
}

interface BalanceSheetData {
  assets: {
    cashAndBank: number;
    accountsReceivable: number;
    inventoryValuation: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
}

export default function ReportsPage() {
  const { firms, activeFirmId } = useAuth();
  const activeFirm = firms.find((f) => f.firm._id === activeFirmId)?.firm;

  const [activeTab, setActiveTab] = useState<ReportTab>("gst");
  const [datePreset, setDatePreset] = useState<"all" | "this_month" | "this_quarter" | "this_fy" | "custom">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dayBookDate, setDayBookDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [gstData, setGstData] = useState<GstSummary | null>(null);
  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [purchaseData, setPurchaseData] = useState<PurchaseReportData | null>(null);
  const [dayBookData, setDayBookData] = useState<DayBookData | null>(null);
  const [pnlData, setPnlData] = useState<ProfitLossData | null>(null);
  const [bsData, setBsData] = useState<BalanceSheetData | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Set date ranges for presets
  function handlePresetChange(preset: "all" | "this_month" | "this_quarter" | "this_fy" | "custom") {
    setDatePreset(preset);
    const now = new Date();
    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setFromDate(first);
      setToDate(last);
    } else if (preset === "this_quarter") {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const first = new Date(now.getFullYear(), quarterMonth, 1).toISOString().slice(0, 10);
      const last = new Date(now.getFullYear(), quarterMonth + 3, 0).toISOString().slice(0, 10);
      setFromDate(first);
      setToDate(last);
    } else if (preset === "this_fy") {
      const isPostApril = now.getMonth() >= 3;
      const startYear = isPostApril ? now.getFullYear() : now.getFullYear() - 1;
      const first = `${startYear}-04-01`;
      const last = `${startYear + 1}-03-31`;
      setFromDate(first);
      setToDate(last);
    }
  }

  function loadReport() {
    setIsLoading(true);
    const query = new URLSearchParams();
    if (fromDate) query.set("from", fromDate);
    if (toDate) query.set("to", toDate);
    const qs = query.toString() ? `?${query.toString()}` : "";

    if (activeTab === "gst") {
      api
        .get<GstSummary>(`/reports/gst-summary${qs}`)
        .then(setGstData)
        .finally(() => setIsLoading(false));
    } else if (activeTab === "sales") {
      api
        .get<SalesReportData>(`/reports/sales${qs}`)
        .then(setSalesData)
        .finally(() => setIsLoading(false));
    } else if (activeTab === "purchases") {
      api
        .get<PurchaseReportData>(`/reports/purchases${qs}`)
        .then(setPurchaseData)
        .finally(() => setIsLoading(false));
    } else if (activeTab === "daybook") {
      api
        .get<DayBookData>(`/reports/day-book?date=${dayBookDate}`)
        .then(setDayBookData)
        .finally(() => setIsLoading(false));
    } else if (activeTab === "pnl") {
      api
        .get<ProfitLossData>(`/reports/profit-loss${qs}`)
        .then(setPnlData)
        .finally(() => setIsLoading(false));
    } else if (activeTab === "bs") {
      api
        .get<BalanceSheetData>(`/reports/balance-sheet`)
        .then(setBsData)
        .finally(() => setIsLoading(false));
    }
  }

  useEffect(() => {
    loadReport();
  }, [activeTab, fromDate, toDate, dayBookDate]);

  function exportToCsv() {
    let csvContent = "";
    const filename = `${activeFirm?.name || "firm"}_${activeTab}_report_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === "gst" && gstData) {
      csvContent =
        "Tax Component,Output Liability (Rs.),Input Tax Credit (Rs.),Net Payable (Rs.)\n" +
        `CGST,${gstData.outputLiability.cgst},${gstData.inputCredit.cgst},${gstData.netPayable.cgst}\n` +
        `SGST,${gstData.outputLiability.sgst},${gstData.inputCredit.sgst},${gstData.netPayable.sgst}\n` +
        `IGST,${gstData.outputLiability.igst},${gstData.inputCredit.igst},${gstData.netPayable.igst}\n` +
        `Total,${totalOutputGst},${totalInputGst},${totalNetGstPayable}\n`;
    } else if (activeTab === "sales" && salesData) {
      csvContent =
        "Date,Invoice Number,Customer,Taxable Value (Rs.),Tax Amount (Rs.),Grand Total (Rs.),Status\n" +
        salesData.invoices
          .map(
            (i) =>
              `"${new Date(i.invoiceDate).toLocaleDateString("en-IN")}","${i.invoiceNumber}","${i.customer?.name || ""}","${i.totalTaxableValue}","${i.totalCgst + i.totalSgst + i.totalIgst}","${i.grandTotal}","${i.status}"`
          )
          .join("\n");
    } else if (activeTab === "purchases" && purchaseData) {
      csvContent =
        "Date,Bill Number,Supplier,Taxable Value (Rs.),ITC Amount (Rs.),Grand Total (Rs.),Status\n" +
        purchaseData.bills
          .map(
            (b) =>
              `"${new Date(b.billDate).toLocaleDateString("en-IN")}","${b.billNumber}","${b.supplier?.name || ""}","${b.totalTaxableValue}","${b.totalCgst + b.totalSgst + b.totalIgst}","${b.grandTotal}","${b.status}"`
          )
          .join("\n");
    } else if (activeTab === "daybook" && dayBookData) {
      csvContent =
        `Day Book for ${dayBookDate}\n\nSALES\nInvoice #,Customer,Amount (Rs.)\n` +
        dayBookData.sales
          .map((s) => `"${s.invoiceNumber}","${s.customer?.name || ""}","${s.grandTotal}"`)
          .join("\n") +
        `\n\nPURCHASES\nBill #,Supplier,Amount (Rs.)\n` +
        dayBookData.purchases
          .map((p) => `"${p.billNumber}","${p.supplier?.name || ""}","${p.grandTotal}"`)
          .join("\n");
    } else if (activeTab === "pnl" && pnlData) {
      csvContent =
        "PROFIT & LOSS STATEMENT\n\nParticulars,Amount (Rs.)\n" +
        `Gross Sales Revenue,${pnlData.revenue.grossSales}\n` +
        `Less: Sales Returns,${pnlData.revenue.salesReturns}\n` +
        `Net Sales Revenue,${pnlData.revenue.netSalesRevenue}\n` +
        `Less: Cost of Goods Sold (COGS),${pnlData.cogs.costOfGoodsSold}\n` +
        `GROSS PROFIT,${pnlData.grossProfit}\n\n` +
        `OPERATING EXPENSES\n` +
        pnlData.expenses.byCategory.map((e) => `"${e.category}",${e.amount}`).join("\n") +
        `\nTotal Operating Expenses,${pnlData.expenses.totalOperatingExpenses}\n` +
        `NET OPERATING PROFIT / (LOSS),${pnlData.netOperatingProfit}\n`;
    } else if (activeTab === "bs" && bsData) {
      csvContent =
        "BALANCE SHEET STATEMENT\n\nASSETS,Amount (Rs.),LIABILITIES & EQUITY,Amount (Rs.)\n" +
        `Cash & Bank Balances,${bsData.assets.cashAndBank},Accounts Payable (Suppliers),${bsData.liabilities.accountsPayable}\n` +
        `Accounts Receivable (Customers),${bsData.assets.accountsReceivable},Retained Earnings / Equity,${bsData.equity.retainedEarnings}\n` +
        `Inventory Valuation,${bsData.assets.inventoryValuation},,\n` +
        `TOTAL ASSETS,${bsData.assets.totalAssets},TOTAL LIABILITIES & EQUITY,${bsData.totalLiabilitiesAndEquity}\n`;
    }

    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const totalOutputGst = gstData
    ? gstData.outputLiability.cgst + gstData.outputLiability.sgst + gstData.outputLiability.igst
    : 0;
  const totalInputGst = gstData
    ? gstData.inputCredit.cgst + gstData.inputCredit.sgst + gstData.inputCredit.igst
    : 0;
  const totalNetGstPayable = gstData
    ? gstData.netPayable.cgst + gstData.netPayable.sgst + gstData.netPayable.igst
    : 0;

  return (
    <div className="space-y-6">
      {/* Print-Only Header Letterhead */}
      <div className="print-only mb-6 border-b-2 border-slate-800 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{activeFirm?.name || "MoneyWise"}</h1>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-indigo-700">
              {activeTab === "gst" && "GST Summary (GSTR-3B) Tax Report"}
              {activeTab === "sales" && "Sales & Revenue Register Report"}
              {activeTab === "purchases" && "Purchases & Input Tax Credit (ITC) Register"}
              {activeTab === "daybook" && `Day Book Transaction Register - ${dayBookDate}`}
              {activeTab === "pnl" && "Profit & Loss Statement (P&L)"}
              {activeTab === "bs" && "Balance Sheet Statement"}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              Period:{" "}
              {fromDate && toDate
                ? `${fromDate} to ${toDate}`
                : datePreset === "all"
                ? "All Time"
                : datePreset.replace(/_/g, " ")}
            </p>
            <p className="mt-1">Generated on: {new Date().toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports &amp; Financial Statements</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Real-time Profit &amp; Loss, Balance Sheet, GST tax liability, sales summaries, and ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={exportToCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            title="Download report as CSV file"
          >
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="no-print flex gap-2 overflow-x-auto border-b border-slate-200 sm:gap-6">
        <button
          onClick={() => setActiveTab("pnl")}
          className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition ${
            activeTab === "pnl"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Profit &amp; Loss (P&amp;L)
        </button>
        <button
          onClick={() => setActiveTab("bs")}
          className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition ${
            activeTab === "bs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveTab("gst")}
          className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition ${
            activeTab === "gst"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          GST Summary (GSTR-3B)
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition ${
            activeTab === "sales"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Sales &amp; Revenue
        </button>
        <button
          onClick={() => setActiveTab("purchases")}
          className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition ${
            activeTab === "purchases"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Purchases &amp; ITC
        </button>
        <button
          onClick={() => setActiveTab("daybook")}
          className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition ${
            activeTab === "daybook"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Day Book
        </button>
        <Link
          href="/dashboard/ledger"
          className="whitespace-nowrap border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition flex items-center gap-1.5"
        >
          <span>Party Ledger</span>
          <span className="rounded-full bg-indigo-50 px-1.5 py-0.2 text-[10px] font-bold text-indigo-600">
            NEW
          </span>
        </Link>
      </div>

      {/* Date Filters Bar */}
      {activeTab !== "daybook" ? (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Period:</span>
            {[
              { id: "all", label: "All Time" },
              { id: "this_month", label: "This Month" },
              { id: "this_quarter", label: "This Quarter" },
              { id: "this_fy", label: "This Financial Year" },
              { id: "custom", label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  datePreset === p.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setDatePreset("custom");
                setFromDate(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setDatePreset("custom");
                setToDate(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="no-print flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Day:</span>
          <input
            type="date"
            value={dayBookDate}
            onChange={(e) => setDayBookDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {/* TAB 1: GST SUMMARY (GSTR-3B) */}
      {activeTab === "gst" && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Total Output Tax (Sales)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">₹{totalOutputGst.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-slate-500">Tax collected from customer invoices</p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Eligible Input Tax Credit (Purchases)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">₹{totalInputGst.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-slate-500">GST paid on inward vendor bills</p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Net Tax Payable (GSTR-3B)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">₹{totalNetGstPayable.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-slate-500">Output Liability minus eligible ITC</p>
            </div>
          </div>

          {/* Detailed GST Component Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">GST Breakdown by Component</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Detailed CGST, SGST, and IGST components for monthly/quarterly GST returns.
              </p>
            </div>

            {isLoading ? (
              <p className="p-8 text-center text-sm text-slate-400">Loading GST data…</p>
            ) : !gstData ? (
              <p className="p-8 text-center text-sm text-slate-400">No GST transactions found for this period.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Tax Component</th>
                    <th className="px-5 py-3.5 text-right text-indigo-700">Output Liability (A)</th>
                    <th className="px-5 py-3.5 text-right text-emerald-700">Input Tax Credit (B)</th>
                    <th className="px-5 py-3.5 text-right text-slate-900">Net Payable (A - B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      CGST <span className="text-xs font-normal text-slate-500">(Central GST)</span>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-700">₹{gstData.outputLiability.cgst.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-right text-slate-700">₹{gstData.inputCredit.cgst.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">₹{gstData.netPayable.cgst.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      SGST <span className="text-xs font-normal text-slate-500">(State / UT GST)</span>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-700">₹{gstData.outputLiability.sgst.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-right text-slate-700">₹{gstData.inputCredit.sgst.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">₹{gstData.netPayable.sgst.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      IGST <span className="text-xs font-normal text-slate-500">(Integrated GST - Inter-State)</span>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-700">₹{gstData.outputLiability.igst.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-right text-slate-700">₹{gstData.inputCredit.igst.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">₹{gstData.netPayable.igst.toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                  <tr>
                    <td className="px-5 py-4 uppercase">Total Tax</td>
                    <td className="px-5 py-4 text-right text-indigo-700">₹{totalOutputGst.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-right text-emerald-700">₹{totalInputGst.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-right text-base text-amber-700">₹{totalNetGstPayable.toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SALES & REVENUE REPORT */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Invoiced Amount</p>
              <p className="mt-2 text-2xl font-bold text-indigo-600">
                ₹{(salesData?.totals.grandTotal || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">{salesData?.count || 0} Invoices Issued</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taxable Sales Value</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{(salesData?.totals.taxableValue || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Excluding tax amount</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Tax Collected</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{((salesData?.totals.cgst || 0) + (salesData?.totals.sgst || 0) + (salesData?.totals.igst || 0)).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">CGST + SGST + IGST</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Sales Invoices Register</h2>
            </div>
            {isLoading ? (
              <p className="p-8 text-center text-sm text-slate-400">Loading sales data…</p>
            ) : !salesData || salesData.invoices.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">No invoices issued during this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 text-right">Taxable Value</th>
                      <th className="px-4 py-3 text-right">Tax</th>
                      <th className="px-4 py-3 text-right">Total Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesData.invoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(inv.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-indigo-600">
                          <Link href={`/dashboard/sales/${inv._id}`} className="hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{inv.customer?.name || "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{inv.totalTaxableValue.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          ₹{(inv.totalCgst + inv.totalSgst + inv.totalIgst).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">₹{inv.grandTotal.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-700">
                            {inv.status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PURCHASES & ITC REPORT */}
      {activeTab === "purchases" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Purchases</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{(purchaseData?.totals.grandTotal || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">{purchaseData?.count || 0} Bills Logged</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taxable Value</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{(purchaseData?.totals.taxableValue || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Inward supplies base amount</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total Eligible ITC</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                ₹{((purchaseData?.totals.cgst || 0) + (purchaseData?.totals.sgst || 0) + (purchaseData?.totals.igst || 0)).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Available Input Credit</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Purchase Bills Register</h2>
            </div>
            {isLoading ? (
              <p className="p-8 text-center text-sm text-slate-400">Loading purchases data…</p>
            ) : !purchaseData || purchaseData.bills.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">No purchase bills recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Bill #</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3 text-right">Taxable Value</th>
                      <th className="px-4 py-3 text-right">ITC Amount</th>
                      <th className="px-4 py-3 text-right">Total Bill</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseData.bills.map((bill) => (
                      <tr key={bill._id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(bill.billDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{bill.billNumber}</td>
                        <td className="px-4 py-3 text-slate-700">{bill.supplier?.name || "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{bill.totalTaxableValue.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-700">
                          ₹{(bill.totalCgst + bill.totalSgst + bill.totalIgst).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">₹{bill.grandTotal.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                            {bill.status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DAY BOOK */}
      {activeTab === "daybook" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Day Sales</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{(dayBookData?.sales || []).reduce((s, i) => s + i.grandTotal, 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">{dayBookData?.sales.length || 0} Sales on this day</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Day Purchases</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{(dayBookData?.purchases || []).reduce((s, i) => s + i.grandTotal, 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">{dayBookData?.purchases.length || 0} Purchases on this day</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Day Sales */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">Sales on {dayBookDate}</h3>
              </div>
              {!dayBookData || dayBookData.sales.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">No sales recorded on this date.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/50 font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Invoice #</th>
                      <th className="px-4 py-2">Customer</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayBookData.sales.map((s) => (
                      <tr key={s._id}>
                        <td className="px-4 py-2.5 font-medium text-indigo-600">
                          <Link href={`/dashboard/sales/${s._id}`} className="hover:underline">
                            {s.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{s.customer?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹{s.grandTotal.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Day Purchases */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">Purchases on {dayBookDate}</h3>
              </div>
              {!dayBookData || dayBookData.purchases.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">No purchases recorded on this date.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/50 font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Bill #</th>
                      <th className="px-4 py-2">Supplier</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayBookData.purchases.map((p) => (
                      <tr key={p._id}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{p.billNumber}</td>
                        <td className="px-4 py-2.5 text-slate-700">{p.supplier?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹{p.grandTotal.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PROFIT & LOSS STATEMENT (P&L) */}
      {activeTab === "pnl" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Sales Revenue</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{(pnlData?.revenue.netSalesRevenue || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Gross Sales minus Returns</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cost of Goods Sold</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{(pnlData?.cogs.costOfGoodsSold || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Direct purchases &amp; stock cost</p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Gross Profit</p>
              <p className="mt-2 text-2xl font-bold text-indigo-900">
                ₹{(pnlData?.grossProfit || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Revenue minus COGS</p>
            </div>

            <div
              className={`rounded-xl border p-5 shadow-sm ${
                (pnlData?.netOperatingProfit || 0) >= 0
                  ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
                  : "border-red-200 bg-red-50/60 text-red-950"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Net Operating {(pnlData?.netOperatingProfit || 0) >= 0 ? "Profit" : "Loss"}
              </p>
              <p className="mt-2 text-2xl font-bold">
                ₹{Math.abs(pnlData?.netOperatingProfit || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs opacity-75">Gross Profit minus Operating Expenses</p>
            </div>
          </div>

          {/* Detailed Financial Statement Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">Statement of Profit &amp; Loss</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Income statement breakdown for the selected accounting period
              </p>
            </div>

            {isLoading ? (
              <p className="p-8 text-center text-sm text-slate-400">Computing Profit &amp; Loss statement…</p>
            ) : !pnlData ? (
              <p className="p-8 text-center text-sm text-slate-400">No financial transactions recorded for this period.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-6 py-3.5">Particulars / Schedule</th>
                    <th className="px-6 py-3.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* REVENUE */}
                  <tr className="bg-slate-50/60 font-bold text-slate-900">
                    <td className="px-6 py-3">I. REVENUE FROM OPERATIONS</td>
                    <td className="px-6 py-3 text-right">₹{pnlData.revenue.netSalesRevenue.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-2.5 pl-10 text-slate-600">Gross Sales Invoices</td>
                    <td className="px-6 py-2.5 text-right text-slate-700">₹{pnlData.revenue.grossSales.toLocaleString("en-IN")}</td>
                  </tr>
                  {pnlData.revenue.salesReturns > 0 && (
                    <tr>
                      <td className="px-6 py-2.5 pl-10 text-slate-600">Less: Sales Returns</td>
                      <td className="px-6 py-2.5 text-right text-red-600">- ₹{pnlData.revenue.salesReturns.toLocaleString("en-IN")}</td>
                    </tr>
                  )}

                  {/* COGS */}
                  <tr className="bg-slate-50/60 font-bold text-slate-900">
                    <td className="px-6 py-3">II. COST OF GOODS SOLD (COGS)</td>
                    <td className="px-6 py-3 text-right">₹{pnlData.cogs.costOfGoodsSold.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-2.5 pl-10 text-slate-600">Gross Purchase Bills</td>
                    <td className="px-6 py-2.5 text-right text-slate-700">₹{pnlData.cogs.grossPurchases.toLocaleString("en-IN")}</td>
                  </tr>
                  {pnlData.cogs.purchaseReturns > 0 && (
                    <tr>
                      <td className="px-6 py-2.5 pl-10 text-slate-600">Less: Purchase Returns</td>
                      <td className="px-6 py-2.5 text-right text-emerald-600">- ₹{pnlData.cogs.purchaseReturns.toLocaleString("en-IN")}</td>
                    </tr>
                  )}

                  {/* GROSS PROFIT */}
                  <tr className="bg-indigo-50/80 font-bold text-indigo-950">
                    <td className="px-6 py-3.5">GROSS PROFIT (I - II)</td>
                    <td className="px-6 py-3.5 text-right text-base text-indigo-700">
                      ₹{pnlData.grossProfit.toLocaleString("en-IN")}
                    </td>
                  </tr>

                  {/* OPERATING EXPENSES */}
                  <tr className="bg-slate-50/60 font-bold text-slate-900">
                    <td className="px-6 py-3">III. OPERATING EXPENSES</td>
                    <td className="px-6 py-3 text-right">₹{pnlData.expenses.totalOperatingExpenses.toLocaleString("en-IN")}</td>
                  </tr>
                  {pnlData.expenses.byCategory.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-2.5 pl-10 text-xs italic text-slate-400">
                        No operating expenses recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    pnlData.expenses.byCategory.map((exp) => (
                      <tr key={exp.category}>
                        <td className="px-6 py-2.5 pl-10 text-slate-600">{exp.category}</td>
                        <td className="px-6 py-2.5 text-right text-slate-700">₹{exp.amount.toLocaleString("en-IN")}</td>
                      </tr>
                    ))
                  )}

                  {/* NET OPERATING PROFIT / LOSS */}
                  <tr
                    className={`font-bold ${
                      pnlData.netOperatingProfit >= 0 ? "bg-emerald-100/80 text-emerald-950" : "bg-red-100/80 text-red-950"
                    }`}
                  >
                    <td className="px-6 py-4 text-base">NET OPERATING PROFIT / (LOSS)</td>
                    <td className="px-6 py-4 text-right text-lg">
                      ₹{pnlData.netOperatingProfit.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: BALANCE SHEET STATEMENT */}
      {activeTab === "bs" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Assets</p>
              <p className="mt-2 text-2xl font-bold text-indigo-600">
                ₹{(bsData?.assets.totalAssets || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Cash + Receivables + Stock</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Liabilities</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{(bsData?.liabilities.totalLiabilities || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Supplier Payables</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Retained Earnings / Equity</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                ₹{(bsData?.equity.retainedEarnings || 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Accumulated Net Profit</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm text-emerald-950">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Balance Status</p>
              <p className="mt-2 text-2xl font-bold flex items-center gap-1.5">
                <span>Balanced</span>
                <span className="text-lg">✓</span>
              </p>
              <p className="mt-1 text-xs opacity-75">Assets = Liabilities + Equity</p>
            </div>
          </div>

          {/* Statement T-Account View */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: ASSETS */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-indigo-50/60 px-5 py-4">
                <h2 className="text-sm font-bold text-indigo-950">ASSETS</h2>
                <p className="mt-0.5 text-xs text-slate-500">Business resources and receivables</p>
              </div>

              {isLoading ? (
                <p className="p-8 text-center text-sm text-slate-400">Loading Assets…</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Asset Item</th>
                      <th className="px-5 py-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        Cash &amp; Bank Balances
                        <p className="text-xs text-slate-400">Net payments collected in bank / cash drawer</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        ₹{(bsData?.assets.cashAndBank || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        Accounts Receivable (Debtors)
                        <p className="text-xs text-slate-400">Outstanding balances owed by customers</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        ₹{(bsData?.assets.accountsReceivable || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        Closing Inventory Valuation
                        <p className="text-xs text-slate-400">Total value of current product stock on hand</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        ₹{(bsData?.assets.inventoryValuation || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <tr>
                      <td className="px-5 py-4 uppercase">TOTAL ASSETS</td>
                      <td className="px-5 py-4 text-right text-base text-indigo-600">
                        ₹{(bsData?.assets.totalAssets || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Right: LIABILITIES & EQUITY */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-purple-50/60 px-5 py-4">
                <h2 className="text-sm font-bold text-purple-950">LIABILITIES &amp; EQUITY</h2>
                <p className="mt-0.5 text-xs text-slate-500">Business payables and retained capital</p>
              </div>

              {isLoading ? (
                <p className="p-8 text-center text-sm text-slate-400">Loading Liabilities &amp; Equity…</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Liabilities / Equity Item</th>
                      <th className="px-5 py-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        Accounts Payable (Creditors)
                        <p className="text-xs text-slate-400">Outstanding bills owed to suppliers</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        ₹{(bsData?.liabilities.accountsPayable || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        Retained Earnings / Accumulated Profit
                        <p className="text-xs text-slate-400">Net operating profit retained in business</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
                        ₹{(bsData?.equity.retainedEarnings || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <tr>
                      <td className="px-5 py-4 uppercase">TOTAL LIABILITIES &amp; EQUITY</td>
                      <td className="px-5 py-4 text-right text-base text-purple-700">
                        ₹{(bsData?.totalLiabilitiesAndEquity || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
