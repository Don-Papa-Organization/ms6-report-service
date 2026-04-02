import { inventoryExternalService } from "./inventoryExternalService";

export interface ProductAnalytics {
  idProducto: number;
  nombre: string;
  stockActual: number;
  stockMinimo?: number;
  precio: number;
  categoria?: string;
  activo?: boolean;
}

export interface CategoryAnalytics {
  idCategoria: number;
  nombre: string;
  totalStock: number;
  productosCount: number;
}

export class InventoryAnalyticsService {
  private normalizeToken(token?: string): string | undefined {
    if (!token) return undefined;
    return token.replace(/^Bearer\s+/i, '').trim() || undefined;
  }

  async getAllProducts(internalToken?: string): Promise<ProductAnalytics[]> {
    try {
      const products = await inventoryExternalService.getAllProducts(this.normalizeToken(internalToken));
      return Array.isArray(products) ? products : [];
    } catch (error: any) {
      console.error('Error fetching products:', error.message);
      return [];
    }
  }

  async getProductsByCategory(internalToken?: string): Promise<CategoryAnalytics[]> {
    try {
      const [products, categories] = await Promise.all([
        inventoryExternalService.getAllProducts(this.normalizeToken(internalToken)),
        inventoryExternalService.getCategories(this.normalizeToken(internalToken))
      ]);

      const stockMap = new Map<number, { totalStock: number; productosCount: number }>();
      for (const product of products) {
        const idCategoria = Number(product.idCategoria || 0);
        const current = stockMap.get(idCategoria) || { totalStock: 0, productosCount: 0 };
        stockMap.set(idCategoria, {
          totalStock: current.totalStock + Number(product.stockActual || 0),
          productosCount: current.productosCount + 1
        });
      }

      return categories.map((category) => ({
        idCategoria: category.idCategoria,
        nombre: category.nombre,
        totalStock: stockMap.get(category.idCategoria)?.totalStock || 0,
        productosCount: stockMap.get(category.idCategoria)?.productosCount || 0
      }));
    } catch (error: any) {
      console.error('Error fetching categories:', error.message);
      return [];
    }
  }

  async getLowStockProducts(threshold: number = 10, internalToken?: string): Promise<ProductAnalytics[]> {
    try {
      const products = await inventoryExternalService.getLowStockProducts(this.normalizeToken(internalToken));
      return products.filter((p) => Number(p.stockActual) <= Number(p.stockMinimo ?? threshold));
    } catch (error: any) {
      console.error('Error fetching low stock products:', error.message);
      return [];
    }
  }
}

export const inventoryAnalyticsService = new InventoryAnalyticsService();
