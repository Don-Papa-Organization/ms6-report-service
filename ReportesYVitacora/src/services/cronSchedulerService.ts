import cron from "node-cron"
import { ETLSyncService } from './etlSyncService';

export class CronSchedulerService {
  private etlService: ETLSyncService;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(etlService: ETLSyncService) {
    this.etlService = etlService;
  }

  /**
   * Inicia todos los jobs programados
   * Por defecto se ejecutan diariamente a las 2:00 AM
   */
  startAllJobs(cronExpression: string = '0 2 * * *'): void {
    console.log(`\n🚀 [SCHEDULER] Iniciando cron jobs con expresión: ${cronExpression}\n`);

    // Job principal: Ejecutar sincronización de ayer (porque el job se ejecuta a las 2 AM)
    const mainJob = cron.schedule(cronExpression, async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      console.log(`\n⏰ [SCHEDULER] Ejecutando sincronización programada para ${yesterday.toISOString()}`);
      await this.etlService.syncAllForDate(yesterday);
    });

    this.scheduledTasks.set('mainSync', mainJob);

    const nearRealtimeExpression = process.env.CRON_NEAR_REALTIME || '*/5 * * * *';
    const nearRealtimeJob = cron.schedule(nearRealtimeExpression, async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log(`\n⚡ [SCHEDULER] Ejecutando sincronización frecuente para ${today.toISOString()}`);
      await this.etlService.syncAllForDate(today);
    });

    this.scheduledTasks.set('nearRealtimeSync', nearRealtimeJob);

    // Job de sincronización manual (mediante endpoint) también disponible
    console.log(`✅ [SCHEDULER] Jobs programados iniciados correctamente`);
  }

  async runStartupBackfill(days: number = 1): Promise<void> {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 1;

    console.log(`\n🧩 [SCHEDULER] Ejecutando backfill inicial de ${safeDays} día(s)`);

    for (let offset = safeDays - 1; offset >= 0; offset--) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      date.setHours(0, 0, 0, 0);

      await this.etlService.syncAllForDate(date);
    }
  }

  /**
   * Detiene todos los jobs programados
   */
  stopAllJobs(): void {
    console.log(`\n⏹️  [SCHEDULER] Deteniendo todos los jobs\n`);
    for (const task of this.scheduledTasks.values()) {
      task.stop();
    }
    this.scheduledTasks.clear();
  }

  /**
   * Ejecuta sincronización manual para una fecha específica
   */
  async executeManualSync(date: Date): Promise<void> {
    console.log(`\n🔧 [SCHEDULER] Sincronización manual iniciada para ${date.toISOString()}`);
    await this.etlService.syncAllForDate(date);
  }

  /**
   * Obtiene el estado de los jobs
   */
  getJobsStatus(): { job: string; status: string }[] {
    return Array.from(this.scheduledTasks.entries()).map(([job]) => ({
      job,
      status: 'Activo'
    }));
  }
}
