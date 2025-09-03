import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
})

app.use(cors())
app.use(express.json())

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist/client')))
    app.get('*', (_, res) => {
        res.sendFile(path.join(__dirname, '../../dist/client/index.html'))
    })
}

app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', rooms: 0 }) // We'll update this later
})

io.on('connection', (socket) => {
    console.log('New connection:', socket.id)

    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id)
    })

    // We'll implement game logic in Phase 2
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    if (process.env.NODE_ENV !== 'production') {
        console.log(`WebSocket proxy expected on http://localhost:5173`)
    }
})