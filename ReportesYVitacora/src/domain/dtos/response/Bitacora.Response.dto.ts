import { TipoBitacora } from "../bitacoraDto";

export interface BitacoraResponseDto {
	id: number;
	idUsuario: number;
	idEmpleado: number;
	descripcion: string;
	tipo: TipoBitacora;
	fecha: Date;
	horaInicio?: Date;
	horaFin?: Date;
	createdAt: Date;
	updatedAt: Date;
}
