import { Response } from "express";
import asyncHandler from "express-async-handler";
import { SalesInvoice } from "../models/SalesInvoice";
import { PurchaseInvoice } from "../models/PurchaseInvoice";
import { StockMovement } from "../models/StockMovement";
import { Product } from "../models/Product";
import { Party } from "../models/Party";
import { Payment } from "../models/Payment";
import { Expense } from "../models/Expense";
import { AuthenticatedRequest } from "../middleware/auth";

function dateFilter(from?: string, to?: string) {
  const filter: Record<string, any> = {};
  if (from || to) {
    filter.$gte = from ? new Date(from) : undefined;
    filter.$lte = to ? new Date(to) : undefined;
    Object.keys(filter).forEach((k) => filter[k] === undefined && delete filter[k]);
  }
  return filter;
}

// Sales report: totals + list, optionally grouped by customer or item
export const salesReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { from, to } = req.query;
  const df = dateFilter(from as string, to as string);

  const match: Record<string, any> = { firm: req.firmId, docType: "invoice", status: { $ne: "cancelled" } };
  if (Object.keys(df).length) match.invoiceDate = df;

  const invoices = await SalesInvoice.find(match).populate("customer", "name");
  const totals = invoices.reduce(
    (acc, inv) => {
      acc.grandTotal += inv.grandTotal;
      acc.taxableValue += inv.totalTaxableValue;
      acc.cgst += inv.totalCgst;
      acc.sgst += inv.totalSgst;
      acc.igst += inv.totalIgst;
      return acc;
    },
    { grandTotal: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 }
  );

  res.json({ totals, count: invoices.length, invoices });
});

export const purchaseReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { from, to } = req.query;
  const df = dateFilter(from as string, to as string);

  const match: Record<string, any> = { firm: req.firmId, docType: "purchase_invoice", status: { $ne: "cancelled" } };
  if (Object.keys(df).length) match.billDate = df;

  const bills = await PurchaseInvoice.find(match).populate("supplier", "name");
  const totals = bills.reduce(
    (acc, b) => {
      acc.grandTotal += b.grandTotal;
      acc.taxableValue += b.totalTaxableValue;
      acc.cgst += b.totalCgst;
      acc.sgst += b.totalSgst;
      acc.igst += b.totalIgst;
      return acc;
    },
    { grandTotal: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 }
  );

  res.json({ totals, count: bills.length, bills });
});

// GST summary: output liability (from sales) vs input tax credit (from purchases)
export const gstSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { from, to } = req.query;
  const df = dateFilter(from as string, to as string);

  const salesMatch: Record<string, any> = { firm: req.firmId, docType: "invoice", status: { $ne: "cancelled" } };
  if (Object.keys(df).length) salesMatch.invoiceDate = df;

  const purchaseMatch: Record<string, any> = {
    firm: req.firmId,
    docType: "purchase_invoice",
    status: { $ne: "cancelled" },
    itcEligible: true,
  };
  if (Object.keys(df).length) purchaseMatch.billDate = df;

  const [sales, purchases] = await Promise.all([
    SalesInvoice.find(salesMatch),
    PurchaseInvoice.find(purchaseMatch),
  ]);

  const outputLiability = sales.reduce(
    (acc, s) => {
      acc.cgst += s.totalCgst;
      acc.sgst += s.totalSgst;
      acc.igst += s.totalIgst;
      return acc;
    },
    { cgst: 0, sgst: 0, igst: 0 }
  );

  const inputCredit = purchases.reduce(
    (acc, p) => {
      acc.cgst += p.totalCgst;
      acc.sgst += p.totalSgst;
      acc.igst += p.totalIgst;
      return acc;
    },
    { cgst: 0, sgst: 0, igst: 0 }
  );

  const netPayable = {
    cgst: Math.max(0, outputLiability.cgst - inputCredit.cgst),
    sgst: Math.max(0, outputLiability.sgst - inputCredit.sgst),
    igst: Math.max(0, outputLiability.igst - inputCredit.igst),
  };

  res.json({ outputLiability, inputCredit, netPayable });
});

// Stock report: current levels + movement history for a product
export const stockReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const products = await Product.find({ firm: req.firmId, isActive: true }).select(
    "name sku currentStock lowStockThreshold unit"
  );
  res.json(products);
});

