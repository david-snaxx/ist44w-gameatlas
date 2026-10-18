import mysql from 'mysql2/promise'
import {config} from './config.ts'

/** The shared MySQL connection pool: `await db.query(sql, params)` with `?` placeholders. JSON columns come back as objects. */
export const db = mysql.createPool(config.db)
