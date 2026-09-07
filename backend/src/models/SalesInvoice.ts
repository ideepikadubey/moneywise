import { Schema, model, Document } from "mongoose";

export interface ILineItem {
  product: Schema.Types.ObjectId;
  description?: string;
  hsnOrSac?: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxableValue: number; // (qty*rate) - discount
  taxRate: number; // GST %
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number; // taxableValue + tax
}

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

export type SalesDocType = "quotation" | "sales_order" | "invoice" | "delivery_challan" | "sales_return";

export interface ISalesInvoice extends Document {
  firm: Schema.Types.ObjectId;
  docType: SalesDocType;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  customer: Schema.Types.ObjectId;
  placeOfSupplyStateCode?: string;
  isInterState: boolean; // determines IGST vs CGST+SGST
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
  status: "draft" | "unpaid" | "partially_paid" | "paid" | "cancelled";
  linkedFromOrder?: Schema.Types.ObjectId; // e.g. invoice generated from a sales order
  notes?: string;
  createdBy: Schema.Types.ObjectId;
}

const salesInvoiceSchema = new Schema<ISalesInvoice>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    docType: {
      type: String,
      enum: ["quotation", "sales_order", "invoice", "delivery_challan", "sales_return"],
      default: "invoice",
    },
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    dueDate: Date,
    customer: { type: Schema.Types.ObjectId, ref: "Party", required: true },
    placeOfSupplyStateCode: String,
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
    status: {
      type: String,
      enum: ["draft", "unpaid", "partially_paid", "paid", "cancelled"],
      default: "unpaid",
    },
    linkedFromOrder: { type: Schema.Types.ObjectId, ref: "SalesInvoice" },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

salesInvoiceSchema.index({ firm: 1, docType: 1, invoiceNumber: 1 }, { unique: true });
salesInvoiceSchema.index({ firm: 1, customer: 1 });
salesInvoiceSchema.index({ firm: 1, invoiceDate: 1 });

export const SalesInvoice = model<ISalesInvoice>("SalesInvoice", salesInvoiceSchema);
