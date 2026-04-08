import { Request, Response } from 'express';
import { AnalyticsRepository } from '../domain/repositories/analyticsRepository';
import { inventoryExternalService } from '../services/apis/inventoryExternalService';
import { promotionExternalService } from '../services/apis/promotionExternalService';
import { extractToken } from '../middlewares/authMiddleware';

export class AnalyticsController {
  constructor(private repository: AnalyticsRepository) {}

  private resolveAuthHeader(req: Request): string | undefined {
    const token = extractToken(req);
    return token ? `Bearer ${token}` : undefined;
  }

  private toNumericId(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private getProductDisplayName(idProducto: number, productNames: Map<number, string>): string {
    const rawName = productNames.get(idProducto);
    const normalized = typeof rawName === 'string' ? rawName.trim() : '';
    if (normalized) {
      return normalized;
    }
    return 'N/A';
  }

  private async buildProductLookups(authHeader?: string): Promise<{
    productNames: Map<number, string>;
    categoryNames: Map<number, string>;
  }> {
    const { products, categories } = await inventoryExternalService.getProductsWithCategory(authHeader);

    return {
      productNames: new Map(products.map((product) => [this.toNumericId(product.idProducto), (product.nombre || '').trim()])),
      categoryNames: new Map(categories.map((category) => [this.toNumericId(category.idCategoria), (category.nombre || '').trim()]))
    };
  }

  private async hydrateMissingProductNames(
    productIds: number[],
    productNames: Map<number, string>,
    authHeader?: string
  ): Promise<void> {
    const missingIds = [...new Set(productIds)].filter((idProducto) => idProducto > 0 && !(productNames.get(idProducto) || '').trim());

    if (!missingIds.length) {
      return;
    }

    const fetchedProducts = await Promise.all(
      missingIds.map((idProducto) => inventoryExternalService.getProductById(idProducto, authHeader))
    );

    fetchedProducts.forEach((product) => {
      if (!product) {
        return;
      }

      const idProducto = this.toNumericId(product.idProducto);
      const normalizedName = typeof product.nombre === 'string' ? product.nombre.trim() : '';

      if (idProducto > 0 && normalizedName) {
        productNames.set(idProducto, normalizedName);
      }
    });
  }

  private async buildPromotionLookup(): Promise<Map<number, string>> {
    const promotions = await promotionExternalService.getPromotions();
    return new Map(promotions.map((promotion) => [this.toNumericId(promotion.idPromocion), promotion.nombre]));
  }

  // Resumen de ventas por rango de fechas
  async getSalesSummary(req: Request, res: Response): Promise<void> {
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

      const summaries = await this.repository.getDailySalesSummary(start, end);

      const totalVentas = summaries.reduce((sum, s) => sum + Number(s.totalVentas), 0);
      const totalPedidos = summaries.reduce((sum, s) => sum + s.cantidadPedidos, 0);
      const totalFisico = summaries.reduce((sum, s) => sum + s.canalFisico, 0);
      const totalWeb = summaries.reduce((sum, s) => sum + s.canalWeb, 0);
      const totalDescuentos = summaries.reduce((sum, s) => sum + Number(s.totalDescuentos), 0);

      res.json({
        success: true,
        data: {
          periodo: { desde: startDate, hasta: endDate },
          resumen: {
            totalVentas,
            cantidadPedidos: totalPedidos,
            ventasFisico: totalFisico,
            ventasWeb: totalWeb,
            totalDescuentos,
            margenPromedio: totalVentas > 0 ? ((totalVentas - totalDescuentos) / totalVentas * 100).toFixed(2) : '0.00'
          },
          detalles: summaries
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener resumen de ventas',
        error: error.message
      });
    }
  }

  // Timeline de ventas diarias
  async getSalesTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, limit = 14 } = req.query;

      const start = new Date(startDate as string || new Date().toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const summaries = await this.repository.getDailySalesSummary(start, end);
      const timeline = summaries
        .map(s => ({
          fecha: s.fecha,
          totalVentas: Number(s.totalVentas),
          cantidadPedidos: s.cantidadPedidos,
          canalFisico: s.canalFisico,
          canalWeb: s.canalWeb
        }))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .slice(-Math.max(1, Number(limit) || 14));

      res.json({
        success: true,
        data: {
          puntos: timeline,
          totalPuntos: timeline.length
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener timeline de ventas',
        error: error.message
      });
    }
  }

