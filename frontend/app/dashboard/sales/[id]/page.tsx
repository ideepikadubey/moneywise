"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

interface LineItem {
  product: { name: string; hsnOrSac?: string } | string;
  description?: string;
  hsnOrSac?: string;
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

function formatQuantity(item: LineItem) {
  const u = (item.unit || "").toUpperCase();
  if (u === "OTH" || u === "SERV" || u === "SERVICE" || u === "NA" || u === "N/A" || !item.unit) {
    return "—";
  }
  return `${item.quantity} ${item.unit}`;
}

interface FirmDetails {
  _id: string;
  name: string;
  logoUrl?: string;
  signatureUrl?: string;
  signatoryName?: string;
  gstin?: string;
  udyamNumber?: string;
  businessRegNumber?: string;
  pan?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
  };
  contact?: { email?: string; phone?: string; website?: string };
  branding?: { primaryColor?: string; invoiceTemplate?: "standard" | "spreadsheet" | "continental" | "compact" };
  invoiceSettings?: { footerNote?: string; termsAndConditions?: string };
}

interface Invoice {
  _id: string;
  firm?: FirmDetails | string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  isInterState: boolean;
  customer: {
    name: string;
    gstin?: string;
    billingAddress?: string;
    email?: string;
    phone?: string;
    mobile?: string;
  };
  items: LineItem[];
  subTotal?: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  status: string;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<"standard" | "spreadsheet" | "continental" | "compact">("standard");

