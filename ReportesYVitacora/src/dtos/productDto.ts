export interface ProductDto {
    idProducto?: number,
    nombre: string,
    precio: number,
    stockActual: number,
    stockMinimo: number,
    esPromocion: boolean,
    activo: boolean,
    descripcion: string,
    urlImagen: string,
    idCategoria: number
}