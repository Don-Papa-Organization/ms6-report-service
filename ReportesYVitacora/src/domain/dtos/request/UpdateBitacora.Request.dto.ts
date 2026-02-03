import { TipoBitacora } from "../bitacoraDto";

export interface UpdateBitacoraRequestDto {
	descripcion?: string;
	tipo?: TipoBitacora;
	fecha?: Date;
	horaInicio?: Date;
	horaFin?: Date;
}