export const stockLedger = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const movements = await StockMovement.find({ firm: req.firmId, product: req.params.productId }).sort({
    createdAt: 1,
  });
  res.json(movements);
});

// Day book: all sales, purchases, and payments for a given day
export const dayBook = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { date } = req.query;
  const day = date ? new Date(date as string) : new Date();
  const start = new Date(day.setHours(0, 0, 0, 0));
  const end = new Date(day.setHours(23, 59, 59, 999));

  const [sales, purchases] = await Promise.all([
    SalesInvoice.find({ firm: req.firmId, invoiceDate: { $gte: start, $lte: end } }).populate("customer", "name"),
    PurchaseInvoice.find({ firm: req.firmId, billDate: { $gte: start, $lte: end } }).populate("supplier", "name"),
  ]);

  res.json({ date: start, sales, purchases });
});

// Party Ledger: complete transaction statement (Invoices, Bills, Payments) with running balance
export const partyLedger = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { partyId } = req.params;
  const { from, to } = req.query;

  const party = await Party.findOne({ _id: partyId, firm: req.firmId });
  if (!party) {
    res.status(404);
    throw new Error("Party not found");
  }

  const fromDate = from ? new Date(from as string) : undefined;
  const toDate = to ? new Date(to as string) : undefined;
  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  // 1. Fetch all financial transactions for this party in this firm
  const [salesInvoices, purchaseBills, payments] = await Promise.all([
    SalesInvoice.find({
      firm: req.firmId,
      customer: party._id,
      status: { $ne: "cancelled" },
      docType: { $in: ["invoice", "sales_return"] },
    }).sort({ invoiceDate: 1, createdAt: 1 }),
    PurchaseInvoice.find({
      firm: req.firmId,
      supplier: party._id,
      status: { $ne: "cancelled" },
      docType: { $in: ["purchase_invoice", "purchase_return"] },
    }).sort({ billDate: 1, createdAt: 1 }),
    Payment.find({
      firm: req.firmId,
      party: party._id,
    }).sort({ paymentDate: 1, createdAt: 1 }),
  ]);

  interface RawEntry {
    date: Date;
    createdAt: Date;
    type: "sales_invoice" | "sales_return" | "purchase_bill" | "purchase_return" | "payment_in" | "payment_out";
    docType: string;
    docId: string;
    voucherNumber: string;
    description: string;
    paymentMode?: string;
    referenceNumber?: string;
    notes?: string;
    debit: number;
    credit: number;
  }

  const allEntries: RawEntry[] = [];

  for (const inv of salesInvoices) {
    const isReturn = inv.docType === "sales_return";
    allEntries.push({
      date: new Date(inv.invoiceDate),
      createdAt: (inv as any).createdAt || new Date(inv.invoiceDate),
      type: isReturn ? "sales_return" : "sales_invoice",
      docType: inv.docType,
      docId: inv._id.toString(),
      voucherNumber: inv.invoiceNumber,
      description: isReturn ? "Sales Return" : "Sales Invoice",
      notes: inv.notes,
      debit: isReturn ? 0 : inv.grandTotal,
      credit: isReturn ? inv.grandTotal : 0,
    });
  }

  for (const bill of purchaseBills) {
    const isReturn = bill.docType === "purchase_return";
    allEntries.push({
      date: new Date(bill.billDate),
      createdAt: (bill as any).createdAt || new Date(bill.billDate),
      type: isReturn ? "purchase_return" : "purchase_bill",
      docType: bill.docType,
      docId: bill._id.toString(),
      voucherNumber: bill.billNumber || bill.supplierBillNumber || "BILL",
      description: isReturn
        ? "Purchase Return"
        : bill.supplierBillNumber
        ? `Purchase Bill (Supplier Ref: ${bill.supplierBillNumber})`
        : "Purchase Bill",
      notes: bill.notes,
      debit: isReturn ? bill.grandTotal : 0,
      credit: isReturn ? 0 : bill.grandTotal,
    });
  }

  for (const pmt of payments) {
    const isReceived = pmt.direction === "in";
    allEntries.push({
      date: new Date(pmt.paymentDate),
      createdAt: (pmt as any).createdAt || new Date(pmt.paymentDate),
      type: isReceived ? "payment_in" : "payment_out",
      docType: "payment",
      docId: pmt._id.toString(),
      voucherNumber: pmt.receiptNumber,
      description: isReceived ? `Payment Received (${pmt.paymentMode})` : `Payment Made (${pmt.paymentMode})`,
      paymentMode: pmt.paymentMode,
      referenceNumber: pmt.referenceNumber,
      notes: pmt.notes,
      debit: isReceived ? 0 : pmt.amount,
      credit: isReceived ? pmt.amount : 0,
    });
  }

  // Sort chronologically
  allEntries.sort((a, b) => a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime());

  // Calculate opening balance before fromDate
  let openingBalance = party.openingBalance || 0;

  const periodEntries: RawEntry[] = [];

  for (const entry of allEntries) {
    const entryTime = entry.date.getTime();
    if (fromDate && entryTime < fromDate.getTime()) {
      openingBalance += entry.debit - entry.credit;
    } else if (!toDate || entryTime <= toDate.getTime()) {
      periodEntries.push(entry);
    }
  }

  let currentRunning = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  const formattedEntries = periodEntries.map((e) => {
    currentRunning += e.debit - e.credit;
    totalDebit += e.debit;
    totalCredit += e.credit;

    return {
      date: e.date,
      type: e.type,
      docType: e.docType,
      docId: e.docId,
      voucherNumber: e.voucherNumber,
      description: e.description,
      paymentMode: e.paymentMode,
      referenceNumber: e.referenceNumber,
      notes: e.notes,
      debit: e.debit,
      credit: e.credit,
      runningBalance: Math.abs(currentRunning),
      balanceType: currentRunning >= 0 ? ("Dr" as const) : ("Cr" as const),
    };
  });

  const closingBalance = currentRunning;

  res.json({
    party: {
      _id: party._id,
      name: party.name,
      type: party.type,
      category: party.category,
      companyName: party.companyName,
      gstin: party.gstin,
      pan: party.pan,
      phone: party.phone,
      mobile: party.mobile,
      email: party.email,
      billingAddress: party.billingAddress,
      state: party.state,
      stateCode: party.stateCode,
      currentBalance: party.currentBalance,
    },
    period: {
      from: from || null,
      to: to || null,
    },
    openingBalance: Math.abs(openingBalance),
    openingBalanceType: openingBalance >= 0 ? "Dr" : "Cr",
    entries: formattedEntries,
    summary: {
      openingBalance: Math.abs(openingBalance),
      openingBalanceType: openingBalance >= 0 ? "Dr" : "Cr",
      totalDebit,
      totalCredit,
      closingBalance: Math.abs(closingBalance),
      closingBalanceType: closingBalance >= 0 ? "Dr" : "Cr",
    },
  });
});

