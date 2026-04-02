import { AnalyticsRepository } from "../domain/repositories/analyticsRepository";

export class AnalyticsSeeds {
  private repository: AnalyticsRepository;

  constructor(repository: AnalyticsRepository) {
    this.repository = repository;
  }

  async run(): Promise<void> {
    console.log("🌱 Ejecutando seeds de analytics...");

    await this.seedDailySales();
    await this.seedProductSales();
    await this.seedCategoryStock();
    await this.seedUserGrowth();
    await this.seedReservations();
    await this.seedPromotions();

    console.log("✅ Seeds de analytics completados");
  }

  private async seedDailySales(): Promise<void> {
    const today = new Date();
    const salesData = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      salesData.push({
        fecha: date,
        totalVentas: Math.floor(Math.random() * 5000) + 1000,
        cantidadPedidos: Math.floor(Math.random() * 50) + 10,
        canalFisico: Math.floor(Math.random() * 30) + 5,
        canalWeb: Math.floor(Math.random() * 20) + 3,
        totalDescuentos: Math.floor(Math.random() * 500) + 50
      });
    }

    for (const data of salesData) {
      try {
        await this.repository.saveDailySalesSummary(data);
      } catch (error) {
        // Ignorar duplicados
      }
    }
    console.log(`✅ ${salesData.length} registros de ventas diarias sembrados`);
  }

  private async seedProductSales(): Promise<void> {
    const today = new Date();
    const productIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      for (const productId of productIds) {
        try {
          await this.repository.saveProductSalesSummary({
            idProducto: productId,
            fecha: date,
            cantidadVendida: Math.floor(Math.random() * 30) + 5,
            ingresosGenerados: Math.floor(Math.random() * 1000) + 100
          });
        } catch (error) {
          // Ignorar duplicados
        }
      }
    }
    console.log(`✅ ${productIds.length * 7} registros de productos vendidos sembrados`);
  }

  private async seedCategoryStock(): Promise<void> {
    const today = new Date();
    const categories = [
      { id: 1, name: "Licores" },
      { id: 2, name: "Cervezas" },
      { id: 3, name: "Vinos" },
      { id: 4, name: "Bebidas sin alcohol" }
    ];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      for (const cat of categories) {
        try {
          await this.repository.saveCategoryStockSummary({
            idCategoria: cat.id,
            fecha: date,
            stockTotal: Math.floor(Math.random() * 200) + 50,
            productosUnicos: Math.floor(Math.random() * 10) + 3
          });
        } catch (error) {
          // Ignorar duplicados
        }
      }
    }
    console.log(`✅ ${categories.length * 7} registros de stock por categoría sembrados`);
  }

  private async seedUserGrowth(): Promise<void> {
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      try {
        await this.repository.saveUserGrowthSummary({
          fecha: date,
          nuevosRegistros: Math.floor(Math.random() * 5) + 1,
          clientesFrecuentesActivos: Math.floor(Math.random() * 20) + 10
        });
      } catch (error) {
        // Ignorar duplicados
      }
    }
    console.log("✅ 30 registros de crecimiento de usuarios sembrados");
  }

  private async seedReservations(): Promise<void> {
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const cantidadReservas = Math.floor(Math.random() * 15) + 3;
      const noShows = Math.floor(Math.random() * 3);

      try {
        await this.repository.saveReservationOccupancySummary({
          fecha: date,
          horaPico: Math.floor(Math.random() * 4) + 18,
          cantidadReservas,
          tasaNoShow: cantidadReservas > 0 ? (noShows / cantidadReservas) * 100 : 0
        });
      } catch (error) {
        // Ignorar duplicados
      }
    }
    console.log("✅ 14 registros de reservaciones sembrados");
  }

  private async seedPromotions(): Promise<void> {
    const today = new Date();
    const promotions = [
      { idPromocion: 1, idEvento: 1 },
      { idPromocion: 2, idEvento: 2 },
      { idPromocion: 3, idEvento: null }
    ];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      for (const promo of promotions) {
        try {
            await this.repository.savePromotionPerformance({
            idPromocion: promo.idPromocion,
            idEvento: promo.idEvento,
            fecha: date,
            usosAplicados: Math.floor(Math.random() * 20) + 2,
            ingresoBajoPromocion: Math.floor(Math.random() * 2000) + 200
          });
        } catch (error) {
          // Ignorar duplicados
        }
      }
    }
    console.log("✅ 21 registros de promociones sembrados");
  }
}
