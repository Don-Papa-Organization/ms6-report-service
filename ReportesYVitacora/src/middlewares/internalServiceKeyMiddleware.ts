import { Request, Response, NextFunction } from 'express';

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'una_llave_secreta_compartida';

/**
 * Middleware para validar el service key en endpoints internos
 * Solo permite acceso a servicios internos que proporcionan el header correcto
 */
export const internalServiceKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const providedKey = req.headers['x-service-key'] as string;

  if (!providedKey || providedKey !== INTERNAL_SERVICE_KEY) {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado: service key inválida',
      error: 'INVALID_SERVICE_KEY'
    });
    return;
  }

  next();
};
