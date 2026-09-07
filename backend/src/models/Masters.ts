import { Schema, model, Document } from "mongoose";

// --- Tax Rate master (GST slabs a firm uses: 0%, 5%, 12%, 18%, 28%) ---
export interface ITaxRate extends Document {
  firm: Schema.Types.ObjectId;
  name: string; // e.g. "GST 18%"
  ratePercent: number;
  isActive: boolean;
}
const taxRateSchema = new Schema<ITaxRate>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    name: { type: String, required: true },
    ratePercent: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const TaxRate = model<ITaxRate>("TaxRate", taxRateSchema);

// --- Unit of Measure master ---
export interface IUnitOfMeasure extends Document {
  firm: Schema.Types.ObjectId;
  code: string; // "PCS", "KG", "LTR", "BOX"
  name: string; // "Pieces", "Kilogram"
}
const unitSchema = new Schema<IUnitOfMeasure>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);
unitSchema.index({ firm: 1, code: 1 }, { unique: true });
export const UnitOfMeasure = model<IUnitOfMeasure>("UnitOfMeasure", unitSchema);

// --- Bank / Cash Account master (for payments module) ---
export interface IAccount extends Document {
  firm: Schema.Types.ObjectId;
  type: "cash" | "bank";
  name: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
}
const accountSchema = new Schema<IAccount>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    type: { type: String, enum: ["cash", "bank"], required: true },
    name: { type: String, required: true },
    accountNumber: String,
    ifsc: String,
    bankName: String,
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const Account = model<IAccount>("Account", accountSchema);
