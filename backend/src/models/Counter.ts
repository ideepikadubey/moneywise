import { Schema, model, Document } from "mongoose";

// Used for atomic, race-condition-safe invoice/bill/receipt numbering.
// One document per (firm, series, financialYear) combination.
export interface ICounter extends Document {
  firm: Schema.Types.ObjectId;
  series: string; // e.g. "sales_invoice", "purchase_bill", "payment_in_receipt"
  financialYear: string; // e.g. "2026-27", or "ALL" if not FY-reset
  value: number;
}

const counterSchema = new Schema<ICounter>({
  firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true },
  series: { type: String, required: true },
  financialYear: { type: String, required: true },
  value: { type: Number, default: 0 },
});

counterSchema.index({ firm: 1, series: 1, financialYear: 1 }, { unique: true });

export const Counter = model<ICounter>("Counter", counterSchema);
