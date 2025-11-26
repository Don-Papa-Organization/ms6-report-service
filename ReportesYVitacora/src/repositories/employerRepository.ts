import { BaseRepository } from "./baseRepository";
import { databaseService } from "../services/apis/databaseService";
import { EmployerDto } from "../dtos/employerDto";

export class EmployerRepository extends BaseRepository<EmployerDto>{
    constructor(){
        super('empleados')
    }

    async findByCargo(cargo: string): Promise<EmployerDto>{
        const response = await databaseService.instance.get(`/db/${this.endpoint}/cargo/${cargo}`)
        return response.data
    }


}