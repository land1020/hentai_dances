
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOnlineRoom, getOrCreateUserId } from '../hooks/useOnlineRoom';
import LobbyScreen from './LobbyScreen';
import type { Player } from '../types';
import { PLAYER_COLORS } from '../store/gameStore';
import { initializeGame } from '../engine/GameEngine';

const NPC_NAMES = [
    'AI太郎', 'AI花子', 'AI次郎', 'AI三郎',
    'ボット1号', 'ボット2号', 'ボット3号', 'ボット4号'
];

export default function OnlineLobbyScreen() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const userId = getOrCreateUserId();

    const {
        room,
        isLoading,
        error,
        addNpc,
        removeNpc,
        updatePlayerName,
        updatePlayerColor,
        startGame,
        leaveCurrentRoom
    } = useOnlineRoom(roomId || null);

    // ルーム消失チェック
    useEffect(() => {
        if (!isLoading && !room && !error && roomId) {
            // ルームが見つからない場合
            // navigate('/'); // ここで遷移するとチラつく可能性があるので、ユーザー操作まで待ってもいいが、
            // エラー表示に任せる
        }
    }, [room, isLoading, error, roomId, navigate]);

    // ゲーム開始遷移
    useEffect(() => {
        if (room?.status === 'PLAYING' && room.gameState) {
            navigate(`/online-game/${roomId}`);
        }
    }, [room?.status, room?.gameState, roomId, navigate]);

    const handleAddNpc = async () => {
        if (!room || room.players.length >= 8) return;
        const existingNpcCount = room.players.filter(p => p.isNpc).length;
        const npcName = NPC_NAMES[existingNpcCount] || `NPC${existingNpcCount + 1}`;

        const npc: Player = {
            id: `npc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: npcName,
            isNpc: true,
            hand: [],
            isAlive: true,
            team: 'CITIZEN',
            hentaiLevel: 0,
            currentPrefix: '常識人な',
            assignedWord: null,
            isCursed: false,
            cursedPrefix: null,
            color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length]
        };
        await addNpc(npc);
    };

    const handleRemoveNpc = async () => {
        if (!room) return;
        const npcs = room.players.filter(p => p.isNpc);
        if (npcs.length === 0) return;
        const lastNpc = npcs[npcs.length - 1];
        await removeNpc(lastNpc.id);
    };

    const handleStartGame = async () => {
        if (!room) return;
        const gameState = initializeGame(room.players);
        await startGame(gameState);
    };

    const handleLeave = async () => {
        if (roomId) {
            await leaveCurrentRoom(userId);
        }
        navigate('/');
    };

    // 初期ロードまたはエラー
    if (isLoading && !room) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">接続中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-xl text-red-400 mb-4">{error}</div>
                    <button onClick={() => navigate('/')} className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 text-white">
                        トップに戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <LobbyScreen
            isOnlineMode={true}
            onlineRoomId={roomId}
            onlineRoomState={room}
            onAddNpc={handleAddNpc}
            onRemoveNpc={handleRemoveNpc}
            onStartGame={handleStartGame}
            onUpdatePlayerName={updatePlayerName}
            onUpdatePlayerColor={updatePlayerColor}
            onLeave={handleLeave}
        />
    );
}
