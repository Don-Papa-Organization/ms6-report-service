import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import app from "./app";
import { initializeDB } from "./config/db";

const PORT = process.env.PORT;

async function startServer() {
    const sequelize = await initializeDB();
    if (process.env.NODE_ENV !== "production") {
        console.log('✅ se concecto a algo')
      await sequelize.sync({ alter: true });
    }
  
    app.listen(PORT, () => console.log("✅ Servidor corriendo en", PORT, "puedes consumir la API Database"));
  }
  
startServer()