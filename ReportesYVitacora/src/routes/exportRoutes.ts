import { Router } from "express";
import { ExportController } from "../controllers/exportController";
import { authenticateToken, requireRoles } from "../middlewares/authMiddleware";
import { TipoUsuario } from "../types/express";

const router = Router();

export const createExportRoutes = (controller: ExportController) => {
  /**
   * Rutas de Exportación - Solo accesible para administradores
   */

  // Exportar datos en JSON
  router.get('/data', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.exportJSON(req, res));

  // Exportar PDF
  router.get('/pdf', authenticateToken, requireRoles(TipoUsuario.administrador),
    (req, res) => controller.exportPDF(req, res));

  return router;
};

export default router;
