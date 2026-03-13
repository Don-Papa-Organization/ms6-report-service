import PDFDocument from 'pdfkit';
import { AnalyticsRepository } from '../domain/repositories/analyticsRepository';

export class PdfExportService {
  constructor(private repository: AnalyticsRepository) {}

  /**
   * Genera un PDF con todos los datos del dashboard
   */
  async generateDashboardPDF(startDate: Date, endDate: Date): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', reject);

        // Encabezado
        doc.fontSize(24).font('Helvetica-Bold').text('Reporte de Analytics', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, { align: 'center' });
        doc.fontSize(10).text(`Generado: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).stroke();
        doc.moveDown(2);

        // Obtener datos
        const sales = await this.repository.getDailySalesSummary(startDate, endDate);
        const products = await this.repository.getProductSalesSummary(startDate, endDate, 20);
        const categories = await this.repository.getCategoryStockSummary(startDate, endDate);
        const users = await this.repository.getUserGrowthSummary(startDate, endDate);
        const reservations = await this.repository.getReservationOccupancySummary(startDate, endDate);
        const promotions = await this.repository.getPromotionPerformance(startDate, endDate);

        // Sección 1: Resumen de Ventas
        doc.fontSize(14).font('Helvetica-Bold').text('1. Resumen de Ventas', { underline: true });
        doc.moveDown();

        const totalVentas = sales.reduce((sum, s) => sum + Number(s.totalVentas), 0);
        const totalPedidos = sales.reduce((sum, s) => sum + s.cantidadPedidos, 0);
        const canalFisico = sales.reduce((sum, s) => sum + s.canalFisico, 0);
        const canalWeb = sales.reduce((sum, s) => sum + s.canalWeb, 0);
        const totalDescuentos = sales.reduce((sum, s) => sum + Number(s.totalDescuentos), 0);

        doc.fontSize(10).font('Helvetica');
        this.addKeyValuePair(doc, 'Total de Ventas:', `$${totalVentas.toFixed(2)}`);
        this.addKeyValuePair(doc, 'Cantidad de Pedidos:', `${totalPedidos}`);
        this.addKeyValuePair(doc, 'Ventas Físico:', `${canalFisico} pedidos`);
        this.addKeyValuePair(doc, 'Ventas Web/Delivery:', `${canalWeb} pedidos`);
        this.addKeyValuePair(doc, 'Descuentos Aplicados:', `$${totalDescuentos.toFixed(2)}`);
        this.addKeyValuePair(doc, 'Margen Neto:', `${((totalVentas - totalDescuentos) / totalVentas * 100).toFixed(2)}%`);

        // Tabla de ventas diarias si hay espacio
        if (sales.length > 0 && doc.y < 650) {
          doc.moveDown(1);
          doc.fontSize(10).font('Helvetica-Bold').text('Detalles por Día:', { underline: true });
          this.addSalesTable(doc, sales.slice(0, 10));
        }

        // Sección 2: Productos Top
        if (products.length > 0) {
          doc.addPage();
          doc.fontSize(14).font('Helvetica-Bold').text('2. Top Productos Vendidos', { underline: true });
          doc.moveDown();
          this.addProductsTable(doc, products.slice(0, 15));
        }

        // Sección 3: Inventario
        if (categories.length > 0) {
          doc.addPage();
          doc.fontSize(14).font('Helvetica-Bold').text('3. Inventario por Categoría', { underline: true });
          doc.moveDown();
          this.addCategoryTable(doc, categories);
        }

        // Sección 4: Usuarios
        if (users.length > 0) {
          doc.addPage();
          doc.fontSize(14).font('Helvetica-Bold').text('4. Crecimiento de Usuarios', { underline: true });
          doc.moveDown();

          const totalNuevos = users.reduce((sum, u) => sum + u.nuevosRegistros, 0);
          const avgFrecuentes = Math.round(users.reduce((sum, u) => sum + u.clientesFrecuentesActivos, 0) / users.length);

          doc.fontSize(10).font('Helvetica');
          this.addKeyValuePair(doc, 'Nuevos Registros:', `${totalNuevos}`);
          this.addKeyValuePair(doc, 'Clientes Frecuentes Promedio:', `${avgFrecuentes}`);

          if (users.length > 0) {
            doc.moveDown();
            doc.fontSize(9).text('Detalle Diario:', { underline: true });
            users.slice(0, 10).forEach(u => {
              doc.fontSize(8).text(`${u.fecha ? new Date(u.fecha).toLocaleDateString() : 'N/A'}: ${u.nuevosRegistros} nuevos, ${u.clientesFrecuentesActivos} frecuentes`);
            });
          }
        }

        // Sección 5: Reservaciones
        if (reservations.length > 0) {
          doc.addPage();
          doc.fontSize(14).font('Helvetica-Bold').text('5. Ocupación y Reservaciones', { underline: true });
          doc.moveDown();

          const totalReservas = reservations.reduce((sum, r) => sum + r.cantidadReservas, 0);
          const avgNoShow = reservations.reduce((sum, r) => sum + r.tasaNoShow, 0) / reservations.length;

          doc.fontSize(10).font('Helvetica');
          this.addKeyValuePair(doc, 'Total Reservaciones:', `${totalReservas}`);
          this.addKeyValuePair(doc, 'Tasa No-Show Promedio:', `${avgNoShow.toFixed(2)}%`);

          doc.moveDown();
          doc.fontSize(9).text('Detalle:', { underline: true });
          reservations.slice(0, 10).forEach(r => {
            doc.fontSize(8).text(`${r.fecha ? new Date(r.fecha).toLocaleDateString() : 'N/A'}: ${r.cantidadReservas} reservas, ${r.tasaNoShow.toFixed(2)}% no-show`);
          });
        }

        // Sección 6: Promociones
        if (promotions.length > 0) {
          doc.addPage();
          doc.fontSize(14).font('Helvetica-Bold').text('6. Efectividad de Promociones', { underline: true });
          doc.moveDown();

          const totalUsosAplicados = promotions.reduce((sum, p) => sum + p.usosAplicados, 0);
          const totalIngresoPromo = promotions.reduce((sum, p) => sum + Number(p.ingresoBajoPromocion), 0);

          doc.fontSize(10).font('Helvetica');
          this.addKeyValuePair(doc, 'Usos Totales:', `${totalUsosAplicados}`);
          this.addKeyValuePair(doc, 'Ingresos por Promoción:', `$${totalIngresoPromo.toFixed(2)}`);
          this.addKeyValuePair(doc, 'Ingresos Promedio por Uso:', `$${(totalIngresoPromo / (totalUsosAplicados || 1)).toFixed(2)}`);

          doc.moveDown();
          doc.fontSize(9).text('Top Promociones:', { underline: true });
          promotions.slice(0, 10).forEach(p => {
            doc.fontSize(8).text(`ID ${p.idPromocion}: ${p.usosAplicados} usos, $${Number(p.ingresoBajoPromocion).toFixed(2)} ingresos`);
          });
        }

        // Pie de página
        doc.fontSize(8).text('Fin del Reporte', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Exporta los datos del dashboard en formato JSON
   */
  async exportDashboardJSON(startDate: Date, endDate: Date): Promise<any> {
    try {
      const [sales, products, categories, users, reservations, promotions] = await Promise.all([
        this.repository.getDailySalesSummary(startDate, endDate),
        this.repository.getProductSalesSummary(startDate, endDate, 20),
        this.repository.getCategoryStockSummary(startDate, endDate),
        this.repository.getUserGrowthSummary(startDate, endDate),
        this.repository.getReservationOccupancySummary(startDate, endDate),
        this.repository.getPromotionPerformance(startDate, endDate)
      ]);

      return {
        metadata: {
          generatedAt: new Date(),
          period: { startDate, endDate }
        },
        sales: {
          summary: {
            totalVentas: sales.reduce((sum, s) => sum + Number(s.totalVentas), 0),
            cantidadPedidos: sales.reduce((sum, s) => sum + s.cantidadPedidos, 0),
            canalFisico: sales.reduce((sum, s) => sum + s.canalFisico, 0),
            canalWeb: sales.reduce((sum, s) => sum + s.canalWeb, 0),
            totalDescuentos: sales.reduce((sum, s) => sum + Number(s.totalDescuentos), 0)
          },
          details: sales
        },
        products: {
          top: products
        },
        inventory: {
          byCategory: categories
        },
        users: {
          summary: {
            totalNuevosRegistros: users.reduce((sum, u) => sum + u.nuevosRegistros, 0),
            clientesFrecuentesPromedio: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + u.clientesFrecuentesActivos, 0) / users.length) : 0
          },
          details: users
        },
        reservations: {
          summary: {
            totalReservas: reservations.reduce((sum, r) => sum + r.cantidadReservas, 0),
            tasaNoShowPromedio: reservations.length > 0 ? reservations.reduce((sum, r) => sum + r.tasaNoShow, 0) / reservations.length : 0
          },
          details: reservations
        },
        promotions: {
          summary: {
            totalUsos: promotions.reduce((sum, p) => sum + p.usosAplicados, 0),
            totalIngresos: promotions.reduce((sum, p) => sum + Number(p.ingresoBajoPromocion), 0)
          },
          details: promotions
        }
      };
    } catch (error: any) {
      throw new Error(`Error exporting JSON: ${error.message}`);
    }
  }

  // Utilidades para construcción del PDF
  private addKeyValuePair(doc: any, key: string, value: string): void {
    const keyWidth = doc.widthOfString(key);
    doc.text(key, { width: keyWidth, continued: true });
    doc.text(` ${value}`);
  }

  private addSalesTable(doc: any, sales: any[]): void {
    const tableTop = doc.y + 10;
    const colWidth = 90;
    const rowHeight = 20;

    // Headers
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Fecha', 40, tableTop);
    doc.text('Ingresos', 130, tableTop);
    doc.text('Pedidos', 220, tableTop);
    doc.text('Físico', 300, tableTop);
    doc.text('Web', 380, tableTop);

    doc.moveTo(40, tableTop + 15).lineTo(515, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.fontSize(8).font('Helvetica');
    sales.forEach((sale) => {
      if (y > 700) {
        doc.addPage();
        y = 40;
      }
      const fecha = sale.fecha ? new Date(sale.fecha).toLocaleDateString() : 'N/A';
      doc.text(fecha, 40, y);
      doc.text(`$${Number(sale.totalVentas).toFixed(2)}`, 130, y);
      doc.text(`${sale.cantidadPedidos}`, 220, y);
      doc.text(`${sale.canalFisico}`, 300, y);
      doc.text(`${sale.canalWeb}`, 380, y);
      y += rowHeight;
    });
  }

  private addProductsTable(doc: any, products: any[]): void {
    const tableTop = doc.y + 10;
    const rowHeight = 18;

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('ID Producto', 40, tableTop);
    doc.text('Cantidad', 150, tableTop);
    doc.text('Ingresos', 250, tableTop);

    doc.moveTo(40, tableTop + 15).lineTo(515, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.fontSize(8).font('Helvetica');
    products.forEach((product) => {
      if (y > 700) {
        doc.addPage();
        y = 40;
      }
      doc.text(`${product.idProducto}`, 40, y);
      doc.text(`${product.cantidadVendida}`, 150, y);
      doc.text(`$${Number(product.ingresosGenerados).toFixed(2)}`, 250, y);
      y += rowHeight;
    });
  }

  private addCategoryTable(doc: any, categories: any[]): void {
    const tableTop = doc.y + 10;
    const rowHeight = 18;

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('ID Categoría', 40, tableTop);
    doc.text('Stock Total', 150, tableTop);
    doc.text('Productos', 250, tableTop);
    doc.text('Fecha', 350, tableTop);

    doc.moveTo(40, tableTop + 15).lineTo(515, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.fontSize(8).font('Helvetica');
    categories.forEach((cat) => {
      if (y > 700) {
        doc.addPage();
        y = 40;
      }
      const fecha = cat.fecha ? new Date(cat.fecha).toLocaleDateString() : 'N/A';
      doc.text(`${cat.idCategoria}`, 40, y);
      doc.text(`${cat.stockTotal}`, 150, y);
      doc.text(`${cat.productosUnicos}`, 250, y);
      doc.text(fecha, 350, y);
      y += rowHeight;
    });
  }

  /**
   * Método legacy para compatibilidad con salesController
   * Genera un PDF con el historial de ventas
   */
  async generarHistorialVentasPDF(res: any, ventas: any[]): Promise<void> {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        res.contentType('application/pdf');
        res.send(Buffer.concat(chunks));
      });

      // Encabezado
      doc.fontSize(20).font('Helvetica-Bold').text('Historial de Ventas', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Generado: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).stroke();
      doc.moveDown(2);

      // Tabla de ventas
      if (ventas && ventas.length > 0) {
        doc.fontSize(10).font('Helvetica-Bold').text('Detalle de Ventas');
        doc.moveDown();
        ventas.slice(0, 20).forEach(venta => {
          doc.fontSize(8).font('Helvetica');
          doc.text(`ID Pedido: ${venta.idPedido || 'N/A'} | Estado: ${venta.estado || 'N/A'} | Total: $${venta.total || 0}`);
        });
      } else {
        doc.fontSize(10).text('No hay datos de ventas disponibles');
      }

      doc.end();
    } catch (error) {
      throw new Error(`Error generating PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Método legacy para compatibilidad con salesController
   * Genera un reporte de ventas en PDF
   */
  async generarReporteVentasPDF(res: any, datos: any): Promise<void> {
    try {
      const startDate = new Date(datos.startDate || new Date().setDate(new Date().getDate() - 30));
      const endDate = new Date(datos.endDate || new Date());
      const buffer = await this.generateDashboardPDF(startDate, endDate);
      
      res.contentType('application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-ventas.pdf"');
      res.send(buffer);
    } catch (error) {
      throw new Error(`Error generating report PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

}

