export interface LineItemInput {
  quantity: number;
  rate: number;
  discountPercent?: number;
  taxRate: number; // GST % e.g. 18
}

export interface LineItemCalculated {
  taxableValue: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

/**
 * Calculates tax for a single line item.
 * isInterState determines whether tax splits into CGST+SGST (intra-state)
 * or goes entirely to IGST (inter-state) - the core GST rule.
 */
export function calculateLineItem(item: LineItemInput, isInterState: boolean): LineItemCalculated {
  const gross = item.quantity * item.rate;
  const discountAmount = gross * ((item.discountPercent || 0) / 100);
  const taxableValue = round2(gross - discountAmount);
  const taxAmount = round2(taxableValue * (item.taxRate / 100));

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = taxAmount;
  } else {
    cgstAmount = round2(taxAmount / 2);
    sgstAmount = round2(taxAmount - cgstAmount); // avoids rounding drift
  }

  const totalAmount = round2(taxableValue + cgstAmount + sgstAmount + igstAmount);

  return { taxableValue, discountAmount, cgstAmount, sgstAmount, igstAmount, totalAmount };
}

/**
 * Sums an array of calculated line items into invoice-level totals,
 * including round-off to the nearest rupee (standard Indian invoicing practice).
 */
export function summarizeInvoice(items: LineItemCalculated[]) {
  const subTotal = round2(items.reduce((s, i) => s + i.taxableValue + i.discountAmount, 0));
  const totalDiscount = round2(items.reduce((s, i) => s + i.discountAmount, 0));
  const totalTaxableValue = round2(items.reduce((s, i) => s + i.taxableValue, 0));
  const totalCgst = round2(items.reduce((s, i) => s + i.cgstAmount, 0));
  const totalSgst = round2(items.reduce((s, i) => s + i.sgstAmount, 0));
  const totalIgst = round2(items.reduce((s, i) => s + i.igstAmount, 0));
  const preRoundTotal = totalTaxableValue + totalCgst + totalSgst + totalIgst;
  const grandTotal = Math.round(preRoundTotal);
  const roundOff = round2(grandTotal - preRoundTotal);

  return { subTotal, totalDiscount, totalTaxableValue, totalCgst, totalSgst, totalIgst, roundOff, grandTotal };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