// Profit & Loss Statement (P&L)
export const profitLossReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { from, to } = req.query;
  const df = dateFilter(from as string, to as string);

  const salesMatch: Record<string, any> = { firm: req.firmId, docType: "invoice", status: { $ne: "cancelled" } };
  const salesReturnMatch: Record<string, any> = { firm: req.firmId, docType: "sales_return", status: { $ne: "cancelled" } };
  const purchaseMatch: Record<string, any> = { firm: req.firmId, docType: "purchase_invoice", status: { $ne: "cancelled" } };
  const purchaseReturnMatch: Record<string, any> = { firm: req.firmId, docType: "purchase_return", status: { $ne: "cancelled" } };
  const expenseMatch: Record<string, any> = { firm: req.firmId };

  if (Object.keys(df).length) {
    salesMatch.invoiceDate = df;
    salesReturnMatch.invoiceDate = df;
    purchaseMatch.billDate = df;
    purchaseReturnMatch.billDate = df;
    expenseMatch.date = df;
  }

  const [salesInvoices, salesReturns, purchaseBills, purchaseReturns, expensesList] = await Promise.all([
    SalesInvoice.find(salesMatch),
    SalesInvoice.find(salesReturnMatch),
    PurchaseInvoice.find(purchaseMatch),
    PurchaseInvoice.find(purchaseReturnMatch),
    Expense.find(expenseMatch),
  ]);

  const grossSales = salesInvoices.reduce((sum, i) => sum + i.totalTaxableValue, 0);
  const totalSalesReturns = salesReturns.reduce((sum, r) => sum + r.totalTaxableValue, 0);
  const netSalesRevenue = grossSales - totalSalesReturns;

  const grossPurchases = purchaseBills.reduce((sum, b) => sum + b.totalTaxableValue, 0);
  const totalPurchaseReturns = purchaseReturns.reduce((sum, r) => sum + r.totalTaxableValue, 0);
  const costOfGoodsSold = grossPurchases - totalPurchaseReturns;

  const grossProfit = netSalesRevenue - costOfGoodsSold;

  const expensesByCategory: Record<string, number> = {};
  let totalOperatingExpenses = 0;

  for (const exp of expensesList) {
    const cat = exp.category || "Other";
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount;
    totalOperatingExpenses += exp.amount;
  }

  const netOperatingProfit = grossProfit - totalOperatingExpenses;

  res.json({
    period: { from: from || null, to: to || null },
    revenue: {
      grossSales,
      salesReturns: totalSalesReturns,
      netSalesRevenue,
    },
    cogs: {
      grossPurchases,
      purchaseReturns: totalPurchaseReturns,
      costOfGoodsSold,
    },
    grossProfit,
    expenses: {
      byCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount })),
      totalOperatingExpenses,
    },
    netOperatingProfit,
  });
});

