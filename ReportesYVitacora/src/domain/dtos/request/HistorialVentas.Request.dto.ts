export interface HistorialVentasRequestDto {
	fechaInicio?: string;
	fechaFin?: string;
	estado?: 'sin_confirmar' | 'pendiente' | 'entregado' | 'cancelado';
	canalVenta?: 'web' | 'fisico';
	idUsuario?: number;
	formato?: 'json' | 'pdf' | 'excel' | 'csv';
}
