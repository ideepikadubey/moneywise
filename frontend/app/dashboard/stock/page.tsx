"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Product {
  _id: string;
  name: string;
  type?: "product" | "service";
  sku?: string;
  unit: string;
  currentStock: number;
  lowStockThreshold?: number;
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustDirection, setAdjustDirection] = useState<"in" | "out">("in");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    api
      .get<Product[]>("/products?type=product")
      .then((data) => setProducts(data.filter((p) => p.type !== "service")))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  const lowStock = products.filter((p) => p.lowStockThreshold && p.currentStock <= p.lowStockThreshold);

  async function submitAdjustment() {
    if (!adjustingId || !adjustQty) return;
    setError(null);
    try {
      await api.post(`/products/${adjustingId}/adjust-stock`, {
        quantity: Number(adjustQty),
        direction: adjustDirection,
        notes: adjustNotes || undefined,
      });
      setAdjustingId(null);
      setAdjustQty("");
      setAdjustNotes("");
      load();
    } catch (err: any) {
      setError(err.message || "Could not adjust stock");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Stock</h1>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            {lowStock.length} item{lowStock.length > 1 ? "s" : ""} at or below their reorder level
          </p>
          <p className="mt-1 text-sm text-amber-700">{lowStock.map((p) => p.name).join(", ")}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Current stock</th>
              <th className="px-4 py-3 text-right">Reorder level</th>
              <th className="px-4 py-3 text-right">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No physical products tracked in inventory yet. (Services do not track stock).
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p._id}>
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.sku || "—"}</td>
                <td
                  className={`px-4 py-3 text-right ${
                    p.lowStockThreshold && p.currentStock <= p.lowStockThreshold
                      ? "font-semibold text-amber-600"
                      : "text-slate-700"
                  }`}
                >
                  {p.currentStock} {p.unit}
                </td>
                <td className="px-4 py-3 text-right text-slate-500">{p.lowStockThreshold ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setAdjustingId(adjustingId === p._id ? null : p._id)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjustingId && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">
            Adjust stock — {products.find((p) => p._id === adjustingId)?.name}
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select
              value={adjustDirection}
              onChange={(e) => setAdjustDirection(e.target.value as "in" | "out")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="in">Stock in</option>
              <option value="out">Stock out</option>
            </select>
            <input
              type="number"
              placeholder="Quantity"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Reason / notes"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            onClick={submitAdjustment}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save adjustment
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Stock transfer between locations/branches (spec screen 31) and batch/expiry tracking (screen 15) aren&apos;t
        built yet — the <code className="rounded bg-slate-100 px-1">Product.trackBatches</code> flag and{" "}
        <code className="rounded bg-slate-100 px-1">StockMovement</code> model already support the fields needed;
        it's a matter of adding batch number/expiry inputs to the purchase and adjustment forms.
      </p>
    </div>
  );
}
