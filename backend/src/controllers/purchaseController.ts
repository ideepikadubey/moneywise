import { Response } from "express";
import asyncHandler from "express-async-handler";
import { PurchaseInvoice } from "../models/PurchaseInvoice";
import { Product } from "../models/Product";
import { Party } from "../models/Party";
import { StockMovement } from "../models/StockMovement";
import { calculateLineItem, summarizeInvoice } from "../utils/gstCalc";
import { getNextDocumentNumber } from "../utils/numbering";
import { AuthenticatedRequest } from "../middleware/auth";

export const createPurchaseInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { supplier, docType, items, isInterState, billDate, dueDate, supplierBillNumber, notes, itcEligible } = req.body;

  const supplierDoc = await Party.findOne({ _id: supplier, firm: req.firmId });
  if (!supplierDoc) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  const calculatedItems = items.map((item: any) => {
    const calc = calculateLineItem(item, !!isInterState);
    return { ...item, ...calc };
  });

  const totals = summarizeInvoice(calculatedItems);

  const billNumber = await getNextDocumentNumber(
    req.firmId!,
    docType === "purchase_invoice" || !docType ? "purchase_bill" : docType,
    { prefix: "PB" }
  );

  const bill = await PurchaseInvoice.create({
    firm: req.firmId,
    docType: docType || "purchase_invoice",
    billNumber,
    supplierBillNumber,
    billDate: billDate || new Date(),
    dueDate,
    supplier,
    isInterState: !!isInterState,
    items: calculatedItems,
    ...totals,
    amountDue: totals.grandTotal,
    itcEligible: itcEligible !== false,
    status: "unpaid",
    notes,
    createdBy: req.userId,
  });

  if ((docType || "purchase_invoice") === "purchase_invoice" || docType === "grn") {
    for (const item of calculatedItems) {
      const product = await Product.findOne({ _id: item.product, firm: req.firmId });
      if (!product || product.type === "service") continue;

      const newStock = product.currentStock + item.quantity;
      product.currentStock = newStock;
      await product.save();

      await StockMovement.create({
        firm: req.firmId,
        product: product._id,
        type: "purchase_in",
        quantity: item.quantity,
        referenceModel: "PurchaseInvoice",
        referenceId: bill._id,
        balanceAfter: newStock,
        createdBy: req.userId,
      });
    }

    if (docType !== "grn") {
      supplierDoc.currentBalance -= totals.grandTotal; // you owe the supplier
      await supplierDoc.save();
    }
  }

  res.status(201).json(bill);
});

export const listPurchaseInvoices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { docType, supplier, status, from, to } = req.query;
  const filter: Record<string, any> = { firm: req.firmId };

  if (docType) filter.docType = docType;
  if (supplier) filter.supplier = supplier;
  if (status) filter.status = status;
  if (from || to) {
    filter.billDate = {};
    if (from) filter.billDate.$gte = new Date(from as string);
    if (to) filter.billDate.$lte = new Date(to as string);
  }

  const bills = await PurchaseInvoice.find(filter).populate("supplier", "name gstin").sort({ billDate: -1 });
  res.json(bills);
});

export const getPurchaseInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const bill = await PurchaseInvoice.findOne({ _id: req.params.id, firm: req.firmId })
    .populate("supplier")
    .populate("items.product", "name hsnOrSac unit");
  if (!bill) {
    res.status(404);
    throw new Error("Purchase bill not found");
  }
  res.json(bill);
});
