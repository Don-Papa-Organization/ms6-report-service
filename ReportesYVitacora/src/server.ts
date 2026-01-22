import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import app from "./app";
import { initializeDB } from "./config/db";

const PORT = process.env.PORT || 4006;

async function startServer() {
    try {
        // Inicializar conexión a BD con reintentos
        const sequelize = await initializeDB();
        
        // Sincronizar modelos en desarrollo
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✅ Modelos sincronizados con la base de datos');
        }

        app.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en puerto ${PORT}`);
            console.log("📊 Microservicio de Reportes y Bitácora listo");
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();
