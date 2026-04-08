import PDFDocument from 'pdfkit';
import { AnalyticsRepository } from '../domain/repositories/analyticsRepository';
import { inventoryExternalService } from './apis/inventoryExternalService';
import { promotionExternalService } from './apis/promotionExternalService';

export class PdfExportService {
  constructor(private repository: AnalyticsRepository) {}

  private toSafeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(this.toSafeNumber(value));
  }

  private buildProductDisplayName(idProducto: number, productNames: Map<number, string>): string {
    const raw = productNames.get(idProducto);
    const normalized = typeof raw === 'string' ? raw.trim() : '';
    if (normalized) {
      return normalized;
    }
    return 'N/A';
  }

  /**
   * Genera un PDF con todos los datos del dashboard
   */
  async generateDashboardPDF(startDate: Date, endDate: Date, authHeader?: string): Promise<Buffer> {
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
        doc.fontSize(24).font('Helvetica-Bold').text('Reporte Ejecutivo de Operacion', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Periodo: ${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`, { align: 'center' });
        doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-CO')}`, { align: 'center' });
        doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).stroke();
        doc.moveDown(2);

        // Obtener datos
        const [
          sales,
          products,
          categories,
          users,
          reservations,
          promotions,
          productsWithCategories,
          promotionCatalog
        ] = await Promise.all([
          this.repository.getDailySalesSummary(startDate, endDate),
          this.repository.getProductSalesSummary(startDate, endDate, 20),
          this.repository.getCategoryStockSummary(startDate, endDate),
          this.repository.getUserGrowthSummary(startDate, endDate),
          this.repository.getReservationOccupancySummary(startDate, endDate),
          this.repository.getPromotionPerformance(startDate, endDate),
          inventoryExternalService.getProductsWithCategory(authHeader),
          promotionExternalService.getPromotions()
        ]);

        const productNames = new Map(
          (productsWithCategories.products || []).map((product) => [this.toSafeNumber(product.idProducto), product.nombre])
        );
        const categoryNames = new Map(
          (productsWithCategories.categories || []).map((category) => [this.toSafeNumber(category.idCategoria), category.nombre])
        );
        const promotionNames = new Map(
          (promotionCatalog || []).map((promotion) => [this.toSafeNumber(promotion.idPromocion), promotion.nombre])
        );

        const totalVentas = sales.reduce((sum, s) => sum + this.toSafeNumber(s.totalVentas), 0);
        const totalPedidos = sales.reduce((sum, s) => sum + this.toSafeNumber(s.cantidadPedidos), 0);
        const canalFisico = sales.reduce((sum, s) => sum + this.toSafeNumber(s.canalFisico), 0);
        const canalWeb = sales.reduce((sum, s) => sum + this.toSafeNumber(s.canalWeb), 0);
        const totalDescuentos = sales.reduce((sum, s) => sum + this.toSafeNumber(s.totalDescuentos), 0);
        const margenNeto = totalVentas > 0 ? ((totalVentas - totalDescuentos) / totalVentas) * 100 : 0;
        const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

        const totalReservas = reservations.reduce((sum, r) => sum + this.toSafeNumber(r.cantidadReservas), 0);
        const avgNoShow = reservations.length > 0
          ? reservations.reduce((sum, r) => sum + this.toSafeNumber(r.tasaNoShow), 0) / reservations.length
          : 0;

        const totalNuevos = users.reduce((sum, u) => sum + this.toSafeNumber(u.nuevosRegistros), 0);
        const avgFrecuentes = users.length > 0
          ? Math.round(users.reduce((sum, u) => sum + this.toSafeNumber(u.clientesFrecuentesActivos), 0) / users.length)
          : 0;

        const totalUsosAplicados = promotions.reduce((sum, p) => sum + this.toSafeNumber(p.usosAplicados), 0);
        const totalIngresoPromo = promotions.reduce((sum, p) => sum + this.toSafeNumber(p.ingresoBajoPromocion), 0);

        // Conclusiones ejecutivas (arriba)
        doc.fontSize(13).font('Helvetica-Bold').text('Conclusiones clave', { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(9).font('Helvetica');

        const topProduct = [...products].sort((a, b) => this.toSafeNumber(b.ingresosGenerados) - this.toSafeNumber(a.ingresosGenerados))[0];
        const topProductName = topProduct
          ? this.buildProductDisplayName(this.toSafeNumber(topProduct.idProducto), productNames)
          : 'N/A';

        const conclusiones = [
          `Ventas del periodo: ${this.formatCurrency(totalVentas)} con ${totalPedidos} pedidos y ticket promedio ${this.formatCurrency(ticketPromedio)}.`,
          `El canal físico representa ${canalFisico} pedidos vs ${canalWeb} web/delivery; margen neto estimado ${margenNeto.toFixed(2)}%.`,
          `Producto líder por ingresos: ${topProductName}${topProduct ? ` (${this.formatCurrency(this.toSafeNumber(topProduct.ingresosGenerados))})` : ''}.`,
          `Reservas totales: ${totalReservas} con no-show promedio ${avgNoShow.toFixed(2)}%; nuevos usuarios: ${totalNuevos}.`
        ];

        conclusiones.forEach((item) => {
          doc.text(`• ${item}`);
        });

        doc.moveDown(1.2);
        doc.fontSize(13).font('Helvetica-Bold').text('Datos concretos', { underline: true });
        doc.moveDown(0.5);

        // Bloque 1: KPIs de ventas
        doc.fontSize(11).font('Helvetica-Bold').text('1) Resumen de Ventas');
        doc.fontSize(9).font('Helvetica');
        this.addKeyValuePair(doc, 'Total de Ventas:', this.formatCurrency(totalVentas));
        this.addKeyValuePair(doc, 'Cantidad de Pedidos:', `${totalPedidos}`);
        this.addKeyValuePair(doc, 'Ticket Promedio:', this.formatCurrency(ticketPromedio));
        this.addKeyValuePair(doc, 'Ventas Físico / Web:', `${canalFisico} / ${canalWeb}`);
        this.addKeyValuePair(doc, 'Descuentos Aplicados:', this.formatCurrency(totalDescuentos));
        this.addKeyValuePair(doc, 'Margen Neto:', `${margenNeto.toFixed(2)}%`);
        doc.moveDown(0.4);
        this.addSalesTable(doc, [...sales].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 7));

        // Bloque 2: Productos top
        doc.addPage();
        doc.fontSize(11).font('Helvetica-Bold').text('2) Top Productos Vendidos');
        doc.fontSize(9).font('Helvetica').text('Top por ingresos en el periodo.');
        doc.moveDown(0.4);
        this.addProductsTable(
          doc,
          [...products].sort((a, b) => this.toSafeNumber(b.ingresosGenerados) - this.toSafeNumber(a.ingresosGenerados)).slice(0, 10),
          productNames
        );

        // Bloque 3: Inventario condensado por último corte
        const latestByCategory = new Map<number, any>();
        for (const row of categories) {
          const idCategoria = this.toSafeNumber(row.idCategoria);
          const existing = latestByCategory.get(idCategoria);
          if (!existing || new Date(row.fecha).getTime() > new Date(existing.fecha).getTime()) {
            latestByCategory.set(idCategoria, row);
          }
        }

        doc.moveDown(1);
        doc.fontSize(11).font('Helvetica-Bold').text('3) Inventario por Categoría (último corte)');
        doc.fontSize(9).font('Helvetica').text('Se muestra un único registro por categoría para evitar ruido visual.');
        doc.moveDown(0.4);
        this.addCategoryTable(doc, Array.from(latestByCategory.values()).slice(0, 12), categoryNames);

        // Bloque 4: Usuarios y ocupación
        doc.addPage();
        doc.fontSize(11).font('Helvetica-Bold').text('4) Crecimiento de Usuarios y Ocupación');
        doc.fontSize(9).font('Helvetica');
        this.addKeyValuePair(doc, 'Nuevos Registros:', `${totalNuevos}`);
        this.addKeyValuePair(doc, 'Clientes Frecuentes Promedio:', `${avgFrecuentes}`);
        this.addKeyValuePair(doc, 'Total Reservaciones:', `${totalReservas}`);
        this.addKeyValuePair(doc, 'No-show Promedio:', `${avgNoShow.toFixed(2)}%`);
        doc.moveDown(0.4);

        const usersShort = [...users].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 6);
        if (usersShort.length) {
          doc.fontSize(9).font('Helvetica-Bold').text('Detalle usuarios (últimos 6 días):');
          doc.fontSize(8).font('Helvetica');
          usersShort.forEach((u) => {
            doc.text(`${u.fecha ? new Date(u.fecha).toLocaleDateString() : 'N/A'} · Nuevos: ${u.nuevosRegistros} · Frecuentes: ${u.clientesFrecuentesActivos}`);
          });
        }

        const reservationsShort = [...reservations].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 6);
        if (reservationsShort.length) {
          doc.moveDown(0.4);
          doc.fontSize(9).font('Helvetica-Bold').text('Detalle reservas (últimos 6 días):');
          doc.fontSize(8).font('Helvetica');
          reservationsShort.forEach((r) => {
            doc.text(`${r.fecha ? new Date(r.fecha).toLocaleDateString() : 'N/A'} · Reservas: ${this.toSafeNumber(r.cantidadReservas)} · No-show: ${this.toSafeNumber(r.tasaNoShow).toFixed(2)}%`);
          });
        }

        // Bloque 5: Promociones
        doc.addPage();
        doc.fontSize(11).font('Helvetica-Bold').text('5) Efectividad de Promociones');
        doc.fontSize(9).font('Helvetica');
        this.addKeyValuePair(doc, 'Usos Totales:', `${totalUsosAplicados}`);
        this.addKeyValuePair(doc, 'Ingresos por Promoción:', this.formatCurrency(totalIngresoPromo));
        this.addKeyValuePair(doc, 'Ingreso Promedio por Uso:', this.formatCurrency(totalIngresoPromo / (totalUsosAplicados || 1)));
        doc.moveDown(0.4);
        doc.fontSize(9).font('Helvetica-Bold').text('Top promociones (por ingresos):');
        doc.fontSize(8).font('Helvetica');
        [...promotions]
          .sort((a, b) => this.toSafeNumber(b.ingresoBajoPromocion) - this.toSafeNumber(a.ingresoBajoPromocion))
          .slice(0, 8)
          .forEach((p) => {
            const idPromocion = this.toSafeNumber(p.idPromocion);
            const nombrePromocion = (promotionNames.get(idPromocion) || '').trim() || `Promoción #${idPromocion}`;
            doc.text(`${nombrePromocion} · usos: ${this.toSafeNumber(p.usosAplicados)} · ingresos: ${this.formatCurrency(this.toSafeNumber(p.ingresoBajoPromocion))}`);
          });

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
            totalVentas: sales.reduce((sum, s) => sum + this.toSafeNumber(s.totalVentas), 0),
            cantidadPedidos: sales.reduce((sum, s) => sum + this.toSafeNumber(s.cantidadPedidos), 0),
            canalFisico: sales.reduce((sum, s) => sum + this.toSafeNumber(s.canalFisico), 0),
            canalWeb: sales.reduce((sum, s) => sum + this.toSafeNumber(s.canalWeb), 0),
            totalDescuentos: sales.reduce((sum, s) => sum + this.toSafeNumber(s.totalDescuentos), 0)
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
            totalNuevosRegistros: users.reduce((sum, u) => sum + this.toSafeNumber(u.nuevosRegistros), 0),
            clientesFrecuentesPromedio: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + this.toSafeNumber(u.clientesFrecuentesActivos), 0) / users.length) : 0
          },
          details: users
        },
        reservations: {
          summary: {
            totalReservas: reservations.reduce((sum, r) => sum + this.toSafeNumber(r.cantidadReservas), 0),
            tasaNoShowPromedio: reservations.length > 0 ? reservations.reduce((sum, r) => sum + this.toSafeNumber(r.tasaNoShow), 0) / reservations.length : 0
          },
          details: reservations
        },
        promotions: {
          summary: {
            totalUsos: promotions.reduce((sum, p) => sum + this.toSafeNumber(p.usosAplicados), 0),
            totalIngresos: promotions.reduce((sum, p) => sum + this.toSafeNumber(p.ingresoBajoPromocion), 0)
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
      doc.text(`$${this.toSafeNumber(sale.totalVentas).toFixed(2)}`, 130, y);
      doc.text(`${this.toSafeNumber(sale.cantidadPedidos)}`, 220, y);
      doc.text(`${this.toSafeNumber(sale.canalFisico)}`, 300, y);
      doc.text(`${this.toSafeNumber(sale.canalWeb)}`, 380, y);
      y += rowHeight;
    });
  }

  private addProductsTable(doc: any, products: any[], productNames: Map<number, string>): void {
    const tableTop = doc.y + 10;
    const rowHeight = 18;

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('ID Producto', 40, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Cantidad', 325, tableTop);
    doc.text('Ingresos', 410, tableTop);

    doc.moveTo(40, tableTop + 15).lineTo(515, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.fontSize(8).font('Helvetica');
    products.forEach((product) => {
      if (y > 700) {
        doc.addPage();
        y = 40;
      }
      const idProducto = this.toSafeNumber(product.idProducto);
      doc.text(`${idProducto}`, 40, y);
      doc.text(this.buildProductDisplayName(idProducto, productNames), 100, y, { width: 210, ellipsis: true });
      doc.text(`${this.toSafeNumber(product.cantidadVendida)}`, 325, y);
      doc.text(this.formatCurrency(this.toSafeNumber(product.ingresosGenerados)), 410, y);
      y += rowHeight;
    });
  }

  private addCategoryTable(doc: any, categories: any[], categoryNames: Map<number, string>): void {
    const tableTop = doc.y + 10;
    const rowHeight = 18;

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Categoría', 40, tableTop);
    doc.text('Stock Total', 230, tableTop);
    doc.text('Productos', 320, tableTop);
    doc.text('Fecha', 410, tableTop);

    doc.moveTo(40, tableTop + 15).lineTo(515, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.fontSize(8).font('Helvetica');
    categories.forEach((cat) => {
      if (y > 700) {
        doc.addPage();
        y = 40;
      }
      const fecha = cat.fecha ? new Date(cat.fecha).toLocaleDateString() : 'N/A';
      const idCategoria = this.toSafeNumber(cat.idCategoria);
      const nombreCategoria = (categoryNames.get(idCategoria) || '').trim() || `Categoría #${idCategoria}`;
      doc.text(nombreCategoria, 40, y, { width: 180, ellipsis: true });
      doc.text(`${this.toSafeNumber(cat.stockTotal)}`, 230, y);
      doc.text(`${this.toSafeNumber(cat.productosUnicos)}`, 320, y);
      doc.text(fecha, 410, y);
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

