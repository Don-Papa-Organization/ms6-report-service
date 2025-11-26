import { BaseRepository } from "./baseRepository";
import { UserI } from "../dtos/userDto";
import { databaseService } from "../services/apis/databaseService";
import { TipoUsuario } from "../types/express";

export class UserRepository extends BaseRepository<UserI>{
    constructor(){
        super('users')
    }

    async findByEmail(email: string): Promise<UserI | null>{
        try {
            const response = await databaseService.instance.get(`/db/${this.endpoint}/correo/${email}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error; 
        }
    }

    async findByActivo(activo: boolean): Promise<UserI[]>{
        const response = await databaseService.instance.get(`/db/${this.endpoint}/activo/${activo}`)
        return response.data
    }

    async findByTipoUsuario(tipo: TipoUsuario): Promise<UserI[]>{
        const response = await databaseService.instance.get(`/db/${this.endpoint}/tipo/${tipo}`)
        return response.data
    }

    async create(data: UserI): Promise<UserI> {

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.correo as string)) {
            throw new Error('Invalid email format')
        }

        const existingUser = await this.findByEmail(data.correo as string)
        if (existingUser) {
            throw new Error('User with this email already exists')
        }

        const response = await databaseService.instance.post(`/db/${this.endpoint}`, data)
        return response.data
    }
}
