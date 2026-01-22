import { SaleService } from "./apis/saleService";
interface FiltrosVentas {
    fechaInicio?: string;
    fechaFin?: string;
    estado?: 'sin_confirmar' | 'pendiente' | 'entregado' | 'cancelado';
    canalVenta?: 'web' | 'fisico';
    idUsuario?: number;
}

interface ReporteVentas {
    ventas: any[];
    totalVentas: number;
    montoTotal: number;
    promedioVenta: number;
    ventasPorEstado: Record<string, number>;
    ventasPorCanalVenta: Record<string, number>;
    periodo: {
        inicio: string;
        fin: string;
    };
}

export class SalesReportService {
    private saleService: SaleService;

    constructor() {
        this.saleService = new SaleService();
    }

    /**
     * CU011 - Consultar historial de ventas con filtros
     */
    async consultarHistorialVentas(token: string, filtros: FiltrosVentas) {
        try {
            // Obtener todos los pedidos
            const pedidos = await this.saleService.obtenerTodosLosPedidos(token);

            // Aplicar filtros
            let pedidosFiltrados = pedidos;

            if (filtros.fechaInicio) {
                const fechaInicio = new Date(filtros.fechaInicio);
                pedidosFiltrados = pedidosFiltrados.filter(p => {
                    if (p.fechaPedido) {
                        return new Date(p.fechaPedido) >= fechaInicio;
                    }
                    return false;
                });
            }

            if (filtros.fechaFin) {
                const fechaFin = new Date(filtros.fechaFin);
                pedidosFiltrados = pedidosFiltrados.filter(p => {
                    if (p.fechaPedido) {
                        return new Date(p.fechaPedido) <= fechaFin;
                    }
                    return false;
                });
            }

            if (filtros.estado) {
                pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === filtros.estado);
            }

            if (filtros.canalVenta) {
                pedidosFiltrados = pedidosFiltrados.filter(p => p.canalVenta === filtros.canalVenta);
            }

            if (filtros.idUsuario) {
                pedidosFiltrados = pedidosFiltrados.filter(p => p.idUsuario === filtros.idUsuario);
            }

            // Ordenar por fecha descendente (más recientes primero)
            pedidosFiltrados.sort((a, b) => {
                const fechaA = a.fechaPedido ? new Date(a.fechaPedido).getTime() : 0;
                const fechaB = b.fechaPedido ? new Date(b.fechaPedido).getTime() : 0;
                return fechaB - fechaA;
            });

            return {
                status: 200,
                data: {
                    total: pedidosFiltrados.length,
                    ventas: pedidosFiltrados
                }
            };
        } catch (error: any) {
            console.error('Error al consultar historial de ventas:', error);
            return {
                status: error.statusCode || 500,
                message: error.message || 'Error al consultar historial de ventas'
            };
        }
    }

    /**
     * CU011 - Obtener detalle completo de una venta específica
     */
    async obtenerDetalleVenta(token: string, idPedido: number) {
        try {
            // Obtener todos los pedidos y buscar el específico
            const pedidos = await this.saleService.obtenerTodosLosPedidos(token);
            const pedido = pedidos.find(p => p.idPedido === idPedido);

            if (!pedido) {
                return {
                    status: 404,
                    message: 'Venta no encontrada'
                };
            }

            // Obtener información del pago asociado
            try {
                const pagos = await this.saleService.obtenerTodosLosPagos(token);
                const pagoAsociado = pagos.find(p => p.idPedido === idPedido);

                return {
                    status: 200,
                    data: {
                        pedido,
                        pago: pagoAsociado || null
                    }
                };
            } catch (error) {
                // Si no se pueden obtener los pagos, devolver solo el pedido
                return {
                    status: 200,
                    data: {
                        pedido,
                        pago: null
                    }
                };
            }
        } catch (error: any) {
            console.error('Error al obtener detalle de venta:', error);
            return {
                status: error.statusCode || 500,
                message: error.message || 'Error al obtener detalle de venta'
            };
        }
    }

    /**
     * CU012 - Generar reporte de ventas por fechas con estadísticas
     */
    async generarReportePorFechas(token: string, filtros: FiltrosVentas) {
        try {
            // Obtener pedidos con filtros
            const result = await this.consultarHistorialVentas(token, filtros);

            if (result.status !== 200 || !result.data) {
                return { status: result.status, message: result.message };
            }

            const ventas = result.data.ventas;

            // Calcular estadísticas
            const totalVentas = ventas.length;
            const montoTotal = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
            const promedioVenta = totalVentas > 0 ? montoTotal / totalVentas : 0;

            // Agrupar por estado
            const ventasPorEstado: Record<string, number> = {};
            ventas.forEach(v => {
                const estado = v.estado || 'sin_confirmar';
                ventasPorEstado[estado] = (ventasPorEstado[estado] || 0) + 1;
            });

            // Agrupar por canal de venta
            const ventasPorCanalVenta: Record<string, number> = {};
            ventas.forEach(v => {
                const canal = v.canalVenta || 'fisico';
                ventasPorCanalVenta[canal] = (ventasPorCanalVenta[canal] || 0) + 1;
            });

            const reporte: ReporteVentas = {
                ventas,
                totalVentas,
                montoTotal,
                promedioVenta,
                ventasPorEstado,
                ventasPorCanalVenta,
                periodo: {
                    inicio: filtros.fechaInicio || 'No especificado',
                    fin: filtros.fechaFin || 'No especificado'
                }
            };

            return { status: 200, data: reporte };
        } catch (error: any) {
            console.error('Error al generar reporte por fechas:', error);
            return {
                status: error.statusCode || 500,
                message: error.message || 'Error al generar reporte por fechas'
            };
        }
    }
}
