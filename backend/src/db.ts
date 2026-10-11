import mysql from 'mysql2/promise'
import { config } from './config.ts'

/**
 * The shared pool of MySQL connections. Run queries with `await db.query(sql, params)`, using `?` placeholders
 * for values. JSON columns come back as plain objects.
 */
export const db = mysql.createPool(config.db)
