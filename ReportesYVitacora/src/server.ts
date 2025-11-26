import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import app from "./app";


const PORT = process.env.PORT;

async function startServer() {
  
    app.listen(PORT, () => console.log("✅ Servidor corriendo en", PORT, "puedes consumir la API Node"));
  }
  
startServer()