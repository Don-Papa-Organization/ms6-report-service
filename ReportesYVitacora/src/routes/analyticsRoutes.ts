import { Router } from "express";
import { AnalyticsController } from "../controllers/analyticsController";
import { authenticateToken, requireRoles } from "../middlewares/authMiddleware";
import { TipoUsuario } from "../types/express";

const router = Router();

// Nota: Los controladores de analytics se inicializarán en app.ts con la instancia de la BD

export const createAnalyticsRoutes = (controller: AnalyticsController) => {
  /**
   * Rutas de Analytics - Solo accesible para administradores
   */

  // Resumen de ventas por rango de fechas
  router.get('/sales/summary', authenticateToken, requireRoles(TipoUsuario.administrador), 
    (req, res) => controller.getSalesSummary(req, res));

  // Timeline de ventas diarias
  router.get('/sales/timeline', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.getSalesTimeline(req, res));

  // Productos más vendidos (Top N)
  router.get('/products/top', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.getTopProducts(req, res));

  // Productos sin movimiento (dead stock)
  router.get('/products/dead-stock', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.getDeadStock(req, res));

  // Inventario por categoría
  router.get('/inventory/by-category', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.getInventoryByCategory(req, res));

  // Crecimiento de usuarios
  router.get('/users/growth', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.getUserGrowth(req, res));

  // Usuarios frecuentes activos
  router.get('/users/frequent', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.getFrequentUsers(req, res));

  // Horas pico de ocupación
  router.get('/occupancy/peak-hours', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.getPeakHours(req, res));

  // Tasa de no-show en reservaciones
  router.get('/occupancy/no-show', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.getNoShowRate(req, res));

  // Efectividad de promociones
  router.get('/promotions/effectiveness', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.getPromotionEffectiveness(req, res));

  return router;
};

export default router;
