import { Router } from "express";
import { SalesController } from "../controllers/salesController";
import { authenticateToken, requireRoles } from "../middlewares/authMiddleware";
import { TipoUsuario } from "../types/express";

const router = Router();
const salesController = new SalesController();

/**
 * Rutas para CU011 y CU012 - Gestión de reportes de ventas
 * Solo accesible para administradores
 */

// CU011 - Consultar historial de ventas
// GET /api/sales/history?fechaInicio=2024-01-01&fechaFin=2024-12-31&estado=entregado&canalVenta=web
router.get('/history', authenticateToken, requireRoles(TipoUsuario.administrador), salesController.consultarHistorialVentas);

// CU011 - Obtener detalle de una venta específica
// GET /api/sales/:idPedido/detail
router.get('/:idPedido/detail', authenticateToken, requireRoles(TipoUsuario.administrador), salesController.obtenerDetalleVenta);

// CU012 - Generar reporte de ventas por fechas
// GET /api/sales/reports/by-dates?fechaInicio=2024-01-01&fechaFin=2024-12-31&formato=pdf&canalVenta=web
router.get('/by-dates', authenticateToken, requireRoles(TipoUsuario.administrador), salesController.generarReportePorFechas);

export default router;
