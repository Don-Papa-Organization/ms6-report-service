import { Request, Response } from "express";
import { ProductRepository } from "../repositories/productRepository";
import { TipoUsuario } from "../types/express";

const productRepository = new ProductRepository();

// Obtener todos los productos
export const getProductos = async (req: Request, res: Response): Promise<any> => {
    try {
        // Validar usuario activo y tipo
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario === TipoUsuario.cliente) {
            return res.status(403).json({ message: "El usuario debe ser admin o empleado" });
        }
        const productos = await productRepository.findAll();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener productos", error });
    }
};

// Obtener un producto por ID
export const getProductoById = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario === TipoUsuario.cliente) {
            return res.status(403).json({ message: "El usuario debe ser admin o empleado" });
        }
        const producto = await productRepository.findById(parseInt(req.params.id));
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        res.json(producto);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el producto", error });
    }
};

// Crear un nuevo producto
export const createProducto = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario !== TipoUsuario.administrador) {
            return res.status(403).json({ message: "Solo administradores pueden crear productos" });
        }
        const productoGuardado = await productRepository.create(req.body);
        res.status(201).json(productoGuardado);
    } catch (error) {
        res.status(400).json({ message: "Error al crear el producto", error });
    }
};

// Actualizar un producto existente
export const updateProducto = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario !== TipoUsuario.administrador) {
            return res.status(403).json({ message: "Solo administradores pueden modificar productos" });
        }
        const producto = await productRepository.findById(parseInt(req.params.id));
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        const productoActualizado = await productRepository.update(parseInt(req.params.id), req.body);
        if (!productoActualizado) {
            return res.status(404).json({ message: "No se pudo actualizar: producto no encontrado" });
        }
        res.json(productoActualizado);
    } catch (error) {
        res.status(400).json({ message: "Error al actualizar el producto", error });
    }
};

// Eliminar un producto
export const deleteProducto = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        if (!req.user.activo) {
            return res.status(403).json({ message: "Usuario no activo" });
        }
        if (req.user.tipoUsuario !== TipoUsuario.administrador) {
            return res.status(403).json({ message: "Solo administradores pueden eliminar productos" });
        }
        const producto = await productRepository.findById(parseInt(req.params.id));
        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        await productRepository.delete(parseInt(req.params.id));
        res.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el producto", error });
    }
};