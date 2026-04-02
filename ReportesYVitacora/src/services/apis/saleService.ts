import axios, { AxiosInstance } from "axios";

const RAW_ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://order-service-app:4003";
const HTTP_TIMEOUT = parseInt(process.env.HTTP_TIMEOUT || '10000');

const normalizeOrderServiceBaseUrl = (url: string): string => {
    const cleaned = url.replace(/\/+$/, '');
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
};

const ORDER_SERVICE_URL = normalizeOrderServiceBaseUrl(RAW_ORDER_SERVICE_URL);

// Interfaces basadas en los DTOs reales del microservicio de pedidos
interface Pedido {
    idPedido?: number;
    total: number;
    canalVenta: 'web' | 'fisico';
    estado: 'sin_confirmar' | 'pendiente' | 'entregado' | 'cancelado';
    fechaPedido: Date;
    direccionEntrega?: string;
    idUsuario: number;
}

interface Pago {
    idPago?: number;
    urlComprobante: string;
    monto: number;
    fechaPago: Date;
    idPedido: number;
    idMetodoPago: number;
}

interface ProductoPedido {
    idProductoPedido?: number;
    subtotal: number;
    precioUnitario: number;
    cantidad: number;
    idProducto: number;
    idPedido: number;
}

interface MetodoPago {
    idMetodo?: number;
    nombre: string;
}

export class SaleService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: ORDER_SERVICE_URL,
            timeout: HTTP_TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    private extraerLista<T>(data: any): T[] {
        const payload = data?.data ?? data;
        if (Array.isArray(payload)) {
            return payload;
        }
        if (Array.isArray(payload?.items)) {
            return payload.items;
        }
        if (Array.isArray(payload?.orders)) {
            return payload.orders;
        }
        if (Array.isArray(payload?.pedidos)) {
            return payload.pedidos;
        }
        if (Array.isArray(payload?.payments)) {
            return payload.payments;
        }
        if (Array.isArray(payload?.pagos)) {
            return payload.pagos;
        }
        return [];
    }

    private esErrorIdInvalido(error: any, mensaje: string): boolean {
        const status = error?.response?.status;
        const detalle = (error?.response?.data?.message || error?.message || '').toLowerCase();
        return status === 400 && detalle.includes(mensaje);
    }

    /**
     * Obtener todos los pedidos del sistema
     * @param token Token de autenticación del usuario (empleado/admin)
     * @returns Lista de todos los pedidos
     */
    async obtenerTodosLosPedidos(token: string): Promise<Pedido[]> {
        try {
            const response = await this.client.get('/orders/all', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return this.extraerLista<Pedido>(response.data);
        } catch (error: any) {
            if (this.esErrorIdInvalido(error, 'id de pedido inválido')) {
                try {
                    const response = await this.client.get('/orders', {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    return this.extraerLista<Pedido>(response.data);
                } catch (fallbackError: any) {
                    console.error('Error al obtener todos los pedidos:', fallbackError.message);
                    throw new Error(`Error al consultar pedidos: ${fallbackError.response?.data?.message || fallbackError.message}`);
                }
            }
            console.error('Error al obtener todos los pedidos:', error.message);
            throw new Error(`Error al consultar pedidos: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Obtener todos los pagos del sistema
     * @param token Token de autenticación del usuario (admin)
     * @returns Lista de todos los pagos
     */
    async obtenerTodosLosPagos(token: string): Promise<Pago[]> {
        try {
            const response = await this.client.get('/payments/all', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return this.extraerLista<Pago>(response.data);
        } catch (error: any) {
            if (this.esErrorIdInvalido(error, 'id de pago inválido')) {
                try {
                    const response = await this.client.get('/payments', {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    return this.extraerLista<Pago>(response.data);
                } catch (fallbackError: any) {
                    console.error('Error al obtener todos los pagos:', fallbackError.message);
                    throw new Error(`Error al consultar pagos: ${fallbackError.response?.data?.message || fallbackError.message}`);
                }
            }
            console.error('Error al obtener todos los pagos:', error.message);
            throw new Error(`Error al consultar pagos: ${error.response?.data?.message || error.message}`);
        }
    }
}
