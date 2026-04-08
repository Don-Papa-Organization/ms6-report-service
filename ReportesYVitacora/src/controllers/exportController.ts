import { Request, Response } from 'express';
import { PdfExportService } from '../services/pdfExportService';
import { extractToken } from '../middlewares/authMiddleware';

export class ExportController {
  constructor(private pdfExportService: PdfExportService) {}

  private resolveAuthHeader(req: Request): string | undefined {
    const token = extractToken(req);
    return token ? `Bearer ${token}` : undefined;
  }

  // Exportar datos en JSON
  async exportJSON(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Parámetros startDate y endDate requeridos'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const data = await this.pdfExportService.exportDashboardJSON(start, end);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.json`);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al exportar datos JSON',
        error: error.message
      });
    }
  }

  // Exportar PDF
  async exportPDF(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Parámetros startDate y endDate requeridos'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const authHeader = this.resolveAuthHeader(req);
      const pdfBuffer = await this.pdfExportService.generateDashboardPDF(start, end, authHeader);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar PDF',
        error: error.message
      });
    }
  }
}
