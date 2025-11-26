import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
	getEmpleados,
	getEmpleadoById,
	createEmpleado,
	updateEmpleado,
	desactivarEmpleado,
} from "../controllers/employerController";

const router = Router();

router.get('/', authenticateToken, getEmpleados);
router.get('/:id', authenticateToken, getEmpleadoById);
router.post('/', authenticateToken, createEmpleado);
router.put('/:id', authenticateToken, updateEmpleado);
router.delete('/:id', authenticateToken, desactivarEmpleado);

export default router;

