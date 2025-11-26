import { BaseRepository } from "./baseRepository";
import { TokenDriverI } from "../dtos/tokenDriverDto";
import { databaseService } from "../services/apis/databaseService";

export class TokenDriverRepository extends BaseRepository<TokenDriverI>{
    constructor(){
        super('tokens')
    }

    async findByToken(token: string): Promise<TokenDriverI>{
        const response = await databaseService.instance.get(`/db/${this.endpoint}/token/${token}`)
        return response.data.data
    }

    async findByUsuario(idUsuario: number): Promise<TokenDriverI>{
        const response = await databaseService.instance.get(`/db/${this.endpoint}/usuario/${idUsuario}`)
        return response.data
    }
    
}