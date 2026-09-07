import { Router } from "express";
import * as partyController from "../controllers/partyController";
import { partyLedger } from "../controllers/reportController";
import { requireAuth } from "../middleware/auth";
import { requireFirmAccess } from "../middleware/firmAccess";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireFirmAccess);

router.post("/", partyController.createParty);
router.get("/", partyController.listParties);
router.get("/:id", partyController.getParty);
router.get("/:id/ledger", partyLedger);
router.put("/:id", partyController.updateParty);
router.delete("/:id", partyController.deleteParty);

export default router;
