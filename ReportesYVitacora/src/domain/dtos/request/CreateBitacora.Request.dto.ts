import { TipoBitacora } from "../bitacoraDto";

export interface CreateBitacoraRequestDto {
	descripcion: string;
	tipo?: TipoBitacora;
	fecha?: Date;
	horaInicio?: Date;
	horaFin?: Date;
}
