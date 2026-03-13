import { Request, Response, NextFunction } from "express";
import { SalesReportService } from "../services/salesReportService";
import { PdfExportService } from "../services/pdfExportService";
import { AnalyticsRepository } from "../domain/repositories/analyticsRepository";
import { extractToken } from "../middlewares/authMiddleware";
import { ApiResponse } from "../types";
import { AppError } from "../middlewares/error.middleware";

export class SalesController {
    private salesReportService: SalesReportService;
    private pdfExportService: PdfExportService;

    constructor(private analyticsRepository: AnalyticsRepository) {
        this.salesReportService = new SalesReportService();
        this.pdfExportService = new PdfExportService(this.analyticsRepository);
    }

    /**
     * CU011 - Consulta historial de ventas
     * Permite al administrador consultar el historial completo de ventas
     * con filtros opcionales (fecha, producto, etc.)
     */
    consultarHistorialVentas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const token = extractToken(req);
        if (!token) {
            throw new AppError('Token no proporcionado', 401);
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

        const response: ApiResponse = {
            success: result.status === 200,
            message: result.status === 200 ? 'Historial de ventas obtenido exitosamente' : result.message,
            data: result.data || null,
            timestamp: new Date().toISOString()
        };
        res.status(result.status).json(response);
    };

    /**
     * CU011 - Obtener detalle de una venta específica
     */
    obtenerDetalleVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const token = extractToken(req);
        if (!token) {
            throw new AppError('Token no proporcionado', 401);
        }

        const { idPedido } = req.params;

        const idPedidoNum = parseInt(idPedido);
        if (isNaN(idPedidoNum) || idPedidoNum <= 0) {
            throw new AppError('ID de pedido inválido', 400);
        }

        const result = await this.salesReportService.obtenerDetalleVenta(token, idPedidoNum);

        const response: ApiResponse = {
            success: result.status === 200,
            message: result.status === 200 ? 'Detalle de venta obtenido exitosamente' : result.message,
            data: result.data || null,
            timestamp: new Date().toISOString()
        };
        res.status(result.status).json(response);
    };

    /**
     * CU012 - Generar reporte de ventas por fechas
     * Genera reportes detallados de ventas en un rango de fechas específicas
     * con filtros adicionales y estadísticas
     */
    generarReportePorFechas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const token = extractToken(req);
        if (!token) {
            throw new AppError('Token no proporcionado', 401);
        }

        const { fechaInicio, fechaFin, canalVenta, idUsuario, formato } = req.query;

        // Validar que las fechas sean válidas
        if (!fechaInicio || !fechaFin) {
            throw new AppError('Debe proporcionar fechaInicio y fechaFin', 400);
        }

        const inicio = new Date(fechaInicio as string);
        const fin = new Date(fechaFin as string);

        if (inicio > fin) {
            throw new AppError('La fecha de inicio no puede ser posterior a la fecha final', 400);
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
                    const response: ApiResponse = {
                        success: true,
                        message: `La exportación a ${formato} estará disponible próximamente`,
                        data: result.data,
                        timestamp: new Date().toISOString()
                    };
                    res.status(200).json(response);
                    return;
                default:
                    break;
            }
        }

        const response: ApiResponse = {
            success: result.status === 200,
            message: result.status === 200 ? 'Reporte de ventas generado exitosamente' : result.message,
            data: result.data || null,
            timestamp: new Date().toISOString()
        };
        res.status(result.status).json(response);
    };
}
