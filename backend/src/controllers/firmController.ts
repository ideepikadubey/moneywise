import { Response } from "express";
import asyncHandler from "express-async-handler";
import { Firm } from "../models/Firm";
import { FirmMember } from "../models/FirmMember";
import { User } from "../models/User";
import { AuthenticatedRequest } from "../middleware/auth";

export const createFirm = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const firm = await Firm.create({ ...req.body, createdBy: req.userId });

  // Creator automatically becomes the "owner" of this firm
  await FirmMember.create({ user: req.userId, firm: firm._id, role: "owner" });

  res.status(201).json(firm);
});

export const listMyFirms = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const memberships = await FirmMember.find({ user: req.userId, isActive: true }).populate("firm");
  res.json(memberships.map((m) => ({ ...(m.firm as any).toObject(), myRole: m.role })));
});

export const getFirm = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const firm = await Firm.findById(req.firmId);
  if (!firm) {
    res.status(404);
    throw new Error("Firm not found");
  }
  res.json(firm);
});

export const updateFirm = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const firm = await Firm.findByIdAndUpdate(req.firmId, req.body, { new: true, runValidators: true });
  if (!firm) {
    res.status(404);
    throw new Error("Firm not found");
  }
  res.json(firm);
});

// --- Team management (invite/assign roles) ---
export const inviteMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { identifier, role } = req.body; // identifier = invitee's email or phone

  const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
  if (!user) {
    res.status(404);
    throw new Error("No registered user found with this email/phone. They must sign up first.");
  }

  const existing = await FirmMember.findOne({ user: user._id, firm: req.firmId });
  if (existing) {
    res.status(409);
    throw new Error("This user is already a member of this firm");
  }

  const membership = await FirmMember.create({ user: user._id, firm: req.firmId, role: role || "staff" });
  res.status(201).json(membership);
});

export const listMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const members = await FirmMember.find({ firm: req.firmId }).populate("user", "name email phone");
  res.json(members);
});

export const updateMemberRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { role, isActive } = req.body;
  const member = await FirmMember.findOneAndUpdate(
    { _id: req.params.memberId, firm: req.firmId },
    { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
    { new: true }
  );
  if (!member) {
    res.status(404);
    throw new Error("Member not found");
  }
  res.json(member);
});
