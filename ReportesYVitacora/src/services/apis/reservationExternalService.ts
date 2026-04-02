import axios, { AxiosInstance } from "axios";
import jwt from "jsonwebtoken";

const RESERVATION_SERVICE_URL = process.env.RESERVATION_SERVICE_URL || "http://reservation-service-app:4004/api";
const HTTP_TIMEOUT = parseInt(process.env.HTTP_TIMEOUT || '10000');

export interface ReservationInfo {
  idReserva: number;
  estado: string;
  fechaReserva: Date;
  cantidadPersonas: number;
  idMesa: number;
  idCliente: number;
}

export class ReservationExternalService {
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
      baseURL: RESERVATION_SERVICE_URL,
      timeout: HTTP_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY || 'una_llave_secreta_compartida',
        'x-service-key': process.env.INTERNAL_SERVICE_KEY || 'una_llave_secreta_compartida',
        'Authorization': `Bearer ${this.serviceToken}`
      }
    });
  }

  private extractPayload<T>(data: any): T {
    return (data?.data ?? data) as T;
  }

  async getReservationsByDateRange(startDate: string, endDate: string): Promise<ReservationInfo[]> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const allReservations: ReservationInfo[] = [];
      
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayReservations = await this.getDailyReservations(dateStr);
        allReservations.push(...dayReservations);
        current.setDate(current.getDate() + 1);
      }
      
      return allReservations;
    } catch (error: any) {
      console.error('Error fetching reservations by date range:', error.message);
      return [];
    }
  }

  async getDailyReservations(date: string): Promise<ReservationInfo[]> {
    try {
      const response = await this.client.get('/reservations/daily', {
        params: { fecha: date }
      });
      
      const reservations = this.extractPayload<ReservationInfo[] | any>(response.data);
      return Array.isArray(reservations) ? reservations : [];
    } catch (error: any) {
      console.error('Error fetching daily reservations:', error.message);
      return [];
    }
  }
}

export const reservationExternalService = new ReservationExternalService();