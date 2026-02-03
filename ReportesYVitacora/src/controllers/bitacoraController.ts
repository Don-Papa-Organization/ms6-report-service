import { Request, Response, NextFunction } from "express";
import { BitacoraService } from "../services/bitacoraService";
import { ApiResponse } from "../types";
import { AppError } from "../middlewares/error.middleware";

export class BitacoraController {
    private bitacoraService: BitacoraService;

    constructor() {
        this.bitacoraService = new BitacoraService();
    }

    /**
     * CU46 - Registrar incidente en bitácora
     * Permite registrar un incidente ocurrido durante la operación
     */
    registrarIncidente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Validar que el body existe
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new AppError('El cuerpo de la petición no puede estar vacío', 400);
        }

        const { descripcion, fecha, horaInicio, horaFin } = req.body;

        // Validar campos obligatorios
        if (!descripcion) {
            throw new AppError('La descripción del incidente es obligatoria', 400);
        }

        // Validar tipo de dato de descripción
        if (typeof descripcion !== 'string' || descripcion.trim().length === 0) {
            throw new AppError('La descripción debe ser un texto válido y no puede estar vacía', 400);
        }

        // Obtener información del usuario autenticado desde el request
        // El middleware de autenticación ya agregó esta información
        const idUsuario = req.user?.id;

        if (!idUsuario) {
            throw new AppError('Usuario no autenticado o sin permisos', 401);
        }

        const incidenteData = {
            idUsuario,
            idEmpleado: idUsuario, // Usando el mismo ID ya que el usuario es el empleado
            descripcion: descripcion.trim(),
            tipo: 'REPORTE_INCIDENTE',
            fecha: fecha ? new Date(fecha) : new Date(),
            horaInicio: horaInicio ? new Date(horaInicio) : undefined,
            horaFin: horaFin ? new Date(horaFin) : undefined
        };

        const result = await this.bitacoraService.registrarEntrada(incidenteData);

        const response: ApiResponse = {
            success: result.status === 201,
            message: result.status === 201 ? 'Incidente registrado exitosamente en la bitácora' : result.message,
            data: result.data || null,
            timestamp: new Date().toISOString()
        };
        res.status(result.status).json(response);
    };

    /**
     * CU47 - Registrar comentario de jornada
     * Permite registrar comentarios relacionados con el desarrollo de la jornada laboral
     */
    registrarComentarioJornada = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Validar que el body existe
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new AppError('El cuerpo de la petición no puede estar vacío', 400);
        }

        const { descripcion, fecha, horaInicio, horaFin } = req.body;

        // Validar campos obligatorios
        if (!descripcion) {
            throw new AppError('El comentario es obligatorio', 400);
        }

        // Validar tipo de dato de descripción
        if (typeof descripcion !== 'string' || descripcion.trim().length === 0) {
            throw new AppError('El comentario debe ser un texto válido y no puede estar vacío', 400);
        }

        // Obtener información del usuario autenticado
        const idUsuario = req.user?.id;

        if (!idUsuario) {
            throw new AppError('Usuario no autenticado o sin permisos', 401);
        }

        const comentarioData = {
            idUsuario,
            idEmpleado: idUsuario, // Usando el mismo ID ya que el usuario es el empleado
            descripcion: descripcion.trim(),
            tipo: 'COMENTARIO_JORNADA',
            fecha: fecha ? new Date(fecha) : new Date(),
            horaInicio: horaInicio ? new Date(horaInicio) : undefined,
            horaFin: horaFin ? new Date(horaFin) : undefined
        };

        const result = await this.bitacoraService.registrarEntrada(comentarioData);

        const response: ApiResponse = {
            success: result.status === 201,
            message: result.status === 201 ? 'Comentario de jornada registrado exitosamente' : result.message,
            data: result.data || null,
            timestamp: new Date().toISOString()
        };
        res.status(result.status).json(response);
    };

    /**
     * Consultar historial de bitácora por empleado
     */
    consultarPorEmpleado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { idEmpleado } = req.params;

        const idEmpleadoNum = parseInt(idEmpleado);
        if (isNaN(idEmpleadoNum) || idEmpleadoNum <= 0) {
            throw new AppError('ID de empleado inválido', 400);
        }

        const result = await this.bitacoraService.consultarPorEmpleado(idEmpleadoNum);

        const response: ApiResponse = {
            success: result.status === 200,
            message: result.status === 200 ? 'Registros de bitácora obtenidos exitosamente' : result.message,
            data: result.data ? { total: result.data.length, registros: result.data } : null,
            timestamp: new Date().toISOString()
        };
        res.status(result.status).json(response);
    };

    /**
     * Consultar todos los registros de bitácora con filtros opcionales
     */
    consultarTodos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { tipo, fechaInicio, fechaFin } = req.query;

        const filtros = {
            tipo: tipo as string,
            fechaInicio: fechaInicio as string,
            fechaFin: fechaFin as string
        };

        const result = await this.bitacoraService.consultarTodos(filtros);

        const response: ApiResponse = {
            success: result.status === 200,
            message: result.status === 200 ? 'Registros de bitácora obtenidos exitosamente' : result.message,
            data: result.data ? { total: result.data.length, registros: result.data } : null,
            timestamp: new Date().toISOString()
        };
        res.status(result.status).json(response);
    };
}