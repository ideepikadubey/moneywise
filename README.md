# LedgerFlow — Multi-Firm Billing & GST SaaS

A starter implementation of a multi-firm billing, inventory, and GST platform,
built to the module spec you provided. Backend and frontend both run and build
cleanly out of the box; this is meant as a solid foundation, not a finished product.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript + MongoDB (Mongoose)
- **Auth:** JWT (access + refresh), bcrypt password hashing, optional OTP flow
- **Multi-tenancy:** every business record carries a `firm` id; a `FirmMember`
  collection links users to firms with a role (owner/admin/accountant/cashier/staff)

## Project structure

```
billing-saas/
  backend/
    src/
      config/       # DB connection
      models/       # Mongoose schemas (User, Firm, Party, Product, Sales/PurchaseInvoice, Payment, StockMovement...)
      middleware/    # auth, firm access + RBAC, error handling
      controllers/   # business logic per module
      routes/        # Express routers, mounted per firm
      utils/         # GST calculation, invoice numbering, JWT helpers
      app.ts         # Express app + route wiring
      server.ts      # entry point
  frontend/
    app/
      (auth)/login, (auth)/signup
      dashboard/
        firm-setup, customers, suppliers, products,
        sales, sales/new, purchases, payments, reports, settings
    context/AuthContext.tsx   # session, firm switching
    lib/api.ts                 # fetch wrapper (JWT + firm header)
```

## Running it locally

### Backend

```bash
cd backend
cp .env.example .env     # then fill in MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run dev               # http://localhost:5000
```

