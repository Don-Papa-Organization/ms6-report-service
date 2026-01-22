import { Request, Response } from "express";
import { SalesReportService } from "../services/salesReportService";
import { PdfExportService } from "../services/pdfExportService";
import { extractToken } from "../middlewares/authMiddleware";

export class SalesController {
    private salesReportService: SalesReportService;
    private pdfExportService: PdfExportService;

    constructor() {
        this.salesReportService = new SalesReportService();
        this.pdfExportService = new PdfExportService();
    }

    /**
     * CU011 - Consulta historial de ventas
     * Permite al administrador consultar el historial completo de ventas
     * con filtros opcionales (fecha, producto, etc.)
     */
    consultarHistorialVentas = async (req: Request, res: Response): Promise<void> => {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({
                    success: false,
                    message: 'Token no proporcionado',
                    data: null
                });
                return;
            }

            const { fechaInicio, fechaFin, estado, canalVenta, idUsuario } = req.query;

            const filtros = {
                fechaInicio: fechaInicio as string,
                fechaFin: fechaFin as string,
                estado: estado as 'sin_confirmar' | 'pendiente' | 'entregado' | 'cancelado',
                canalVenta: canalVenta as 'web' | 'fisico',
                idUsuario: idUsuario ? parseInt(idUsuario as string) : undefined
            };

            const result = await this.salesReportService.consultarHistorialVentas(token, filtros);

            // Si se solicita formato PDF
            if (req.query.formato === 'pdf' && result.data) {
                await this.pdfExportService.generarHistorialVentasPDF(res, result.data.ventas);
                return;
            }

            res.status(result.status).json({
                success: result.status === 200,
                message: result.status === 200 ? 'Historial de ventas obtenido exitosamente' : result.message,
                data: result.data || null
            });
        } catch (error: any) {
            console.error('Error en consultarHistorialVentas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                data: null
            });
        }
    };

    /**
     * CU011 - Obtener detalle de una venta específica
     */
    obtenerDetalleVenta = async (req: Request, res: Response): Promise<void> => {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({
                    success: false,
                    message: 'Token no proporcionado',
                    data: null
                });
                return;
            }

            const { idPedido } = req.params;

            const idPedidoNum = parseInt(idPedido);
            if (isNaN(idPedidoNum) || idPedidoNum <= 0) {
                res.status(400).json({
                    success: false,
                    message: 'ID de pedido inválido',
                    data: null
                });
                return;
            }

            const result = await this.salesReportService.obtenerDetalleVenta(token, idPedidoNum);

            res.status(result.status).json({
                success: result.status === 200,
                message: result.status === 200 ? 'Detalle de venta obtenido exitosamente' : result.message,
                data: result.data || null
            });
        } catch (error: any) {
            console.error('Error en obtenerDetalleVenta:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                data: null
            });
        }
    };

    /**
     * CU012 - Generar reporte de ventas por fechas
     * Genera reportes detallados de ventas en un rango de fechas específicas
     * con filtros adicionales y estadísticas
     */
    generarReportePorFechas = async (req: Request, res: Response): Promise<void> => {
        try {
            const token = extractToken(req);
            if (!token) {
                res.status(401).json({
                    success: false,
                    message: 'Token no proporcionado',
                    data: null
                });
                return;
            }

            const { fechaInicio, fechaFin, canalVenta, idUsuario, formato } = req.query;

            // Validar que las fechas sean válidas
            if (!fechaInicio || !fechaFin) {
                res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar fechaInicio y fechaFin',
                    data: null
                });
                return;
            }

            const inicio = new Date(fechaInicio as string);
            const fin = new Date(fechaFin as string);

            if (inicio > fin) {
                res.status(400).json({
                    success: false,
                    message: 'La fecha de inicio no puede ser posterior a la fecha final',
                    data: null
                });
                return;
            }

            const filtros = {
                fechaInicio: fechaInicio as string,
                fechaFin: fechaFin as string,
                canalVenta: canalVenta as 'web' | 'fisico',
                idUsuario: idUsuario ? parseInt(idUsuario as string) : undefined
            };

            const result = await this.salesReportService.generarReportePorFechas(token, filtros);

            // Si se solicita exportación según formato
            if (formato && result.data) {
                switch (formato) {
                    case 'pdf':
                        await this.pdfExportService.generarReporteVentasPDF(res, result.data);
                        return;
                    case 'excel':
                    case 'csv':
                        res.status(200).json({
                            success: true,
                            message: `La exportación a ${formato} estará disponible próximamente`,
                            data: result.data
                        });
                        return;
                    default:
                        break;
                }
            }

            res.status(result.status).json({
                success: result.status === 200,
                message: result.status === 200 ? 'Reporte de ventas generado exitosamente' : result.message,
                data: result.data || null
            });
        } catch (error: any) {
            console.error('Error en generarReportePorFechas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                data: null
            });
        }
    };
}
