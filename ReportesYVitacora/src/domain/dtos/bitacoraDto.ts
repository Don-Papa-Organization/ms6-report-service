export type TipoBitacora = 'REPORTE_INCIDENTE' | 'COMENTARIO_JORNADA' | 'OTRO';

export interface CreateBitacoraDto {
    idUsuario: number;
    horaInicio?: Date;
    horaFin?: Date;
    descripcion: string;
    tipo?: TipoBitacora;
    fecha?: Date;
    idEmpleado: number;
}

export interface UpdateBitacoraDto {
    idUsuario?: number;
    horaInicio?: Date;
    horaFin?: Date;
    descripcion?: string;
    tipo?: TipoBitacora;
    fecha?: Date;
    idEmpleado?: number;
}

export interface BitacoraResponseDto {
    idUsuario: number;
    horaInicio?: Date;
    horaFin?: Date;
    descripcion: string;
    tipo?: string;
    fecha?: Date;
    idEmpleado: number;
}
