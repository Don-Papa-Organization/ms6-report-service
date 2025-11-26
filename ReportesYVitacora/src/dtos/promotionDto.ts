export interface PromotionDto {
    idPromocion?: number;
    nombre: string;
    descripcion: string;
    fechaInicio: Date;
    fechaFin: Date;
    tipoPromocion: 'porcentaje' | 'precio_fijo' | 'combo';
    activo: boolean;
}
