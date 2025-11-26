import { TipoUsuario } from "../types/express";

export interface JwtUserPayload {
  id: number,
  tipoUsuario: TipoUsuario,
  activo: boolean,
  iat?: number,
  exp?: number
}