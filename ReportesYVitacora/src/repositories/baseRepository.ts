import { databaseService } from "../services/apis/databaseService";

export abstract class BaseRepository<T> {
    constructor(protected endpoint: string) { }

    async findAll(): Promise<T[]> {
        const response = await databaseService.instance.get(`/db/${this.endpoint}`)
        return response.data;
    }

    async findById(id: number): Promise<T | null> {
        try {
            const response = await databaseService.instance.get(`/db/${this.endpoint}/${id}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return null;
            throw error;
        }
    }

    async create(data: T): Promise<T> {
        const response = await databaseService.instance.post(`/db/${this.endpoint}`, data);
        return response.data;
    }

    async update(id: number, data: T): Promise<T | null> {
        try {
            const response = await databaseService.instance.put(`/db/${this.endpoint}/${id}`, data);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return null;
            throw error;
        }
    }

    async delete(id: number): Promise<void> {
        await databaseService.instance.delete(`/db/${this.endpoint}/${id}`);
    }
}       