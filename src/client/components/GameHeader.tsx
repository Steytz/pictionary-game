import type {FC} from "react"

interface Props {
    connected: boolean
}

export const GameHeader: FC<Props> = ({ connected }) => {
  return <div className="mb-8 text-center">
      <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Pictionary Game
      </h1>
      <div className="flex items-center justify-center gap-2 text-sm">
          <span className={`connection-dot ${connected ? 'connected' : 'disconnected'}`}></span>
          <span className={connected ? 'text-green-400' : 'text-red-400'}>
                        {connected ? 'Connected' : 'Disconnected'}
          </span>
      </div>
  </div>
}

