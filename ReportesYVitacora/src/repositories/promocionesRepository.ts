import { BaseRepository } from "./baseRepository";
import { PromotionDto } from "../dtos/promotionDto";
import { databaseService } from "../services/apis/databaseService";

export class PromocionRepository extends BaseRepository<PromotionDto> {
    constructor() {
        super('promociones'); //antes promocion, pero lo sigue tomando igual
    }

    async findByActivas(activas: boolean): Promise<PromotionDto[]> {
        const response = await databaseService.instance.get(`/db/${this.endpoint}/activas/${activas}`);
        return response.data;
    }
}
