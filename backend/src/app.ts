import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import express from 'express'
import session from 'express-session'
import MySQLStoreFactory from 'express-mysql-session'
import type {NextFunction, Request, Response} from 'express'
import {config} from './config.ts'
import {db} from './db.ts'
import {assetsRouter} from './routes/assets.ts'
import {blueprintsRouter} from './routes/blueprints.ts'
import {dialoguesRouter} from './routes/dialogues.ts'
import {healthRouter} from './routes/health.ts'
import {projectsRouter} from './routes/projects.ts'
import {usersRouter} from './routes/users.ts'

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000
const PROJECT_CONTENTS_LIMIT = '20mb'
/** The built website (`npm run build` in frontend/). In development Vite serves it instead, so it may not exist. */
const WEBSITE_FOLDER = fileURLToPath(new URL('../../frontend/dist', import.meta.url))
const MySQLStore = MySQLStoreFactory(session)
/** Where login sessions live, one row each in the `sessions` table */
export const sessionStore = new MySQLStore({createDatabaseTable: false}, db.pool)

export const app = express()
// Registered before the general parser, which skips a body that's already been read
app.put('/api/projects/:id/contents', express.json({limit: PROJECT_CONTENTS_LIMIT}))
app.use(express.json()) // read JSON request bodies into request.body

// Logins: the browser holds a signed cookie with the session's ID, and the session itself is a row in MySQL
app.use(
    session({
        secret: config.sessionSecret,
        store: sessionStore,
        resave: false, // only save a session when it changed
        saveUninitialized: false, // no cookie until someone logs in
        cookie: {httpOnly: true, sameSite: 'lax', maxAge: ONE_WEEK_IN_MS},
    }),
)

app.use('/api/health', healthRouter)
app.use('/api/users', usersRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/blueprints', blueprintsRouter)
app.use('/api/assets', assetsRouter)
app.use('/api/dialogues', dialoguesRouter)
app.use('/api', sendNotFound)
// Serving the website too means one server on one address, which is how Docker runs it
if (existsSync(WEBSITE_FOLDER)) {
    app.use(express.static(WEBSITE_FOLDER))
    app.use(sendWebsite)
}
app.use(handleError)

/** Answers 404 with JSON instead of Express's default HTML page. */
function sendNotFound(request: Request, response: Response) {
    response.status(404).json({message: 'Not found'})
}

/**
 * Sends the website's index.html for any other page address (like /projects/…/blueprints), so the website's own
 * router can show that page. Requests other than GET carry on to Express's 404.
 */
function sendWebsite(request: Request, response: Response, next: NextFunction) {
    if (request.method !== 'GET') {
        next()
        return
    }
    response.sendFile('index.html', {root: WEBSITE_FOLDER})
}

/**
 * Answers an error with JSON: 413 or 400 for a body express.json() refused, otherwise logs it and answers 500.
 * Express only treats a function with four parameters as an error handler, so `next` stays though it's unused.
 */
function handleError(error: unknown, request: Request, response: Response, next: NextFunction) {
    const bodyError = bodyErrorType(error)
    if (bodyError === 'entity.too.large') {
        response.status(413).json({message: 'This is more data than the server accepts at once.'})
        return
    }
    if (bodyError === 'entity.parse.failed') {
        response.status(400).json({message: "The request body isn't valid JSON."})
        return
    }

    console.error(error)
    response.status(500).json({message: 'Something went wrong on the server.'})
}

/** Why express.json() refused a body ('entity.too.large', 'entity.parse.failed', …), or null for other errors. */
function bodyErrorType(error: unknown): string | null {
    if (error instanceof Error && 'type' in error && typeof error.type === 'string') {
        return error.type
    }
    return null
}
