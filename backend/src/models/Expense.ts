import { Schema, model, Document } from "mongoose";

export interface IExpense extends Document {
  firm: Schema.Types.ObjectId;
  expenseNumber: string;
  date: Date;
  category: string;
  amount: number;
  paymentMode: "cash" | "bank" | "upi" | "card" | "net_banking";
  paidTo?: string;
  referenceNumber?: string;
  notes?: string;
  isRecurring?: boolean;
  frequency?: "one_time" | "daily" | "weekly" | "monthly";
  createdBy: Schema.Types.ObjectId;
}

const expenseSchema = new Schema<IExpense>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    expenseNumber: { type: String, required: true },
    date: { type: Date, default: Date.now, required: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ["cash", "bank", "upi", "card", "net_banking"],
      default: "cash",
    },
    paidTo: { type: String, trim: true },
    referenceNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ["one_time", "daily", "weekly", "monthly"],
      default: "one_time",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ firm: 1, date: -1 });

export const Expense = model<IExpense>("Expense", expenseSchema);
