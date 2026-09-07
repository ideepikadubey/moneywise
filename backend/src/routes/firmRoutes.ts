import { Router } from "express";
import * as firmController from "../controllers/firmController";
import { requireAuth } from "../middleware/auth";
import { requireFirmAccess, requireRole } from "../middleware/firmAccess";

const router = Router();

router.use(requireAuth);

router.post("/", firmController.createFirm);
router.get("/", firmController.listMyFirms);

router.get("/:firmId", requireFirmAccess, firmController.getFirm);
router.put("/:firmId", requireFirmAccess, requireRole("owner", "admin"), firmController.updateFirm);

router.post("/:firmId/members", requireFirmAccess, requireRole("owner", "admin"), firmController.inviteMember);
router.get("/:firmId/members", requireFirmAccess, firmController.listMembers);
router.put(
  "/:firmId/members/:memberId",
  requireFirmAccess,
  requireRole("owner", "admin"),
  firmController.updateMemberRole
);

export default router;
