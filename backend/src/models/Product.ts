import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  firm: Schema.Types.ObjectId;
  type: "product" | "service"; // "Goods" / "Service" in the UI
  name: string;
  sku?: string;
  category?: string;
  unit: string; // ref to UnitOfMeasure.code, e.g. "PCS", "KG"
  itemsPerUnit?: number; // e.g. 30 (30 items/pcs per box or crate)
  secondaryUnit?: string; // e.g. "PCS"
  hsnOrSac?: string;
  taxPreference: "taxable" | "non_taxable" | "out_of_scope" | "non_gst_supply";
  taxRate: number; // GST % e.g. 18 (intra-state / CGST+SGST rate)
  interStateTaxRate: number; // IGST % - usually equals taxRate but kept separate like Zoho
  purchasePrice: number;
  salePrice: number;
  mrp?: number;
  openingStock: number;
  currentStock: number; // updated on every stock movement
  lowStockThreshold?: number;
  trackBatches: boolean;
  description?: string;
  isActive: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    type: { type: String, enum: ["product", "service"], default: "product" },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    category: { type: String, trim: true },
    unit: { type: String, default: "PCS" },
    itemsPerUnit: { type: Number, default: 1 },
    secondaryUnit: { type: String, default: "PCS" },
    hsnOrSac: { type: String, trim: true },
    taxPreference: {
      type: String,
      enum: ["taxable", "non_taxable", "out_of_scope", "non_gst_supply"],
      default: "taxable",
    },
    taxRate: { type: Number, default: 0 },
    interStateTaxRate: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    mrp: { type: Number },
    openingStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    trackBatches: { type: Boolean, default: false },
    description: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ firm: 1, name: 1 });
productSchema.index({ firm: 1, sku: 1 });

export const Product = model<IProduct>("Product", productSchema);
