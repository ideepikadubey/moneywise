import { Schema, model, Document } from "mongoose";

export interface IFirm extends Document {
  name: string;
  logoUrl?: string;
  signatureUrl?: string;
  signatoryName?: string;
  registrationType?: "gstin" | "udyam" | "business_reg" | "none";
  gstin?: string;
  udyamNumber?: string;
  businessRegNumber?: string;
  pan?: string;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    stateCode?: string; // needed for CGST/SGST vs IGST determination
    pincode?: string;
    country?: string;
  };
  contact: {
    email?: string;
    phone?: string;
    website?: string;
  };
  invoiceSettings: {
    prefix: string; // e.g. "INV"
    nextNumber: number; // auto-incremented
    numberPadding: number; // e.g. 4 => INV-0001
    financialYearReset: boolean; // reset numbering every FY
    termsAndConditions?: string;
    footerNote?: string;
  };
  branding: {
    primaryColor?: string;
    invoiceTemplate: "standard" | "spreadsheet" | "continental" | "compact";
  };
  createdBy: Schema.Types.ObjectId;
  isActive: boolean;
}

const firmSchema = new Schema<IFirm>(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String },
    signatureUrl: { type: String },
    signatoryName: { type: String },
    registrationType: { type: String, enum: ["gstin", "udyam", "business_reg", "none"], default: "gstin" },
    gstin: { type: String, trim: true, uppercase: true },
    udyamNumber: { type: String, trim: true, uppercase: true },
    businessRegNumber: { type: String, trim: true, uppercase: true },
    pan: { type: String, trim: true, uppercase: true },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      stateCode: String,
      pincode: String,
      country: { type: String, default: "India" },
    },
    contact: {
      email: String,
      phone: String,
      website: String,
    },
    invoiceSettings: {
      prefix: { type: String, default: "INV" },
      nextNumber: { type: Number, default: 1 },
      numberPadding: { type: Number, default: 4 },
      financialYearReset: { type: Boolean, default: true },
      termsAndConditions: String,
      footerNote: String,
    },
    branding: {
      primaryColor: { type: String, default: "#2563eb" },
      invoiceTemplate: { type: String, enum: ["standard", "spreadsheet", "continental", "compact"], default: "spreadsheet" },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Firm = model<IFirm>("Firm", firmSchema);
