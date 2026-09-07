import { Router } from "express";
import * as productController from "../controllers/productController";
import { requireAuth } from "../middleware/auth";
import { requireFirmAccess } from "../middleware/firmAccess";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireFirmAccess);

router.post("/", productController.createProduct);
router.get("/", productController.listProducts);
router.get("/:id", productController.getProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
router.post("/:id/adjust-stock", productController.adjustStock);

export default router;
