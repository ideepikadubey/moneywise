"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Party {
  _id: string;
  name: string;
  category: "business" | "individual";
  companyName?: string;
  gstin?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  currentBalance: number;
}

const SALUTATIONS = ["Mr.", "Ms.", "Mrs.", "Dr."];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<"business" | "individual">("individual");
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [gstin, setGstin] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function load() {
    setIsLoading(true);
    api
      .get<Party[]>("/parties?type=customer")
      .then(setCustomers)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  // Suggest a display name from whatever identifying info has been entered,
  // same as Zoho's "Select or type to add" behaviour - the person can still
  // override it by typing their own.
  const suggestedName =
    category === "business"
      ? companyName
      : [firstName, lastName].filter(Boolean).join(" ") || companyName;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const name = displayName || suggestedName;
    if (!name) {
      setError("Please provide a display name");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/parties", {
        name,
        type: "customer",
        category,
        salutation: salutation || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        companyName: companyName || undefined,
        gstin: gstin || undefined,
        email: email || undefined,
        phone: phone || undefined,
        mobile: mobile || undefined,
        openingBalance: Number(openingBalance) || 0,
      });
      setCategory("individual");
      setSalutation("");
      setFirstName("");
      setLastName("");
      setCompanyName("");
      setDisplayName("");
      setEmail("");
      setPhone("");
      setMobile("");
      setGstin("");
      setOpeningBalance("0");
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message || "Could not add customer");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "New Customer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <label className="mb-2 flex items-center gap-1 text-sm font-medium text-slate-700">
              Customer Type
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={category === "business"}
                  onChange={() => setCategory("business")}
                />
                Business
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  checked={category === "individual"}
                  onChange={() => setCategory("individual")}
                />
                Individual
              </label>
            </div>
          </div>

          {category === "individual" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700">Primary Contact</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <select
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Salutation</option>
                  {SALUTATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700">Company Name</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Display Name<span className="text-red-500">*</span>
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={suggestedName || "Select or type to add"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">This is what appears on invoices and reports.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Work Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Mobile</label>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">GSTIN (optional)</label>
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Opening balance (₹)</label>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">GSTIN</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && customers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No customers yet. Click &quot;New Customer&quot; above.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-3 text-slate-500 capitalize">{c.category}</td>
                <td className="px-4 py-3 text-slate-500">{c.email || c.mobile || c.phone || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{c.gstin || "—"}</td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    c.currentBalance > 0 ? "text-amber-600" : "text-slate-500"
                  }`}
                >
                  ₹{c.currentBalance.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/ledger?partyId=${c._id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Ledger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
