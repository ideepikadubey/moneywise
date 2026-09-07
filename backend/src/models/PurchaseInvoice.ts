import { Schema, model, Document } from "mongoose";
import { ILineItem } from "./SalesInvoice";

const lineItemSchema = new Schema<ILineItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    description: String,
    hsnOrSac: String,
    quantity: { type: Number, required: true },
    unit: { type: String, default: "PCS" },
    rate: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxableValue: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
  },
  { _id: false }
);

export type PurchaseDocType = "purchase_order" | "grn" | "purchase_invoice" | "purchase_return";

export interface IPurchaseInvoice extends Document {
  firm: Schema.Types.ObjectId;
  docType: PurchaseDocType;
  billNumber: string; // internal reference number
  supplierBillNumber?: string; // the supplier's own invoice number
  billDate: Date;
  dueDate?: Date;
  supplier: Schema.Types.ObjectId;
  isInterState: boolean;
  items: ILineItem[];
  subTotal: number;
  totalDiscount: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  itcEligible: boolean; // input tax credit eligibility
  status: "draft" | "unpaid" | "partially_paid" | "paid" | "cancelled";
  linkedFromOrder?: Schema.Types.ObjectId;
  notes?: string;
  createdBy: Schema.Types.ObjectId;
}

const purchaseInvoiceSchema = new Schema<IPurchaseInvoice>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    docType: {
      type: String,
      enum: ["purchase_order", "grn", "purchase_invoice", "purchase_return"],
      default: "purchase_invoice",
    },
    billNumber: { type: String, required: true },
    supplierBillNumber: String,
    billDate: { type: Date, required: true, default: Date.now },
    dueDate: Date,
    supplier: { type: Schema.Types.ObjectId, ref: "Party", required: true },
    isInterState: { type: Boolean, default: false },
    items: [lineItemSchema],
    subTotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTaxableValue: { type: Number, default: 0 },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    itcEligible: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["draft", "unpaid", "partially_paid", "paid", "cancelled"],
      default: "unpaid",
    },
    linkedFromOrder: { type: Schema.Types.ObjectId, ref: "PurchaseInvoice" },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

purchaseInvoiceSchema.index({ firm: 1, docType: 1, billNumber: 1 }, { unique: true });
purchaseInvoiceSchema.index({ firm: 1, supplier: 1 });

export const PurchaseInvoice = model<IPurchaseInvoice>("PurchaseInvoice", purchaseInvoiceSchema);
