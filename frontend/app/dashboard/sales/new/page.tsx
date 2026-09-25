"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import UnitSelect from "@/components/UnitSelect";

interface Party {
  _id: string;
  name: string;
  stateCode?: string;
}
interface Product {
  _id: string;
  name: string;
  type?: "product" | "service";
  unit: string;
  itemsPerUnit?: number;
  secondaryUnit?: string;
  taxRate: number;
  salePrice: number;
  hsnOrSac?: string;
}
interface LineDraft {
  product: string;
  quantity: string;
  unit: string;
  rate: string;
  discountPercent: string;
  taxRate: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default function NewSalesInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [docType, setDocType] = useState<"invoice" | "quotation" | "sales_order">("invoice");
  const [customer, setCustomer] = useState("");
  const [isInterState, setIsInterState] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [lines, setLines] = useState<LineDraft[]>([{ product: "", quantity: "1", unit: "PCS", rate: "", discountPercent: "0", taxRate: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<Party[]>("/parties?type=customer").then(setCustomers);
    api.get<Product[]>("/products").then(setProducts);
  }, []);

  function handleMonthChange(monthStr: string) {
    setSelectedMonth(monthStr);
    if (monthStr) {
      // Set invoice date to 1st of selected month, or retain current day if within that month
      const currentDay = new Date().getDate();
      const paddedDay = String(currentDay).padStart(2, "0");
      setInvoiceDate(`${monthStr}-${paddedDay}`);
    }
  }

  function handleDateChange(dateStr: string) {
    setInvoiceDate(dateStr);
    if (dateStr) {
      setSelectedMonth(dateStr.slice(0, 7));
    }
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function selectProduct(index: number, productId: string) {
    const p = products.find((pr) => pr._id === productId);
    const isService = p?.type === "service";
    updateLine(index, {
      product: productId,
      quantity: isService ? "1" : (lines[index]?.quantity && lines[index]?.quantity !== "0" ? lines[index]?.quantity : "1"),
      unit: isService ? "OTH" : (p?.unit || "PCS"),
      rate: p ? String(p.salePrice) : "",
      taxRate: p?.taxRate || 0,
    });
  }

  function addLine() {
    setLines((prev) => [...prev, { product: "", quantity: "1", unit: "PCS", rate: "", discountPercent: "0", taxRate: 0 }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const calculated = useMemo(() => {
    return lines.map((l) => {
      const p = products.find((pr) => pr._id === l.product);
      const isService = p?.type === "service";
      const qty = isService ? 1 : (Number(l.quantity) || 0);
      const rate = Number(l.rate) || 0;
      const discPct = Number(l.discountPercent) || 0;
      const gross = qty * rate;
      const discountAmount = round2(gross * (discPct / 100));
      const taxableValue = round2(gross - discountAmount);
      const taxAmount = round2(taxableValue * (l.taxRate / 100));
      const cgst = isInterState ? 0 : round2(taxAmount / 2);
      const sgst = isInterState ? 0 : round2(taxAmount - cgst);
      const igst = isInterState ? taxAmount : 0;
      const total = round2(taxableValue + cgst + sgst + igst);
      return { taxableValue, discountAmount, cgst, sgst, igst, total };
    });
  }, [lines, isInterState, products]);

  const totals = useMemo(() => {
    const taxableValue = round2(calculated.reduce((s, c) => s + c.taxableValue, 0));
    const cgst = round2(calculated.reduce((s, c) => s + c.cgst, 0));
    const sgst = round2(calculated.reduce((s, c) => s + c.sgst, 0));
    const igst = round2(calculated.reduce((s, c) => s + c.igst, 0));
    const preRound = taxableValue + cgst + sgst + igst;
    const grandTotal = Math.round(preRound);
    return { taxableValue, cgst, sgst, igst, roundOff: round2(grandTotal - preRound), grandTotal };
  }, [calculated]);

  async function handleSubmit() {
    setError(null);
    if (!customer) {
      setError("Please select a customer");
      return;
    }
    if (
      lines.some((l) => {
        const p = products.find((pr) => pr._id === l.product);
        const isService = p?.type === "service";
        if (!l.product || !l.rate) return true;
        if (!isService && !l.quantity) return true;
        return false;
      })
    ) {
      setError("Every line needs a product/service and rate");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/sales", {
        docType,
        customer,
        isInterState,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        items: lines.map((l) => {
          const p = products.find((pr) => pr._id === l.product);
          const isService = p?.type === "service";
          return {
            product: l.product,
            quantity: isService ? 1 : Number(l.quantity),
            unit: isService ? "OTH" : (l.unit || "PCS"),
            rate: Number(l.rate),
            discountPercent: Number(l.discountPercent) || 0,
            taxRate: l.taxRate,
          };
        }),
      });
      router.push(docType === "invoice" ? "/dashboard/sales" : "/dashboard/sales/quotations");
    } catch (err: any) {
      setError(err.message || "Could not create document");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          {docType === "invoice" ? "New sales invoice" : docType === "quotation" ? "New quotation" : "New sales order"}
        </h1>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as typeof docType)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium bg-white shadow-xs focus:border-indigo-500 focus:outline-none"
        >
          <option value="invoice">Sales invoice</option>
          <option value="quotation">Quotation / estimate</option>
          <option value="sales_order">Sales order</option>
        </select>
      </div>

      {/* Customer & Date Selection */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3 shadow-xs">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Customer *</label>
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Date & Month Selector */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Invoice Date *</label>
            <span className="text-[11px] font-medium text-indigo-600">
              Month: {selectedMonth ? new Date(selectedMonth + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : ""}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Month / Period Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Billing Month / Period</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                handleDateChange(today);
              }}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              title="Reset to Today"
            >
              Today
            </button>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isInterState}
              onChange={(e) => setIsInterState(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Inter-state sale (charge IGST instead of CGST+SGST)
          </label>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Due Date (Optional):</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Line items</h2>
            <p className="text-xs text-slate-500">Add products or services to this document</p>
          </div>
          <button onClick={addLine} type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            <span>+ Add line</span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {lines.map((line, i) => {
            const selectedProd = products.find((pr) => pr._id === line.product);
            const isService = selectedProd?.type === "service";
            const totalPcs =
              !isService && selectedProd?.itemsPerUnit && selectedProd.itemsPerUnit > 1 && Number(line.quantity) > 0
                ? Number(line.quantity) * selectedProd.itemsPerUnit
                : null;

            return (
              <div key={i} className="grid grid-cols-12 items-center gap-2.5 rounded-lg border border-slate-200/80 p-2.5 bg-slate-50/50">
                {/* Product / Service Selector */}
                <div className={isService ? "col-span-5" : "col-span-3"}>
                  <select
                    value={line.product}
                    onChange={(e) => selectProduct(i, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Product or Service</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.type === "service" ? "⚡ [Service] " : "📦 "}
                        {p.name}
                        {p.type !== "service" && p.itemsPerUnit && p.itemsPerUnit > 1 ? ` (${p.itemsPerUnit} ${p.secondaryUnit || "PCS"}/${p.unit})` : ""}
                      </option>
                    ))}
                  </select>
                  {isService && (
                    <span className="mt-0.5 inline-block text-[11px] font-semibold text-indigo-600">
                      Service (Flat Charge • No Qty / Pieces)
                    </span>
                  )}
                </div>

                {/* For Physical Goods: Quantity & Unit */}
                {!isService ? (
                  <>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => updateLine(i, { quantity: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      {totalPcs !== null && (
                        <span className="block text-[10px] font-semibold text-indigo-600 truncate mt-0.5">
                          = {totalPcs} {selectedProd?.secondaryUnit || "PCS"}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <UnitSelect
                        compact
                        value={line.unit}
                        onChange={(u) => updateLine(i, { unit: u })}
                      />
                    </div>
                  </>
                ) : null}

                {/* Rate / Service Fee */}
                <div className={isService ? "col-span-3" : "col-span-2"}>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      placeholder={isService ? "Service Fee" : "Rate"}
                      value={line.rate}
                      onChange={(e) => updateLine(i, { rate: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-6 pr-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Discount % */}
                <div className={isService ? "col-span-2" : "col-span-1"}>
                  <input
                    type="number"
                    placeholder="Disc %"
                    value={line.discountPercent}
                    onChange={(e) => updateLine(i, { discountPercent: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Total */}
                <div className="col-span-1 text-right text-xs font-bold text-slate-900 truncate">
                  ₹{calculated[i]?.total.toLocaleString("en-IN") || 0}
                </div>

                {/* Remove */}
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="rounded-md p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Remove line"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 ml-auto w-64 space-y-1 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Taxable value</span>
            <span>₹{totals.taxableValue.toLocaleString("en-IN")}</span>
          </div>
          {!isInterState ? (
            <>
              <div className="flex justify-between text-slate-600">
                <span>CGST</span>
                <span>₹{totals.cgst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST</span>
                <span>₹{totals.sgst.toLocaleString("en-IN")}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-600">
              <span>IGST</span>
              <span>₹{totals.igst.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Round off</span>
            <span>₹{totals.roundOff.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
            <span>Grand total</span>
            <span>₹{totals.grandTotal.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {isSubmitting ? "Saving…" : "Save invoice"}
      </button>
    </div>
  );
}
