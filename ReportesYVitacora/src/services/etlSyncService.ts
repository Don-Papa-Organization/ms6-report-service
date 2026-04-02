import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';
import { AnalyticsRepository } from '../domain/repositories/analyticsRepository';

interface SyncConfig {
  orderServiceUrl: string;
  inventoryServiceUrl: string;
  userServiceUrl: string;
  reservationServiceUrl: string;
  eventServiceUrl: string;
  internalServiceKey: string;
  httpTimeout: number;
}

export class ETLSyncService {
  private axiosInstance: AxiosInstance;
  private repository: AnalyticsRepository;
  private config: SyncConfig;
  private serviceToken: string;

  constructor(config: SyncConfig, repository: AnalyticsRepository) {
    this.config = {
      ...config,
      orderServiceUrl: this.normalizeServiceBaseUrl(config.orderServiceUrl),
      inventoryServiceUrl: this.normalizeServiceBaseUrl(config.inventoryServiceUrl),
      userServiceUrl: this.normalizeServiceBaseUrl(config.userServiceUrl),
      reservationServiceUrl: this.normalizeServiceBaseUrl(config.reservationServiceUrl),
      eventServiceUrl: this.normalizeServiceBaseUrl(config.eventServiceUrl)
    };
    this.repository = repository;
    this.serviceToken = this.createServiceToken();
    this.axiosInstance = axios.create({
      timeout: config.httpTimeout,
      headers: {
        'x-internal-service-key': config.internalServiceKey,
        'x-service-key': config.internalServiceKey,
        'Authorization': `Bearer ${this.serviceToken}`
      }
    });
  }

  private normalizeServiceBaseUrl(url: string): string {
    const cleaned = (url || '').replace(/\/+$/, '');
    if (!cleaned) return cleaned;
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }

  private createServiceToken(): string {
    const jwtSecret = process.env.JWT_SECRET || 'tu_super_secreto_jwt_development_very_secure_key_12345';
    return jwt.sign(
      {
        id: 0,
        tipoUsuario: 'administrador',
        activo: true
      },
      jwtSecret,
      { expiresIn: '12h' }
    );
  }

