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
  const [lines, setLines] = useState<LineDraft[]>([{ product: "", quantity: "1", unit: "PCS", rate: "", discountPercent: "0", taxRate: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<Party[]>("/parties?type=customer").then(setCustomers);
    api.get<Product[]>("/products").then(setProducts);
  }, []);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function selectProduct(index: number, productId: string) {
    const p = products.find((pr) => pr._id === productId);
    updateLine(index, {
      product: productId,
      unit: p?.unit || "PCS",
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
      const qty = Number(l.quantity) || 0;
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
  }, [lines, isInterState]);

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
    if (lines.some((l) => !l.product || !l.quantity || !l.rate)) {
      setError("Every line needs a product, quantity, and rate");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/sales", {
        docType,
        customer,
        isInterState,
        items: lines.map((l) => ({
          product: l.product,
          quantity: Number(l.quantity),
          unit: l.unit || "PCS",
          rate: Number(l.rate),
          discountPercent: Number(l.discountPercent) || 0,
          taxRate: l.taxRate,
        })),
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
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="invoice">Sales invoice</option>
          <option value="quotation">Quotation / estimate</option>
          <option value="sales_order">Sales order</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Customer</label>
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} />
            Inter-state sale (charge IGST instead of CGST+SGST)
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Line items</h2>
          <button onClick={addLine} type="button" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            + Add line
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {lines.map((line, i) => {
            const selectedProd = products.find((pr) => pr._id === line.product);
            const totalPcs =
              selectedProd?.itemsPerUnit && selectedProd.itemsPerUnit > 1 && Number(line.quantity) > 0
                ? Number(line.quantity) * selectedProd.itemsPerUnit
                : null;

            return (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <select
                  value={line.product}
                  onChange={(e) => selectProduct(i, e.target.value)}
                  className="col-span-3 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.itemsPerUnit && p.itemsPerUnit > 1 ? `(${p.itemsPerUnit} ${p.secondaryUnit || "PCS"}/${p.unit})` : ""}
                    </option>
                  ))}
                </select>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
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
              <input
                type="number"
                placeholder="Rate"
                value={line.rate}
                onChange={(e) => updateLine(i, { rate: e.target.value })}
                className="col-span-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                placeholder="Disc %"
                value={line.discountPercent}
                onChange={(e) => updateLine(i, { discountPercent: e.target.value })}
                className="col-span-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <span className="col-span-1 text-right text-xs font-semibold text-slate-700">
                ₹{calculated[i]?.total.toLocaleString("en-IN") || 0}
              </span>
              <button
                type="button"
                onClick={() => removeLine(i)}
                className="col-span-1 text-right text-xs text-slate-400 hover:text-red-600"
              >
                Remove
              </button>
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