  useEffect(() => {
    api
      .get<Invoice>(`/sales/${id}`)
      .then((inv) => {
        setInvoice(inv);
        const firmObj = typeof inv.firm === "object" ? inv.firm : null;
        if (firmObj?.branding?.invoiceTemplate) {
          setSelectedTemplate(firmObj.branding.invoiceTemplate);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleDownload() {
    if (!invoice) return;
    setIsDownloading(true);
    setError(null);
    try {
      await api.downloadFile(
        `/sales/${id}/pdf?template=${selectedTemplate}`,
        `${invoice.invoiceNumber}.pdf`
      );
    } catch (err: any) {
      setError(err.message || "Could not download the invoice");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this invoice? Stock and customer dues will be reversed.")) return;
    try {
      await api.post(`/sales/${id}/cancel`);
      router.refresh();
      api.get<Invoice>(`/sales/${id}`).then(setInvoice);
    } catch (err: any) {
      setError(err.message || "Could not cancel the invoice");
    }
  }

  if (isLoading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!invoice) return <p className="text-sm text-red-600">{error || "Invoice not found"}</p>;

  const firm = typeof invoice.firm === "object" ? invoice.firm : null;
  const primaryColor = firm?.branding?.primaryColor || "#4f46e5";

  const firmAddressStr = [
    firm?.address?.line1,
    firm?.address?.line2,
    firm?.address?.city,
    firm?.address?.state,
    firm?.address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const customerPhone = invoice.customer.phone || invoice.customer.mobile;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard/sales" className="text-sm text-slate-500 hover:text-slate-700">
            ← All Invoices
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status !== "cancelled" && (
            <button
              onClick={handleCancel}
              className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
            >
              Cancel invoice
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{isDownloading ? "Preparing PDF…" : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Template Selector Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Invoice Style:</span>
          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 uppercase">
            {selectedTemplate}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["standard", "spreadsheet", "continental", "compact"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTemplate(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                selectedTemplate === t
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      {/* ========================================================================= */}
      {/* TEMPLATE: CONTINENTAL                                                    */}
      {/* ========================================================================= */}
      {selectedTemplate === "continental" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          {/* Full-bleed Bold Top Header Band */}
          <div style={{ backgroundColor: primaryColor }} className="p-8 text-white">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                {firm?.logoUrl && (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-white/15 p-1 backdrop-blur-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={firm.logoUrl} alt={firm.name} className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{firm?.name || "Your Firm"}</h2>
                  {firmAddressStr && <p className="mt-1 text-xs text-white/80 max-w-sm">{firmAddressStr}</p>}
                  {firm?.gstin && <p className="mt-0.5 text-xs font-semibold text-white/90">GSTIN: {firm.gstin}</p>}
                  {firm?.pan && <p className="text-xs text-white/75">PAN: {firm.pan}</p>}
                </div>
              </div>

              <div className="text-left sm:text-right border-t border-white/20 pt-3 sm:border-0 sm:pt-0">
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold tracking-widest uppercase">
                  TAX INVOICE
                </span>
                <p className="mt-2 text-xl font-bold font-mono tracking-tight">#{invoice.invoiceNumber}</p>
                <p className="text-xs text-white/80 mt-1">Date: {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</p>
                {invoice.dueDate && (
                  <p className="text-xs text-white/80">Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Bill To Card */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bill To Customer</p>
              <p className="mt-1 text-base font-bold text-slate-900">{invoice.customer.name}</p>
              {customerPhone && (
                <p className="mt-0.5 text-xs font-semibold text-indigo-700">
                  📱 Mobile / Phone: {customerPhone}
                </p>
              )}
              {invoice.customer.billingAddress && (
                <p className="mt-0.5 text-xs text-slate-600 max-w-md">{invoice.customer.billingAddress}</p>
              )}
              {invoice.customer.gstin && (
                <p className="mt-0.5 text-xs font-medium text-slate-700">GSTIN: {invoice.customer.gstin}</p>
              )}
              {invoice.customer.email && (
                <p className="mt-0.5 text-xs text-slate-500">Email: {invoice.customer.email}</p>
              )}
            </div>

            {/* Line items */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-xs font-bold uppercase tracking-wider text-slate-900">
                    <th className="pb-3">Item Details</th>
                    <th className="pb-3 text-right">Qty</th>
                    <th className="pb-3 text-right">Rate</th>
                    <th className="pb-3 text-right">Tax</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 font-semibold text-slate-800">
                        {typeof item.product === "object" ? item.product.name : item.description || "Item"}
                      </td>
                      <td className="py-3 text-right text-slate-600">{formatQuantity(item)}</td>
                      <td className="py-3 text-right text-slate-600">₹{item.rate.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-right text-slate-600">{item.taxRate}%</td>
                      <td className="py-3 text-right font-bold text-slate-900">₹{item.totalAmount.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TotalsSection invoice={invoice} firm={firm} primaryColor={primaryColor} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEMPLATE: SPREADSHEET (Grid / Ledger Boxed Style)                        */}
      {/* ========================================================================= */}
      {selectedTemplate === "spreadsheet" && (
        <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-300 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50/50">
              <div className="flex items-start gap-3">
                {firm?.logoUrl && (
                  <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={firm.logoUrl} alt={firm.name} className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{firm?.name || "Your Firm"}</h2>
                  {firmAddressStr && <p className="text-xs text-slate-500 mt-0.5">{firmAddressStr}</p>}
                  {firm?.gstin && <p className="text-xs font-mono font-medium text-slate-700 mt-0.5">GSTIN: {firm.gstin}</p>}
                  {(firm?.contact?.email || firm?.contact?.phone) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[firm?.contact?.email, firm?.contact?.phone].filter(Boolean).join(" | ")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t sm:border-t-0 sm:border-l border-slate-300 bg-slate-100/60 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Document</span>
                <p className="text-xl font-extrabold text-slate-900 font-mono">TAX INVOICE #{invoice.invoiceNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div>
                  <span className="text-slate-400">Date:</span>{" "}
                  <span className="font-semibold text-slate-800">{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</span>
                </div>
                {invoice.dueDate && (
                  <div>
                    <span className="text-slate-400">Due:</span>{" "}
                    <span className="font-semibold text-slate-800">{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill To Grid Box */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/30">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billed Party / Client</p>
            <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-base font-bold text-slate-900">{invoice.customer.name}</p>
                {invoice.customer.billingAddress && (
                  <p className="text-xs text-slate-600 mt-0.5">{invoice.customer.billingAddress}</p>
                )}
              </div>
              <div className="text-left sm:text-right">
                {customerPhone && (
                  <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-0.5 inline-block">
                    📱 Customer Mobile: {customerPhone}
                  </p>
                )}
                {invoice.customer.gstin && (
                  <p className="text-xs font-mono text-slate-600 mt-1">GSTIN: {invoice.customer.gstin}</p>
                )}
              </div>
            </div>
          </div>

          {/* Spreadsheet Table with Full Borders */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300">
                  <th className="p-2.5 border-r border-slate-300">#</th>
                  <th className="p-2.5 border-r border-slate-300">Description</th>
                  <th className="p-2.5 text-right border-r border-slate-300">Qty</th>
                  <th className="p-2.5 text-right border-r border-slate-300">Rate</th>
                  <th className="p-2.5 text-right border-r border-slate-300">Tax</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-200 even:bg-slate-50/70">
                    <td className="p-2.5 text-slate-400 font-mono text-xs border-r border-slate-200">{i + 1}</td>
                    <td className="p-2.5 font-medium text-slate-800 border-r border-slate-200">
                      {typeof item.product === "object" ? item.product.name : item.description || "Item"}
                    </td>
                    <td className="p-2.5 text-right text-slate-700 border-r border-slate-200">{formatQuantity(item)}</td>
                    <td className="p-2.5 text-right text-slate-700 border-r border-slate-200">₹{item.rate.toLocaleString("en-IN")}</td>
                    <td className="p-2.5 text-right text-slate-700 border-r border-slate-200">{item.taxRate}%</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">₹{item.totalAmount.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TotalsSection invoice={invoice} firm={firm} primaryColor={primaryColor} isBoxed />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEMPLATE: COMPACT (Retail / Fast Density Bill)                          */}
      {/* ========================================================================= */}
      {selectedTemplate === "compact" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4 text-xs">
          {/* Top Compact Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{firm?.name || "Your Firm"}</h2>
              {firmAddressStr && <p className="text-[11px] text-slate-500">{firmAddressStr}</p>}
              {firm?.gstin && <p className="text-[11px] font-mono text-slate-600">GSTIN: {firm.gstin}</p>}
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900 text-sm">INVOICE #{invoice.invoiceNumber}</span>
              <p className="text-[11px] text-slate-500">Date: {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</p>
            </div>
          </div>

          {/* Customer Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 border border-slate-200/60">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Customer: </span>
              <span className="font-bold text-slate-900">{invoice.customer.name}</span>
            </div>
            {customerPhone && (
              <div className="font-bold text-indigo-700">
                📱 {customerPhone}
              </div>
            )}
            {invoice.customer.gstin && (
              <div className="font-mono text-slate-600">
                GSTIN: {invoice.customer.gstin}
              </div>
            )}
          </div>

          {/* Compact items table */}
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-300 font-bold uppercase text-[10px] text-slate-600">
                <th className="py-1.5">Item</th>
                <th className="py-1.5 text-right">Qty</th>
                <th className="py-1.5 text-right">Rate</th>
                <th className="py-1.5 text-right">Tax</th>
                <th className="py-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item, i) => (
                <tr key={i} className="py-1">
                  <td className="py-1.5 font-medium text-slate-800">
                    {typeof item.product === "object" ? item.product.name : item.description || "Item"}
                  </td>
                  <td className="py-1.5 text-right">{formatQuantity(item)}</td>
                  <td className="py-1.5 text-right">₹{item.rate}</td>
                  <td className="py-1.5 text-right">{item.taxRate}%</td>
                  <td className="py-1.5 text-right font-bold">₹{item.totalAmount.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <TotalsSection invoice={invoice} firm={firm} primaryColor={primaryColor} isCompact />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEMPLATE: STANDARD (Clean Modern Accent Layout)                         */}
      {/* ========================================================================= */}
      {selectedTemplate === "standard" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Top accent branding bar */}
          <div style={{ backgroundColor: primaryColor }} className="h-2.5 w-full" />

          <div className="p-8 space-y-6">
            {/* Header: Firm Details & Tax Invoice Title */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row">
              <div className="flex items-start gap-4">
                {firm?.logoUrl && (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={firm.logoUrl} alt={firm.name} className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
                    {firm?.name || "Your Firm"}
                  </h2>
                  {firmAddressStr && <p className="mt-1 max-w-sm text-xs text-slate-500">{firmAddressStr}</p>}
                  {firm?.gstin && <p className="mt-0.5 text-xs font-medium text-slate-600">GSTIN: {firm.gstin}</p>}
                  {firm?.pan && <p className="text-xs text-slate-500">PAN: {firm.pan}</p>}
                  {(firm?.contact?.email || firm?.contact?.phone) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {[firm?.contact?.email, firm?.contact?.phone].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                  Tax Invoice
                </span>
                <p className="mt-2 text-base font-bold text-slate-800">#{invoice.invoiceNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Date:{" "}
                  <span className="font-medium text-slate-700">
                    {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </p>
                {invoice.dueDate && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Due:{" "}
                    <span className="font-medium text-slate-700">
                      {new Date(invoice.dueDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Bill To */}
            <div className="border-b border-slate-100 pb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bill To</p>
              <p className="mt-1 text-base font-bold text-slate-900">{invoice.customer.name}</p>
              {customerPhone && (
                <p className="mt-0.5 text-xs font-semibold text-indigo-600">
                  📱 Mobile: {customerPhone}
                </p>
              )}
              {invoice.customer.billingAddress && (
                <p className="mt-0.5 max-w-xs text-xs text-slate-500">{invoice.customer.billingAddress}</p>
              )}
              {invoice.customer.gstin && (
                <p className="mt-0.5 text-xs font-medium text-slate-600">GSTIN: {invoice.customer.gstin}</p>
              )}
              {invoice.customer.email && <p className="mt-0.5 text-xs text-slate-500">{invoice.customer.email}</p>}
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="pb-3">Item &amp; Description</th>
                    <th className="pb-3 text-right">Qty</th>
                    <th className="pb-3 text-right">Rate</th>
                    <th className="pb-3 text-right">Tax</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, i) => (
                    <tr key={i} className="text-slate-700">
                      <td className="py-3 font-medium text-slate-800">
                        {typeof item.product === "object" ? item.product.name : item.description || "Item"}
                      </td>
                      <td className="py-3 text-right text-slate-600">
                        {formatQuantity(item)}
                      </td>
                      <td className="py-3 text-right text-slate-600">₹{item.rate.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-right text-slate-600">{item.taxRate}%</td>
                      <td className="py-3 text-right font-semibold text-slate-900">
                        ₹{item.totalAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TotalsSection invoice={invoice} firm={firm} primaryColor={primaryColor} />
          </div>
        </div>
      )}
    </div>
  );
}

function TotalsSection({
  invoice,
  firm,
  primaryColor,
  isBoxed = false,
  isCompact = false,
}: {
  invoice: Invoice;
  firm: FirmDetails | null;
  primaryColor: string;
  isBoxed?: boolean;
  isCompact?: boolean;
}) {
  return (
    <div>
      <div className={`flex flex-col justify-between gap-6 border-t border-slate-200 ${isCompact ? "pt-2" : "pt-4"} sm:flex-row`}>
        <div className="max-w-xs space-y-2 text-xs text-slate-500">
          {firm?.invoiceSettings?.termsAndConditions && (
            <div>
              <p className="font-semibold text-slate-700 uppercase tracking-wider">Terms &amp; Conditions</p>
              <p className="mt-1 whitespace-pre-line text-slate-600">{firm.invoiceSettings.termsAndConditions}</p>
            </div>
          )}
        </div>

        <div className={`w-full max-w-xs space-y-1.5 ${isCompact ? "text-xs" : "text-sm"}`}>
          <div className="flex justify-between text-slate-600">
            <span>Taxable value</span>
            <span>₹{invoice.totalTaxableValue.toLocaleString("en-IN")}</span>
          </div>
          {invoice.isInterState ? (
            <div className="flex justify-between text-slate-600">
              <span>IGST</span>
              <span>₹{invoice.totalIgst.toLocaleString("en-IN")}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-slate-600">
                <span>CGST</span>
                <span>₹{invoice.totalCgst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST</span>
                <span>₹{invoice.totalSgst.toLocaleString("en-IN")}</span>
              </div>
            </>
          )}
          {invoice.roundOff !== 0 && (
            <div className="flex justify-between text-slate-500 text-xs">
              <span>Round off</span>
              <span>₹{invoice.roundOff.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-base">
            <span>Grand total</span>
            <span style={{ color: primaryColor }}>₹{invoice.grandTotal.toLocaleString("en-IN")}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <>
              <div className="flex justify-between text-slate-600">
                <span>Paid</span>
                <span>₹{invoice.amountPaid.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-medium text-amber-600">
                <span>Balance due</span>
                <span>₹{invoice.amountDue.toLocaleString("en-IN")}</span>
              </div>
            </>
          )}

          {/* Digital Signature block */}
          <div className="border-t border-slate-100 pt-6 text-right">
            <p className="text-xs font-semibold text-slate-700">For {firm?.name || "Your Firm"}</p>
            {firm?.signatureUrl ? (
              <div className="my-2 flex justify-end">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={firm.signatureUrl} alt="Signature" className="h-12 max-w-[140px] object-contain" />
              </div>
            ) : (
              <div className="h-10" />
            )}
            <p className="text-xs text-slate-500">{firm?.signatoryName || "Authorized Signatory"}</p>
          </div>
        </div>
      </div>

      {firm?.invoiceSettings?.footerNote && (
        <div className="border-t border-slate-100 pt-3 text-center text-xs italic text-slate-400">
          {firm.invoiceSettings.footerNote}
        </div>
      )}
    </div>
  );
}
