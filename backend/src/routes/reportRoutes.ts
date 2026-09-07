import { Router } from "express";
import * as reportController from "../controllers/reportController";
import { requireAuth } from "../middleware/auth";
import { requireFirmAccess } from "../middleware/firmAccess";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireFirmAccess);

router.get("/sales", reportController.salesReport);
router.get("/purchases", reportController.purchaseReport);
router.get("/gst-summary", reportController.gstSummary);
router.get("/stock", reportController.stockReport);
router.get("/stock/:productId/ledger", reportController.stockLedger);
router.get("/day-book", reportController.dayBook);
router.get("/ledger/:partyId", reportController.partyLedger);
router.get("/profit-loss", reportController.profitLossReport);
router.get("/balance-sheet", reportController.balanceSheetReport);

export default router;
