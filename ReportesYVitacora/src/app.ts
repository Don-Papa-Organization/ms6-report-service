import express, { Express, Request, Response, NextFunction} from "express";
import salesRoutes from "./routes/salesRoutes";
import bitacoraRoutes from "./routes/bitacoraRoutes";
import { createAnalyticsRoutes } from "./routes/analyticsRoutes";
import { createExportRoutes } from "./routes/exportRoutes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { AnalyticsRepository } from "./domain/repositories/analyticsRepository";
import { AnalyticsController } from "./controllers/analyticsController";
import { ExportController } from "./controllers/exportController";
import { PdfExportService } from "./services/pdfExportService";
import { Sequelize } from "sequelize-typescript";

const app: Express = express();

// Aumentar límite de body para JSON
app.use(express.json({ limit: '50mb' }));

// Middleware global para loggear todas las peticiones
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[REQUEST] ${req.method} ${req.path} - Headers: ${JSON.stringify(req.headers)}`);
  console.log(`[REQUEST] Body length: ${req.headers['content-length']}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Inicializar servicios (esta función se llama desde server.ts)
export function initializeAnalyticsRoutes(sequelize: Sequelize) {
  const repository = new AnalyticsRepository(sequelize);
  const analyticsController = new AnalyticsController(repository);
  const pdfExportService = new PdfExportService(repository);
  const exportController = new ExportController(pdfExportService);

  // Rutas de analytics
  app.use("/api/analytics", createAnalyticsRoutes(analyticsController));
  app.use("/analytics", createAnalyticsRoutes(analyticsController));

  // Rutas de exportación
  app.use("/api/export", createExportRoutes(exportController));
  app.use("/export", createExportRoutes(exportController));
}

// Rutas antiguas (mantener compatibilidad)
app.use("/api/sales", salesRoutes);
app.use("/api/bitacora", bitacoraRoutes);

// Middleware de manejo de errores - DEBE IR AL FINAL
app.use(errorMiddleware);

export default app;