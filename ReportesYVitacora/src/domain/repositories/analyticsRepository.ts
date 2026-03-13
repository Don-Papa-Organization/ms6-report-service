import { Sequelize } from "sequelize-typescript";
import { Op } from "sequelize";
import {
  DailySalesSummary,
  ProductSalesSummary,
  CategoryStockSummary,
  UserGrowthSummary,
  ReservationOccupancySummary,
  PromotionPerformance
} from "../models";

export class AnalyticsRepository {
  constructor(private sequelize: Sequelize) {}

  async saveDailySalesSummary(data: any): Promise<DailySalesSummary> {
    return await DailySalesSummary.create(data);
  }

  async saveProductSalesSummary(data: any): Promise<ProductSalesSummary> {
    return await ProductSalesSummary.create(data);
  }

  async saveCategoryStockSummary(data: any): Promise<CategoryStockSummary> {
    return await CategoryStockSummary.create(data);
  }

  async saveUserGrowthSummary(data: any): Promise<UserGrowthSummary> {
    return await UserGrowthSummary.create(data);
  }

  async saveReservationOccupancySummary(data: any): Promise<ReservationOccupancySummary> {
    return await ReservationOccupancySummary.create(data);
  }

  async savePromotionPerformance(data: any): Promise<PromotionPerformance> {
    return await PromotionPerformance.create(data);
  }

  // Reads
  async getDailySalesSummary(startDate: Date, endDate: Date): Promise<DailySalesSummary[]> {
    return await DailySalesSummary.findAll({
      where: {
        fecha: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['fecha', 'DESC']]
    });
  }

  async getProductSalesSummary(startDate: Date, endDate: Date, limit: number = 10): Promise<ProductSalesSummary[]> {
    return await ProductSalesSummary.findAll({
      where: {
        fecha: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['ingresosGenerados', 'DESC']],
      limit
    });
  }

  async getCategoryStockSummary(startDate: Date, endDate: Date): Promise<CategoryStockSummary[]> {
    return await CategoryStockSummary.findAll({
      where: {
        fecha: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['fecha', 'DESC']]
    });
  }

  async getUserGrowthSummary(startDate: Date, endDate: Date): Promise<UserGrowthSummary[]> {
    return await UserGrowthSummary.findAll({
      where: {
        fecha: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['fecha', 'DESC']]
    });
  }

  async getReservationOccupancySummary(startDate: Date, endDate: Date): Promise<ReservationOccupancySummary[]> {
    return await ReservationOccupancySummary.findAll({
      where: {
        fecha: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['fecha', 'DESC']]
    });
  }

  async getPromotionPerformance(startDate: Date, endDate: Date): Promise<PromotionPerformance[]> {
    return await PromotionPerformance.findAll({
      where: {
        fecha: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['ingresoBajoPromocion', 'DESC']]
    });
  }

  async getLatestDailySalesSummary(): Promise<DailySalesSummary | null> {
    return await DailySalesSummary.findOne({
      order: [['fecha', 'DESC']]
    });
  }

  async checkSummarySyncExists(fecha: Date, modelType: string): Promise<boolean> {
    let model: any;
    switch (modelType) {
      case 'daily_sales':
        model = DailySalesSummary;
        break;
      case 'product_sales':
        model = ProductSalesSummary;
        break;
      default:
        return false;
    }
    const record = await model.findOne({ where: { fecha } });
    return !!record;
  }
}
