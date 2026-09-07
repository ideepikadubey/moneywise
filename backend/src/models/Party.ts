import { Schema, model, Document } from "mongoose";

// A "Party" covers both customers and suppliers - most billing systems
// let the same contact act as both, so we use a `type` field instead of
// two separate collections. Filter by type in queries.
export interface IParty extends Document {
  firm: Schema.Types.ObjectId;
  type: "customer" | "supplier" | "both";
  category: "business" | "individual";
  salutation?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  name: string;
  gstin?: string;
  pan?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  stateCode?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  openingBalance: number; // positive = they owe you, negative = you owe them
  currentBalance: number;
  creditLimit?: number;
  creditPeriodDays?: number;
  isActive: boolean;
}

const partySchema = new Schema<IParty>(
  {
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true, index: true },
    type: { type: String, enum: ["customer", "supplier", "both"], required: true },
    category: { type: String, enum: ["business", "individual"], default: "business" },
    salutation: String,
    firstName: String,
    lastName: String,
    companyName: String,
    name: { type: String, required: true, trim: true }, // "Display Name" - what shows on invoices
    gstin: { type: String, trim: true, uppercase: true },
    pan: { type: String, trim: true, uppercase: true },
    billingAddress: String,
    shippingAddress: String,
    state: String,
    stateCode: String,
    phone: String,
    mobile: String,
    email: String,
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    creditLimit: { type: Number },
    creditPeriodDays: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

partySchema.index({ firm: 1, name: 1 });

export const Party = model<IParty>("Party", partySchema);
