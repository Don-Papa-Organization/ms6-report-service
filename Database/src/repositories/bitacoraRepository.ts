import { BaseRepository } from "./baseRepository";
import { Bitacora } from "../models";

export class BitacoraRepository extends BaseRepository<Bitacora> {
    constructor() {
        super(Bitacora);
    }

    async findByEmpleado(idEmpleado: number): Promise<Bitacora[]> {
        return this.model.findAll({ where: { idEmpleado } });
    }
}
