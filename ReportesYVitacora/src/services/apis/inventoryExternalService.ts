import axios, { AxiosInstance } from "axios";

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || "http://inventory-service-app:4001/api";
const HTTP_TIMEOUT = parseInt(process.env.HTTP_TIMEOUT || '10000');

export interface ProductInfo {
  idProducto: number;
  nombre: string;
  precio: number;
  stockActual: number;
  stockMinimo: number;
  idCategoria?: number;
  activo: boolean;
}

export interface CategoryInfo {
  idCategoria: number;
  nombre: string;
}

export class InventoryExternalService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: INVENTORY_SERVICE_URL,
      timeout: HTTP_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private extractPayload<T>(data: any): T {
    return (data?.data ?? data) as T;
  }

  private buildAuthHeaders(userToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (!userToken) {
      return headers;
    }

    const normalizedToken = userToken.replace(/^Bearer\s+/i, '').trim();
    if (normalizedToken) {
      headers['Authorization'] = `Bearer ${normalizedToken}`;
    }

    return headers;
  }

  async getAllProducts(userToken?: string): Promise<ProductInfo[]> {
    try {
      const headers = this.buildAuthHeaders(userToken);
      
      let allProducts: ProductInfo[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await this.client.get(`/products?limit=50&page=${page}`, { headers });
        const payload = this.extractPayload<any>(response.data);
        const products = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.productos)
            ? payload.productos
            : [];
        allProducts = [...allProducts, ...products];
        
        const totalPaginas = Number(payload?.totalPaginas || 0);
        if (!totalPaginas || page >= totalPaginas || Array.isArray(payload)) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      console.log('[InventoryService] Total products fetched:', allProducts.length);
      return allProducts;
    } catch (error: any) {
      console.error('[InventoryService] Error:', error.message);
      return [];
    }
  }

  async getLowStockProducts(userToken?: string): Promise<ProductInfo[]> {
    try {
      const products = await this.getAllProducts(userToken);
      return products.filter(p => 
        p.activo && p.stockActual <= p.stockMinimo
      );
    } catch (error: any) {
      console.error('Error fetching low stock products:', error.message);
      return [];
    }
  }

  async getCategories(userToken?: string): Promise<CategoryInfo[]> {
    try {
      const headers = this.buildAuthHeaders(userToken);
      
      const response = await this.client.get('/categoria', { headers });
      const categories = this.extractPayload<CategoryInfo[] | any>(response.data);
      return Array.isArray(categories) ? categories : [];
    } catch (error: any) {
      console.error('Error fetching categories from inventory service:', error.message);
      return [];
    }
  }

  async getProductsWithCategory(userToken?: string): Promise<{products: ProductInfo[], categories: CategoryInfo[]}> {
    const [products, categories] = await Promise.all([
      this.getAllProducts(userToken),
      this.getCategories(userToken)
    ]);
    return { products, categories };
  }
}

export const inventoryExternalService = new InventoryExternalService();