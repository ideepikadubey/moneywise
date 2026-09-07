import { Response } from "express";
import asyncHandler from "express-async-handler";
import { Expense } from "../models/Expense";
import { getNextDocumentNumber } from "../utils/numbering";
import { AuthenticatedRequest } from "../middleware/auth";

export const createExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { date, category, amount, paymentMode, paidTo, referenceNumber, notes, isRecurring, frequency } = req.body;

  if (!category || !amount) {
    res.status(400);
    throw new Error("Category and Amount are required");
  }

  const expenseNumber = await getNextDocumentNumber(req.firmId!, "EXP", {
    prefix: "EXP",
    padding: 4,
  });

  const expense = await Expense.create({
    firm: req.firmId,
    expenseNumber,
    date: date ? new Date(date) : new Date(),
    category,
    amount: Number(amount),
    paymentMode: paymentMode || "cash",
    paidTo,
    referenceNumber,
    notes,
    isRecurring: Boolean(isRecurring),
    frequency: frequency || "one_time",
    createdBy: req.userId,
  });

  res.status(201).json(expense);
});

export const listExpenses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { category, startDate, endDate, search } = req.query;
  const filter: Record<string, any> = { firm: req.firmId };

  if (category && category !== "all") filter.category = category;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (search) {
    filter.$or = [
      { category: { $regex: search as string, $options: "i" } },
      { paidTo: { $regex: search as string, $options: "i" } },
      { notes: { $regex: search as string, $options: "i" } },
      { expenseNumber: { $regex: search as string, $options: "i" } },
    ];
  }

  const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });

  // Calculate summary metrics (Today & Month totals)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayExpenses = await Expense.aggregate([
    { $match: { firm: req.firmId, date: { $gte: startOfToday } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const monthExpenses = await Expense.aggregate([
    { $match: { firm: req.firmId, date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const recurringTemplates = await Expense.find({ firm: req.firmId, isRecurring: true }).sort({ updatedAt: -1 });

  res.json({
    expenses,
    recurringTemplates,
    summary: {
      todayTotal: todayExpenses[0]?.total || 0,
      monthTotal: monthExpenses[0]?.total || 0,
      totalCount: expenses.length,
    },
  });
});

export const deleteExpense = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, firm: req.firmId });
  if (!expense) {
    res.status(404);
    throw new Error("Expense entry not found");
  }
  res.json({ message: "Expense entry deleted successfully" });
});
