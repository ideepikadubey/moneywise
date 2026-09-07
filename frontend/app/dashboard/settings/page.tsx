"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { api, getActiveFirmId } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { INDIAN_STATES } from "@/lib/indianStates";

interface Firm {
  name: string;
  registrationType?: "gstin" | "udyam" | "business_reg" | "none";
  gstin?: string;
  udyamNumber?: string;
  businessRegNumber?: string;
  pan?: string;
  logoUrl?: string;
  signatureUrl?: string;
  signatoryName?: string;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
    country?: string;
  };
  contact: { email?: string; phone?: string; website?: string };
  invoiceSettings: {
    prefix: string;
    numberPadding: number;
    financialYearReset: boolean;
    footerNote?: string;
    termsAndConditions?: string;
  };
  branding: { primaryColor: string; invoiceTemplate: "standard" | "spreadsheet" | "continental" | "compact" };
}

const TEMPLATES: { value: Firm["branding"]["invoiceTemplate"]; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "continental", label: "Continental" },
  { value: "compact", label: "Compact" },
];

const TABS = ["Business Details", "Address", "Invoice Branding"] as const;

export default function SettingsPage() {
  const { firms, activeFirmId, switchFirm } = useAuth();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Business Details");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firmId = activeFirmId || getActiveFirmId();
    if (firmId)
      api.get<Firm>(`/firms/${firmId}`).then((data) =>
        setFirm({
          ...data,
          address: data.address || {},
          contact: data.contact || {},
          invoiceSettings: data.invoiceSettings || { prefix: "INV", numberPadding: 4, financialYearReset: true },
          branding: data.branding || { primaryColor: "#4f46e5", invoiceTemplate: "spreadsheet" },
        })
      );
  }, [activeFirmId]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, field: "logoUrl" | "signatureUrl") {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && firm) {
        setFirm({ ...firm, [field]: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firm) return;
    setError(null);
    try {
      const firmId = activeFirmId || getActiveFirmId();
      await api.put(`/firms/${firmId}`, firm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || "Could not save settings");
    }
  }

  if (!firm) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Firm settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage business profile, GSTIN, invoice branding, and preferences</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/firm-setup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New Firm</span>
          </Link>
          <Link
            href="/dashboard/settings/team"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            Manage team →
          </Link>
        </div>
      </div>

      <div className="flex gap-6 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium ${
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {tab === "Business Details" && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">Firm / business name</label>
              <input
                value={firm.name}
                onChange={(e) => setFirm({ ...firm, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Registration Type</label>
                <select
                  value={firm.registrationType || (firm.gstin ? "gstin" : firm.udyamNumber ? "udyam" : firm.businessRegNumber ? "business_reg" : "none")}
                  onChange={(e) => setFirm({ ...firm, registrationType: e.target.value as any })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="gstin">GSTIN (GST Number)</option>
                  <option value="udyam">Udyam Reg # (MSME)</option>
                  <option value="business_reg">Business / Trade License #</option>
                  <option value="none">Unregistered / None</option>
                </select>
              </div>

              {firm.registrationType === "udyam" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Udyam Reg. Number</label>
                  <input
                    value={firm.udyamNumber || ""}
                    onChange={(e) => setFirm({ ...firm, udyamNumber: e.target.value.toUpperCase() })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                    placeholder="UDYAM-KR-00-0000000"
                  />
                </div>
              ) : firm.registrationType === "business_reg" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Business Registration #</label>
                  <input
                    value={firm.businessRegNumber || ""}
                    onChange={(e) => setFirm({ ...firm, businessRegNumber: e.target.value.toUpperCase() })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                    placeholder="SHOP-ACT-12345 / CIN"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700">GSTIN</label>
                  <input
                    value={firm.gstin || ""}
                    onChange={(e) => setFirm({ ...firm, gstin: e.target.value.toUpperCase() })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                    maxLength={15}
                    placeholder="27ABCDE1234F1Z5"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">PAN</label>
                <input
                  value={firm.pan || ""}
                  onChange={(e) => setFirm({ ...firm, pan: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={firm.contact.email || ""}
                  onChange={(e) => setFirm({ ...firm, contact: { ...firm.contact, email: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input
                  value={firm.contact.phone || ""}
                  onChange={(e) => setFirm({ ...firm, contact: { ...firm.contact, phone: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Website</label>
              <input
                value={firm.contact.website || ""}
                onChange={(e) => setFirm({ ...firm, contact: { ...firm.contact, website: e.target.value } })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="https://"
              />
            </div>
          </div>
        )}

        {tab === "Address" && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">Address line 1</label>
              <input
                value={firm.address.line1 || ""}
                onChange={(e) => setFirm({ ...firm, address: { ...firm.address, line1: e.target.value } })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Address line 2</label>
              <input
                value={firm.address.line2 || ""}
                onChange={(e) => setFirm({ ...firm, address: { ...firm.address, line2: e.target.value } })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">City</label>
                <input
                  value={firm.address.city || ""}
                  onChange={(e) => setFirm({ ...firm, address: { ...firm.address, city: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Pincode</label>
                <input
                  value={firm.address.pincode || ""}
                  onChange={(e) => setFirm({ ...firm, address: { ...firm.address, pincode: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">State</label>
                <select
                  value={firm.address.state || ""}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const matched = INDIAN_STATES.find((s) => s.name === selectedName);
                    setFirm({
                      ...firm,
                      address: {
                        ...firm.address,
                        state: selectedName,
                        stateCode: matched ? matched.code : (firm.address.stateCode || ""),
                      },
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                  value={firm.address.stateCode || ""}
                  onChange={(e) => {
                    const selectedCode = e.target.value;
                    const matched = INDIAN_STATES.find((s) => s.code === selectedCode);
                    setFirm({
                      ...firm,
                      address: {
                        ...firm.address,
                        stateCode: selectedCode,
                        state: matched ? matched.name : (firm.address.state || ""),
                      },
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select Code</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Used to auto-detect CGST+SGST vs IGST against a customer&apos;s state.
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "Invoice Branding" && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-800">How do you want your invoices to look?</p>
            <p className="mt-1 text-sm text-slate-500">
              Pick a template that suits your business. This is what customers see on the PDF.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFirm({ ...firm, branding: { ...firm.branding, invoiceTemplate: t.value } })}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    firm.branding.invoiceTemplate === t.value
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <TemplatePreview variant={t.value} />
                  <p className="mt-2 text-center text-xs font-medium uppercase tracking-wide text-slate-600">
                    {t.label}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Organization Logo */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Organization logo</label>
                <div className="mt-2 flex items-center gap-4">
                  {firm.logoUrl ? (
                    <div className="relative flex h-16 w-28 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={firm.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFirm({ ...firm, logoUrl: "" })}
                        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow hover:bg-red-700"
                        title="Remove logo"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-28 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                      No Logo
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                      {firm.logoUrl ? "Change logo" : "Upload logo"}
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "logoUrl")}
                      />
                    </label>
                    <p className="mt-1 text-xs text-slate-400">PNG, JPG, or WEBP up to 2MB</p>
                  </div>
                </div>
              </div>

              {/* Invoice Accent Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Invoice accent color</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={firm.branding.primaryColor || "#4f46e5"}
                    onChange={(e) =>
                      setFirm({ ...firm, branding: { ...firm.branding, primaryColor: e.target.value } })
                    }
                    className="h-10 w-16 cursor-pointer rounded border border-slate-300"
                  />
                  <span className="text-sm font-mono text-slate-600">{firm.branding.primaryColor || "#4f46e5"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Used for headers, highlights, and total amount tags.</p>
              </div>
            </div>

            {/* Digital Signature Section */}
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Digital signature</label>
                <div className="mt-2 flex items-center gap-4">
                  {firm.signatureUrl ? (
                    <div className="relative flex h-16 w-28 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={firm.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFirm({ ...firm, signatureUrl: "" })}
                        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow hover:bg-red-700"
                        title="Remove signature"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-28 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                      No Signature
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                      {firm.signatureUrl ? "Change signature" : "Upload signature"}
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "signatureUrl")}
                      />
                    </label>
                    <p className="mt-1 text-xs text-slate-400">PNG / JPG on clear/white background</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Signatory designation / name</label>
                <input
                  value={firm.signatoryName || ""}
                  onChange={(e) => setFirm({ ...firm, signatoryName: e.target.value })}
                  placeholder="e.g. Authorized Signatory / Director"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-slate-400">Appears right below the signature on the invoice.</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Invoice number prefix</label>
              <input
                value={firm.invoiceSettings.prefix}
                onChange={(e) =>
                  setFirm({ ...firm, invoiceSettings: { ...firm.invoiceSettings, prefix: e.target.value.toUpperCase() } })
                }
                className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Terms &amp; conditions</label>
              <textarea
                value={firm.invoiceSettings.termsAndConditions || ""}
                onChange={(e) =>
                  setFirm({
                    ...firm,
                    invoiceSettings: { ...firm.invoiceSettings, termsAndConditions: e.target.value },
                  })
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Invoice footer note</label>
              <textarea
                value={firm.invoiceSettings.footerNote || ""}
                onChange={(e) =>
                  setFirm({ ...firm, invoiceSettings: { ...firm.invoiceSettings, footerNote: e.target.value } })
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save settings
          </button>
          {saved && <span className="ml-3 text-sm text-emerald-600">Saved</span>}
        </div>
      </form>
    </div>
  );
}

function TemplatePreview({ variant }: { variant: Firm["branding"]["invoiceTemplate"] }) {
  return (
    <div className="flex h-20 flex-col justify-between rounded-md border border-slate-200 bg-slate-50 p-2">
      {variant === "standard" && (
        <>
          <div className="h-2 w-8 rounded bg-slate-300" />
          <div className="space-y-1">
            <div className="h-1 w-full rounded bg-slate-200" />
            <div className="h-1 w-full rounded bg-slate-200" />
          </div>
        </>
      )}
      {variant === "spreadsheet" && (
        <>
          <div className="flex justify-between">
            <div className="h-2 w-6 rounded bg-slate-300" />
            <div className="h-2 w-4 rounded bg-slate-300" />
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-1.5 rounded bg-slate-200" />
            ))}
          </div>
        </>
      )}
      {variant === "continental" && (
        <>
          <div className="h-2 w-full rounded bg-slate-300" />
          <div className="space-y-1">
            <div className="h-1 w-3/4 rounded bg-slate-200" />
            <div className="h-1 w-full rounded bg-slate-200" />
          </div>
        </>
      )}
      {variant === "compact" && (
        <>
          <div className="h-1.5 w-6 rounded bg-slate-300" />
          <div className="space-y-0.5">
            <div className="h-0.5 w-full rounded bg-slate-200" />
            <div className="h-0.5 w-full rounded bg-slate-200" />
            <div className="h-0.5 w-full rounded bg-slate-200" />
          </div>
        </>
      )}
    </div>
  );
}