You need a MongoDB instance — either local (`mongod`) or a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster. Put its connection
string in `MONGO_URI`.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev               # http://localhost:3000
```

## How the modules map to the code

| Spec module | Where it lives |
|---|---|
| 1. Authentication | `backend/src/controllers/authController.ts`, `frontend/app/(auth)` |
| 2. Firm management | `backend/src/controllers/firmController.ts`, `frontend/app/dashboard/firm-setup`, `.../settings`, `.../settings/team` |
| 3. Master data | `Party` + `Product` models, `frontend/app/dashboard/{customers,suppliers,products}` |
| 4. Purchase | `PurchaseInvoice` model, `purchaseController.ts`, `frontend/app/dashboard/purchases`, `.../purchases/new` |
| 5. Sales | `SalesInvoice` model, `salesController.ts`, `frontend/app/dashboard/sales`, `.../sales/new` (invoice/quotation/order), `.../sales/quotations` |
| 6. Payments | `Payment` model, `paymentController.ts`, `frontend/app/dashboard/payments`, `.../payments/new` (payment in/out with allocation) |
| 7. Inventory | `StockMovement` model (the audit ledger) + `currentStock` on `Product`, `frontend/app/dashboard/stock` |
| 8. GST | `utils/gstCalc.ts` (CGST/SGST vs IGST logic), `reportController.gstSummary` |
| 9. Reports | `reportController.ts` — sales, purchase, GST summary, stock, day book, `frontend/app/dashboard/reports` |
| 10. Settings | `Firm.invoiceSettings` / `Firm.branding`, `frontend/app/dashboard/settings`, team management, `.../notifications` |

## Screen-by-screen coverage

Against the 49-screen flow you provided, here's what exists and what's next:

**Built:** splash/welcome → landing page; signup/login/OTP screens; create-firm +
branding + invoice-settings screens (combined into one firm-setup + settings
flow); customer/supplier/product list + create/edit; main dashboard with
stat cards and fast-action buttons; notifications screen (low stock +
overdue, computed from existing data); purchase entry screen; supplier
payment / customer payment screens (combined into one payment-in/payment-out
form with invoice allocation); sales invoice screen; quotation/estimate and
sales-order screens (share one form via a doc-type switcher); stock
dashboard + manual stock entry/adjustment; GST summary; sales/purchase
reports; outstanding report (folded into the payments page); user
management / team screen.

**Not built yet** — these need real design decisions, not just more CRUD,
so I left them as noted stubs rather than guessing:
- **PDF/print invoice templates & branding** (screens 7, 46) — `Firm.branding`
  stores the choice but nothing renders it yet.
- **Purchase order, GRN, purchase return, sales return** (screens 21, 22, 27) —
  the models support the doc types (`purchase_order`, `grn`, `purchase_return`,
  `sales_return`); only `purchase_invoice` and `invoice` have forms so far.
- **Stock transfer between locations, batch/expiry tracking** (screens 15, 31) —
  `Product.trackBatches` and `StockMovement.batchNumber/expiryDate` exist in
  the schema but no form captures them, and there's no branch/location model yet.
- **Convert quotation/order → invoice** (screens 25, 26) — `linkedFromOrder`
  is on the model; needs an action that re-posts the line items with
  `docType: "invoice"`.
- **GSTR-style reports, HSN summary, ITC summary** (screens 34–36) — the
  current GST summary report gives net payable by CGST/SGST/IGST; a proper
  GSTR-1/GSTR-3B-shaped export needs its own report builder.
- **Backup/export, audit log** (screens 48, 49) — no export-to-Excel/PDF or
  audit trail yet; Mongoose `post-save` hooks writing to an `AuditLog`
  collection is the natural place to add the latter.
- **Notifications as a real system** — the current notifications screen
  computes low-stock/overdue client-side on page load; a proper version
  needs a scheduled backend job and a persisted notifications collection
  (also needed for GST filing reminders and expiry alerts).

## Design decisions worth knowing about

- **Multi-tenancy via `firm` field + `x-firm-id` header**, not separate
  databases per firm. Simpler to run and query across firms (e.g. a "switch
  firm" dropdown), and every model/controller already filters by it.
- **Stock is never edited directly.** Every change (purchase, sale, return,
  manual adjustment) writes a row to `StockMovement`; `Product.currentStock`
  is a cached total kept in sync by the controllers. If the cached total ever
  drifts, you can rebuild it by summing `StockMovement` for that product —
  the ledger is the source of truth.
- **Invoice numbering is atomic** via the `Counter` collection
  (`findOneAndUpdate` with `$inc`), so two people creating invoices at the
  same time never get a duplicate number, and numbering resets per financial
  year (`2026-27`) if the firm wants that.
- **GST split (CGST+SGST vs IGST)** is decided per-invoice via `isInterState`,
  computed from whether the customer's state differs from the firm's — currently
  a checkbox in the UI; wire it to compare `firm.address.stateCode` against
  `customer.stateCode` automatically as a next step.
- Party balances (`currentBalance`) update automatically on invoice creation,
  cancellation, and payment — that's what powers the dues/outstanding report
  and the receivable/payable stat cards on the dashboard overview.

## What's scaffolded vs. what's a stub

**Fully working:** signup/login/OTP/reset, firm creation + team invites +
roles (with a management UI), full firm settings (business details, address,
contact, invoice branding/template — not just the initial setup screen),
customers/suppliers/products CRUD, sales invoices/quotations/sales-orders
with live GST calculation and stock/dues updates, an invoice detail page
with a real PDF download (generated server-side with `pdfkit`, not just
`window.print()`), purchase bill creation (form + API) with GST calc,
payment recording (in/out) with invoice allocation and an outstanding-dues
view, manual stock adjustments with a low-stock dashboard, GST summary +
sales/purchase/stock reports, and a notifications screen.

**Stubbed / needs your next pass:**
- OTP and password-reset emails/SMS just `console.log` the code — wire up
  MSG91/Twilio/SES (or similar) in `authController.ts`.
- Purchase order, GRN, purchase return, and sales return forms (screens 21,
  22, 27) — the data model supports these doc types; only the two most-used
  ones (purchase invoice, sales invoice/quotation/order) have forms.
- Purchase bill and quotation don't have their own PDF download yet — the
  invoice PDF (`utils/invoicePdf.ts`) is the pattern to copy for those.
- Converting a quotation or sales order into an invoice (screens 25, 26) —
  noted directly on the quotations page as the next thing to wire up.
- Batch/expiry tracking on stock (`Product.trackBatches`) and stock transfer
  between locations (screen 31) are modeled but not enforced/built in the UI.
- Negative stock is currently allowed on sales — the spec calls it out as a
  business rule, so make it a per-firm toggle in `invoiceSettings` and check
  it in `salesController.createSalesInvoice`.
- Audit log (screen 49) isn't built — Mongoose `post-save` hooks writing to
  an `AuditLog` collection is the natural place to add it.
- Backup/export to Excel/PDF (screen 48) isn't built.
- Notifications are computed client-side on page load rather than by a
  scheduled backend job — fine for a demo, but GST filing reminders and
  expiry alerts need real server-side scheduling.
- Logo upload is a URL field for now, not a file upload — wiring actual
  file storage (S3/Cloudinary/local disk) is the next step there.

## Next steps I'd recommend

1. Get both servers running locally against a real MongoDB and walk through
   the flow end to end: sign up → create firm → add a customer and product →
   raise a sales invoice → download its PDF → record a payment → check the
   GST summary report.
2. Extend PDF generation to purchase bills and quotations (same `invoicePdf.ts`
   pattern, different totals block).
3. Build the purchase-order → GRN → purchase-invoice chain, and the
   quotation/order → invoice conversion — these turn the app from "record
   what already happened" into an actual workflow tool.
4. Decide on hosting: MongoDB Atlas (free tier is enough to start) + Render/
   Railway for the backend + Vercel for the frontend is a low-friction combo.