  private extractDataArray(responseData: any): any[] {
    const payload = responseData?.data ?? responseData;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.reservas)) return payload.reservas;
    if (Array.isArray(payload?.productos)) return payload.productos;
    if (Array.isArray(payload?.orders)) return payload.orders;
    if (Array.isArray(responseData?.orders)) return responseData.orders;
    if (Array.isArray(responseData)) return responseData;
    return [];
  }

  private getOrderProducts(order: any): any[] {
    if (Array.isArray(order?.productos)) return order.productos;
    if (Array.isArray(order?.productosPedido)) return order.productosPedido;
    if (Array.isArray(order?.detallePedido)) return order.detallePedido;
    return [];
  }

  // Job 1: Sincronizar ventas diarias
  async syncDailySales(date: Date): Promise<void> {
    try {
      console.log(`🔄 [ETL] Sincronizando ventas del día ${date.toISOString()}`);

      // Verificar si ya existe
      const exists = await this.repository.checkSummarySyncExists(date, 'daily_sales');
      if (exists) {
        console.log(`⏭️  [ETL] Ventas del ${date.toISOString()} ya sincronizadas`);
        return;
      }

      const response = await this.axiosInstance.get(`${this.config.orderServiceUrl}/orders/all`, {
        params: {
          page: 1,
          limit: 1000
        }
      });

      const targetDate = date.toISOString().split('T')[0];
      const orders = this.extractDataArray(response.data).filter((order: any) => {
        if (!order?.fechaPedido) return false;
        return new Date(order.fechaPedido).toISOString().split('T')[0] === targetDate;
      });
      
      let totalVentas = 0;
      let cantidadPedidos = 0;
      let canalFisico = 0;
      let canalWeb = 0;
      let totalDescuentos = 0;

      orders.forEach((order: any) => {
        totalVentas += Number(order.total || 0);
        cantidadPedidos++;
        totalDescuentos += Number(order.descuentoAplicado || 0);
        
        if (order.canalVenta === 'fisico') {
          canalFisico++;
        } else if (order.canalVenta === 'web' || order.canalVenta === 'delivery') {
          canalWeb++;
        }
      });

      await this.repository.saveDailySalesSummary({
        fecha: date,
        totalVentas,
        cantidadPedidos,
        canalFisico,
        canalWeb,
        totalDescuentos
      });

      console.log(`✅ [ETL] Ventas sincronizadas: ${cantidadPedidos} pedidos, $${totalVentas}`);
    } catch (error: any) {
      console.error(`❌ [ETL] Error sincronizando ventas:`, error.message);
    }
  }

  // Job 2: Sincronizar productos más vendidos
  async syncTopProducts(date: Date): Promise<void> {
    try {
      console.log(`🔄 [ETL] Sincronizando productos del día ${date.toISOString()}`);

      const exists = await this.repository.checkSummarySyncExists(date, 'product_sales');
      if (exists) {
        console.log(`⏭️  [ETL] Productos del ${date.toISOString()} ya sincronizados`);
        return;
      }

      const response = await this.axiosInstance.get(`${this.config.orderServiceUrl}/orders/all`, {
        params: {
          page: 1,
          limit: 1000
        }
      });

      const targetDate = date.toISOString().split('T')[0];
      const orders = this.extractDataArray(response.data).filter((order: any) => {
        if (!order?.fechaPedido) return false;
        return new Date(order.fechaPedido).toISOString().split('T')[0] === targetDate;
      });

      const productMap = new Map<number, { cantidadVendida: number; ingresosGenerados: number }>();

      for (const order of orders) {
        const products = this.getOrderProducts(order);
        products.forEach((product: any) => {
          const idProducto = Number(product.idProducto);
          if (!idProducto) return;

          const cantidad = Number(product.cantidad || 0);
          const ingreso = Number(product.subtotal || 0);
          const current = productMap.get(idProducto) || { cantidadVendida: 0, ingresosGenerados: 0 };

          productMap.set(idProducto, {
            cantidadVendida: current.cantidadVendida + cantidad,
            ingresosGenerados: current.ingresosGenerados + ingreso
          });
        });
      }

      for (const [idProducto, metrics] of productMap.entries()) {
        await this.repository.saveProductSalesSummary({
          idProducto,
          fecha: date,
          cantidadVendida: metrics.cantidadVendida,
          ingresosGenerados: metrics.ingresosGenerados
        });
      }

      console.log(`✅ [ETL] ${productMap.size} productos sincronizados`);
    } catch (error: any) {
      console.error(`❌ [ETL] Error sincronizando productos:`, error.message);
    }
  }

  // Job 3: Sincronizar stock por categoría
  async syncCategoryStock(date: Date): Promise<void> {
    try {
      console.log(`🔄 [ETL] Sincronizando stock del día ${date.toISOString()}`);

      const exists = await this.repository.checkSummarySyncExists(date, 'category_stock');
      if (exists) {
        console.log(`⏭️  [ETL] Stock por categoría del ${date.toISOString()} ya sincronizado`);
        return;
      }

      const response = await this.axiosInstance.get(`${this.config.inventoryServiceUrl}/products`);
      const products = this.extractDataArray(response.data);

      // Agrupar por categoría
      const categoryMap = new Map<number, { stock: number; count: number }>();

      products.forEach((product: any) => {
        const catId = product.idCategoria;
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, { stock: 0, count: 0 });
        }
        const cat = categoryMap.get(catId)!;
        cat.stock += product.stock || 0;
        cat.count++;
      });

      for (const [idCategoria, data] of categoryMap.entries()) {
        await this.repository.saveCategoryStockSummary({
          idCategoria,
          fecha: date,
          stockTotal: data.stock,
          productosUnicos: data.count
        });
      }

      console.log(`✅ [ETL] Stock de ${categoryMap.size} categorías sincronizado`);
    } catch (error: any) {
      console.error(`❌ [ETL] Error sincronizando stock:`, error.message);
    }
  }

  // Job 4: Sincronizar crecimiento de usuarios
  async syncUserGrowth(date: Date): Promise<void> {
    try {
      console.log(`🔄 [ETL] Sincronizando usuarios del día ${date.toISOString()}`);

      const exists = await this.repository.checkSummarySyncExists(date, 'user_growth');
      if (exists) {
        console.log(`⏭️  [ETL] Crecimiento de usuarios del ${date.toISOString()} ya sincronizado`);
        return;
      }

      const usersResponse = await this.axiosInstance.get(`${this.config.userServiceUrl}/usuarios`);
      const users = this.extractDataArray(usersResponse.data);
      const activeClients = users.filter((user: any) => user?.tipoUsuario === 'cliente' && user?.activo !== false).length;

      await this.repository.saveUserGrowthSummary({
        fecha: date,
        nuevosRegistros: 0,
        clientesFrecuentesActivos: activeClients
      });

      console.log(`✅ [ETL] Estadísticas de usuarios sincronizadas`);
    } catch (error: any) {
      console.error(`❌ [ETL] Error sincronizando usuarios:`, error.message);
    }
  }

  // Job 5: Sincronizar reservaciones
  async syncReservations(date: Date): Promise<void> {
    try {
      console.log(`🔄 [ETL] Sincronizando reservaciones del día ${date.toISOString()}`);

      const exists = await this.repository.checkSummarySyncExists(date, 'reservation_occupancy');
      if (exists) {
        console.log(`⏭️  [ETL] Reservaciones del ${date.toISOString()} ya sincronizadas`);
        return;
      }

      const response = await this.axiosInstance.get(`${this.config.reservationServiceUrl}/reservations/daily`, {
        params: {
          fecha: date.toISOString().split('T')[0]
        }
      });

      const reservations = this.extractDataArray(response.data);

      let cantidadReservas = 0;
      let noShows = 0;
      const horaMap = new Map<number, number>();

      reservations.forEach((res: any) => {
        cantidadReservas++;
        
        if (res.estado === 'cancelada' || res.estado === 'no-show') {
          noShows++;
        }

        const baseDate = res.fechaCompleta || res.fechaReserva;
        const hora = baseDate ? new Date(baseDate).getHours() : 0;
        horaMap.set(hora, (horaMap.get(hora) || 0) + 1);
      });

      const horaPico = Array.from(horaMap.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      const tasaNoShow = cantidadReservas > 0 
        ? (noShows / cantidadReservas) * 100 
        : 0;

      await this.repository.saveReservationOccupancySummary({
        fecha: date,
        horaPico,
        cantidadReservas,
        tasaNoShow
      });

      console.log(`✅ [ETL] Reservaciones sincronizadas: ${cantidadReservas} reservas, ${tasaNoShow.toFixed(2)}% no-show`);
    } catch (error: any) {
      console.error(`❌ [ETL] Error sincronizando reservaciones:`, error.message);
    }
  }

  // Job 6: Sincronizar performance de promociones
  async syncPromotions(date: Date): Promise<void> {
    try {
      console.log(`🔄 [ETL] Sincronizando promociones del día ${date.toISOString()}`);

      const exists = await this.repository.checkSummarySyncExists(date, 'promotion_performance');
      if (exists) {
        console.log(`⏭️  [ETL] Promociones del ${date.toISOString()} ya sincronizadas`);
        return;
      }

      const promotionsResponse = await this.axiosInstance.get(`${this.config.eventServiceUrl}/promotions`);
      const promotions = this.extractDataArray(promotionsResponse.data);

      for (const promo of promotions) {
        await this.repository.savePromotionPerformance({
          idPromocion: Number(promo.idPromocion || promo.id || 0),
          idEvento: promo.idEvento || null,
          fecha: date,
          usosAplicados: 0,
          ingresoBajoPromocion: 0
        });
      }

      console.log(`✅ [ETL] ${promotions.length} promociones sincronizadas (base)`);
    } catch (error: any) {
      console.error(`❌ [ETL] Error sincronizando promociones:`, error.message);
    }
  }

  // Ejecutar todos los jobs para una fecha
  async syncAllForDate(date: Date): Promise<void> {
    console.log(`\n📊 [ETL] Iniciando sincronización completa para ${date.toISOString()}`);
    try {
      await Promise.all([
        this.syncDailySales(date),
        this.syncTopProducts(date),
        this.syncCategoryStock(date),
        this.syncUserGrowth(date),
        this.syncReservations(date),
        this.syncPromotions(date)
      ]);
      console.log(`\n✅ [ETL] Sincronización completa finalizada\n`);
    } catch (error: any) {
      console.error(`\n❌ [ETL] Error durante sincronización completa:`, error.message);
    }
  }
}
