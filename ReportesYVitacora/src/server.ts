import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import app, { initializeAnalyticsRoutes } from "./app";
import { initializeDB } from "./config/db";
import { AnalyticsRepository } from "./domain/repositories/analyticsRepository";
import { BitacoraRepository } from "./domain/repositories/bitacoraRepository";
import { AnalyticsSeeds } from "./seeds/analytics.seeds";
import { BitacoraSeeds } from "./seeds/bitacora.seeds";
import { ETLSyncService } from "./services/etlSyncService";
import { CronSchedulerService } from "./services/cronSchedulerService";

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

        // Inicializar servicios de analytics
        initializeAnalyticsRoutes(sequelize);

        // Inicializar ETL y Cron Scheduler
        const repository = new AnalyticsRepository(sequelize);

        // Seeds opcionales para demo
        const shouldRunAnalyticsSeeds = process.env.RUN_ANALYTICS_SEEDS === 'true';
        const shouldRunBitacoraSeeds = process.env.RUN_BITACORA_SEEDS === 'true';

        if (shouldRunAnalyticsSeeds) {
            const seeds = new AnalyticsSeeds(repository);
            await seeds.run();
            console.log('🌱 Seeds de analytics ejecutados por configuración RUN_ANALYTICS_SEEDS=true');
        }

        if (shouldRunBitacoraSeeds) {
            const bitacoraRepository = new BitacoraRepository();
            const bitacoraSeeds = new BitacoraSeeds(bitacoraRepository);
            await bitacoraSeeds.run();
            console.log('🌱 Seeds de bitácora ejecutados por configuración RUN_BITACORA_SEEDS=true');
        }

        const etlService = new ETLSyncService({
            orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://order-service-app:4003/api',
            inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service-app:4001/api',
            userServiceUrl: process.env.USER_SERVICE_URL || 'http://user-service-app:4002/api',
            reservationServiceUrl: process.env.RESERVATION_SERVICE_URL || 'http://reservation-service-app:4004/api',
            eventServiceUrl: process.env.EVENT_SERVICE_URL || 'http://event-service-app:4005/api',
            internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'una_llave_secreta_compartida',
            httpTimeout: parseInt(process.env.HTTP_TIMEOUT || '10000')
        }, repository);

        const cronScheduler = new CronSchedulerService(etlService);
        
        // Iniciar jobs programados
        const cronExpression = process.env.CRON_SCHEDULE || '0 2 * * *'; // 02:00 AM diariamente
        cronScheduler.startAllJobs(cronExpression);

        // Backfill inicial para poblar analíticas recientes al arrancar
        const startupBackfillDays = parseInt(process.env.STARTUP_BACKFILL_DAYS || '30');
        console.log(`🧩 Backfill inicial configurado: ${startupBackfillDays} día(s)`);
        await cronScheduler.runStartupBackfill(startupBackfillDays);

        // Obtener estado de jobs
        console.log('\n📋 Estado de Jobs Programados:');
        cronScheduler.getJobsStatus().forEach(job => {
          console.log(`   ✓ ${job.job}: ${job.status}`);
        });

        app.listen(PORT, () => {
            console.log(`\n✅ Servidor corriendo en puerto ${PORT}`);
            console.log("📊 Microservicio de Reportes y Bitácora listo");
            console.log("🔄 Servicios ETL y Cron Scheduler inicializados\n");
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();
