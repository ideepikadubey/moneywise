import { Schema, model, Document } from "mongoose";

// Every stock change (purchase, sale, return, adjustment, transfer) writes
// one row here. currentStock on Product is a cached/denormalized total kept
// in sync by the controller - this collection is the source of truth /
// audit trail, and is what the Stock Report reads from.
export type StockMovementType =
  | "opening"
  | "purchase_in"
  | "sales_out"
  | "sales_return_in"
  | "purchase_return_out"
  | "adjustment_in"
  | "adjustment_out"
  | "transfer_in"
  | "transfer_out";

export interface IStockMovement extends Document {
  firm: Schema.Types.ObjectId;
  product: Schema.Types.ObjectId;
  type: StockMovementType;
  quantity: number; // always positive; direction implied by `type`
  batchNumber?: string;
  expiryDate?: Date;
  referenceModel?: "SalesInvoice" | "PurchaseInvoice";
  referenceId?: Schema.Types.ObjectId;
  balanceAfter: number; // running stock balance after this movement
  notes?: string;
  createdBy: Schema.Types.ObjectId;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: {
      type: String,
      enum: [
        "opening",
        "purchase_in",
        "sales_out",
        "sales_return_in",
        "purchase_return_out",
        "adjustment_in",
        "adjustment_out",
        "transfer_in",
        "transfer_out",
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    batchNumber: String,
    expiryDate: Date,
    referenceModel: { type: String, enum: ["SalesInvoice", "PurchaseInvoice"] },
    referenceId: { type: Schema.Types.ObjectId, refPath: "referenceModel" },
    balanceAfter: { type: Number, required: true },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

stockMovementSchema.index({ firm: 1, product: 1, createdAt: 1 });

export const StockMovement = model<IStockMovement>("StockMovement", stockMovementSchema);
