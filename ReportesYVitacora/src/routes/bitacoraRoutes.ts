import { Router } from "express";
import { BitacoraController } from "../controllers/bitacoraController";
import { authenticateToken, requireRoles } from "../middlewares/authMiddleware";
import { TipoUsuario } from "../types/express";

const router = Router();
const bitacoraController = new BitacoraController();

/**
 * Rutas para CU46 y CU47 - Gestión de bitácora
 */

// CU46 - Registrar incidente en bitácora (Empleado y Administrador)
// POST /api/bitacora/incidents
// Body: { descripcion: "...", fecha: "2024-01-01", horaInicio: "...", horaFin: "..." }
router.post('/incidents', authenticateToken, requireRoles(TipoUsuario.empleado, TipoUsuario.administrador), bitacoraController.registrarIncidente);

// CU47 - Registrar comentario de jornada (Empleado y Administrador)
// POST /api/bitacora/comments
// Body: { descripcion: "...", fecha: "2024-01-01", horaInicio: "...", horaFin: "..." }
router.post('/comments', authenticateToken, requireRoles(TipoUsuario.empleado, TipoUsuario.administrador), bitacoraController.registrarComentarioJornada);

// Consultar registros de bitácora por empleado (Solo Administrador)
// GET /api/bitacora/employee/:idEmpleado
router.get('/employee/:idEmpleado', authenticateToken, requireRoles(TipoUsuario.administrador), bitacoraController.consultarPorEmpleado);

// Consultar todos los registros de bitácora con filtros (Solo Administrador)
// GET /api/bitacora?tipo=REPORTE_INCIDENTE&fechaInicio=2024-01-01&fechaFin=2024-12-31
router.get('/', authenticateToken, requireRoles(TipoUsuario.administrador), bitacoraController.consultarTodos);

export default router;
