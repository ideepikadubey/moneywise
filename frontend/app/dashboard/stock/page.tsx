"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Product {
  _id: string;
  name: string;
  type?: "product" | "service";
  sku?: string;
  unit: string;
  itemsPerUnit?: number;
  secondaryUnit?: string;
  currentStock: number;
  lowStockThreshold?: number;
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustDirection, setAdjustDirection] = useState<"in" | "out">("in");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "low_stock">("all");

  function load() {
    setIsLoading(true);
    api
      .get<Product[]>("/products")
      .then((data) => {
        // Services do not hold physical inventory; filter to physical products only
        setProducts((data || []).filter((p) => p.type !== "service"));
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const lowStockItems = useMemo(() => {
    return products.filter((p) => {
      const threshold = p.lowStockThreshold ?? 5;
      return p.currentStock <= threshold;
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterMode === "low_stock") {
        const threshold = p.lowStockThreshold ?? 5;
        if (p.currentStock > threshold) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, filterMode, searchQuery]);

  async function submitAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustingProduct || !adjustQty) return;
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await api.post(`/products/${adjustingProduct._id}/adjust-stock`, {
        quantity: Number(adjustQty),
        direction: adjustDirection,
        notes: adjustNotes || undefined,
      });
      setSuccessMessage(`Stock adjusted for "${adjustingProduct.name}" successfully.`);
      setAdjustingProduct(null);
      setAdjustQty("");
      setAdjustNotes("");
      load();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Could not adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Inventory &amp; Stock</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Goods Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical products inventory levels, reorder alerts, and manual adjustments (services excluded).
          </p>
        </div>
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <span>Manage Items &amp; Services</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* Success / Error alerts */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-xs">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            ✕
          </button>
        </div>
      )}

      {/* Low Stock Alert Box */}
      {lowStockItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-amber-100 p-1.5 text-amber-700 mt-0.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Low Stock Warning ({lowStockItems.length} {lowStockItems.length === 1 ? "Product" : "Products"})
              </p>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                The following physical goods have reached or fallen below their reorder threshold:{" "}
                <span className="font-semibold text-amber-900">
                  {lowStockItems.map((p) => `${p.name} (${p.currentStock} ${p.unit})`).join(", ")}
                </span>
              </p>
            </div>
            <button
              onClick={() => setFilterMode("low_stock")}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline shrink-0"
            >
              Filter Low Stock &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search physical products by name or SKU…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`rounded-md px-3 py-1 transition ${
              filterMode === "all" ? "bg-white text-indigo-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("low_stock")}
            className={`rounded-md px-3 py-1 transition ${
              filterMode === "low_stock" ? "bg-white text-amber-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Low Stock ({lowStockItems.length})
          </button>
        </div>
      </div>

      {/* Products Stock Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Current Stock</th>
              <th className="px-4 py-3 text-right">Reorder Threshold</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Loading inventory…
                </td>
              </tr>
            )}
            {!isLoading && filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {products.length === 0
                    ? "No physical products found in inventory. Only physical goods track stock (services are excluded)."
                    : "No products match the selected filter."}
                </td>
              </tr>
            )}
            {filteredProducts.map((p) => {
              const threshold = p.lowStockThreshold ?? 5;
              const isOut = p.currentStock <= 0;
              const isLow = p.currentStock <= threshold;

              return (
                <tr key={p._id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div>{p.name}</div>
                    {p.itemsPerUnit && p.itemsPerUnit > 1 && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        1 {p.unit} = {p.itemsPerUnit} {p.secondaryUnit || "PCS"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.sku || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span className={isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-800"}>
                      {p.currentStock.toLocaleString("en-IN")} {p.unit}
                    </span>
                    {p.itemsPerUnit && p.itemsPerUnit > 1 && (
                      <div className="text-[11px] font-normal text-slate-400">
                        ({(p.currentStock * p.itemsPerUnit).toLocaleString("en-IN")} {p.secondaryUnit || "PCS"})
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">
                    {p.lowStockThreshold ?? 5} {p.unit}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isOut
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : isLow
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setAdjustingProduct(p);
                        setAdjustQty("");
                        setAdjustNotes("");
                        setError(null);
                      }}
                      className="rounded-md bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white transition"
                    >
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Adjust Physical Stock</h3>
                <p className="text-xs text-slate-500">{adjustingProduct.name}</p>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between text-xs">
              <span className="text-slate-600">Current Balance:</span>
              <span className="font-bold text-slate-900">
                {adjustingProduct.currentStock} {adjustingProduct.unit}
              </span>
            </div>

            <form onSubmit={submitAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDirection("in")}
                    className={`rounded-lg border p-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      adjustDirection === "in"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>➕ Stock In (Add)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDirection("out")}
                    className={`rounded-lg border p-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      adjustDirection === "out"
                        ? "border-rose-500 bg-rose-50 text-rose-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>➖ Stock Out (Reduce)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Quantity ({adjustingProduct.unit}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 10"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory recount / Damaged goods"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !adjustQty}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition shadow-xs"
                >
                  {isSubmitting ? "Updating…" : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
