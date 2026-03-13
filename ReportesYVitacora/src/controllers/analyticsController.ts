import { Request, Response } from 'express';
import { AnalyticsRepository } from '../domain/repositories/analyticsRepository';

export class AnalyticsController {
  constructor(private repository: AnalyticsRepository) {}

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
      const { startDate, endDate } = req.query;

      const start = new Date(startDate as string || new Date().toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const summaries = await this.repository.getDailySalesSummary(start, end);

      res.json({
        success: true,
        data: summaries.map(s => ({
          fecha: s.fecha,
          totalVentas: s.totalVentas,
          cantidadPedidos: s.cantidadPedidos,
          canalFisico: s.canalFisico,
          canalWeb: s.canalWeb
        }))
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

      const start = new Date(startDate as string || new Date().toISOString().split('T')[0]);
      const end = new Date(endDate as string || new Date().toISOString());
      end.setHours(23, 59, 59, 999);

      const products = await this.repository.getProductSalesSummary(start, end, parseInt(limit as string) || 10);

      res.json({
        success: true,
        data: products.map(p => ({
          idProducto: p.idProducto,
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

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysWithoutSale as string || '30'));

      const latestSale = await this.repository.getLatestDailySalesSummary();
      const allProductSales = await this.repository.getProductSalesSummary(
        cutoffDate,
        new Date(),
        1000
      );

      const soldProducts = new Set(allProductSales.map(p => p.idProducto));

      // En un caso real, consultaríamos todas los productos de inventory
      // Por ahora retornamos la estructura esperada
      res.json({
        success: true,
        data: {
          productosSinVentas: Array.from(soldProducts).length === 0 ? [] : [],
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

      res.json({
        success: true,
        data: categories.map(c => ({
          idCategoria: c.idCategoria,
          stockTotal: c.stockTotal,
          productosUnicos: c.productosUnicos,
          fecha: c.fecha
        }))
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

      res.json({
        success: true,
        data: growth.map(g => ({
          fecha: g.fecha,
          clientesFrecuentesActivos: g.clientesFrecuentesActivos,
          nuevosRegistros: g.nuevosRegistros
        }))
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

      res.json({
        success: true,
        data: {
          periodo: { desde: startDate, hasta: endDate },
          horaPico: reservations.length > 0 ? reservations[0].horaPico : null,
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

      const totalUsosAplicados = promotions.reduce((sum, p) => sum + p.usosAplicados, 0);
      const totalIngresoPromo = promotions.reduce((sum, p) => sum + Number(p.ingresoBajoPromocion), 0);

      res.json({
        success: true,
        data: {
          periodo: { desde: startDate, hasta: endDate },
          resumen: {
            totalPromociones: promotions.length,
            totalUsosAplicados,
            ingresoTotalPromo: totalIngresoPromo,
            ingresoPromedio: promotions.length > 0 ? (totalIngresoPromo / promotions.length).toFixed(2) : '0.00'
          },
          detalles: promotions.map(p => ({
            idPromocion: p.idPromocion,
            idEvento: p.idEvento,
            usosAplicados: p.usosAplicados,
            ingresoTotal: p.ingresoBajoPromocion,
            fecha: p.fecha
          }))
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
}
