import { Schema, model, Document } from "mongoose";

export type FirmRole = "owner" | "admin" | "accountant" | "cashier" | "staff";

export interface IFirmMember extends Document {
  user: Schema.Types.ObjectId;
  firm: Schema.Types.ObjectId;
  role: FirmRole;
  permissions: string[]; // fine-grained overrides, e.g. ["sales:create", "reports:view"]
  isActive: boolean;
}

const firmMemberSchema = new Schema<IFirmMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    firm: { type: Schema.Types.ObjectId, ref: "Firm", required: true },
    role: {
      type: String,
      enum: ["owner", "admin", "accountant", "cashier", "staff"],
      required: true,
      default: "staff",
    },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

firmMemberSchema.index({ user: 1, firm: 1 }, { unique: true });

export const FirmMember = model<IFirmMember>("FirmMember", firmMemberSchema);
