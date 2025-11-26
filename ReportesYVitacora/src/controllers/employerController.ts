import { Request, Response } from "express";
import { EmployerRepository } from "../repositories/employerRepository";
//import { Usuario } from "../models/User";
import { hashPassword } from "../utils/authUtil";
import { TipoUsuario } from "../types/express";
import { EmployerDto } from "../dtos/employerDto";
import { UserRepository } from "../repositories/userRepository";
import { UserI } from "../dtos/userDto";

const employerRepository = new EmployerRepository();
const userRepository = new UserRepository();


const tiposValidos = ["cliente", "empleado", "administrador"];
// Obtener todos los empleados (solo admin)
export const getEmpleados = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) return res.status(401).json({ message: "No autenticado" });
        if (!req.user.activo) return res.status(403).json({ message: "Usuario no activo" });
        if (req.user.tipoUsuario !== TipoUsuario.administrador) return res.status(403).json({ message: "Acceso denegado: solo administradores" });

        const { nombre, rol, estado } = req.query;

        const empleadosAll = await employerRepository.findAll();
        const usuariosAll = await userRepository.findAll();

        // Mapa de usuarios por idUsuario para acceso rápido
        const usuarioMap = new Map<number, UserI>();
        usuariosAll.forEach((usr) => {
            if (usr.idUsuario !== undefined) usuarioMap.set(usr.idUsuario, usr);
        });

        // Normalizar filtros
        const nombreFiltro = typeof nombre === "string" && nombre.trim() !== "" ? nombre.toLowerCase() : null;
        const rolFiltro = typeof rol === "string" && rol.trim() !== "" ? rol : null;
        const estadoFiltro = typeof estado !== "undefined" ? String(estado).toLowerCase() === "true" : null;

        // Filtrar y adjuntar usuario a cada empleado
        let resultado: Array<any> = empleadosAll
            .filter((emp) => {
                const usr = usuarioMap.get(emp.idUsuario);

                // Filtro por nombre (sobre el nombre del empleado)
                if (nombreFiltro && !emp.nombre.toLowerCase().includes(nombreFiltro)) return false;

                // Filtro por rol -> se interpreta como tipoUsuario del usuario asociado
                if (rolFiltro) {
                    if (!usr) return false;
                    if (String(usr.tipoUsuario) !== rolFiltro) return false;
                }

                // Filtro por estado -> se interpreta como usuario.activo
                if (estadoFiltro !== null) {
                    if (!usr) return false;
                    if (usr.activo !== estadoFiltro) return false;
                }

                return true;
            })
            .map((emp) => {
                const usuario = usuarioMap.get(emp.idUsuario) || null;
                return { ...emp, usuario };
            });

        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener empleados", error });
    }
}

// Obtener empleado por id (solo admin)
export const getEmpleadoById = async (req: Request, res: Response): Promise<any> => {
	try {
		if (!req.user) return res.status(401).json({ message: "No autenticado" });
		if (!req.user.activo) return res.status(403).json({ message: "Usuario no activo" });
		if (req.user.tipoUsuario !== TipoUsuario.administrador) return res.status(403).json({ message: "Acceso denegado: solo administradores" });

		const empleado = await employerRepository.findById(parseInt(req.params.id));
		if (!empleado) return res.status(404).json({ message: "Empleado no encontrado" });
		
		const usuario = await userRepository.findById(empleado.idUsuario);
		res.json({ ...empleado, usuario });
	} catch (error) {
		res.status(500).json({ message: "Error al obtener empleado", error });
	}
}

// Crear nuevo empleado (solo admin)
export const createEmpleado = async (req: Request, res: Response): Promise<any> => {
	try {
		if (!req.user) return res.status(401).json({ message: "No autenticado" });
		if (!req.user.activo) return res.status(403).json({ message: "Usuario no activo" });
		if (req.user.tipoUsuario !== TipoUsuario.administrador) return res.status(403).json({ message: "Acceso denegado: solo administradores" });

		const { nombre, documento, correo, telefono, cargo, contrasena } = req.body;
		if (!nombre || !documento || !correo || !cargo || !contrasena) {
			return res.status(400).json({ message: "Faltan campos obligatorios" });
		}

		// Validar duplicados: correo en Usuario
		const usuarioExistente = await userRepository.findByEmail(correo);
		if (usuarioExistente) return res.status(400).json({ message: "Ya existe un usuario con ese correo" });

		// Hash de contraseña y creación de usuario
		const hashed = await hashPassword(contrasena);
		const nuevoUsuario = await userRepository.create({
			correo,
			contrasena: hashed,
			tipoUsuario: TipoUsuario.empleado,
			activo: true
		});

		// Creación de empleado
		const nuevoEmpleado = await employerRepository.create({
			idUsuario: nuevoUsuario.idUsuario!,
			nombre,
			documento,
			telefono,
			cargo
		});

		res.status(201).json({ ...nuevoEmpleado, usuario: nuevoUsuario });
	} catch (error) {
		res.status(500).json({ message: "Error al crear empleado", error });
	}
}

