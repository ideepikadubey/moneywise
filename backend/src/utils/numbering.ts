import { Counter } from "../models/Counter";
import { Firm } from "../models/Firm";
import { Types } from "mongoose";

/**
 * Returns the current Indian financial year as "2026-27" style string.
 * FY runs April 1 - March 31.
 */
export function currentFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const fyStart = month >= 4 ? year : year - 1;
  const fyEndShort = String((fyStart + 1) % 100).padStart(2, "0");
  return `${fyStart}-${fyEndShort}`;
}

/**
 * Atomically gets the next number in a series for a firm and formats it
 * using the firm's configured prefix + padding, e.g. "INV-2026-27-0001".
 * Use this for sales invoices, purchase bills, and payment receipts.
 */
export async function getNextDocumentNumber(
  firmId: Types.ObjectId | string,
  series: string,
  options?: { resetPerFY?: boolean; prefix?: string; padding?: number }
): Promise<string> {
  const resetPerFY = options?.resetPerFY ?? true;
  const fy = resetPerFY ? currentFinancialYear() : "ALL";

  const counter = await Counter.findOneAndUpdate(
    { firm: firmId, series, financialYear: fy },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  let prefix = options?.prefix;
  let padding = options?.padding ?? 4;

  if (!prefix) {
    const firm = await Firm.findById(firmId).select("invoiceSettings");
    prefix = firm?.invoiceSettings?.prefix || series.toUpperCase().slice(0, 3);
    padding = firm?.invoiceSettings?.numberPadding ?? padding;
  }

  const paddedNumber = String(counter.value).padStart(padding, "0");
  return resetPerFY ? `${prefix}-${fy}-${paddedNumber}` : `${prefix}-${paddedNumber}`;
}
