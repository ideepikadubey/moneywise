import PDFDocument from "pdfkit";
import { Response } from "express";

interface PdfLineItem {
  description: string;
  hsnOrSac?: string;
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

interface PdfFirm {
  name: string;
  logoUrl?: string;
  signatureUrl?: string;
  signatoryName?: string;
  gstin?: string;
  udyamNumber?: string;
  businessRegNumber?: string;
  pan?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  contact?: { email?: string; phone?: string };
  invoiceSettings?: { footerNote?: string; termsAndConditions?: string };
  branding?: {
    primaryColor?: string;
    invoiceTemplate?: "standard" | "spreadsheet" | "continental" | "compact" | string;
  };
}

interface PdfParty {
  name: string;
  gstin?: string;
  billingAddress?: string;
  state?: string;
  email?: string;
  phone?: string;
  mobile?: string;
}

interface PdfInvoice {
  invoiceNumber: string;
  invoiceDate: Date | string;
  dueDate?: Date | string;
  isInterState: boolean;
  items: PdfLineItem[];
  subTotal: number;
  totalDiscount: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  status: string;
}

function parseImageBuffer(dataUrlOrPath?: string): Buffer | null {
  if (!dataUrlOrPath) return null;
  try {
    if (dataUrlOrPath.startsWith("data:image/")) {
      const base64Index = dataUrlOrPath.indexOf(";base64,");
      if (base64Index !== -1) {
        const base64Data = dataUrlOrPath.substring(base64Index + 8);
        return Buffer.from(base64Data, "base64");
      }
    }
  } catch (err) {
    console.error("Error parsing image buffer for PDF:", err);
  }
  return null;
}

function formatCurrency(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d?: Date | string): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Streams a formatted invoice PDF directly to the HTTP response.
 * Supports standard, spreadsheet, continental, and compact templates.
 */
export function streamInvoicePdf(res: Response, firm: PdfFirm, party: PdfParty, invoice: PdfInvoice): void {
  const template = firm.branding?.invoiceTemplate || "standard";
  const isCompact = template === "compact";
  const isSpreadsheet = template === "spreadsheet";
  const isContinental = template === "continental";

  const margin = isCompact ? 28 : 40;
  const doc = new PDFDocument({ size: "A4", margin });
  const accentColor = firm.branding?.primaryColor || "#4f46e5";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNumber}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  const logoBuffer = parseImageBuffer(firm.logoUrl);

  // =========================================================================
  // 1. HEADER SECTION PER TEMPLATE
  // =========================================================================
  let billToY = 120;

