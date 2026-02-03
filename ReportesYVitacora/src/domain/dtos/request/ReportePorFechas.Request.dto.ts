export interface ReportePorFechasRequestDto {
	fechaInicio: string;
	fechaFin: string;
	canalVenta?: 'web' | 'fisico';
	idUsuario?: number;
	formato?: 'json' | 'pdf' | 'excel' | 'csv';
}
