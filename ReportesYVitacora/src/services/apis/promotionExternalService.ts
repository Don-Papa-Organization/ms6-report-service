import axios, { AxiosInstance } from "axios";
import jwt from "jsonwebtoken";

const PROMOTION_SERVICE_URL = process.env.EVENT_SERVICE_URL || "http://event-service-app:4005/api";
const HTTP_TIMEOUT = parseInt(process.env.HTTP_TIMEOUT || '10000');

export interface PromotionInfo {
  idPromocion: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export class PromotionExternalService {
  private client: AxiosInstance;
  private serviceToken: string;

  constructor() {
    const jwtSecret = process.env.JWT_SECRET || 'tu_super_secreto_jwt_development_very_secure_key_12345';
    this.serviceToken = jwt.sign(
      {
        id: 0,
        tipoUsuario: 'administrador',
        activo: true
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    this.client = axios.create({
      baseURL: PROMOTION_SERVICE_URL,
      timeout: HTTP_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceToken}`
      }
    });
  }

  private extractPayload<T>(data: any): T {
    return (data?.data ?? data) as T;
  }

  async getPromotions(): Promise<PromotionInfo[]> {
    try {
      const response = await this.client.get('/promotions');
      const payload = this.extractPayload<PromotionInfo[] | any>(response.data);
      return Array.isArray(payload) ? payload : [];
    } catch (error: any) {
      console.error('[PromotionExternalService] Error fetching promotions:', error.message);
      return [];
    }
  }
}

export const promotionExternalService = new PromotionExternalService();