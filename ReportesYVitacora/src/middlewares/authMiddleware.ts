import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwtUtil";
import { TipoUsuario } from "../types/express";
import { AppError } from "./error.middleware";

// Extrae token desde cookie accessToken o encabezado Authorization: Bearer
export function extractToken(req: Request): string | null {
	const cookieHeader = req.headers.cookie;
	if (cookieHeader) {
		const match = cookieHeader.match(/accessToken=([^;]+)/);
		if (match?.[1]) return match[1];
	}

	const authHeader = req.headers.authorization;
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.replace("Bearer ", "").trim();
	}

	return null;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): any => {
	const token = extractToken(req);
	if (!token) {
		throw new AppError("No se proporcionó access token", 401);
	}

	const payload = verifyAccessToken(token);
	if (!payload) {
		throw new AppError("Token inválido o expirado", 401);
	}

	req.user = payload;
	next();
};

export const requireUsuarioActivo = (req: Request, res: Response, next: NextFunction) => {
	if (!req.user) {
		throw new AppError("No autenticado", 401);
	}
	if (!req.user.activo) {
		throw new AppError("Usuario no activo", 403);
	}
	return next();
};

export const requireRoles = (...rolesPermitidos: TipoUsuario[]) => {
	if (rolesPermitidos.length === 0) {
		throw new Error('requireRoles debe recibir al menos un rol permitido');
	}

	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			throw new AppError("No autenticado", 401);
		}
		if (!req.user.activo) {
			throw new AppError("Usuario no activo", 403);
		}
		if (!rolesPermitidos.includes(req.user.tipoUsuario)) {
			throw new AppError("No tiene permisos para esta operación", 403);
		}
		return next();
	};
};

