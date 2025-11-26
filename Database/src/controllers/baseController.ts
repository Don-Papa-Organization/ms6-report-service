    import { Request, Response } from "express";
    import { BaseRepository } from "../repositories/baseRepository";
    import { Model } from "sequelize";

    export abstract class BaseController<T extends Model> {
        constructor(protected repository: BaseRepository<T>) { }

        async getAll(req: Request, res: Response): Promise<any> {
            try {
                const data = await this.repository.findAll(req.query);
                res.json(data);
            } catch (error) {
                this.handleError(error, res, "Error al obtener todos los registros")
            }
        }

        async getById(req: Request, res: Response): Promise<any> {
            try {
                const id = this.validateId(req.params.id);

                if (!id) {
                    return res.status(400).json({ error: "Invalid ID format" });
                }

                const data = await this.repository.findById(id);
                data
                    ? res.json(data)
                    : res.status(404).json({ error: "not found" })
            } catch (error) {
                this.handleError(error, res, "Error al obtener por id")
            }
        }

        async create(req: Request, res: Response): Promise<any> {
            try {
                const data = await this.repository.create(req.body);
                res.status(201).json(data);
            } catch (error) {
                this.handleError(error, res, "Error al crear")
            }
        }

        async update(req: Request, res: Response): Promise<any> {
            try {
                const id = this.validateId(req.params.id);
                
                if (!id) {
                    return res.status(400).json({ error: "Invalid ID format" });
                }

                const register = await this.repository.update(
                    id,
                    req.body
                )

                register !== null
                    ? res.json({ message: "Actualizado con exito" })
                    : res.status(404).json({ error: "Not found" })
            } catch (error) {
                this.handleError(error, res, "Error al actualizar")
            }
        }

        async delete(req: Request, res: Response): Promise<any> {
            try {
                const id = this.validateId(req.params.id);

                if (!id) {
                    return res.status(400).json({ error: "Invalid ID format" });
                }
                
                const deletedCount = await this.repository.delete(id)
                deletedCount > 0
                    ? res.json({ message: "Eliminado con exito" })
                    : res.status(404).json({ error: "Not found" })
            } catch (error) {
                this.handleError(error, res, "Error al eliiminar")
            }
        }

        public handleError(error: any, res: Response, defaultMessage = "Internal Server Error"): void {
            console.log("Controller error: ", error);

            if (error instanceof Error) {
                res.status(500).json({
                    error: error.message
                })
            }else{
                res.status(500).json({ error: defaultMessage})
            }
        }

        protected validateId(id: string): number | null{
            const parsedId = parseInt(id);
            return !isNaN(parsedId) && parsedId > 0 ? parsedId : null;

        }
    }