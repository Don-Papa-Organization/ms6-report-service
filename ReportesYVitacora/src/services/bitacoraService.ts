import { BitacoraRepository } from "../domain/repositories/bitacoraRepository";
import { Bitacora } from "../domain/models";
import { Op } from "sequelize";

interface EntradaBitacora {
    idUsuario: number;
    idEmpleado: number;
    descripcion: string;
    tipo: string;
    fecha?: Date;
    horaInicio?: Date;
    horaFin?: Date;
}

interface FiltrosBitacora {
    tipo?: string;
    fechaInicio?: string;
    fechaFin?: string;
}

export class BitacoraService {
    private bitacoraRepository: BitacoraRepository;

    constructor() {
        this.bitacoraRepository = new BitacoraRepository();
    }

    /**
     * Registrar una nueva entrada en la bitácora
     * Usado tanto para incidentes (CU46) como para comentarios de jornada (CU47)
     */
    async registrarEntrada(data: EntradaBitacora) {
        try {
            const entrada = await this.bitacoraRepository.create({
                idUsuario: data.idUsuario,
                idEmpleado: data.idEmpleado,
                descripcion: data.descripcion,
                tipo: data.tipo,
                fecha: data.fecha || new Date(),
                horaInicio: data.horaInicio,
                horaFin: data.horaFin
            });

            return { status: 201, data: entrada };
        } catch (error: any) {
            console.error('Error al registrar entrada en bitácora:', error);
            return {
                status: 500,
                message: 'Error al guardar el registro en la base de datos'
            };
        }
    }

    /**
     * Consultar registros de bitácora por empleado
     */
    async consultarPorEmpleado(idEmpleado: number) {
        try {
            const registros = await this.bitacoraRepository.findByEmpleado(idEmpleado);
            return { status: 200, data: registros };
        } catch (error: any) {
            console.error('Error al consultar bitácora por empleado:', error);
            return {
                status: 500,
                message: 'Error al consultar registros de bitácora'
            };
        }
    }

    /**
     * Consultar todos los registros de bitácora con filtros opcionales
     */
    async consultarTodos(filtros: FiltrosBitacora) {
        try {
            const whereClause: any = {};

            // Filtrar por tipo si se proporciona
            if (filtros.tipo) {
                whereClause.tipo = filtros.tipo;
            }

            // Filtrar por rango de fechas
            if (filtros.fechaInicio || filtros.fechaFin) {
                whereClause.fecha = {};
                
                if (filtros.fechaInicio) {
                    whereClause.fecha[Op.gte] = new Date(filtros.fechaInicio);
                }
                
                if (filtros.fechaFin) {
                    whereClause.fecha[Op.lte] = new Date(filtros.fechaFin);
                }
            }

            const registros = await this.bitacoraRepository.findAll({
                where: whereClause,
                order: [['fecha', 'DESC']]
            });

            return { status: 200, data: registros };
        } catch (error: any) {
            console.error('Error al consultar todos los registros de bitácora:', error);
            return {
                status: 500,
                message: 'Error al consultar registros de bitácora'
            };
        }
    }

    /**
     * Obtener un registro específico de la bitácora
     */
    async obtenerPorId(idUsuario: number) {
        try {
            const registro = await this.bitacoraRepository.findById(idUsuario);
            if (!registro) {
                return { status: 404, message: 'Registro no encontrado' };
            }
            return { status: 200, data: registro };
        } catch (error: any) {
            console.error('Error al obtener registro de bitácora:', error);
            return {
                status: 500,
                message: 'Error al consultar registro de bitácora'
            };
        }
    }
}
