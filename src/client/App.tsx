import {useSocket} from './hooks/useSocket'
import {AppLayout} from './components/AppLayout'
import './App.css'
import {RoomManagement} from "./components/RoomManagement.tsx";
import {GameRoom} from "./components/GameRoom.tsx";
import {GameHeader} from "./components/GameHeader.tsx";
import {type FC, useMemo} from "react";

const App: FC = () => {
    const socket = useSocket()
    const isDrawer = !!socket.gameState && socket.gameState.players.find((p) => p.isDrawing)?.id === socket.myPlayerId

    const renderAppState = useMemo(() => {
        if(!socket.gameState?.roomId) return <RoomManagement {...socket} />
        if(socket.gameState?.roomId && socket.gameState) return <GameRoom isDrawer={isDrawer} {...socket} />
        return null
    }, [socket])

    return (
        <AppLayout>
            <GameHeader connected={socket.connected} />
            {renderAppState}
        </AppLayout>
    )
}

export default App