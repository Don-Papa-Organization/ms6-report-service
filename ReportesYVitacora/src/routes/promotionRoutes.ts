import { Router } from "express";
import {
    getPromocionesActivas,
    getPromociones,
    getPromocionById,
    createPromocion,
    updatePromocion,
    deletePromocion
} from "../controllers/promotionController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

/**
 * CU031 - Ver promociones activas
 * Acceso: Todos los usuarios autenticados (Cliente, Empleado, Admin)
 * NOTA: Esta ruta debe ir ANTES de /:id para evitar conflictos de enrutamiento
 */
router.get("/activas/:activas", getPromocionesActivas);

/**
 * Obtener una promoción por ID
 * Acceso: Solo Empleado y Administrador
 */
router.get("/:id", getPromocionById);

/**
 * Obtener todas las promociones
 * Acceso: Solo Empleado y Administrador
 */
router.get("/", getPromociones);

/**
 * CU50 - Crear nueva promoción
 * Acceso: Solo Administrador
 */
router.post("/", createPromocion);

/**
 * CU51 - Actualizar promoción
 * Acceso: Solo Administrador
 */
router.put("/:id", updatePromocion);

/**
 * CU52 - Eliminar promoción
 * Acceso: Solo Administrador
 */
router.delete("/:id", deletePromocion);

export default router;
