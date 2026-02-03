export type TipoBitacora = 'REPORTE_INCIDENTE' | 'COMENTARIO_JORNADA' | 'OTRO';

export interface BitacoraDto {
    id: number;
    idUsuario: number;
    idEmpleado: number;
    descripcion: string;
    tipo: TipoBitacora;
    fecha: Date;
    horaInicio?: Date;
    horaFin?: Date;
}
