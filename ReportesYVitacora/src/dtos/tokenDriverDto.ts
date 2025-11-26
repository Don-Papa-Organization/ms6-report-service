export interface TokenDriverI {
    idManejadorTokens?: number,
    creadoEn: Date,
    expiraEn: Date,
    token: string,
    idUsuario: number,
}