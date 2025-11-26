//Importar dependencias
import { Request, Response } from "express";
import { hashPassword, comparePassword } from "../utils/authUtil";
import crypto from "crypto";

//Importar utilidades y servicios
import {
    generateAccesToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
} from "../utils/jwtUtil"
import { sendVerificationEmail } from "../services/emailService";
import { JwtUserPayload } from "../interfaces/jwtUserPayloadI";

//Importar modelos
import { UserRepository } from "../repositories/userRepository";
import { TokenDriverRepository } from "../repositories/tokenRepository";
import { UserI } from "../dtos/userDto";

//import { Usuario } from "../models/User"
//import { ManejadorTokens } from "../models/TokenDriver";

const userRepository = new UserRepository();
const tokenDriverRepository = new TokenDriverRepository();

export const register = async (req: Request, res: Response): Promise<any> => {
    try {
        // Validaciones de entrada
        const { correo, contrasena, tipoUsuario } = req.body;
        if (!correo || !contrasena) {
            return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
        }

        // Validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            return res.status(400).json({ message: "Formato de correo inválido" });
        }

        // Validar contraseña (mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(contrasena)) {
            return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número" });
        }

        // Validar tipoUsuario
        const tiposValidos = ["cliente", "empleado", "administrador"];
        if (tipoUsuario && !tiposValidos.includes(tipoUsuario)) {
            return res.status(400).json({ message: "Tipo de usuario inválido" });
        }

        // Validar correo duplicado
        const usuarioExistente = await userRepository.findByEmail(correo)
        if (usuarioExistente) {
            return res.status(409).json({ message: "El correo ya está registrado" });
        }

        // Hash de contraseña
        const hashedPassword = await hashPassword(contrasena);

        // Crear usuario
        // En desarrollo, activar automáticamente; en producción, requiere verificación de email
        const activo = process.env.NODE_ENV === "development" ? true : false;
        
        const usuario = await userRepository.create({
            correo,
            contrasena: hashedPassword,
            tipoUsuario: tipoUsuario || "cliente",
            activo: activo
        })

        console.log("[REGISTER] Usuario creado:", { 
            id: usuario.idUsuario, 
            correo: usuario.correo, 
            activo: usuario.activo,
            env: process.env.NODE_ENV
        });

        // Crear registro de verificación de email
        const token = crypto.randomBytes(32).toString("hex");
        const creadoEn = new Date();
        const expiraEn = new Date(Date.now() + 60 * 60 * 1000);

        await tokenDriverRepository.create({
            creadoEn,
            expiraEn,
            token,
            idUsuario: usuario.idUsuario as number
        })
        
        await sendVerificationEmail(correo, token);


        // Enviar correo de verificación
        res.status(201).json({ message: "Usuario registrado correctamente. Revisa tu correo para verificar la cuenta." });
    } catch (error) {
        console.log("se ha producido un error al registrar: ", error);
        res.status(500).json({ message: "Error interno al registrar usuario" });
    }
}

export const verifyEmail = async (req: Request, res: Response): Promise<any> => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== "string") {
            return res.status(400).json({ message: "Token de verificación requerido" });
        }

        // Buscar registro de verificación
        //const verificacion = await ManejadorTokens.findOne({ where: { token } });
        const verificacion = await tokenDriverRepository.findByToken(token)
        console.log(verificacion)
        if (!verificacion) {
            return res.status(404).json({ message: "Token de verificación inválido o no encontrado" });
        }

        // Validar expiración
        if (verificacion.expiraEn < new Date()) {
            return res.status(410).json({ message: "El enlace de verificación ha expirado" });
        }

        // Buscar usuario
        //const usuario = await Usuario.findOne({ where: { idUsuario: verificacion.idUsuario } });
        
        const usuario = await userRepository.findById(verificacion.idUsuario)

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado para este token" });
        }

        if (usuario.activo) {
            return res.status(200).json({ message: "El usuario ya está verificado" });
        }


        //await usuario.update({ activo: true });

        let updateUserData: UserI = {
            correo: usuario.correo,
            contrasena: usuario.contrasena, 
            tipoUsuario: usuario.tipoUsuario,
            activo: true
        }

        const updated = await userRepository.update(usuario.idUsuario as number, updateUserData)
        if (!updated) {
            return res.status(404).json({ message: "No se pudo verificar: usuario no encontrado" });
        }

        res.status(200).json({ message: `Se verificó el correo ${usuario.correo}` });
    } catch (error) {
        console.log('Error en verificar email: ', error);
        res.status(500).json({ message: "Error interno al verificar email" });
    }
}


