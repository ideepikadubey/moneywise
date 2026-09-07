import { Response } from "express";
import asyncHandler from "express-async-handler";
import { Party } from "../models/Party";
import { AuthenticatedRequest } from "../middleware/auth";

export const createParty = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const party = await Party.create({
    ...req.body,
    firm: req.firmId,
    currentBalance: req.body.openingBalance || 0,
  });
  res.status(201).json(party);
});

export const listParties = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, search, isActive } = req.query;
  const filter: Record<string, any> = { firm: req.firmId };

  if (type) filter.type = type === "customer" ? { $in: ["customer", "both"] } : { $in: ["supplier", "both"] };
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) filter.name = { $regex: search as string, $options: "i" };

  const parties = await Party.find(filter).sort({ name: 1 });
  res.json(parties);
});

export const getParty = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const party = await Party.findOne({ _id: req.params.id, firm: req.firmId });
  if (!party) {
    res.status(404);
    throw new Error("Party not found");
  }
  res.json(party);
});

export const updateParty = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const party = await Party.findOneAndUpdate({ _id: req.params.id, firm: req.firmId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!party) {
    res.status(404);
    throw new Error("Party not found");
  }
  res.json(party);
});

export const deleteParty = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Soft delete - billing history must never lose its customer/supplier reference
  const party = await Party.findOneAndUpdate({ _id: req.params.id, firm: req.firmId }, { isActive: false }, { new: true });
  if (!party) {
    res.status(404);
    throw new Error("Party not found");
  }
  res.json({ message: "Party deactivated" });
});
