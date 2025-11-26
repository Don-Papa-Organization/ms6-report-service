import { JwtUserPayload } from "../interfaces/interfaces";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {}; // Esto hace que el archivo sea un módulo

export enum TipoUsuario { 'cliente', 'empleado', 'administrador'};
