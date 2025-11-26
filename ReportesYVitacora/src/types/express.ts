import { JwtUserPayload } from "../interfaces/jwtUserPayloadI";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {}; // Esto hace que el archivo sea un módulo

export enum TipoUsuario {
    cliente = 'cliente', 
    empleado = 'empleado',
    administrador = 'administrador'
}
