import { Model, FindOptions, ModelStatic, WhereOptions, where } from "sequelize";

export abstract class BaseRepository<T extends Model> {
    constructor(protected model: ModelStatic<T>) { }

    async findAll(options?: FindOptions): Promise<T[]> {
        return this.model.findAll(options)
    }

    async findById(id: number): Promise<T | null> {
        return this.model.findByPk(id)
    }

    async create(data: any): Promise<T> {
        return this.model.create(data)
    }

    async update(id: number, data: any): Promise<T | null> {
        const primaryKey = this.model.primaryKeyAttribute;

        if(!primaryKey){
            throw new Error(`Esta instancia no cuenta con Primary Key: ${this.model.name}`);
        }

        const register = await this.model.findByPk(id);
        if (!register) {
            // No se encontró la instancia, devolver null para que el controlador maneje el 404
            return null;
        }

        return await register.update(data);
    }

    async delete(id: number): Promise<number> {
        const primaryKey = this.model.primaryKeyAttribute;

        if(!primaryKey){
            throw new Error(`Esta instancia no cuenta con Primary Key: ${this.model.name}`);
        }

        const whereClause: WhereOptions = { [primaryKey]: id } 

        return this.model.destroy({ where: whereClause });
    }
}