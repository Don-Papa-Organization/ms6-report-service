import { BaseRepository } from "./baseRepository";
import { ProductDto } from "../dtos/productDto";
import { databaseService } from "../services/apis/databaseService";

export class ProductRepository extends BaseRepository<ProductDto>{
    constructor(){
        super('productos')
    }

    async findByCategoria(idCategoria: number): Promise<ProductDto>{
        const response = await databaseService.instance.get(`/db/${this.endpoint}/idCategoria/${idCategoria}`)
        return response.data
    }

    async findByActivo(activo: number): Promise<ProductDto>{
        const response = await databaseService.instance.get(`/db/${this.endpoint}/activo/${activo}`)
        return response.data
    }
}