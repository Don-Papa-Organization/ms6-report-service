import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwtUtil";
import { TipoUsuario } from "../types/express";

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
	try {
		const token = extractToken(req);
		if (!token) {
			return res.status(401).json({ message: "No se proporcionó access token" });
		}

		const payload = verifyAccessToken(token);
		if (!payload) {
			return res.status(401).json({ message: "Token inválido o expirado" });
		}

		req.user = payload;
		next();
	} catch (error) {
		return res.status(500).json({ message: "Error interno de autenticación" });
	}
};

export const requireUsuarioActivo = (req: Request, res: Response, next: NextFunction) => {
	if (!req.user) {
		return res.status(401).json({ message: "No autenticado" });
	}
	if (!req.user.activo) {
		return res.status(403).json({ message: "Usuario no activo" });
	}
	return next();
};

export const requireRoles = (...rolesPermitidos: TipoUsuario[]) => {
	if (rolesPermitidos.length === 0) {
		throw new Error('requireRoles debe recibir al menos un rol permitido');
	}

	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({ message: "No autenticado" });
		}
		if (!req.user.activo) {
			return res.status(403).json({ message: "Usuario no activo" });
		}
		if (!rolesPermitidos.includes(req.user.tipoUsuario)) {
			return res.status(403).json({ message: "No tiene permisos para esta operación" });
		}
		return next();
	};
};

