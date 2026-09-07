"use client";

import { useEffect, useState, FormEvent, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import UnitSelect from "@/components/UnitSelect";

interface Product {
  _id: string;
  name: string;
  type: "product" | "service";
  unit: string;
  itemsPerUnit?: number;
  secondaryUnit?: string;
  taxPreference: string;
  taxRate: number;
  interStateTaxRate: number;
  salePrice: number;
  purchasePrice?: number;
  currentStock: number;
  openingStock?: number;
  lowStockThreshold?: number;
  hsnOrSac?: string;
  description?: string;
}

const TAX_PREFERENCES = [
  { value: "taxable", label: "Taxable" },
  { value: "non_taxable", label: "Non-Taxable" },
  { value: "out_of_scope", label: "Out of Scope" },
  { value: "non_gst_supply", label: "Non-GST Supply" },
];

const GST_SLABS = [0, 5, 12, 18, 28];

export default function ItemsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "product" | "service">("all");

  // Form states
  const [type, setType] = useState<"product" | "service">("product");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("PCS");
  const [itemsPerUnit, setItemsPerUnit] = useState("");
  const [secondaryUnit, setSecondaryUnit] = useState("PCS");
  const [hsnOrSac, setHsnOrSac] = useState("");
  const [taxPreference, setTaxPreference] = useState("taxable");
  const [taxRate, setTaxRate] = useState("18");
  const [salePrice, setSalePrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [description, setDescription] = useState("");
  const [openingStock, setOpeningStock] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function load() {
    setIsLoading(true);
    api
      .get<Product[]>("/products")
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function resetForm() {
    setEditingProduct(null);
    setType("product");
    setName("");
    setUnit("PCS");
    setItemsPerUnit("");
    setSecondaryUnit("PCS");
    setHsnOrSac("");
    setTaxPreference("taxable");
    setTaxRate("18");
    setSalePrice("");
    setPurchasePrice("");
    setDescription("");
    setOpeningStock("0");
    setLowStockThreshold("0");
    setShowForm(false);
    setError(null);
  }

  function handleStartNew() {
    resetForm();
    setShowForm(true);
  }

  function handleStartEdit(p: Product) {
    setEditingProduct(p);
    setType(p.type || "product");
    setName(p.name || "");
    setUnit(p.unit || "PCS");
    setItemsPerUnit(p.itemsPerUnit && p.itemsPerUnit > 1 ? String(p.itemsPerUnit) : "");
    setSecondaryUnit(p.secondaryUnit || "PCS");
    setHsnOrSac(p.hsnOrSac || "");
    setTaxPreference(p.taxPreference || "taxable");
    setTaxRate(String(p.taxRate ?? 18));
    setSalePrice(String(p.salePrice ?? ""));
    setPurchasePrice(String(p.purchasePrice ?? ""));
    setDescription(p.description || "");
    setOpeningStock(String(p.openingStock ?? 0));
    setLowStockThreshold(String(p.lowStockThreshold ?? 0));
    setShowForm(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const rate = taxPreference === "taxable" ? Number(taxRate) || 0 : 0;
      const payload: any = {
        name,
        type,
        unit,
        itemsPerUnit: Number(itemsPerUnit) || 1,
        secondaryUnit: secondaryUnit || "PCS",
        hsnOrSac: hsnOrSac || undefined,
        taxPreference,
        taxRate: rate,
        interStateTaxRate: rate,
        salePrice: Number(salePrice) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        description: description || undefined,
        lowStockThreshold: type === "product" ? Number(lowStockThreshold) || 0 : 0,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, payload);
        setSuccessMessage(`Product "${name}" updated successfully.`);
      } else {
        payload.openingStock = type === "product" ? Number(openingStock) || 0 : 0;
        await api.post("/products", payload);
        setSuccessMessage(`Product "${name}" added successfully.`);
      }

      resetForm();
      load();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Could not save item");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingProduct) return;
    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.delete(`/products/${deletingProduct._id}`);
      setSuccessMessage(`Item "${deletingProduct.name}" removed successfully.`);
      setDeletingProduct(null);
      load();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Could not remove item");
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterType !== "all" && p.type !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(query);
        const hsnMatch = p.hsnOrSac?.toLowerCase().includes(query);
        return nameMatch || hsnMatch;
      }
      return true;
    });
  }, [products, filterType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Items &amp; Products</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage goods, services, inventory levels, and pricing</p>
        </div>
        <button
          onClick={showForm ? resetForm : handleStartNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-xs transition"
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Item</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
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

      {/* Create / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              {editingProduct ? `Edit Item: ${editingProduct.name}` : "Create New Item"}
            </h2>
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {editingProduct ? "Updating Details" : "New Inventory Record"}
            </span>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Item Type</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="itemType"
                  checked={type === "product"}
                  onChange={() => setType("product")}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Goods (Physical Inventory)
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="itemType"
                  checked={type === "service"}
                  onChange={() => setType("service")}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Service (Non-Physical)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wireless Mouse / Consulting Fee"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measurement</label>
              <UnitSelect value={unit} onChange={setUnit} />
            </div>
          </div>

          {/* Conversion / Items per Box or Crate */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 transition-all">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Items / Quantity per {unit || "Box/Crate"} (Optional Conversion)
                </label>
                <p className="mt-0.5 text-xs text-indigo-600">
                  Specify how many items/pieces are inside 1 {unit} (e.g. 30 eggs per Crate / 12 items per Box).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Qty:</span>
                  <input
                    type="number"
                    min="1"
                    value={itemsPerUnit}
                    onChange={(e) => setItemsPerUnit(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-20 font-bold text-slate-800 focus:outline-none text-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">In:</span>
                  <input
                    type="text"
                    value={secondaryUnit}
                    onChange={(e) => setSecondaryUnit(e.target.value.toUpperCase())}
                    placeholder="PCS"
                    className="w-16 uppercase font-bold text-slate-800 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>
            {Number(itemsPerUnit) > 1 && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-indigo-100/80 px-2.5 py-1 text-xs font-semibold text-indigo-950">
                <span>💡 Packaging Formula:</span>
                <span className="font-bold text-indigo-900">1 {unit} = {itemsPerUnit} {secondaryUnit || "PCS"}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tax Preference <span className="text-red-500">*</span>
            </label>
            <select
              value={taxPreference}
              onChange={(e) => setTaxPreference(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {TAX_PREFERENCES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Selling Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Purchase / Cost Price (₹)</label>
              <input
                type="number"
                step="any"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description / Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional item details or specifications shown on invoices"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {taxPreference === "taxable" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">GST Tax Rates &amp; HSN/SAC</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Intra-State GST Rate (CGST + SGST)</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    {GST_SLABS.map((r) => (
                      <option key={r} value={r}>
                        GST {r}% {r > 0 ? `(${r / 2}% CGST + ${r / 2}% SGST)` : "(0%)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Inter-State GST Rate (IGST)</label>
                  <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 font-medium">
                    IGST {taxRate}%
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">HSN / SAC Code</label>
                <input
                  value={hsnOrSac}
                  onChange={(e) => setHsnOrSac(e.target.value)}
                  className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. 8471 or 9983"
                />
              </div>
            </div>
          )}

          {type === "product" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Stock &amp; Inventory</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600">Opening Stock Quantity</label>
                    <input
                      type="number"
                      value={openingStock}
                      onChange={(e) => setOpeningStock(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600">Low Stock Reorder Alert Level</label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              {editingProduct && (
                <p className="text-xs text-slate-500">
                  Current stock level: <span className="font-semibold text-slate-800">{editingProduct.currentStock} {editingProduct.unit}</span>. (To record physical stock changes, use Stock Adjustments).
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition shadow-xs"
            >
              {isSubmitting ? (editingProduct ? "Updating…" : "Saving…") : editingProduct ? "Update Item" : "Save Item"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search items by name or HSN/SAC…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-md px-3 py-1 transition ${
              filterType === "all" ? "bg-white text-indigo-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Items ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("product")}
            className={`rounded-md px-3 py-1 transition ${
              filterType === "product" ? "bg-white text-indigo-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Goods ({products.filter((p) => p.type === "product").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("service")}
            className={`rounded-md px-3 py-1 transition ${
              filterType === "service" ? "bg-white text-indigo-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Services ({products.filter((p) => p.type === "service").length})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">HSN/SAC</th>
              <th className="px-4 py-3">Tax</th>
              <th className="px-4 py-3 text-right">Sale Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Loading items…
                </td>
              </tr>
            )}
            {!isLoading && filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {products.length === 0
                    ? "No items added yet. Click 'New Item' above to get started."
                    : "No items match your search criteria."}
                </td>
              </tr>
            )}
            {filteredProducts.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <div>{p.name}</div>
                  {p.itemsPerUnit && p.itemsPerUnit > 1 && (
                    <span className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 mt-0.5">
                      1 {p.unit} = {p.itemsPerUnit} {p.secondaryUnit || "PCS"}
                    </span>
                  )}
                  {p.description && <p className="text-xs text-slate-400 line-clamp-1">{p.description}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      p.type === "product" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
                    }`}
                  >
                    {p.type === "product" ? "Goods" : "Service"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.hsnOrSac || "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.taxPreference === "taxable" ? (
                    <span className="font-medium text-slate-700">{p.taxRate}% GST</span>
                  ) : (
                    <span className="text-slate-400 capitalize">{p.taxPreference.replace(/_/g, " ")}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                  ₹{p.salePrice.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {p.type === "product" ? (
                    <div>
                      <span
                        className={
                          p.lowStockThreshold && p.currentStock <= p.lowStockThreshold
                            ? "inline-flex items-center gap-1 font-bold text-amber-600"
                            : "font-medium"
                        }
                      >
                        {p.currentStock.toLocaleString("en-IN")} {p.unit}
                      </span>
                      {p.itemsPerUnit && p.itemsPerUnit > 1 && (
                        <div className="text-[11px] font-normal text-indigo-600">
                          ({(p.currentStock * p.itemsPerUnit).toLocaleString("en-IN")} {p.secondaryUnit || "PCS"})
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    {p.type === "product" && (
                      <Link
                        href={`/dashboard/stock?productId=${p._id}`}
                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        title="Adjust or view stock movements"
                      >
                        Stock
                      </Link>
                    )}
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                      title="Edit product details"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingProduct(p)}
                      className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                      title="Remove product"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Item</h3>
                <p className="text-xs text-slate-500">Confirm removing this product from active listings</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to remove <strong className="text-slate-900">&quot;{deletingProduct.name}&quot;</strong>? It will no longer appear when creating new sales invoices or purchase bills. Past invoices and financial records will remain preserved.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingProduct(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition shadow-xs"
              >
                {isDeleting ? "Removing…" : "Yes, Remove Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
