import express, { Express } from "express";
import {
	bitacoraRoutes,
} from './routes';

const app: Express = express();

app.use(express.json());

app.use('/db/bitacoras', bitacoraRoutes);


export default app;