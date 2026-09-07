import { Router } from "express";
import * as paymentController from "../controllers/paymentController";
import { requireAuth } from "../middleware/auth";
import { requireFirmAccess } from "../middleware/firmAccess";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireFirmAccess);

router.post("/", paymentController.recordPayment);
router.get("/", paymentController.listPayments);
router.get("/dues", paymentController.listOutstandingDues); // must stay above "/:id"
router.get("/:id", paymentController.getPayment);

export default router;
