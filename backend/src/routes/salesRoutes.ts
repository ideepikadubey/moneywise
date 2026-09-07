import { Router } from "express";
import * as salesController from "../controllers/salesController";
import { requireAuth } from "../middleware/auth";
import { requireFirmAccess } from "../middleware/firmAccess";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireFirmAccess);

router.post("/", salesController.createSalesInvoice);
router.get("/", salesController.listSalesInvoices);
router.get("/:id", salesController.getSalesInvoice);
router.get("/:id/pdf", salesController.downloadSalesInvoicePdf);
router.post("/:id/cancel", salesController.cancelSalesInvoice);

export default router;
