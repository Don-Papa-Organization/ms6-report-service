import { Request, Response } from "express";
import { PromocionRepository } from "../repositories/promocionesRepository";
import { PromotionDto } from "../dtos/promotionDto";
import { TipoUsuario } from "../types/express";

const promocionRepository = new PromocionRepository();

/**
 * CU031 - Obtener promociones activas
 * Permite a cualquier usuario autenticado ver las promociones vigentes
 */
export const getPromocionesActivas = async (req: Request, res: Response): Promise<any> => {
    try {
        // Validar autenticación
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }

        const activas = req.params.activas === "true";
        const promociones = await promocionRepository.findByActivas(activas);

        if (!promociones || promociones.length === 0) {
            return res.json({ message: "No hay promociones disponibles", data: [] });
        }

        res.json(promociones);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener promociones activas", error });
    }
};

/**
 * Obtener todas las promociones (admin y empleados)
 */
export const getPromociones = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario === TipoUsuario.cliente) {
            return res.status(403).json({ message: "El usuario debe ser admin o empleado" });
        }

        const promociones = await promocionRepository.findAll();
        res.json(promociones);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener promociones", error });
    }
};

/**
 * Obtener una promoción por ID (admin y empleados)
 */
export const getPromocionById = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario === TipoUsuario.cliente) {
            return res.status(403).json({ message: "El usuario debe ser admin o empleado" });
        }

        const promocion = await promocionRepository.findById(parseInt(req.params.id));
        if (!promocion) {
            return res.status(404).json({ message: "Promoción no encontrada" });
        }

        res.json(promocion);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener la promoción", error });
    }
};

/**
 * CU50 - Crear una nueva promoción
 * Solo administradores pueden crear promociones
 * Validaciones:
 * - Todos los campos obligatorios
 * - Fecha de fin debe ser posterior a fecha de inicio
 * - Tipo de promoción válido (porcentaje, precio_fijo, combo)
 */
export const createPromocion = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario !== TipoUsuario.administrador) {
            return res.status(403).json({ message: "Solo administradores pueden crear promociones" });
        }

        const { nombre, descripcion, fechaInicio, fechaFin, tipoPromocion, activo } = req.body;

        // Validar campos obligatorios
        if (!nombre || !descripcion || !fechaInicio || !fechaFin || !tipoPromocion) {
            return res.status(400).json({ 
                message: "Faltan campos obligatorios",
                campos_requeridos: ["nombre", "descripcion", "fechaInicio", "fechaFin", "tipoPromocion"]
            });
        }

        // Validar tipo de promoción
        const tiposValidos = ["porcentaje", "precio_fijo", "combo"];
        if (!tiposValidos.includes(tipoPromocion)) {
            return res.status(400).json({ 
                message: "Tipo de promoción inválido",
                tipos_validos: tiposValidos
            });
        }

        // Validar fechas
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);

        if (fin <= inicio) {
            return res.status(400).json({ 
                message: "La fecha de fin debe ser posterior a la fecha de inicio"
            });
        }

        const promocionData: PromotionDto = {
            nombre,
            descripcion,
            fechaInicio: inicio,
            fechaFin: fin,
            tipoPromocion,
            activo: activo !== undefined ? activo : true
        };

        const promocionGuardada = await promocionRepository.create(promocionData);
        res.status(201).json({
            message: "Promoción creada exitosamente",
            data: promocionGuardada
        });
    } catch (error) {
        res.status(400).json({ message: "Error al crear la promoción", error });
    }
};

/**
 * CU51 - Actualizar una promoción
 * Solo administradores pueden actualizar promociones
 * Validaciones:
 * - La promoción debe existir
 * - Fecha de fin debe ser posterior a fecha de inicio (si se actualiza)
 * - Tipo de promoción válido (si se actualiza)
 */
export const updatePromocion = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario !== TipoUsuario.administrador) {
            return res.status(403).json({ message: "Solo administradores pueden modificar promociones" });
        }

        const id = parseInt(req.params.id);
        const promocionExistente = await promocionRepository.findById(id);

        if (!promocionExistente) {
            return res.status(404).json({ message: "Promoción no encontrada" });
        }

        const { nombre, descripcion, fechaInicio, fechaFin, tipoPromocion, activo } = req.body;

        // Validar tipo de promoción si se proporciona
        if (tipoPromocion) {
            const tiposValidos = ["porcentaje", "precio_fijo", "combo"];
            if (!tiposValidos.includes(tipoPromocion)) {
                return res.status(400).json({ 
                    message: "Tipo de promoción inválido",
                    tipos_validos: tiposValidos
                });
            }
        }

        // Validar fechas si se proporcionan
        if (fechaInicio || fechaFin) {
            const inicio = fechaInicio ? new Date(fechaInicio) : new Date(promocionExistente.fechaInicio);
            const fin = fechaFin ? new Date(fechaFin) : new Date(promocionExistente.fechaFin);

            if (fin <= inicio) {
                return res.status(400).json({ 
                    message: "La fecha de fin debe ser posterior a la fecha de inicio"
                });
            }
        }

        const promocionActualizada: PromotionDto = {
            nombre: nombre || promocionExistente.nombre,
            descripcion: descripcion || promocionExistente.descripcion,
            fechaInicio: fechaInicio ? new Date(fechaInicio) : promocionExistente.fechaInicio,
            fechaFin: fechaFin ? new Date(fechaFin) : promocionExistente.fechaFin,
            tipoPromocion: tipoPromocion || promocionExistente.tipoPromocion,
            activo: activo !== undefined ? activo : promocionExistente.activo
        };

        const promocionResult = await promocionRepository.update(id, promocionActualizada);

        if (!promocionResult) {
            return res.status(404).json({ message: "No se pudo actualizar: promoción no encontrada" });
        }

        res.json({
            message: "Promoción actualizada exitosamente",
            data: promocionResult
        });
    } catch (error) {
        res.status(400).json({ message: "Error al actualizar la promoción", error });
    }
};

/**
 * CU52 - Eliminar una promoción
 * Solo administradores pueden eliminar promociones
 * Validaciones:
 * - La promoción debe existir
 */
export const deletePromocion = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario !== TipoUsuario.administrador) {
            return res.status(403).json({ message: "Solo administradores pueden eliminar promociones" });
        }

        const id = parseInt(req.params.id);
        const promocion = await promocionRepository.findById(id);

        if (!promocion) {
            return res.status(404).json({ message: "Promoción no encontrada" });
        }

        await promocionRepository.delete(id);

        res.json({ message: "Promoción eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar la promoción", error });
    }
};
