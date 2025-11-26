import { Request, Response } from 'express';
import { BaseController } from './baseController';
import { Bitacora } from '../models';
import { BitacoraRepository } from '../repositories/bitacoraRepository';

export class BitacoraController extends BaseController<Bitacora> {
    private bitacoraRepository: BitacoraRepository;

    constructor() {
        const bitacoraRepo = new BitacoraRepository();
        super(bitacoraRepo);
        this.bitacoraRepository = bitacoraRepo;
    }

    async getByEmpleado(req: Request, res: Response): Promise<void> {
        try {
            const idEmpleado = this.validateId(req.params.idEmpleado);
            
            if (!idEmpleado) {
                res.status(400).json({
                    success: false,
                    error: 'ID de empleado inválido'
                });
                return;
            }

            const registros = await this.bitacoraRepository.findByEmpleado(idEmpleado);
            
            registros.length > 0
                ? res.json({ success: true, data: registros })
                : res.status(404).json({
                    success: false,
                    error: 'No se encontraron registros para este empleado'
                });
        } catch (error) {
            this.handleError(error, res, 'Error al buscar registros del empleado');
        }
    }
}