// Balance Sheet Report
export const balanceSheetReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const [customerParties, supplierParties, products, payments, salesInvoices, purchaseBills, expensesList] = await Promise.all([
    Party.find({ firm: req.firmId, type: { $in: ["customer", "both"] } }),
    Party.find({ firm: req.firmId, type: { $in: ["supplier", "both"] } }),
    Product.find({ firm: req.firmId, isActive: true }),
    Payment.find({ firm: req.firmId }),
    SalesInvoice.find({ firm: req.firmId, status: { $ne: "cancelled" } }),
    PurchaseInvoice.find({ firm: req.firmId, status: { $ne: "cancelled" } }),
    Expense.find({ firm: req.firmId }),
  ]);

  const accountsReceivable = customerParties.reduce((sum, p) => sum + (p.currentBalance > 0 ? p.currentBalance : 0), 0);
  const accountsPayable = supplierParties.reduce((sum, p) => sum + (p.currentBalance < 0 ? Math.abs(p.currentBalance) : 0), 0);

  const stockValuation = products.reduce((sum, prod) => {
    const val = (prod.currentStock || 0) * (prod.purchasePrice || prod.salePrice || 0);
    return sum + (val > 0 ? val : 0);
  }, 0);

  const totalCashIn = payments.filter((p) => p.direction === "in").reduce((s, p) => s + p.amount, 0);
  const totalCashOut = payments.filter((p) => p.direction === "out").reduce((s, p) => s + p.amount, 0);
  const totalExpensesPaid = expensesList.reduce((s, e) => s + e.amount, 0);
  const netCashBankBalance = totalCashIn - (totalCashOut + totalExpensesPaid);

  const totalCurrentAssets = Math.max(0, netCashBankBalance) + accountsReceivable + stockValuation;

  const totalSalesRevenue =
    salesInvoices.filter((i) => i.docType === "invoice").reduce((s, i) => s + i.totalTaxableValue, 0) -
    salesInvoices.filter((i) => i.docType === "sales_return").reduce((s, i) => s + i.totalTaxableValue, 0);

  const totalPurchasesCost =
    purchaseBills.filter((b) => b.docType === "purchase_invoice").reduce((s, b) => s + b.totalTaxableValue, 0) -
    purchaseBills.filter((b) => b.docType === "purchase_return").reduce((s, b) => s + b.totalTaxableValue, 0);

  const grossProfit = totalSalesRevenue - totalPurchasesCost;
  const netRetainedEarnings = grossProfit - totalExpensesPaid;

  const totalLiabilities = accountsPayable;
  const totalEquity = netRetainedEarnings;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  res.json({
    assets: {
      cashAndBank: Math.max(0, netCashBankBalance),
      accountsReceivable,
      inventoryValuation: stockValuation,
      totalAssets: totalCurrentAssets,
    },
    liabilities: {
      accountsPayable,
      totalLiabilities,
    },
    equity: {
      retainedEarnings: netRetainedEarnings,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
  });
});


