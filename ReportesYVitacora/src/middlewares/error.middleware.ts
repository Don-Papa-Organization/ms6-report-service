import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
	statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		Object.setPrototypeOf(this, AppError.prototype);
	}
}

export const errorMiddleware = (
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	if (err instanceof AppError) {
		res.status(err.statusCode).json({
			success: false,
			message: err.message,
			data: null,
			timestamp: new Date().toISOString(),
		});
	} else {
		console.error("Error no manejado:", err);
		res.status(500).json({
			success: false,
			message: "Error interno del servidor",
			data: null,
			timestamp: new Date().toISOString(),
		});
	}
};
