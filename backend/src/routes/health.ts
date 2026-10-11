import express from 'express'
import type {Request, Response} from 'express'
import {db} from '../db.ts'

// region Express Routes
export const healthRouter = express.Router()
healthRouter.get('/', getHealth)
// endregion

// region Endpoints
/**
 * GET /health
 */
async function getHealth(request: Request, response: Response) {
    try {
        await db.query('SELECT 1')
    } catch (error) {
        console.error('Database check failed:', error)
        response.status(503).json({server: 'ok', database: 'unreachable'})
        return
    }
    response.json({server: 'ok', database: 'ok'})
}
// endregion