export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { correo, contrasena } = req.body;

        // Validar campos requeridos
        if (!correo || !contrasena) {
            return res.status(400).json({ message: "Email y contraseña son obligatorios" });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            return res.status(400).json({ message: "Formato de email inválido" });
        }

        // Buscar usuario
        //const user = await Usuario.findOne({ where: { correo: correo } });
        const user = await userRepository.findByEmail(correo)

        if (!user) {
            return res.status(403).json({ message: "No hay usuario con este correo" });
        }

        console.log("[LOGIN] Usuario encontrado:", { 
            id: user.idUsuario, 
            correo: user.correo, 
            activo: user.activo,
            tipoUsuario: user.tipoUsuario
        });

        // Validar usuario activo
        if (!user.activo) {
            return res.status(403).json({ message: "El usuario no está activo. Por favor verifica tu correo" });
        }

        // Validar contraseña
        const isValid = await comparePassword(contrasena, user.contrasena);
        console.log("[LOGIN] Validación de contraseña:", { isValid, passwordHash: user.contrasena.substring(0, 10) + "..." });
        
        if (!isValid) {
            return res.status(400).json({ message: "Usuario o contraseña incorrectos" });
        }

        // Generar tokens
        const payload: JwtUserPayload = {
            id: user.idUsuario as number,
            tipoUsuario: user.tipoUsuario,
            activo: user.activo,
        };

        const accessToken = generateAccesToken(payload);
        const refreshToken = generateRefreshToken(payload);

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge:  7 * 24 * 60 * 60 * 1000
        });

        console.log("[LOGIN] Tokens generados exitosamente para usuario:", user.correo)
        return res.json({
            message: "Inicio de sesión exitoso",
            user: {
                userId: user.idUsuario as number,
                email: user.correo,
                typeAccount: user.tipoUsuario
            }
        });
    } catch (error) {
        console.error("[LOGIN ERROR]", error);
        res.status(500).json({ message: "Error interno al iniciar sesión" });
    }
}

export const refreshToken = async (req: Request, res: Response): Promise<any> => {
    try {
        // Obtener el refreshToken de las cookies
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "No se proporcionó refresh token" });
        }

        // Verificar refreshToken
        let payload = null;
        try {
            payload = verifyRefreshToken(token);
        } catch (err) {
            return res.status(401).json({ message: "Refresh token inválido o expirado" });
        }
        if (!payload) {
            return res.status(401).json({ message: "Refresh token inválido o expirado" });
        }

        // Buscar usuario y validar que siga activo
        //const user = await Usuario.findOne({ where: { id: payload.id } });
        const user = await userRepository.findById(payload.id)

        if (!user || !user.activo) {
            return res.status(403).json({ message: "Usuario no válido o inactivo" });
        }

        // Generar nuevo accessToken
        const newPayload: JwtUserPayload = {
            id: user.idUsuario as number,
            tipoUsuario: user.tipoUsuario,
            activo: user.activo,
        };
        const newAccessToken = generateAccesToken(newPayload);

        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000
        });

        return res.json({
            message: "Nuevo access token generado",
            accessToken: newAccessToken
        });
    } catch (error) {
        console.log("Error en refreshToken:", error);
        res.status(500).json({ message: "Error interno al refrescar token" });
    }
}
