import express from 'express'
import session from 'express-session'
import type { NextFunction, Request, Response } from 'express'
import { config } from './config.ts'
import { assetsRouter } from './routes/assets.ts'
import { blueprintsRouter } from './routes/blueprints.ts'
import { dialoguesRouter } from './routes/dialogues.ts'
import { healthRouter } from './routes/health.ts'
import { projectsRouter } from './routes/projects.ts'
import { usersRouter } from './routes/users.ts'

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000

// The largest body PUT /api/projects/:id/contents accepts: a whole project, e.g. a backup restored from the
// browser (localStorage holds about 5 MB). Every other route keeps express.json()'s default of 100 KB.
const PROJECT_CONTENTS_LIMIT = '20mb'

/**
 * The Express app: JSON body parsing, every /api route, and the error answers. `server.ts` starts it; keeping
 * the two apart lets tests use the app without opening a port.
 */
export const app = express()
// Replacing a project's contents sends everything in it at once, so that one route reads its body first, with
// the higher limit. The general parser on the next line then sees the body was already read and leaves it alone.
app.put('/api/projects/:id/contents', express.json({ limit: PROJECT_CONTENTS_LIMIT }))
app.use(express.json()) // read JSON request bodies into request.body

// Remembers who is logged in. The browser only gets a signed cookie holding a random session ID; the session
// itself (request.session.userId) stays on the server. Kept in memory for now, so a restart logs everyone out.
app.use(
  session({
    secret: config.sessionSecret,
    resave: false, // only save a session when it changed
    saveUninitialized: false, // no cookie until someone logs in
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: ONE_WEEK_IN_MS },
  }),
)

app.use('/api/health', healthRouter)
app.use('/api/users', usersRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/blueprints', blueprintsRouter)
app.use('/api/assets', assetsRouter)
app.use('/api/dialogues', dialoguesRouter)
app.use('/api', sendNotFound)
app.use(handleError)

/** Answers 404 with JSON instead of Express's default HTML page. */
function sendNotFound(request: Request, response: Response) {
  response.status(404).json({ message: 'Not found' })
}

/**
 * Answers an error with JSON. Express only treats a function as an error handler when it takes four parameters,
 * so `next` has to stay even though it isn't used.
 *
 * A body express.json() refused (too big, or not JSON) is the caller's mistake and keeps its 4xx status. Anything
 * else is logged and answers 500.
 */
function handleError(error: unknown, request: Request, response: Response, next: NextFunction) {
  const bodyError = bodyErrorType(error)
  if (bodyError === 'entity.too.large') {
    response.status(413).json({ message: 'This is more data than the server accepts at once.' })
    return
  }
  if (bodyError === 'entity.parse.failed') {
    response.status(400).json({ message: "The request body isn't valid JSON." })
    return
  }

  console.error(error)
  response.status(500).json({ message: 'Something went wrong on the server.' })
}

/**
 * What express.json() says went wrong with a body it refused, e.g. 'entity.too.large' or 'entity.parse.failed'.
 * null for an error that came from anywhere else.
 */
function bodyErrorType(error: unknown): string | null {
  if (error instanceof Error && 'type' in error && typeof error.type === 'string') {
    return error.type
  }
  return null
}