  // Productos top vendidos
  async getTopProducts(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, limit = 10 } = req.query;
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      const start = new Date(startDate as string || defaultStart.toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const products = await this.repository.getProductSalesSummary(start, end, parseInt(limit as string) || 10);
      const authHeader = this.resolveAuthHeader(req);
      const { productNames } = await this.buildProductLookups(authHeader);
      await this.hydrateMissingProductNames(
        products.map((product) => this.toNumericId(product.idProducto)),
        productNames,
        authHeader
      );

      res.json({
        success: true,
        data: products.map(p => ({
          idProducto: this.toNumericId(p.idProducto),
          nombreProducto: this.getProductDisplayName(this.toNumericId(p.idProducto), productNames),
          cantidadVendida: p.cantidadVendida,
          ingresosGenerados: p.ingresosGenerados,
          fecha: p.fecha
        }))
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos top',
        error: error.message
      });
    }
  }

  // Productos sin movimiento (dead stock)
  async getDeadStock(req: Request, res: Response): Promise<void> {
    try {
      const { daysWithoutSale = 30 } = req.query;
      const authHeader = this.resolveAuthHeader(req);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysWithoutSale as string || '30'));

      const allProductSales = await this.repository.getProductSalesSummary(
        cutoffDate,
        new Date(),
        1000
      );

      const soldProducts = new Set(allProductSales.map(p => p.idProducto));

      const allProducts = await inventoryExternalService.getAllProducts(authHeader);
      const deadStockProducts = allProducts
        .filter((p) => p.activo && !soldProducts.has(p.idProducto))
        .map((p) => ({
          idProducto: p.idProducto,
          nombre: p.nombre,
          stockActual: p.stockActual,
          stockMinimo: p.stockMinimo
        }));

      res.json({
        success: true,
        data: {
          productosSinVentas: deadStockProducts,
          resumen: {
            totalProductosEvaluados: allProducts.length,
            totalProductosSinVentas: deadStockProducts.length
          },
          periodo: { desde: cutoffDate, hasta: new Date() },
          daysWithoutSale: parseInt(daysWithoutSale as string || '30')
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener dead stock',
        error: error.message
      });
    }
  }

  // Inventario por categoría
  async getInventoryByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = new Date(startDate as string || new Date().toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const categories = await this.repository.getCategoryStockSummary(start, end);
      const authHeader = this.resolveAuthHeader(req);
      const { categoryNames } = await this.buildProductLookups(authHeader);
      const latestByCategory = new Map<number, { idCategoria: number; stockTotal: number; productosUnicos: number; fecha: Date }>();

      for (const row of categories) {
        const idCategoria = this.toNumericId(row.idCategoria);
        const existing = latestByCategory.get(idCategoria);
        if (!existing || new Date(row.fecha).getTime() > new Date(existing.fecha).getTime()) {
          latestByCategory.set(idCategoria, {
            idCategoria,
            stockTotal: row.stockTotal,
            productosUnicos: row.productosUnicos,
            fecha: row.fecha
          });
        }
      }

      const data = Array.from(latestByCategory.values());

      res.json({
        success: true,
        data: {
          categorias: data.map(item => ({
            ...item,
            nombreCategoria: categoryNames.get(item.idCategoria) || 'Categoría sin nombre'
          })),
          resumen: {
            totalCategorias: data.length,
            stockTotal: data.reduce((acc, c) => acc + c.stockTotal, 0),
            productosUnicos: data.reduce((acc, c) => acc + c.productosUnicos, 0)
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener inventario por categoría',
        error: error.message
      });
    }
  }

  // Crecimiento de usuarios
  async getUserGrowth(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = new Date(startDate as string || new Date().toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const growth = await this.repository.getUserGrowthSummary(start, end);

      const totalNuevos = growth.reduce((sum, g) => sum + g.nuevosRegistros, 0);
      const avgFrecuentes = growth.length > 0
        ? Math.round(growth.reduce((sum, g) => sum + g.clientesFrecuentesActivos, 0) / growth.length)
        : 0;

      res.json({
        success: true,
        data: {
          periodo: { desde: startDate, hasta: endDate },
          resumen: {
            totalNuevosRegistros: totalNuevos,
            clientesFrecuentesPromedio: avgFrecuentes
          },
          detalles: growth
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener crecimiento de usuarios',
        error: error.message
      });
    }
  }

  // Usuarios frecuentes activos
  async getFrequentUsers(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = new Date(startDate as string || new Date().toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const growth = await this.repository.getUserGrowthSummary(start, end);

      const serie = growth
        .map(g => ({
          fecha: g.fecha,
          clientesFrecuentesActivos: g.clientesFrecuentesActivos,
          nuevosRegistros: g.nuevosRegistros
        }))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

      res.json({
        success: true,
        data: {
          serie,
          resumen: {
            ultimoValorFrecuentes: serie.length > 0 ? serie[serie.length - 1].clientesFrecuentesActivos : 0,
            promedioFrecuentes: serie.length > 0
              ? Math.round(serie.reduce((acc, it) => acc + it.clientesFrecuentesActivos, 0) / serie.length)
              : 0
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios frecuentes',
        error: error.message
      });
    }
  }

  // Horas pico de ocupación
  async getPeakHours(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = new Date(startDate as string || new Date().toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const reservations = await this.repository.getReservationOccupancySummary(start, end);
      const peakHourCount = new Map<number, number>();
      for (const item of reservations) {
        if (item.horaPico === null || item.horaPico === undefined) continue;
        peakHourCount.set(item.horaPico, (peakHourCount.get(item.horaPico) || 0) + 1);
      }

      const horaPicoGlobal = Array.from(peakHourCount.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      res.json({
        success: true,
        data: {
          periodo: { desde: startDate, hasta: endDate },
          horaPico: horaPicoGlobal,
          detalles: reservations
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener horas pico',
        error: error.message
      });
    }
  }

  // Tasa de no-show
  async getNoShowRate(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = new Date(startDate as string || new Date().toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const reservations = await this.repository.getReservationOccupancySummary(start, end);

      const promedioNoShow = reservations.length > 0
        ? reservations.reduce((sum, r) => sum + r.tasaNoShow, 0) / reservations.length
        : 0;

      res.json({
        success: true,
        data: {
          periodo: { desde: startDate, hasta: endDate },
          tasaNoShowPromedio: parseFloat(promedioNoShow.toFixed(2)),
          detalles: reservations.map(r => ({
            fecha: r.fecha,
            cantidadReservas: r.cantidadReservas,
            tasaNoShow: r.tasaNoShow
          }))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener tasa de no-show',
        error: error.message
      });
    }
  }

  // Efectividad de promociones
  async getPromotionEffectiveness(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = new Date(startDate as string || new Date().toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const promotions = await this.repository.getPromotionPerformance(start, end);
      const promotionNames = await this.buildPromotionLookup();

      const totalUsosAplicados = promotions.reduce((sum, p) => sum + p.usosAplicados, 0);
      const totalIngresoPromo = promotions.reduce((sum, p) => sum + Number(p.ingresoBajoPromocion), 0);

      const detalles = promotions.map(p => ({
        idPromocion: this.toNumericId(p.idPromocion),
        nombrePromocion: promotionNames.get(this.toNumericId(p.idPromocion)) || 'Promoción sin nombre',
        idEvento: p.idEvento,
        usosAplicados: p.usosAplicados,
        ingresoTotal: Number(p.ingresoBajoPromocion),
        fecha: p.fecha
      }));

      res.json({
        success: true,
        data: {
          periodo: { desde: startDate, hasta: endDate },
          resumen: {
            totalPromociones: promotions.length,
            totalUsosAplicados,
            ingresoTotalPromo: totalIngresoPromo,
            ingresoPromedio: promotions.length > 0 ? Number((totalIngresoPromo / promotions.length).toFixed(2)) : 0
          },
          topPromociones: detalles
            .sort((a, b) => b.ingresoTotal - a.ingresoTotal)
            .slice(0, 5)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener efectividad de promociones',
        error: error.message
      });
    }
  }

  // Productos con stock bajo (del ms1)
  async getLowStock(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = this.resolveAuthHeader(req);
      
      const products = await inventoryExternalService.getLowStockProducts(authHeader);

      res.json({
        success: true,
        data: {
          productos: products.map(p => ({
            idProducto: p.idProducto,
            nombre: p.nombre,
            stockActual: p.stockActual,
            stockMinimo: p.stockMinimo
          })),
          total: products.length
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos con stock bajo',
        error: error.message
      });
    }
  }

  // Stock por categoría (del ms1)
  async getInventoryStock(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      const { products, categories } = await inventoryExternalService.getProductsWithCategory(authHeader);

      const categoryMap = new Map(categories.map(c => [c.idCategoria, c.nombre]));
      
      const stockByCategory = new Map<number, { nombre: string; stockTotal: number; productos: number }>();

      for (const product of products) {
        const catId = product.idCategoria || 0;
        const catName = categoryMap.get(catId) || 'Sin categoría';
        
        if (!stockByCategory.has(catId)) {
          stockByCategory.set(catId, { nombre: catName, stockTotal: 0, productos: 0 });
        }
        
        const cat = stockByCategory.get(catId)!;
        cat.stockTotal += product.stockActual;
        cat.productos += 1;
      }

      res.json({
        success: true,
        data: Array.from(stockByCategory.values()).map(c => ({
          categoria: c.nombre,
          stockTotal: c.stockTotal,
          productos: c.productos
        }))
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener stock por categoría',
        error: error.message
      });
    }
  }

  // Ventas semanales agrupadas
  async getWeeklySales(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, weeks = 12 } = req.query;

      const now = new Date();
      const start = startDate ? new Date(startDate as string) : new Date(now.setDate(now.getDate() - (parseInt(weeks as string) || 12) * 7));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      const dailySummaries = await this.repository.getDailySalesSummary(start, end);

      const weeklyMap = new Map<string, { weekStart: Date; totalVentas: number; cantidadPedidos: number; canalFisico: number; canalWeb: number; totalDescuentos: number }>();

      for (const summary of dailySummaries) {
        const date = new Date(summary.fecha);
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek;
        const weekStart = new Date(date.setDate(diff));
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, { weekStart, totalVentas: 0, cantidadPedidos: 0, canalFisico: 0, canalWeb: 0, totalDescuentos: 0 });
        }

        const week = weeklyMap.get(weekKey)!;
        week.totalVentas += Number(summary.totalVentas);
        week.cantidadPedidos += summary.cantidadPedidos;
        week.canalFisico += summary.canalFisico;
        week.canalWeb += summary.canalWeb;
        week.totalDescuentos += Number(summary.totalDescuentos);
      }

      const weeklyData = Array.from(weeklyMap.values())
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
        .map(w => ({
          semana: w.weekStart.toISOString().split('T')[0],
          totalVentas: w.totalVentas,
          cantidadPedidos: w.cantidadPedidos,
          ventasFisico: w.canalFisico,
          ventasWeb: w.canalWeb,
          descuentos: w.totalDescuentos
        }));

      if (weeklyData.length === 0) {
        res.json({
          success: true,
          data: {
            ventasSemanales: [],
            comparacion: null
          }
        });
        return;
      }

      const currentWeek = weeklyData[weeklyData.length - 1];
      const previousWeek = weeklyData[weeklyData.length - 2];

      res.json({
        success: true,
        data: {
          ventasSemanales: weeklyData,
          comparacion: previousWeek ? {
            semanaActual: currentWeek.semana,
            semanaAnterior: previousWeek.semana,
            cambioVentas: currentWeek.totalVentas - previousWeek.totalVentas,
            cambioPorcentual: previousWeek.totalVentas > 0 
              ? ((currentWeek.totalVentas - previousWeek.totalVentas) / previousWeek.totalVentas * 100).toFixed(2)
              : '0.00',
            cambioFisico: currentWeek.ventasFisico - previousWeek.ventasFisico,
            cambioWeb: currentWeek.ventasWeb - previousWeek.ventasWeb
          } : null
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener ventas semanales',
        error: error.message
      });
    }
  }
}
