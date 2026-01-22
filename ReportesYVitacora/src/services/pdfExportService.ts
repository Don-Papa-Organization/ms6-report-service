import PDFDocument from 'pdfkit';
import { Response } from 'express';

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

export class PdfExportService {
    /**
     * Formatear estado para visualización
     */
    private formatEstado(estado: string): string {
        const estados: Record<string, string> = {
            'sin_confirmar': 'Sin Confirmar',
            'pendiente': 'Pendiente',
            'entregado': 'Entregado',
            'cancelado': 'Cancelado'
        };
        return estados[estado] || estado;
    }

    /**
     * Formatear canal de venta
     */
    private formatCanal(canal: string): string {
        const canales: Record<string, string> = {
            'web': 'Web',
            'fisico': 'Físico'
        };
        return canales[canal] || canal;
    }

    /**
     * Generar PDF de reporte de ventas y enviarlo como respuesta
     */
    async generarReporteVentasPDF(res: Response, reporte: ReporteVentas): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // Crear documento PDF
                const doc = new PDFDocument({ margin: 50 });

                // Configurar headers de respuesta
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=reporte-ventas-${Date.now()}.pdf`);

                // Pipe del documento a la respuesta
                doc.pipe(res);

                // Título del documento
                doc.fontSize(20)
                   .font('Helvetica-Bold')
                   .text('Reporte de Ventas', { align: 'center' });
                
                doc.moveDown();

                // Periodo del reporte
                doc.fontSize(12)
                   .font('Helvetica')
                   .text(`Periodo: ${reporte.periodo.inicio} - ${reporte.periodo.fin}`, { align: 'center' });
                
                doc.moveDown(2);

                // Resumen General
                doc.fontSize(16)
                   .font('Helvetica-Bold')
                   .text('Resumen General');
                
                doc.moveDown();

                doc.fontSize(11)
                   .font('Helvetica');

                const resumenY = doc.y;
                
                // Columna izquierda
                doc.text(`Total de Ventas: ${reporte.totalVentas}`, 50, resumenY);
                doc.text(`Monto Total: $${reporte.montoTotal.toFixed(2)}`, 50);
                doc.text(`Promedio por Venta: $${reporte.promedioVenta.toFixed(2)}`, 50);

                doc.moveDown(2);

                // Ventas por Estado
                doc.fontSize(14)
                   .font('Helvetica-Bold')
                   .text('Ventas por Estado');
                
                doc.moveDown(0.5);
                doc.fontSize(11)
                   .font('Helvetica');

                Object.entries(reporte.ventasPorEstado).forEach(([estado, cantidad]) => {
                    const estadoTexto = this.formatEstado(estado);
                    doc.text(`${estadoTexto}: ${cantidad} ventas`);
                });

                doc.moveDown(1.5);

                // Ventas por Canal de Venta
                doc.fontSize(14)
                   .font('Helvetica-Bold')
                   .text('Ventas por Canal de Venta');
                
                doc.moveDown(0.5);
                doc.fontSize(11)
                   .font('Helvetica');

                Object.entries(reporte.ventasPorCanalVenta).forEach(([canal, cantidad]) => {
                    const canalTexto = this.formatCanal(canal);
                    doc.text(`${canalTexto}: ${cantidad} ventas`);
                });

                doc.moveDown(1.5);

                // Nueva página para el detalle de ventas
                doc.addPage();

                doc.fontSize(16)
                   .font('Helvetica-Bold')
                   .text('Detalle de Ventas');
                
                doc.moveDown();

                // Tabla de ventas
                doc.fontSize(10)
                   .font('Helvetica-Bold');

                const tableTop = doc.y;
                const col1X = 50;
                const col2X = 130;
                const col3X = 240;
                const col4X = 350;
                const col5X = 470;

                // Headers de la tabla
                doc.text('ID', col1X, tableTop);
                doc.text('Fecha', col2X, tableTop);
                doc.text('Estado', col3X, tableTop);
                doc.text('Canal', col4X, tableTop);
                doc.text('Total', col5X, tableTop);

                doc.moveTo(50, tableTop + 15)
                   .lineTo(550, tableTop + 15)
                   .stroke();

                doc.font('Helvetica');

                let y = tableTop + 25;
                const rowHeight = 20;
                const maxRows = 30; // Máximo de filas por página

                // Datos de las ventas (limitamos a las primeras para no sobrecargar)
                const ventasAMostrar = reporte.ventas.slice(0, 100);

                ventasAMostrar.forEach((venta, index) => {
                    // Nueva página si es necesario
                    if (index > 0 && index % maxRows === 0) {
                        doc.addPage();
                        y = 50;

                        // Repetir headers
                        doc.fontSize(10).font('Helvetica-Bold');
                        doc.text('ID', col1X, y);
                        doc.text('Fecha', col2X, y);
                        doc.text('Estado', col3X, y);
                        doc.text('Canal', col4X, y);
                        doc.text('Total', col5X, y);

                        doc.moveTo(50, y + 15)
                           .lineTo(550, y + 15)
                           .stroke();

                        doc.font('Helvetica');
                        y += 25;
                    }

                    const fecha = venta.fechaPedido 
                        ? new Date(venta.fechaPedido).toLocaleDateString('es-ES')
                        : 'N/A';
                    
                    const estadoTexto = this.formatEstado(venta.estado);
                    const canalTexto = this.formatCanal(venta.canalVenta);

                    doc.fontSize(9);
                    doc.text(venta.idPedido || 'N/A', col1X, y, { width: 70 });
                    doc.text(fecha, col2X, y, { width: 100 });
                    doc.text(estadoTexto, col3X, y, { width: 100 });
                    doc.text(canalTexto, col4X, y, { width: 110 });
                    doc.text(`$${(venta.total || 0).toFixed(2)}`, col5X, y, { width: 80 });

                    y += rowHeight;
                });

                // Footer
                doc.fontSize(8)
                   .font('Helvetica')
                   .text(
                       `Reporte generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`,
                       50,
                       doc.page.height - 50,
                       { align: 'center' }
                   );

                // Finalizar el documento
                doc.end();

                // Resolver cuando el documento termine
                doc.on('end', () => {
                    resolve();
                });

                doc.on('error', (error) => {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generar PDF de historial de ventas simple
     */
    async generarHistorialVentasPDF(res: Response, ventas: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });

                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=historial-ventas-${Date.now()}.pdf`);

                doc.pipe(res);

                doc.fontSize(20)
                   .font('Helvetica-Bold')
                   .text('Historial de Ventas', { align: 'center' });
                
                doc.moveDown(2);

                doc.fontSize(11)
                   .font('Helvetica')
                   .text(`Total de registros: ${ventas.length}`);

                doc.moveDown();

                // Tabla similar a la anterior
                const tableTop = doc.y;
                const col1X = 50;
                const col2X = 130;
                const col3X = 240;
                const col4X = 350;
                const col5X = 470;

                doc.fontSize(10).font('Helvetica-Bold');
                doc.text('ID', col1X, tableTop);
                doc.text('Fecha', col2X, tableTop);
                doc.text('Estado', col3X, tableTop);
                doc.text('Canal', col4X, tableTop);
                doc.text('Total', col5X, tableTop);

                doc.moveTo(50, tableTop + 15)
                   .lineTo(550, tableTop + 15)
                   .stroke();

                doc.font('Helvetica');

                let y = tableTop + 25;
                const rowHeight = 20;
                const maxRows = 30;

                const ventasAMostrar = ventas.slice(0, 100);

                ventasAMostrar.forEach((venta, index) => {
                    if (index > 0 && index % maxRows === 0) {
                        doc.addPage();
                        y = 50;
                    }

                    const fecha = venta.fechaPedido 
                        ? new Date(venta.fechaPedido).toLocaleDateString('es-ES')
                        : 'N/A';
                    
                    const estadoTexto = this.formatEstado(venta.estado);
                    const canalTexto = this.formatCanal(venta.canalVenta);

                    doc.fontSize(9);
                    doc.text(venta.idPedido || 'N/A', col1X, y, { width: 70 });
                    doc.text(fecha, col2X, y, { width: 100 });
                    doc.text(estadoTexto, col3X, y, { width: 100 });
                    doc.text(canalTexto, col4X, y, { width: 110 });
                    doc.text(`$${(venta.total || 0).toFixed(2)}`, col5X, y, { width: 80 });

                    y += rowHeight;
                });

                doc.fontSize(8)
                   .font('Helvetica')
                   .text(
                       `Reporte generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`,
                       50,
                       doc.page.height - 50,
                       { align: 'center' }
                   );

                doc.end();

                doc.on('end', () => resolve());
                doc.on('error', (error) => reject(error));

            } catch (error) {
                reject(error);
            }
        });
    }
}
