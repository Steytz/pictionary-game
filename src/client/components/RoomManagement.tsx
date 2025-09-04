import { type FC, useState } from "react"
import { Card } from "./Card.tsx";

interface Props {
    createRoom: (playerName: string) => void
    joinRoom: (roomId: string, playerName: string) => void
    error: string | null
}

export const RoomManagement: FC<Props> = ({ createRoom, joinRoom, error }) => {
    const [playerName, setPlayerName] = useState('')
    const [inputRoomId, setInputRoomId] = useState('')

    return (
      <Card className="max-w-2xl mx-auto animate-fadeIn">
          <div className="space-y-6">
              <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                  <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full rounded-xl bg-gray-900/50 border border-gray-700 p-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      placeholder="Enter your name..."
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                  <button
                      onClick={() => playerName.trim() && createRoom(playerName)}
                      className=" mb-4 btn-primary w-full py-3 rounded-xl font-semibold text-lg"
                      disabled={!playerName.trim()}
                  >
                      Create New Room
                  </button>

                  <div className="flex gap-2">
                      <input
                          type="text"
                          value={inputRoomId}
                          onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                          className="flex-1 rounded-xl bg-gray-900/50 border border-gray-700 p-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                          placeholder="Room Code"
                          maxLength={6}
                      />
                      <button
                          onClick={() => playerName.trim() && inputRoomId.trim() && joinRoom(inputRoomId, playerName)}
                          className="gradient-success text-white px-6 py-3 font-semibold disabled:opacity-50 rounded-xl font-semibold text-lg"
                          disabled={!playerName.trim() || !inputRoomId.trim()}
                      >
                          Join
                      </button>
                  </div>
              </div>

              {error && (
                  <div className="rounded-xl bg-red-900/30 border border-red-700/50 p-4 text-red-400">
                      {error}
                  </div>
              )}
          </div>
      </Card>
  )
}