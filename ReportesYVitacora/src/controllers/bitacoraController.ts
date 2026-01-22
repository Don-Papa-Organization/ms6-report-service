import { Request, Response } from "express";
import { BitacoraService } from "../services/bitacoraService";

export class BitacoraController {
    private bitacoraService: BitacoraService;

    constructor() {
        this.bitacoraService = new BitacoraService();
    }

    /**
     * CU46 - Registrar incidente en bitácora
     * Permite registrar un incidente ocurrido durante la operación
     */
    registrarIncidente = async (req: Request, res: Response): Promise<void> => {
        try {
            // Validar que el body existe
            if (!req.body || Object.keys(req.body).length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'El cuerpo de la petición no puede estar vacío',
                    data: null
                });
                return;
            }

            const { descripcion, fecha, horaInicio, horaFin } = req.body;

            // Validar campos obligatorios
            if (!descripcion) {
                res.status(400).json({
                    success: false,
                    message: 'La descripción del incidente es obligatoria',
                    data: null
                });
                return;
            }

            // Validar tipo de dato de descripción
            if (typeof descripcion !== 'string' || descripcion.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'La descripción debe ser un texto válido y no puede estar vacía',
                    data: null
                });
                return;
            }

            // Obtener información del usuario autenticado desde el request
            // El middleware de autenticación ya agregó esta información
            const idUsuario = req.user?.id;

            if (!idUsuario) {
                res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado o sin permisos',
                    data: null
                });
                return;
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

            res.status(result.status).json({
                success: result.status === 201,
                message: result.status === 201 ? 'Incidente registrado exitosamente en la bitácora' : result.message,
                data: result.data || null
            });
        } catch (error: any) {
            console.error('Error en registrarIncidente:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                data: null
            });
        }
    };

    /**
     * CU47 - Registrar comentario de jornada
     * Permite registrar comentarios relacionados con el desarrollo de la jornada laboral
     */
    registrarComentarioJornada = async (req: Request, res: Response): Promise<void> => {
        try {
            // Validar que el body existe
            if (!req.body || Object.keys(req.body).length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'El cuerpo de la petición no puede estar vacío',
                    data: null
                });
                return;
            }

            const { descripcion, fecha, horaInicio, horaFin } = req.body;

            // Validar campos obligatorios
            if (!descripcion) {
                res.status(400).json({
                    success: false,
                    message: 'El comentario es obligatorio',
                    data: null
                });
                return;
            }

            // Validar tipo de dato de descripción
            if (typeof descripcion !== 'string' || descripcion.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'El comentario debe ser un texto válido y no puede estar vacío',
                    data: null
                });
                return;
            }

            // Obtener información del usuario autenticado
            const idUsuario = req.user?.id;

            if (!idUsuario) {
                res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado o sin permisos',
                    data: null
                });
                return;
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

            res.status(result.status).json({
                success: result.status === 201,
                message: result.status === 201 ? 'Comentario de jornada registrado exitosamente' : result.message,
                data: result.data || null
            });
        } catch (error: any) {
            console.error('Error en registrarComentarioJornada:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                data: null
            });
        }
    };

    /**
     * Consultar historial de bitácora por empleado
     */
    consultarPorEmpleado = async (req: Request, res: Response): Promise<void> => {
        try {
            const { idEmpleado } = req.params;

            const idEmpleadoNum = parseInt(idEmpleado);
            if (isNaN(idEmpleadoNum) || idEmpleadoNum <= 0) {
                res.status(400).json({
                    success: false,
                    message: 'ID de empleado inválido',
                    data: null
                });
                return;
            }

            const result = await this.bitacoraService.consultarPorEmpleado(idEmpleadoNum);

            res.status(result.status).json({
                success: result.status === 200,
                message: result.status === 200 ? 'Registros de bitácora obtenidos exitosamente' : result.message,
                data: result.data ? { total: result.data.length, registros: result.data } : null
            });
        } catch (error: any) {
            console.error('Error en consultarPorEmpleado:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                data: null
            });
        }
    };

    /**
     * Consultar todos los registros de bitácora con filtros opcionales
     */
    consultarTodos = async (req: Request, res: Response): Promise<void> => {
        try {
            const { tipo, fechaInicio, fechaFin } = req.query;

            const filtros = {
                tipo: tipo as string,
                fechaInicio: fechaInicio as string,
                fechaFin: fechaFin as string
            };

            const result = await this.bitacoraService.consultarTodos(filtros);

            res.status(result.status).json({
                success: result.status === 200,
                message: result.status === 200 ? 'Registros de bitácora obtenidos exitosamente' : result.message,
                data: result.data ? { total: result.data.length, registros: result.data } : null
            });
        } catch (error: any) {
            console.error('Error en consultarTodos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                data: null
            });
        }
    };
}
