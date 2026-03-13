import mysql from "mysql2/promise";
import { Sequelize } from "sequelize-typescript";

//Importacion de modelos
import {
  Bitacora,
  DailySalesSummary,
  ProductSalesSummary,
  CategoryStockSummary,
  UserGrowthSummary,
  ReservationOccupancySummary,
  PromotionPerformance
} from "../domain/models"

//Importar credenciales
const DB_HOST = process.env.DB_HOST || "mysql"; 
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "MiContraseñaSegura123!";
const DB_NAME = process.env.DB_NAME || "don_papa";

// Instancia global de Sequelize
let sequelizeInstance: Sequelize | null = null;

export function getSequelizeInstance(): Sequelize {
  if (!sequelizeInstance) {
    throw new Error('Sequelize instance not initialized. Call initializeDB() first.');
  }
  return sequelizeInstance;
}

export async function initializeDB() {
  // 1. Crear BD si no existe (con mysql2) - con reintentos
  let connection;
  let attempts = 0;
  const maxAttempts = 30;
  const delayMs = 2000;

  while (attempts < maxAttempts) {
    try {
      connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
      });
      console.log("✅ Conexión a MySQL establecida");
      break;
    } catch (error) {
      attempts++;
      console.log(`⏳ Intento ${attempts}/${maxAttempts} de conectar a MySQL en ${DB_HOST}...`);
      if (attempts >= maxAttempts) {
        console.error("❌ No se pudo conectar a MySQL después de varios intentos");
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  await connection!.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
  await connection!.end();

  // 2. Conexión principal con Sequelize
  const sequelize = new Sequelize({
    host: DB_HOST,
    dialect: "mysql",
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    models: [
      Bitacora,
      DailySalesSummary,
      ProductSalesSummary,
      CategoryStockSummary,
      UserGrowthSummary,
      ReservationOccupancySummary,
      PromotionPerformance
    ],
    logging: false, // Desactiva logs de SQL en producción
  });

  // Guardar instancia global
  sequelizeInstance = sequelize;

  return sequelize;
}