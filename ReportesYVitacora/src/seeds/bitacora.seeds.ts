import { BitacoraRepository } from "../domain/repositories/bitacoraRepository";

type SeedEntry = {
  idUsuario: number;
  idEmpleado: number;
  descripcion: string;
  tipo: 'REPORTE_INCIDENTE' | 'COMENTARIO_JORNADA' | 'OTRO';
  fecha: Date;
  horaInicio?: Date;
  horaFin?: Date;
};

export class BitacoraSeeds {
  private repository: BitacoraRepository;

  constructor(repository: BitacoraRepository) {
    this.repository = repository;
  }

  async run(): Promise<void> {
    console.log("🌱 Ejecutando seeds de bitácora...");

    const existing = await this.repository.findAll({ limit: 1 });
    if (existing.length > 0) {
      console.log("ℹ️ La tabla bitácora ya tiene datos; se omite la carga de seeds");
      return;
    }

    const entries = this.buildEntries();

    for (const entry of entries) {
      try {
        await this.repository.create(entry);
      } catch (error) {
        console.error("Error al sembrar bitácora:", error);
      }
    }

    console.log(`✅ ${entries.length} registros de bitácora sembrados`);
  }

  private buildEntries(): SeedEntry[] {
    return [
      {
        idUsuario: 1,
        idEmpleado: 1,
        descripcion: "Se registró una caída temporal en el acceso al módulo de inventario y se notificó al equipo técnico.",
        tipo: 'REPORTE_INCIDENTE',
        fecha: this.buildDate(1, 9, 15),
        horaInicio: this.buildDate(1, 9, 15),
        horaFin: this.buildDate(1, 9, 40)
      },
      {
        idUsuario: 2,
        idEmpleado: 2,
        descripcion: "Se dejó constancia del cierre correcto de la jornada y de la entrega de pendientes operativos.",
        tipo: 'COMENTARIO_JORNADA',
        fecha: this.buildDate(1, 17, 30),
        horaInicio: this.buildDate(1, 17, 30),
        horaFin: this.buildDate(1, 17, 50)
      },
      {
        idUsuario: 3,
        idEmpleado: 3,
        descripcion: "Se documentó ajuste manual de reporte por diferencia detectada entre ventas de caja y ventas consolidadas.",
        tipo: 'OTRO',
        fecha: this.buildDate(2, 11, 0)
      },
      {
        idUsuario: 1,
        idEmpleado: 1,
        descripcion: "Se reportó retraso en la sincronización ETL de analytics; el proceso fue reintentado con éxito.",
        tipo: 'REPORTE_INCIDENTE',
        fecha: this.buildDate(3, 8, 20),
        horaInicio: this.buildDate(3, 8, 20),
        horaFin: this.buildDate(3, 8, 55)
      },
      {
        idUsuario: 4,
        idEmpleado: 4,
        descripcion: "Jornada finalizada sin novedades, con validación de cierre de caja y revisión de reservas pendientes.",
        tipo: 'COMENTARIO_JORNADA',
        fecha: this.buildDate(4, 18, 10),
        horaInicio: this.buildDate(4, 18, 10),
        horaFin: this.buildDate(4, 18, 35)
      },
      {
        idUsuario: 2,
        idEmpleado: 2,
        descripcion: "Se registró observación sobre inconsistencias menores en un reporte de consolidación, sin impacto operativo.",
        tipo: 'OTRO',
        fecha: this.buildDate(5, 10, 45)
      },
      {
        idUsuario: 3,
        idEmpleado: 3,
        descripcion: "Se atendió un incidente en la visualización de bitácora desde el panel administrativo y quedó resuelto.",
        tipo: 'REPORTE_INCIDENTE',
        fecha: this.buildDate(6, 14, 5),
        horaInicio: this.buildDate(6, 14, 5),
        horaFin: this.buildDate(6, 14, 28)
      },
      {
        idUsuario: 4,
        idEmpleado: 4,
        descripcion: "Se dejó comentario de jornada indicando tareas completadas y seguimiento pendiente para el siguiente turno.",
        tipo: 'COMENTARIO_JORNADA',
        fecha: this.buildDate(7, 16, 45),
        horaInicio: this.buildDate(7, 16, 45),
        horaFin: this.buildDate(7, 17, 5)
      }
    ];
  }

  private buildDate(daysAgo: number, hour: number, minute: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, minute, 0, 0);
    return date;
  }
}