// Actualizar empleado (solo admin)
export const updateEmpleado = async (req: Request, res: Response): Promise<any> => {
	try {
		if (!req.user) return res.status(401).json({ message: "No autenticado" });
		
		const admin = await userRepository.findById(req.user.id)
		if(!admin) return res.status(404).json({ message: "Usuario no encontrado"})
			
		if (!req.user.activo) return res.status(403).json({ message: "Usuario no activo" });
		if (req.user.tipoUsuario !== TipoUsuario.administrador) return res.status(403).json({ message: "Acceso denegado: solo administradores" });
		
		const id = parseInt(req.params.id);
		const empleado = await employerRepository.findById(id);
		if (!empleado) return res.status(404).json({ message: "Empleado no encontrado" });

		const usuario = await userRepository.findById(empleado.idUsuario);
		if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

		const { nombre, documento, correo, telefono, cargo, tipoUsuario, contrasena } = req.body;
        
		// Evitar que el admin se cambie su propio rol
		if (req.user.id === empleado.idUsuario && tipoUsuario && tipoUsuario !== req.user.tipoUsuario) {
			return res.status(403).json({ message: "No permitido cambiar el rol del propio administrador" });
		}

		// Validar correo duplicado
		if (correo && correo !== usuario.correo) {
			const usuarioExistente = await userRepository.findByEmail(correo);
			if (usuarioExistente) return res.status(400).json({ message: "El correo ya está en uso por otro usuario" });
		}

		// Actualizar Usuario si es necesario
		if (correo || tipoUsuario || contrasena) {
			const usuarioActualizadoResult = await userRepository.update(empleado.idUsuario, {
				...usuario,
				correo: correo || usuario.correo,
				tipoUsuario: (tipoUsuario as TipoUsuario) || usuario.tipoUsuario,
				contrasena: contrasena ? await hashPassword(contrasena) : usuario.contrasena
			});
			if (!usuarioActualizadoResult) {
				return res.status(404).json({ message: "No se pudo actualizar: usuario no encontrado" });
			}
		}

		// Actualizar Empleado
		const empleadoActualizadoResult = await employerRepository.update(id, {
			...empleado,
			nombre: nombre || empleado.nombre,
			documento: documento || empleado.documento,
			telefono: telefono || empleado.telefono,
			cargo: cargo || empleado.cargo
		});
		if (!empleadoActualizadoResult) {
			return res.status(404).json({ message: "No se pudo actualizar: empleado no encontrado" });
		}

		// Obtener los datos actualizados
		const empleadoActualizado = await employerRepository.findById(id);
		const usuarioActualizado = await userRepository.findById(empleado.idUsuario);
		
		res.json({ ...empleadoActualizado, usuario: usuarioActualizado });
	} catch (error) {
		res.status(500).json({ message: "Error al actualizar empleado", error });
	}
}

// Eliminar/desactivar empleado (solo admin) — por defecto desactivación lógica
export const desactivarEmpleado = async (req: Request, res: Response): Promise<any> => {
	try {
		if (!req.user) return res.status(401).json({ message: "No autenticado" });
		if (!req.user.activo) return res.status(403).json({ message: "Usuario no activo" });
		if (req.user.tipoUsuario !== TipoUsuario.administrador) return res.status(403).json({ message: "Acceso denegado: solo administradores" });

		const id = parseInt(req.params.id);
		const empleado = await employerRepository.findById(id);
		if (!empleado) return res.status(404).json({ message: "Empleado no encontrado" });

		// Evitar que el admin se elimine a sí mismox   
		if (req.user.id === empleado.idUsuario) {
			return res.status(403).json({ message: "No puede eliminar su propia cuenta" });
		}

		// Obtener usuario actual y desactivarlo
		const usuario = await userRepository.findById(empleado.idUsuario);
		if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
		
        const usuarioDesactivado = await userRepository.update(empleado.idUsuario, {
            ...usuario,
            activo: false
        });
        if (!usuarioDesactivado) return res.status(404).json({ message: "No se pudo desactivar: usuario no encontrado" });

        await employerRepository.delete(id);		res.json({ message: "Empleado desactivado correctamente" });
	} catch (error) {
		res.status(500).json({ message: "Error al eliminar/desactivar empleado", error });
	}
}

