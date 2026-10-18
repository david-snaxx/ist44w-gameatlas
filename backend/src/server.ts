import {app} from './app.ts'
import {config} from './config.ts'

app.listen(config.port, (error) => {
    if (error) {
        throw error
    }
    console.log(`GameAtlas API running: http://localhost:${config.port}/api/health`)
})
