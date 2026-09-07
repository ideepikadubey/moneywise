import { Response } from "express";
import asyncHandler from "express-async-handler";
import { Product } from "../models/Product";
import { StockMovement } from "../models/StockMovement";
import { AuthenticatedRequest } from "../middleware/auth";

export const createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const isService = req.body.type === "service";
  const openingStock = isService ? 0 : (req.body.openingStock || 0);

  const product = await Product.create({
    ...req.body,
    firm: req.firmId,
    currentStock: openingStock,
  });

  if (!isService && openingStock > 0) {
    await StockMovement.create({
      firm: req.firmId,
      product: product._id,
      type: "opening",
      quantity: openingStock,
      balanceAfter: openingStock,
      createdBy: req.userId,
    });
  }

  res.status(201).json(product);
});

export const listProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, search, lowStock, isActive } = req.query;
  const filter: Record<string, any> = { firm: req.firmId };

  if (type) filter.type = type;
  if (isActive !== undefined) {
    if (isActive !== "all") filter.isActive = isActive === "true";
  } else {
    filter.isActive = { $ne: false };
  }
  if (search) filter.name = { $regex: search as string, $options: "i" };

  let products = await Product.find(filter).sort({ name: 1 });

  if (lowStock === "true") {
    products = products.filter((p) => p.type === "product" && p.lowStockThreshold && p.currentStock <= p.lowStockThreshold);
  }

  res.json(products);
});

export const getProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await Product.findOne({ _id: req.params.id, firm: req.firmId });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json(product);
});

export const updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Stock is never edited directly here - it only changes via StockMovement
  // (purchase/sale/adjustment) so the ledger always stays the source of truth.
  const { currentStock, ...safeUpdates } = req.body;
  const product = await Product.findOneAndUpdate({ _id: req.params.id, firm: req.firmId }, safeUpdates, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json(product);
});

export const deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await Product.findOneAndUpdate({ _id: req.params.id, firm: req.firmId }, { isActive: false }, { new: true });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ message: "Product deactivated" });
});

// --- Manual stock adjustment (module 7: Stock adjustment) ---
export const adjustStock = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { quantity, direction, notes } = req.body; // direction: "in" | "out"

  const product = await Product.findOne({ _id: req.params.id, firm: req.firmId });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const newStock = direction === "in" ? product.currentStock + quantity : product.currentStock - quantity;

  if (newStock < 0) {
    res.status(400);
    throw new Error("This adjustment would result in negative stock");
  }

  product.currentStock = newStock;
  await product.save();

  await StockMovement.create({
    firm: req.firmId,
    product: product._id,
    type: direction === "in" ? "adjustment_in" : "adjustment_out",
    quantity,
    balanceAfter: newStock,
    notes,
    createdBy: req.userId,
  });

  res.json(product);
});
