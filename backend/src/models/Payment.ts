import { Schema, model, Document } from "mongoose";

export interface IPaymentAllocation {
  invoiceModel: "SalesInvoice" | "PurchaseInvoice";
  invoice: Schema.Types.ObjectId;
  amountAllocated: number;
}

const allocationSchema = new Schema<IPaymentAllocation>(
  {
    invoiceModel: { type: String, enum: ["SalesInvoice", "PurchaseInvoice"], required: true },
    invoice: { type: Schema.Types.ObjectId, required: true, refPath: "allocations.invoiceModel" },
    amountAllocated: { type: Number, required: true },
  },
  { _id: false }
);

export interface IPayment extends Document {
  firm: Schema.Types.ObjectId;
  direction: "in" | "out"; // in = from customer, out = to supplier
  party: Schema.Types.ObjectId;
  amount: number;
  isAdvance: boolean; // true if not yet allocated to any invoice
  allocations: IPaymentAllocation[];
  paymentMode: string; // ref PaymentMode.code e.g. "CASH", "UPI", "BANK_TRANSFER"
  bankOrCashAccount?: Schema.Types.ObjectId;
  referenceNumber?: string;
  paymentDate: Date;
  receiptNumber: string;
  notes?: string;
  createdBy: Schema.Types.ObjectId;
}

const paymentSchema = new Schema<IPayment>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    direction: { type: String, enum: ["in", "out"], required: true },
    party: { type: Schema.Types.ObjectId, ref: "Party", required: true },
    amount: { type: Number, required: true },
    isAdvance: { type: Boolean, default: false },
    allocations: [allocationSchema],
    paymentMode: { type: String, required: true, default: "CASH" },
    bankOrCashAccount: { type: Schema.Types.ObjectId, ref: "Account" },
    referenceNumber: String,
    paymentDate: { type: Date, required: true, default: Date.now },
    receiptNumber: { type: String, required: true },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ firm: 1, direction: 1, receiptNumber: 1 }, { unique: true });
paymentSchema.index({ firm: 1, party: 1 });

export const Payment = model<IPayment>("Payment", paymentSchema);
