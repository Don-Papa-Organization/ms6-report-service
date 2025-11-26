import { Router } from "express";
import { getProductos, getProductoById, createProducto, updateProducto, deleteProducto } from "../controllers/productController"
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticateToken)

router.get("/", getProductos);
router.get("/:id", getProductoById);
router.post("/", createProducto);
router.put("/:id", updateProducto);
router.delete("/:id", deleteProducto);

export default router;