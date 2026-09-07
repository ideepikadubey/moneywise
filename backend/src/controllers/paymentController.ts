import { Response } from "express";
import asyncHandler from "express-async-handler";
import { Payment } from "../models/Payment";
import { Party } from "../models/Party";
import { SalesInvoice } from "../models/SalesInvoice";
import { PurchaseInvoice } from "../models/PurchaseInvoice";
import { getNextDocumentNumber } from "../utils/numbering";
import { AuthenticatedRequest } from "../middleware/auth";

export const recordPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { direction, party, amount, allocations, paymentMode, referenceNumber, paymentDate, notes, bankOrCashAccount } =
    req.body;

  const partyDoc = await Party.findOne({ _id: party, firm: req.firmId });
  if (!partyDoc) {
    res.status(404);
    throw new Error("Party not found");
  }

  const allocatedTotal = (allocations || []).reduce((s: number, a: any) => s + a.amountAllocated, 0);
  if (allocatedTotal > amount) {
    res.status(400);
    throw new Error("Allocated amount cannot exceed the payment amount");
  }

  const receiptNumber = await getNextDocumentNumber(req.firmId!, direction === "in" ? "receipt_in" : "receipt_out", {
    prefix: direction === "in" ? "RCT" : "PMT",
  });

  const payment = await Payment.create({
    firm: req.firmId,
    direction,
    party,
    amount,
    isAdvance: allocatedTotal < amount,
    allocations: allocations || [],
    paymentMode: paymentMode || "CASH",
    bankOrCashAccount,
    referenceNumber,
    paymentDate: paymentDate || new Date(),
    receiptNumber,
    notes,
    createdBy: req.userId,
  });

  // Apply allocations to the relevant invoices/bills
  for (const alloc of allocations || []) {
    const Model: any = alloc.invoiceModel === "SalesInvoice" ? SalesInvoice : PurchaseInvoice;
    const doc = await Model.findOne({ _id: alloc.invoice, firm: req.firmId });
    if (!doc) continue;

    doc.amountPaid += alloc.amountAllocated;
    doc.amountDue = doc.grandTotal - doc.amountPaid;
    doc.status = doc.amountDue <= 0 ? "paid" : doc.amountPaid > 0 ? "partially_paid" : "unpaid";
    await doc.save();
  }

  // Update party running balance
  // direction "in": customer paying you reduces what they owe (positive balance)
  // direction "out": you paying supplier reduces what you owe (negative balance)
  partyDoc.currentBalance += direction === "in" ? -amount : amount;
  await partyDoc.save();

  res.status(201).json(payment);
});

export const listPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { direction, party, from, to } = req.query;
  const filter: Record<string, any> = { firm: req.firmId };

  if (direction) filter.direction = direction;
  if (party) filter.party = party;
  if (from || to) {
    filter.paymentDate = {};
    if (from) filter.paymentDate.$gte = new Date(from as string);
    if (to) filter.paymentDate.$lte = new Date(to as string);
  }

  const payments = await Payment.find(filter).populate("party", "name").sort({ paymentDate: -1 });
  res.json(payments);
});

export const getPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const payment = await Payment.findOne({ _id: req.params.id, firm: req.firmId }).populate("party");
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }
  res.json(payment);
});

// --- Party outstanding / dues (feeds the Payments module reminders + Reports module) ---
export const listOutstandingDues = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.query; // "customer" | "supplier"
  const filter: Record<string, any> = { firm: req.firmId, isActive: true };
  if (type) filter.type = type === "customer" ? { $in: ["customer", "both"] } : { $in: ["supplier", "both"] };

  const parties = await Party.find({ ...filter, currentBalance: { $ne: 0 } }).sort({ currentBalance: -1 });
  res.json(parties);
});
