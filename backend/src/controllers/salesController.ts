import { Response } from "express";
import asyncHandler from "express-async-handler";
import { SalesInvoice } from "../models/SalesInvoice";
import { Product } from "../models/Product";
import { Party } from "../models/Party";
import { Firm } from "../models/Firm";
import { StockMovement } from "../models/StockMovement";
import { calculateLineItem, summarizeInvoice } from "../utils/gstCalc";
import { getNextDocumentNumber } from "../utils/numbering";
import { streamInvoicePdf } from "../utils/invoicePdf";
import { AuthenticatedRequest } from "../middleware/auth";

export const createSalesInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { customer, docType, items, isInterState, invoiceDate, dueDate, notes } = req.body;

  const customerDoc = await Party.findOne({ _id: customer, firm: req.firmId });
  if (!customerDoc) {
    res.status(404);
    throw new Error("Customer not found");
  }

  const calculatedItems = items.map((item: any) => {
    const calc = calculateLineItem(item, !!isInterState);
    return { ...item, ...calc };
  });

  const totals = summarizeInvoice(calculatedItems);

  const invoiceNumber = await getNextDocumentNumber(
    req.firmId!,
    docType === "invoice" || !docType ? "sales_invoice" : docType
  );

  const invoice = await SalesInvoice.create({
    firm: req.firmId,
    docType: docType || "invoice",
    invoiceNumber,
    invoiceDate: invoiceDate || new Date(),
    dueDate,
    customer,
    isInterState: !!isInterState,
    items: calculatedItems,
    ...totals,
    amountDue: totals.grandTotal,
    status: "unpaid",
    notes,
    createdBy: req.userId,
  });

  // Only finalized invoices (not quotations/orders) move stock and dues
  if ((docType || "invoice") === "invoice" || docType === "delivery_challan") {
    for (const item of calculatedItems) {
      const product = await Product.findOne({ _id: item.product, firm: req.firmId });
      if (!product || product.type === "service") continue;

      const newStock = product.currentStock - item.quantity;
      product.currentStock = newStock;
      await product.save();

      await StockMovement.create({
        firm: req.firmId,
        product: product._id,
        type: "sales_out",
        quantity: item.quantity,
        referenceModel: "SalesInvoice",
        referenceId: invoice._id,
        balanceAfter: newStock,
        createdBy: req.userId,
      });
    }

    if (docType !== "delivery_challan") {
      customerDoc.currentBalance += totals.grandTotal;
      await customerDoc.save();
    }
  }

  res.status(201).json(invoice);
});

export const listSalesInvoices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { docType, customer, status, from, to } = req.query;
  const filter: Record<string, any> = { firm: req.firmId };

  if (docType) filter.docType = docType;
  if (customer) filter.customer = customer;
  if (status) filter.status = status;
  if (from || to) {
    filter.invoiceDate = {};
    if (from) filter.invoiceDate.$gte = new Date(from as string);
    if (to) filter.invoiceDate.$lte = new Date(to as string);
  }

  const invoices = await SalesInvoice.find(filter).populate("customer", "name gstin").sort({ invoiceDate: -1 });
  res.json(invoices);
});

export const getSalesInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const invoice = await SalesInvoice.findOne({ _id: req.params.id, firm: req.firmId })
    .populate("firm")
    .populate("customer")
    .populate("items.product", "name hsnOrSac unit");
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }
  res.json(invoice);
});

export const cancelSalesInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const invoice = await SalesInvoice.findOne({ _id: req.params.id, firm: req.firmId });
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }
  if (invoice.status === "cancelled") {
    res.status(400);
    throw new Error("Invoice is already cancelled");
  }

  // Reverse stock movements
  for (const item of invoice.items) {
    const product = await Product.findOne({ _id: item.product, firm: req.firmId });
    if (!product || product.type === "service") continue;
    const newStock = product.currentStock + item.quantity;
    product.currentStock = newStock;
    await product.save();

    await StockMovement.create({
      firm: req.firmId,
      product: product._id,
      type: "sales_return_in",
      quantity: item.quantity,
      referenceModel: "SalesInvoice",
      referenceId: invoice._id,
      balanceAfter: newStock,
      notes: "Reversed due to invoice cancellation",
      createdBy: req.userId,
    });
  }

  // Reverse party due
  const customerDoc = await Party.findById(invoice.customer);
  if (customerDoc) {
    customerDoc.currentBalance -= invoice.grandTotal - invoice.amountPaid;
    await customerDoc.save();
  }

  invoice.status = "cancelled";
  await invoice.save();

  res.json(invoice);
});

export const downloadSalesInvoicePdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const invoice = await SalesInvoice.findOne({ _id: req.params.id, firm: req.firmId })
    .populate("firm")
    .populate("items.product", "name hsnOrSac unit");
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }

  const firm = (invoice.firm as any)?._id ? (invoice.firm as any) : await Firm.findById(req.firmId);
  const customer = await Party.findById(invoice.customer);
  if (!firm || !customer) {
    res.status(404);
    throw new Error("Firm or customer not found");
  }

  const templateOverride = req.query.template as string | undefined;
  if (templateOverride) {
    if (!firm.branding) firm.branding = {};
    firm.branding.invoiceTemplate = templateOverride as any;
  }

  streamInvoicePdf(
    res,
    firm,
    customer,
    {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      isInterState: invoice.isInterState,
      items: invoice.items.map((item) => ({
        description: (item.product as any)?.name || item.description || "Item",
        hsnOrSac: item.hsnOrSac || (item.product as any)?.hsnOrSac,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        taxRate: item.taxRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalAmount: item.totalAmount,
      })),
      subTotal: invoice.subTotal,
      totalDiscount: invoice.totalDiscount,
      totalTaxableValue: invoice.totalTaxableValue,
      totalCgst: invoice.totalCgst,
      totalSgst: invoice.totalSgst,
      totalIgst: invoice.totalIgst,
      roundOff: invoice.roundOff,
      grandTotal: invoice.grandTotal,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      status: invoice.status,
    }
  );
});
