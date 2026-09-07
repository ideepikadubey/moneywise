import { Router } from "express";
import * as purchaseController from "../controllers/purchaseController";
import { requireAuth } from "../middleware/auth";
import { requireFirmAccess } from "../middleware/firmAccess";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireFirmAccess);

router.post("/", purchaseController.createPurchaseInvoice);
router.get("/", purchaseController.listPurchaseInvoices);
router.get("/:id", purchaseController.getPurchaseInvoice);

export default router;
