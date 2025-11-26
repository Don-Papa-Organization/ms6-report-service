import { Router } from "express";
import { BitacoraController } from "../controllers/bitacoraController";

const router = Router();
const bitacoraController = new BitacoraController();

router.get('/empleado/:idEmpleado', bitacoraController.getByEmpleado.bind(bitacoraController));
router.get('/', bitacoraController.getAll.bind(bitacoraController));
router.get('/:id', bitacoraController.getById.bind(bitacoraController));
router.post('/', bitacoraController.create.bind(bitacoraController));
router.put('/:id', bitacoraController.update.bind(bitacoraController));
router.delete('/:id', bitacoraController.delete.bind(bitacoraController));

export default router;
