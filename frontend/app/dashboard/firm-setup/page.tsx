"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api, setActiveFirmId } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { INDIAN_STATES } from "@/lib/indianStates";

export default function FirmSetupPage() {
  const router = useRouter();
  const { firms, refreshFirms } = useAuth();

  const [name, setName] = useState("");
  const [registrationType, setRegistrationType] = useState<"gstin" | "udyam" | "business_reg" | "none">("gstin");
  const [gstin, setGstin] = useState("");
  const [udyamNumber, setUdyamNumber] = useState("");
  const [businessRegNumber, setBusinessRegNumber] = useState("");
  const [state, setState] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleGstinChange(val: string) {
    const upper = val.toUpperCase();
    setGstin(upper);
    if (upper.length >= 2) {
      const code = upper.slice(0, 2);
      const matched = INDIAN_STATES.find((s) => s.code === code);
      if (matched) {
        setState(matched.name);
        setStateCode(matched.code);
      }
    }
  }

  function handleStateChange(stateName: string) {
    setState(stateName);
    const matched = INDIAN_STATES.find((s) => s.name === stateName);
    if (matched) {
      setStateCode(matched.code);
    } else {
      setStateCode("");
    }
  }

  function handleStateCodeChange(code: string) {
    setStateCode(code);
    const matched = INDIAN_STATES.find((s) => s.code === code);
    if (matched) {
      setState(matched.name);
    } else {
      setState("");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const firm = await api.post<{ _id: string }>("/firms", {
        name,
        registrationType,
        gstin: registrationType === "gstin" ? gstin || undefined : undefined,
        udyamNumber: registrationType === "udyam" ? udyamNumber || undefined : undefined,
        businessRegNumber: registrationType === "business_reg" ? businessRegNumber || undefined : undefined,
        address: { state, stateCode },
        invoiceSettings: { prefix: invoicePrefix },
      });
      setActiveFirmId(firm._id);
      await refreshFirms();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Could not create firm");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-between px-6 py-10 bg-slate-50/70">
      <div className="w-full max-w-md my-auto">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/dashboard" className="transition-transform hover:scale-[1.02]">
            <Image
              src="/MoneyWise.png"
              alt="MoneyWise"
              width={190}
              height={127}
              priority
              className="h-20 w-auto object-contain drop-shadow-xs"
            />
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Monitor your money wisely
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Set up your firm</h1>
          <p className="mt-1 text-sm text-slate-600">
            This is the business you&apos;ll invoice from. You can add more firms later and switch between them.
          </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Firm / business name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Acme Trading Co."
            />
          </div>

          {/* Registration Type Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Business Registration Type</label>
            <select
              value={registrationType}
              onChange={(e) => setRegistrationType(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="gstin">GSTIN (GST Registered)</option>
              <option value="udyam">Udyam Reg. No. (MSME)</option>
              <option value="business_reg">Business / Trade License No. (CIN / Shop Act)</option>
              <option value="none">Unregistered / None</option>
            </select>
          </div>

          {registrationType === "gstin" && (
            <div>
              <label className="block text-sm font-medium text-slate-700">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="27ABCDE1234F1Z5"
                maxLength={15}
              />
            </div>
          )}

          {registrationType === "udyam" && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Udyam Registration Number</label>
              <input
                type="text"
                value={udyamNumber}
                onChange={(e) => setUdyamNumber(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="UDYAM-KR-00-0000000"
              />
            </div>
          )}

          {registrationType === "business_reg" && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Business Registration / License Number</label>
              <input
                type="text"
                value={businessRegNumber}
                onChange={(e) => setBusinessRegNumber(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. SHOP-ACT-12345 / CIN / Trade License"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">State</label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">State code</label>
              <select
                value={stateCode}
                onChange={(e) => handleStateCodeChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select Code</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Invoice number prefix</label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="INV"
            />
            <p className="mt-1 text-xs text-slate-500">
              Invoices will look like {invoicePrefix || "INV"}-2026-27-0001
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {isSubmitting ? "Creating firm…" : "Create firm and continue"}
            </button>
            {firms.length > 0 && (
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>
          MoneyWise &bull; monitor your money wisely &bull; a product of{" "}
          <span className="font-semibold text-slate-600">The Dynamite Technologies</span>
        </p>
      </footer>
    </main>
  );
}
