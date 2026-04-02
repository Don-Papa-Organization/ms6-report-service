import { Router } from "express";
import { SalesController } from "../controllers/salesController";
import { authenticateToken, requireRoles } from "../middlewares/authMiddleware";
import { TipoUsuario } from "../types/express";

/**
 * Rutas para CU011 y CU012 - Gestión de reportes de ventas
 * Accesible para administradores y empleados
 */

export const createSalesRoutes = (salesController: SalesController) => {
  const router = Router();

// CU011 - Consultar historial de ventas
// GET /api/sales/history?fechaInicio=2024-01-01&fechaFin=2024-12-31&estado=entregado&canalVenta=web
// Accesible por administradores y empleados para reportes
router.get('/history', authenticateToken, requireRoles(TipoUsuario.administrador, TipoUsuario.empleado), salesController.consultarHistorialVentas);

// CU011 - Obtener detalle de una venta específica
// GET /api/sales/:idPedido/detail
router.get('/:idPedido/detail', authenticateToken, requireRoles(TipoUsuario.administrador, TipoUsuario.empleado), salesController.obtenerDetalleVenta);

// CU012 - Generar reporte de ventas por fechas
// GET /api/sales/reports/by-dates?fechaInicio=2024-01-01&fechaFin=2024-12-31&formato=pdf&canalVenta=web
// Solo administradores pueden generar reportes consolidados
router.get('/by-dates', authenticateToken, requireRoles(TipoUsuario.administrador), salesController.generarReportePorFechas);

  return router;
};
