import { TipoUsuario } from "../types/express"

export interface UserI {
    idUsuario?: number,
    correo: string,
    contrasena: string,
    tipoUsuario: TipoUsuario,
    activo: boolean
}