  if (isContinental) {
    // CONTINENTAL: Full-bleed top color banner
    doc.rect(0, 0, doc.page.width, 95).fill(accentColor);

    let firmTextX = left;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, left, 25, { fit: [85, 45] });
        firmTextX = left + 95;
      } catch (e) {
        console.error("Error embedding logo in continental PDF:", e);
      }
    }

    // Firm name in bold white
    doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text(firm.name, firmTextX, 26);
    doc.fillColor("#e2e8f0").fontSize(8).font("Helvetica");
    const addr = [firm.address?.line1, firm.address?.line2, firm.address?.city, firm.address?.state, firm.address?.pincode].filter(Boolean).join(", ");
    if (addr) doc.text(addr, firmTextX, doc.y + 1, { width: 230 });
    if (firm.gstin) doc.text(`GSTIN: ${firm.gstin}`, firmTextX, doc.y + 1);

    // Header Right
    doc.fillColor("#ffffff").fontSize(15).font("Helvetica-Bold").text("TAX INVOICE", left, 26, { width: pageWidth, align: "right" });
    doc.fillColor("#e2e8f0").fontSize(9).font("Helvetica")
      .text(`#${invoice.invoiceNumber}`, left, 46, { width: pageWidth, align: "right" })
      .text(`Date: ${formatDate(invoice.invoiceDate)}`, left, doc.y + 1, { width: pageWidth, align: "right" });
    if (invoice.dueDate) doc.text(`Due: ${formatDate(invoice.dueDate)}`, left, doc.y + 1, { width: pageWidth, align: "right" });

    billToY = 115;
  } else {
    // STANDARD / SPREADSHEET / COMPACT HEADER
    if (!isSpreadsheet && !isCompact) {
      // Top colored accent bar for Standard
      doc.rect(left, 26, pageWidth, 3).fill(accentColor);
    }

    let firmTextX = left;
    const firmTextY = isCompact ? 30 : 42;

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, left, firmTextY - 4, { fit: [isCompact ? 75 : 95, isCompact ? 35 : 45] });
        firmTextX = left + (isCompact ? 85 : 105);
      } catch (e) {
        console.error("Error embedding logo in PDF:", e);
      }
    }

    doc.fillColor(accentColor).fontSize(isCompact ? 14 : 17).font("Helvetica-Bold").text(firm.name, firmTextX, firmTextY);
    doc.fillColor("#334155").fontSize(isCompact ? 7.5 : 8.5).font("Helvetica");
    const addr = [firm.address?.line1, firm.address?.line2, firm.address?.city, firm.address?.state, firm.address?.pincode].filter(Boolean).join(", ");
    if (addr) doc.text(addr, firmTextX, doc.y + 2, { width: pageWidth * 0.5 });
    if (firm.gstin) {
      doc.text(`GSTIN: ${firm.gstin}`, firmTextX, doc.y + 2);
    } else if (firm.udyamNumber) {
      doc.text(`Udyam: ${firm.udyamNumber}`, firmTextX, doc.y + 2);
    }
    if (firm.contact?.email || firm.contact?.phone) {
      doc.text([firm.contact?.email, firm.contact?.phone].filter(Boolean).join("  |  "), firmTextX, doc.y + 2);
    }

    doc.fillColor("#0f172a").fontSize(isCompact ? 13 : 16).font("Helvetica-Bold")
      .text("TAX INVOICE", left, firmTextY, { width: pageWidth, align: "right" });
    doc.fontSize(isCompact ? 8 : 9).font("Helvetica").fillColor("#475569")
      .text(`Invoice #: ${invoice.invoiceNumber}`, left, firmTextY + (isCompact ? 18 : 24), { width: pageWidth, align: "right" })
      .text(`Date: ${formatDate(invoice.invoiceDate)}`, left, doc.y + 2, { width: pageWidth, align: "right" });
    if (invoice.dueDate) {
      doc.text(`Due: ${formatDate(invoice.dueDate)}`, left, doc.y + 2, { width: pageWidth, align: "right" });
    }

    billToY = Math.max(doc.y + 12, isCompact ? 95 : 115);
  }

  // =========================================================================
  // 2. BILL TO SECTION (With Customer Mobile Number!)
  // =========================================================================
  const customerMobile = party.phone || party.mobile;

  if (isSpreadsheet) {
    // Spreadsheet: Boxed border for party
    doc.roundedRect(left, billToY - 4, pageWidth, 52, 3).strokeColor("#cbd5e1").stroke();
  } else {
    doc.moveTo(left, billToY - 5).lineTo(left + pageWidth, billToY - 5).strokeColor("#e2e8f0").stroke();
  }

  doc.fillColor("#94a3b8").fontSize(8).font("Helvetica-Bold").text("BILL TO CUSTOMER", left + (isSpreadsheet ? 6 : 0), billToY);
  doc.fillColor("#0f172a").fontSize(10.5).font("Helvetica-Bold").text(party.name, left + (isSpreadsheet ? 6 : 0), doc.y + 2);
  doc.fontSize(8.5).font("Helvetica").fillColor("#475569");

  // RENDER CUSTOMER MOBILE NUMBER HERE
  if (customerMobile) {
    doc.fillColor(accentColor).font("Helvetica-Bold").text(`Mobile / Phone: ${customerMobile}`, left + (isSpreadsheet ? 6 : 0), doc.y + 2);
    doc.fillColor("#475569").font("Helvetica");
  }
  if (party.billingAddress) doc.text(party.billingAddress, left + (isSpreadsheet ? 6 : 0), doc.y + 1, { width: pageWidth * 0.55 });
  if (party.gstin) doc.text(`GSTIN: ${party.gstin}`, left + (isSpreadsheet ? 6 : 0), doc.y + 1);

  // =========================================================================
  // 3. LINE ITEMS TABLE
  // =========================================================================
  const tableTop = Math.max(doc.y + 16, billToY + 60);
  const rowHeight = isCompact ? 16 : 20;

  const cols = {
    desc: { x: left, w: pageWidth * 0.44 },
    hsn: { x: left + pageWidth * 0.44, w: pageWidth * 0.12 },
    qty: { x: left + pageWidth * 0.56, w: pageWidth * 0.10 },
    rate: { x: left + pageWidth * 0.66, w: pageWidth * 0.13 },
    tax: { x: left + pageWidth * 0.79, w: pageWidth * 0.08 },
    amount: { x: left + pageWidth * 0.87, w: pageWidth * 0.13 },
  };

  // Header row
  if (isSpreadsheet) {
    doc.rect(left, tableTop, pageWidth, rowHeight).fill("#f1f5f9");
    doc.rect(left, tableTop, pageWidth, rowHeight).strokeColor("#94a3b8").stroke();
    doc.fillColor("#0f172a").fontSize(8).font("Helvetica-Bold");
  } else {
    doc.rect(left, tableTop, pageWidth, rowHeight).fill(accentColor);
    doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
  }

  doc.text("ITEM & DESCRIPTION", cols.desc.x + 5, tableTop + (rowHeight - 9) / 2);
  doc.text("HSN/SAC", cols.hsn.x, tableTop + (rowHeight - 9) / 2, { width: cols.hsn.w, align: "right" });
  doc.text("QTY", cols.qty.x, tableTop + (rowHeight - 9) / 2, { width: cols.qty.w, align: "right" });
  doc.text("RATE", cols.rate.x, tableTop + (rowHeight - 9) / 2, { width: cols.rate.w, align: "right" });
  doc.text("TAX", cols.tax.x, tableTop + (rowHeight - 9) / 2, { width: cols.tax.w, align: "right" });
  doc.text("AMOUNT", cols.amount.x, tableTop + (rowHeight - 9) / 2, { width: cols.amount.w - 5, align: "right" });

  let rowY = tableTop + rowHeight + 3;
  doc.font("Helvetica").fontSize(isCompact ? 8 : 8.5).fillColor("#0f172a");

  invoice.items.forEach((item, i) => {
    if (i % 2 === 1 || isSpreadsheet) {
      doc.rect(left, rowY - 2, pageWidth, rowHeight).fill(i % 2 === 1 ? "#f8fafc" : "#ffffff");
      if (isSpreadsheet) {
        doc.rect(left, rowY - 2, pageWidth, rowHeight).strokeColor("#e2e8f0").stroke();
      }
      doc.fillColor("#0f172a");
    }

    doc.text(item.description, cols.desc.x + 5, rowY + 2, { width: cols.desc.w - 8, lineBreak: false });
    doc.text(item.hsnOrSac || "-", cols.hsn.x, rowY + 2, { width: cols.hsn.w, align: "right" });
    doc.text(`${item.quantity} ${item.unit}`, cols.qty.x, rowY + 2, { width: cols.qty.w, align: "right" });
    doc.text(item.rate.toLocaleString("en-IN"), cols.rate.x, rowY + 2, { width: cols.rate.w, align: "right" });
    doc.text(`${item.taxRate}%`, cols.tax.x, rowY + 2, { width: cols.tax.w, align: "right" });
    doc.text(item.totalAmount.toLocaleString("en-IN"), cols.amount.x, rowY + 2, { width: cols.amount.w - 5, align: "right" });

    rowY += rowHeight;
  });

  doc.moveTo(left, rowY + 2).lineTo(left + pageWidth, rowY + 2).strokeColor("#cbd5e1").stroke();

  // =========================================================================
  // 4. TOTALS BLOCK
  // =========================================================================
  let totalsY = rowY + 12;
  const totalsX = left + pageWidth - 200;
  const totalLine = (label: string, value: string, bold = false) => {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? (isCompact ? 10 : 11) : (isCompact ? 8 : 8.5))
      .fillColor(bold ? "#0f172a" : "#475569")
      .text(label, totalsX, totalsY, { width: 100 })
      .text(value, totalsX + 100, totalsY, { width: 100, align: "right" });
    totalsY += bold ? 16 : 14;
  };

  totalLine("Taxable Value", formatCurrency(invoice.totalTaxableValue));
  if (invoice.isInterState) {
    totalLine("IGST", formatCurrency(invoice.totalIgst));
  } else {
    totalLine("CGST", formatCurrency(invoice.totalCgst));
    totalLine("SGST", formatCurrency(invoice.totalSgst));
  }
  if (invoice.roundOff) totalLine("Round Off", formatCurrency(invoice.roundOff));
  doc.moveTo(totalsX, totalsY).lineTo(totalsX + 200, totalsY).strokeColor("#cbd5e1").stroke();
  totalsY += 4;
  totalLine("Grand Total", formatCurrency(invoice.grandTotal), true);
  if (invoice.amountPaid > 0) {
    totalLine("Amount Paid", formatCurrency(invoice.amountPaid));
    totalLine("Balance Due", formatCurrency(invoice.amountDue), true);
  }

  // =========================================================================
  // 5. SIGNATURE BLOCK
  // =========================================================================
  const sigBuffer = parseImageBuffer(firm.signatureUrl);
  const signatureBlockY = Math.max(totalsY + 14, rowY + 50);
  const signatoryX = left + pageWidth - 160;

  doc.fontSize(8).font("Helvetica-Bold").fillColor("#475569")
    .text(`For ${firm.name}`, signatoryX, signatureBlockY, { width: 160, align: "right" });

  let sigImageY = signatureBlockY + 12;
  if (sigBuffer) {
    try {
      doc.image(sigBuffer, signatoryX + 40, sigImageY, { fit: [120, 32] });
      sigImageY += 34;
    } catch (e) {
      console.error("Error embedding signature in PDF:", e);
      sigImageY += 25;
    }
  } else {
    sigImageY += 25;
  }

  doc.fontSize(7.5).font("Helvetica").fillColor("#64748b")
    .text(firm.signatoryName || "Authorized Signatory", signatoryX, sigImageY, { width: 160, align: "right" });

  // Terms & Conditions on the left
  if (firm.invoiceSettings?.termsAndConditions) {
    const termsY = rowY + 14;
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#94a3b8").text("TERMS & CONDITIONS", left, termsY);
    doc.font("Helvetica").fillColor("#64748b")
      .text(firm.invoiceSettings.termsAndConditions, left, doc.y + 2, { width: pageWidth * 0.5 });
  }

  // Footer note
  if (firm.invoiceSettings?.footerNote) {
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#94a3b8")
      .text(firm.invoiceSettings.footerNote, left, doc.page.height - doc.page.margins.bottom - 12, {
        width: pageWidth,
        align: "center",
      });
  }

  doc.end();
}
