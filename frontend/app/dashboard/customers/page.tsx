"use client";

import { useEffect, useState, FormEvent, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Party {
  _id: string;
  name: string;
  category: "business" | "individual";
  salutation?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  stateCode?: string;
  openingBalance?: number;
  currentBalance: number;
  creditLimit?: number;
  creditPeriodDays?: number;
  createdAt?: string;
  updatedAt?: string;
}

const SALUTATIONS = ["Mr.", "Ms.", "Mrs.", "Dr."];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "business" | "individual">("all");

  // Modals & Panels state
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Party | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Party | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Party | null>(null);

  // Form Fields (used for both Add and Edit)
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
  const [pan, setPan] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [stateName, setStateName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [creditLimit, setCreditLimit] = useState("");
  const [creditPeriodDays, setCreditPeriodDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadCustomers() {
    setIsLoading(true);
    api
      .get<Party[]>("/parties?type=customer")
      .then(setCustomers)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesCategory =
        selectedCategory === "all" || c.category === selectedCategory;
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search) ||
        (c.companyName && c.companyName.toLowerCase().includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search)) ||
        (c.phone && c.phone.toLowerCase().includes(search)) ||
        (c.mobile && c.mobile.toLowerCase().includes(search)) ||
        (c.gstin && c.gstin.toLowerCase().includes(search));

      return matchesCategory && matchesSearch;
    });
  }, [customers, searchTerm, selectedCategory]);

  function resetForm() {
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
    setPan("");
    setBillingAddress("");
    setShippingAddress("");
    setStateName("");
    setOpeningBalance("0");
    setCreditLimit("");
    setCreditPeriodDays("");
    setFormError(null);
  }

  function openAddModal() {
    resetForm();
    setShowAddModal(true);
  }

  function openEditModal(customer: Party) {
    resetForm();
    setCategory(customer.category || "individual");
    setSalutation(customer.salutation || "");
    setFirstName(customer.firstName || "");
    setLastName(customer.lastName || "");
    setCompanyName(customer.companyName || "");
    setDisplayName(customer.name || "");
    setEmail(customer.email || "");
    setPhone(customer.phone || "");
    setMobile(customer.mobile || "");
    setGstin(customer.gstin || "");
    setPan(customer.pan || "");
    setBillingAddress(customer.billingAddress || "");
    setShippingAddress(customer.shippingAddress || "");
    setStateName(customer.state || "");
    setOpeningBalance(String(customer.openingBalance ?? 0));
    setCreditLimit(customer.creditLimit ? String(customer.creditLimit) : "");
    setCreditPeriodDays(customer.creditPeriodDays ? String(customer.creditPeriodDays) : "");
    setEditingCustomer(customer);
  }

  const suggestedName =
    category === "business"
      ? companyName
      : [firstName, lastName].filter(Boolean).join(" ") || companyName;

  async function handleCreateCustomer(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const finalName = displayName || suggestedName;
    if (!finalName) {
      setFormError("Please provide a display name");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/parties", {
        name: finalName,
        type: "customer",
        category,
        salutation: salutation || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        companyName: companyName || undefined,
        gstin: gstin ? gstin.trim().toUpperCase() : undefined,
        pan: pan ? pan.trim().toUpperCase() : undefined,
        email: email || undefined,
        phone: phone || undefined,
        mobile: mobile || undefined,
        billingAddress: billingAddress || undefined,
        shippingAddress: shippingAddress || undefined,
        state: stateName || undefined,
        openingBalance: Number(openingBalance) || 0,
        creditLimit: creditLimit ? Number(creditLimit) : undefined,
        creditPeriodDays: creditPeriodDays ? Number(creditPeriodDays) : undefined,
      });

      setShowAddModal(false);
      resetForm();
      showToast("Customer created successfully!");
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || "Could not add customer");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateCustomer(e: FormEvent) {
    e.preventDefault();
    if (!editingCustomer) return;
    setFormError(null);
    const finalName = displayName || suggestedName;
    if (!finalName) {
      setFormError("Please provide a display name");
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await api.put<Party>(`/parties/${editingCustomer._id}`, {
        name: finalName,
        category,
        salutation: salutation || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        companyName: companyName || undefined,
        gstin: gstin ? gstin.trim().toUpperCase() : undefined,
        pan: pan ? pan.trim().toUpperCase() : undefined,
        email: email || undefined,
        phone: phone || undefined,
        mobile: mobile || undefined,
        billingAddress: billingAddress || undefined,
        shippingAddress: shippingAddress || undefined,
        state: stateName || undefined,
        creditLimit: creditLimit ? Number(creditLimit) : undefined,
        creditPeriodDays: creditPeriodDays ? Number(creditPeriodDays) : undefined,
      });

      setEditingCustomer(null);
      if (viewingCustomer && viewingCustomer._id === editingCustomer._id) {
        setViewingCustomer(updated);
      }
      resetForm();
      showToast("Customer updated successfully!");
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || "Could not update customer");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCustomer() {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      await api.delete(`/parties/${deletingCustomer._id}`);
      if (viewingCustomer && viewingCustomer._id === deletingCustomer._id) {
        setViewingCustomer(null);
      }
      setDeletingCustomer(null);
      showToast("Customer removed successfully!");
      loadCustomers();
    } catch (err: any) {
      setError(err.message || "Could not delete customer");
    } finally {
      setIsDeleting(false);
    }
  }

  function showToast(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your customer directory, contacts, GST details, and outstanding balances.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition active:scale-[0.99]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
          </svg>
          New Customer
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 shadow-xs">
          <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-xs">
          <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, phone, email, GSTIN..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "all"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setSelectedCategory("business")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "business"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Business
          </button>
          <button
            onClick={() => setSelectedCategory("individual")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "individual"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Individual
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Name &amp; Company</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">GSTIN</th>
                <th className="px-4 py-3.5 text-right">Balance</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-6 w-6 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs">Loading customer directory…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No customers found</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        {searchTerm
                          ? "No customers match your search criteria. Try a different query."
                          : "Get started by adding your first customer to generate invoices."}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={openAddModal}
                          className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          + Add New Customer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {filteredCustomers.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* Name & Subtitle */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <button
                          onClick={() => setViewingCustomer(c)}
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition text-left block"
                        >
                          {c.name}
                        </button>
                        {c.companyName && c.companyName !== c.name && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                            {c.companyName}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type Badge */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        c.category === "business"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-purple-50 text-purple-700 border border-purple-100"
                      }`}
                    >
                      {c.category}
                    </span>
                  </td>

                  {/* Contact Info */}
                  <td className="px-4 py-3.5 text-slate-600 text-xs">
                    <div>{c.mobile || c.phone || "—"}</div>
                    {c.email && (
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{c.email}</div>
                    )}
                  </td>

                  {/* GSTIN */}
                  <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                    {c.gstin ? (
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700 border border-slate-200">
                        {c.gstin}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Balance */}
                  <td className="px-4 py-3.5 text-right font-medium">
                    <span
                      className={`inline-block font-semibold ${
                        c.currentBalance > 0
                          ? "text-amber-600"
                          : c.currentBalance < 0
                          ? "text-emerald-600"
                          : "text-slate-600"
                      }`}
                    >
                      ₹{c.currentBalance.toLocaleString("en-IN")}
                    </span>
                    {c.currentBalance > 0 && (
                      <span className="block text-[10px] text-amber-500 font-normal">Receivable</span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Details */}
                      <button
                        onClick={() => setViewingCustomer(c)}
                        title="View Details"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      {/* Edit Customer */}
                      <button
                        onClick={() => openEditModal(c)}
                        title="Edit Customer"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Ledger Link */}
                      <Link
                        href={`/dashboard/ledger?partyId=${c._id}`}
                        title="View Ledger Statement"
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition border border-indigo-100"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ledger
                      </Link>

                      {/* Delete Customer */}
                      <button
                        onClick={() => setDeletingCustomer(c)}
                        title="Delete Customer"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. VIEW CUSTOMER DETAILS DRAWER / MODAL */}
      {/* ========================================================= */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/50 backdrop-blur-xs transition-opacity">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-6 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {viewingCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{viewingCustomer.name}</h2>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 capitalize border border-indigo-100">
                      {viewingCustomer.category}
                    </span>
                  </div>
                  {viewingCustomer.companyName && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{viewingCustomer.companyName}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setViewingCustomer(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Financial Balance Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200/70">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Current Balance</span>
                  <p
                    className={`text-lg font-bold mt-1 ${
                      viewingCustomer.currentBalance > 0
                        ? "text-amber-600"
                        : viewingCustomer.currentBalance < 0
                        ? "text-emerald-600"
                        : "text-slate-800"
                    }`}
                  >
                    ₹{viewingCustomer.currentBalance.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {viewingCustomer.currentBalance > 0
                      ? "Outstanding Receivable"
                      : viewingCustomer.currentBalance < 0
                      ? "Advance Credit"
                      : "Settled Balance"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Opening Balance</span>
                  <p className="text-base font-semibold text-slate-800 mt-1">
                    ₹{(viewingCustomer.openingBalance ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Credit Terms</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {viewingCustomer.creditPeriodDays ? `${viewingCustomer.creditPeriodDays} Days` : "Not set"}
                  </p>
                  {viewingCustomer.creditLimit && (
                    <span className="text-[11px] text-slate-400">
                      Limit: ₹{viewingCustomer.creditLimit.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{viewingCustomer.email || "No email address provided"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Mobile: {viewingCustomer.mobile || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>Work Phone: {viewingCustomer.phone || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Tax & Legal */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tax &amp; Identification</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-500">GSTIN</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {viewingCustomer.gstin || "Unregistered"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-500">PAN</span>
                      <span className="font-mono font-semibold text-slate-800">{viewingCustomer.pan || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-500">State</span>
                      <span className="font-semibold text-slate-800">{viewingCustomer.state || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Billing Address
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">
                    {viewingCustomer.billingAddress || "No billing address provided."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Shipping Address
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">
                    {viewingCustomer.shippingAddress || viewingCustomer.billingAddress || "Same as billing address."}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/sales/new?partyId=${viewingCustomer._id}`}
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  + New Invoice
                </Link>
                <Link
                  href={`/dashboard/ledger?partyId=${viewingCustomer._id}`}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  View Ledger Statement
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const cust = viewingCustomer;
                    setViewingCustomer(null);
                    openEditModal(cust);
                  }}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  Edit Customer
                </button>
                <button
                  onClick={() => {
                    const cust = viewingCustomer;
                    setViewingCustomer(null);
                    setDeletingCustomer(cust);
                  }}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ADD / EDIT CUSTOMER MODAL */}
      {/* ========================================================= */}
      {(showAddModal || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/50 backdrop-blur-xs transition-opacity">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingCustomer ? "Edit Customer Details" : "Create New Customer"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingCustomer
                    ? "Update party information, contact details, and tax credentials."
                    : "Add a new customer to generate bills, track receivables and GST invoices."}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCustomer(null);
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={editingCustomer ? handleUpdateCustomer : handleCreateCustomer}
              className="p-6 space-y-5 max-h-[75vh] overflow-y-auto"
            >
              {/* Customer Type Selector */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Customer Type
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="customerCategory"
                      checked={category === "business"}
                      onChange={() => setCategory("business")}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="font-medium">Business</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="customerCategory"
                      checked={category === "individual"}
                      onChange={() => setCategory("individual")}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="font-medium">Individual</span>
                  </label>
                </div>
              </div>

              {/* Primary Contact / Company Name Fields */}
              {category === "individual" ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Primary Contact Name
                  </label>
                  <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={salutation}
                      onChange={(e) => setSalutation(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                      className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Company Name
                  </label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Reliance Retail Ltd"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Customer Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={suggestedName || "Select or type to add"}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  This primary name will appear on tax invoices, delivery challans, and ledger entries.
                </p>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@domain.com"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Work Phone
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="011-234567"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Mobile Phone
                    </label>
                    <input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="9876543210"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* GSTIN & PAN */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    GSTIN (15-Digit)
                  </label>
                  <input
                    value={gstin}
                    maxLength={15}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCU9603R1ZM"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm uppercase font-mono focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    PAN (Permanent Account Number)
                  </label>
                  <input
                    value={pan}
                    maxLength={10}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm uppercase font-mono focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Billing Address
                  </label>
                  <textarea
                    rows={2}
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Street, City, State, PIN"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Shipping Address
                  </label>
                  <textarea
                    rows={2}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Leave empty if same as billing"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Financial Balance & Limits (Opening balance only on creation) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {!editingCustomer && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Opening Balance (₹)
                    </label>
                    <input
                      type="number"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="Optional"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Credit Period (Days)
                  </label>
                  <input
                    type="number"
                    value={creditPeriodDays}
                    onChange={(e) => setCreditPeriodDays(e.target.value)}
                    placeholder="e.g. 30"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Form Error Feedback */}
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit / Cancel Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCustomer(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Saving Customer…"
                    : editingCustomer
                    ? "Save Changes"
                    : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. DELETE CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Customer</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove <strong className="text-slate-800">{deletingCustomer.name}</strong>?
                </p>
              </div>
            </div>

            {deletingCustomer.currentBalance !== 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                ⚠️ Notice: This customer has an active balance of{" "}
                <strong>₹{deletingCustomer.currentBalance.toLocaleString("en-IN")}</strong>.
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingCustomer(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCustomer}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-60"
              >
                {isDeleting ? "Deleting…" : "Yes, Delete Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
