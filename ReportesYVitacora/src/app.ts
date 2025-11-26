import express, { Express, Request, Response, NextFunction} from "express";
import productRoutes from "./routes/productRoutes";
import employerRoutes from "./routes/employerRoutes";
import userRoutes from "./routes/userRoutes";
import promotionRoutes from "./routes/promotionRoutes";

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

app.use("/api/products", productRoutes);
app.use("/api/employers", employerRoutes)
app.use("/api/users", userRoutes);
app.use("/api/promotions", promotionRoutes);

export default app;