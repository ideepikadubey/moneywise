"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface Party {
  _id: string;
  name: string;
}
interface OpenInvoice {
  _id: string;
  invoiceNumber?: string;
  billNumber?: string;
  invoiceDate?: string;
  billDate?: string;
  grandTotal: number;
  amountDue: number;
}

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];

export default function NewPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDirection = (searchParams.get("direction") as "in" | "out") || "in";

  const [direction, setDirection] = useState<"in" | "out">(initialDirection);
  // "Invoice Payment" applies against open invoices/bills; "Advance" records
  // it against the party with nothing allocated yet - same distinction Zoho
  // draws between its "Invoice Payment" and "Customer Advance" tabs.
  const [mode, setMode] = useState<"apply" | "advance">("apply");

  const [parties, setParties] = useState<Party[]>([]);
  const [party, setParty] = useState("");
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const [amount, setAmount] = useState("");
  const [bankCharges, setBankCharges] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taxDeducted, setTaxDeducted] = useState<"none" | "tds">("none");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<Party[]>(`/parties?type=${direction === "in" ? "customer" : "supplier"}`).then(setParties);
    setParty("");
    setSelected({});
    setAllocations({});
  }, [direction]);

  useEffect(() => {
    if (!party || mode !== "apply") {
      setOpenInvoices([]);
      return;
    }
    const endpoint = direction === "in" ? "/sales" : "/purchases";
    const partyParam = direction === "in" ? `customer=${party}` : `supplier=${party}`;
    api.get<any[]>(`${endpoint}?${partyParam}`).then((docs) => {
      const open = docs
        .filter((d) => d.amountDue > 0 && d.status !== "cancelled")
        .map((d) => ({
          _id: d._id,
          invoiceNumber: d.invoiceNumber,
          billNumber: d.billNumber,
          invoiceDate: d.invoiceDate,
          billDate: d.billDate,
          grandTotal: d.grandTotal,
          amountDue: d.amountDue,
        }));
      setOpenInvoices(open);
    });
  }, [party, direction, mode]);

  // Auto-apply full due amount when an invoice is checked, like Zoho does,
  // while still letting the person edit the applied amount afterward.
  function toggleInvoice(inv: OpenInvoice) {
    setSelected((prev) => {
      const next = { ...prev, [inv._id]: !prev[inv._id] };
      setAllocations((allocPrev) => ({
        ...allocPrev,
        [inv._id]: next[inv._id] ? String(inv.amountDue) : "",
      }));
      return next;
    });
  }

  const totalApplied = useMemo(
    () =>
      Object.entries(allocations)
        .filter(([id]) => selected[id])
        .reduce((s, [, v]) => s + (Number(v) || 0), 0),
    [allocations, selected]
  );

  const amountReceived = Number(amount) || 0;
  const excessAsAdvance = mode === "apply" ? Math.max(0, amountReceived - totalApplied) : amountReceived;

  async function handleSubmit() {
    setError(null);
    if (!party || !amount) {
      setError("Party and amount are required");
      return;
    }
    if (mode === "apply" && totalApplied > amountReceived) {
      setError("Applied amount can't exceed the amount received");
      return;
    }

    setIsSubmitting(true);
    try {
      const noteParts: string[] = [];
      if (bankCharges) noteParts.push(`Bank charges: ₹${bankCharges}`);
      if (taxDeducted === "tds") noteParts.push("TDS deducted by customer");

      await api.post("/payments", {
        direction,
        party,
        amount: amountReceived,
        paymentMode: paymentMode.toUpperCase().replace(/\s+/g, "_"),
        referenceNumber: referenceNumber || undefined,
        paymentDate,
        notes: noteParts.join("; ") || undefined,
        allocations:
          mode === "apply"
            ? Object.entries(allocations)
                .filter(([id, v]) => selected[id] && Number(v) > 0)
                .map(([invoiceId, v]) => ({
                  invoiceModel: direction === "in" ? "SalesInvoice" : "PurchaseInvoice",
                  invoice: invoiceId,
                  amountAllocated: Number(v),
                }))
            : [],
      });
      router.push("/dashboard/payments");
    } catch (err: any) {
      setError(err.message || "Could not record payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          {direction === "in" ? "Payment Received" : "Payment Made"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setDirection("in")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              direction === "in" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            From customer
          </button>
          <button
            onClick={() => setDirection("out")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              direction === "out" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            To supplier
          </button>
        </div>
      </div>

      {/* Tabs, matching "Invoice Payment" / "Customer Advance" from the reference */}
      <div className="flex gap-6 border-b border-slate-200">
        <button
          onClick={() => setMode("apply")}
          className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium ${
            mode === "apply" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"
          }`}
        >
          {direction === "in" ? "Invoice Payment" : "Bill Payment"}
        </button>
        <button
          onClick={() => setMode("advance")}
          className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium ${
            mode === "advance" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"
          }`}
        >
          {direction === "in" ? "Customer Advance" : "Supplier Advance"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {direction === "in" ? "Customer Name" : "Supplier Name"}
            <span className="text-red-500">*</span>
          </label>
          <select
            value={party}
            onChange={(e) => setParty(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select {direction === "in" ? "customer" : "supplier"}</option>
            {parties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Amount {direction === "in" ? "Received" : "Paid"}<span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Bank Charges (if any)</label>
          <input
            type="number"
            value={bankCharges}
            onChange={(e) => setBankCharges(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Payment Date<span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Payment Mode</label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Reference #</label>
          <input
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="UTR / cheque number"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {direction === "in" && (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Tax deducted?</label>
            <div className="mt-1 flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={taxDeducted === "none"} onChange={() => setTaxDeducted("none")} />
                No Tax deducted
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={taxDeducted === "tds"} onChange={() => setTaxDeducted("tds")} />
                Yes, TDS (Income Tax)
              </label>
            </div>
          </div>
        )}
      </div>

      {mode === "apply" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">
            Unpaid {direction === "in" ? "Invoices" : "Bills"}
          </h2>
          {!party && <p className="mt-2 text-sm text-slate-400">Select a {direction === "in" ? "customer" : "supplier"} to see open items.</p>}
          {party && openInvoices.length === 0 && (
            <p className="mt-2 text-sm text-slate-400">Nothing outstanding for this party.</p>
          )}
          {openInvoices.length > 0 && (
            <div className="mt-3 divide-y divide-slate-100">
              {openInvoices.map((inv) => (
                <div key={inv._id} className="flex items-center gap-3 py-2 text-sm">
                  <input type="checkbox" checked={!!selected[inv._id]} onChange={() => toggleInvoice(inv)} />
                  <span className="flex-1 text-slate-700">
                    {inv.invoiceNumber || inv.billNumber}
                    <span className="ml-2 text-slate-400">
                      due ₹{inv.amountDue.toLocaleString("en-IN")} of ₹{inv.grandTotal.toLocaleString("en-IN")}
                    </span>
                  </span>
                  <input
                    type="number"
                    disabled={!selected[inv._id]}
                    value={allocations[inv._id] || ""}
                    onChange={(e) => setAllocations((prev) => ({ ...prev, [inv._id]: e.target.value }))}
                    className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-50"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="text-slate-500">
              {excessAsAdvance > 0
                ? `₹${excessAsAdvance.toLocaleString("en-IN")} will be recorded as an advance`
                : "Fully applied to selected items"}
            </span>
            <span className="font-medium text-slate-700">
              Applied ₹{totalApplied.toLocaleString("en-IN")} of ₹{amountReceived.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {isSubmitting ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
