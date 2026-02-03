import express, { Express, Request, Response, NextFunction} from "express";
import salesRoutes from "./routes/salesRoutes";
import bitacoraRoutes from "./routes/bitacoraRoutes";
import { errorMiddleware } from "./middlewares/error.middleware";

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

// Rutas de la aplicación
app.use("/api/sales", salesRoutes);
app.use("/api/bitacora", bitacoraRoutes);

// Middleware de manejo de errores - DEBE IR AL FINAL
app.use(errorMiddleware);

export default app;