import { GameRoom } from './GameRoom'
import { nanoid } from 'nanoid'

export class RoomManager {
    private rooms: Map<string, GameRoom> = new Map()
    private socketToRoom: Map<string, string> = new Map()

    createRoom(): string {
        let roomId: string

        do {
            roomId = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, '0')
        } while (this.rooms.has(roomId))

        const room = new GameRoom(roomId)
        this.rooms.set(roomId, room)

        console.log(`Room created: ${roomId}`)
        return roomId
    }

    getRoom(roomId: string): GameRoom | null {
        return this.rooms.get(roomId.toUpperCase()) || null
    }

    getRoomBySocket(socketId: string): GameRoom | null {
        const roomId = this.socketToRoom.get(socketId)
        if (!roomId) return null
        return this.getRoom(roomId)
    }

    joinRoom(socketId: string, roomId: string, playerName: string): { room: GameRoom, player: any } | null {
        const room = this.getRoom(roomId)
        if (!room || room.isFull()) return null

        const player = room.addPlayer(socketId, playerName)
        if (!player) return null

        this.socketToRoom.set(socketId, roomId)
        console.log(`Player ${playerName} joined room ${roomId}`)

        return { room, player }
    }

    leaveRoom(socketId: string): { roomId: string, playerId: string } | null {
        const room = this.getRoomBySocket(socketId)
        const roomId = this.socketToRoom.get(socketId)

        if (!room || !roomId) return null

        const playerId = room.removePlayer(socketId)
        if (!playerId) return null

        this.socketToRoom.delete(socketId)

        if (room.isEmpty()) {
            this.rooms.delete(roomId)
            console.log(`Room ${roomId} deleted (empty)`)
        }

        return { roomId, playerId }
    }

    handleDisconnect(socketId: string): { roomId: string, playerId: string } | null {
        const room = this.getRoomBySocket(socketId)
        const roomId = this.socketToRoom.get(socketId)

        if (!room || !roomId) return null

        const playerId = room.disconnectPlayer(socketId)
        if (!playerId) return null

        console.log(`Player disconnected from room ${roomId}`)

        return { roomId, playerId }
    }

    reconnectPlayer(socketId: string, roomId: string, playerId: string): boolean {
        const room = this.getRoom(roomId)
        if (!room) return false

        const success = room.reconnectPlayer(playerId, socketId)
        if (success) {
            this.socketToRoom.set(socketId, roomId)
            console.log(`Player ${playerId} reconnected to room ${roomId}`)
        }

        return success
    }

    getActiveRooms(): string[] {
        return Array.from(this.rooms.keys())
    }

    getRoomCount(): number {
        return this.rooms.size
    }

    getTotalPlayerCount(): number {
        let total = 0
        for (const room of this.rooms.values()) {
            total += room.getState().players.length
        }
        return total
    }

    cleanupDisconnectedPlayer(roomId: string, playerId: string): void {
        const room = this.getRoom(roomId)
        if (!room) return

        const socketId = room.getSocketByPlayerId(playerId)
        if (socketId) {
            this.socketToRoom.delete(socketId)
        }

        room.removePlayer(socketId || '')

        if (room.isEmpty()) {
            this.rooms.delete(roomId)
            console.log(`Room ${roomId} deleted (empty after cleanup)`)
        }
    }
}