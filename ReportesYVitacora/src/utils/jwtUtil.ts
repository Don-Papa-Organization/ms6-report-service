import jwt from "jsonwebtoken";
import { JwtUserPayload } from "../interfaces/jwtUserPayloadI";

const JWT_SECRET = process.env.JWT_SECRET! || "tu_super_secreto_jwt_development_very_secure_key_12345";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET! || "tu_super_secreto_jwt_development_very_secure_key_12345";

export const generateAccesToken = (payload: Object):string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export const generateRefreshToken = (payload: Object): string => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export const verifyAccessToken = (token: string): JwtUserPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    } catch (error) {
        console.log("Token invalido:", error);
        return null
    }
}

export const verifyRefreshToken = (token: string): JwtUserPayload | null => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET) as JwtUserPayload;
    } catch (error) {
        console.log("Token invalido: ", error);
        return null
    }
}