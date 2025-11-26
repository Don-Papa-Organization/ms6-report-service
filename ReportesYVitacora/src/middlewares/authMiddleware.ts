import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwtUtil";


export const authenticateToken = (req: Request, res: Response, next: NextFunction): any => {
	try {
		// Obtener el token de las cookies
		const cookieHeader = req.headers.cookie;
        if (!cookieHeader) {
            return res.status(401).json({ message: "No se proporcionó access token" });
        }

        const match = cookieHeader.match(/accessToken=([^;]+)/);
        const token = match ? match[1] : null;
			
		if (!token) {
			return res.status(401).json({ message: "No se proporcionó access token" });
		}

		// Verificar el token
		let payload;
		try {
			payload = verifyAccessToken(token);
		} catch (err) {
			return res.status(401).json({ message: "Token inválido o expirado" });
		}
		if (!payload) {
			return res.status(401).json({ message: "Token inválido o expirado" });
		}

		// Adjuntar el payload al request para uso posterior
		req.user = payload;
		next();
	} catch (error) {
		return res.status(500).json({ message: "Error interno de autenticación" });
	}
}