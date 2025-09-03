import {useState, useEffect, type FC } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types'

const App: FC = () => {
    const [connected, setConnected] = useState(false)
    const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)

    useEffect(() => {
        const newSocket = io(
            process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5173',
            {
                transports: ['websocket', 'polling']
            }
        ) as Socket<ServerToClientEvents, ClientToServerEvents>

        newSocket.on('connect', () => {
            console.log('Connected to server')
            setConnected(true)
        })

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server')
            setConnected(false)
        })

        setSocket(newSocket)

        return () => {
            newSocket.disconnect()
        }
    }, [])

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Pictionary Game</h1>
                <p className="text-gray-600">
                    Connection Status:
                    <span className={`ml-2 font-semibold ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
                </p>
                <p className="text-gray-500 mt-4">Phase 1 Setup Complete ✓</p>
            </div>
        </div>
    )
}

export default App