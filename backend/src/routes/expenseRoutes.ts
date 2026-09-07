import { Router } from "express";
import { createExpense, listExpenses, deleteExpense } from "../controllers/expenseController";
import { requireAuth } from "../middleware/auth";
import { requireFirmAccess } from "../middleware/firmAccess";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireFirmAccess);

router.route("/").post(createExpense).get(listExpenses);
router.route("/:id").delete(deleteExpense);

export default router;
