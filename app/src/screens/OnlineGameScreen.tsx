// ====================================
// オンラインゲーム画面: 変態は踊る
// ====================================

import { useParams, useNavigate } from 'react-router-dom';
import { useOnlineRoom, getOrCreateUserId } from '../hooks/useOnlineRoom';
import GamePlayScreen from './GamePlayScreen';

/**
 * オンラインゲーム画面
 * Firestore同期を担当し、UIはGamePlayScreenに委譲する
 */
export default function OnlineGameScreen() {
    const { roomId } = useParams<{ roomId: string }>();
    const userId = getOrCreateUserId();
    const navigate = useNavigate();

    const { room, isLoading, error, syncGameState } = useOnlineRoom(roomId || null);

    // ルームが存在しない場合やエラー時のハンドリング
    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center flex-col gap-4">
                <div className="text-xl text-red-500">{error}</div>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full"
                >
                    戻る
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-xl">読み込み中...</div>
            </div>
        );
    }

    if (!room) {
        return null;
    }

    // ゲーム状態がまだない場合（ありえないはずだが念のため）
    if (!room.gameState) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-xl">ゲーム準備中...</div>
            </div>
        );
    }

    return (
        <GamePlayScreen
            isOnlineMode={true}
            onlineRoomId={roomId}
            onlineUserId={userId}
            initialGameState={room.gameState}
            onGameStateChange={syncGameState}
            isHost={room.hostId === userId}
            hostId={room.hostId}
        />
    );
}
