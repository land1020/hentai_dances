// ====================================
// リザルト画面: 変態は踊る
// ====================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import {
    Home,
    RotateCcw,
    Trophy,
    Crown,
    User,
    Bot,
    Skull,
    Shield
} from 'lucide-react';
import { loadRoomState, saveRoomState, clearRoomState, type LocalRoomState } from '../store/gameStore';
import type { Player } from '../types';

export default function ResultScreen() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [roomState, setRoomState] = useState<LocalRoomState | null>(null);
    const [showConfetti, setShowConfetti] = useState(true);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!roomId) {
            navigate('/');
            return;
        }

        const state = loadRoomState();
        if (!state || state.roomId !== roomId) {
            navigate('/');
            return;
        }

        setRoomState(state);

        // 5秒後に紙吹雪を止める
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
    }, [roomId, navigate]);

    // もう一度遊ぶ
    const handlePlayAgain = () => {
        if (roomState) {
            // ゲーム状態をリセットしてロビーへ
            const newState = {
                ...roomState,
                status: 'WAITING' as const,
                gameState: null,
            };
            saveRoomState(newState);
            navigate(`/lobby/${roomId}`);
        }
    };

    // トップへ戻る
    const handleGoHome = () => {
        clearRoomState();
        navigate('/');
    };

    // 殿堂入りへ
    const handleHallOfFame = () => {
        navigate('/hall-of-fame');
    };

    if (!roomState || !roomState.gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">読み込み中...</div>
            </div>
        );
    }


    const { gameState } = roomState;
    const winner = gameState.winner;
    const victoryInfo = gameState.victoryInfo;
    const isCriminalWin = winner === 'CRIMINAL_TEAM';

    // 勝利タイプに応じたメッセージを取得
    const getVictoryMessage = () => {
        if (!victoryInfo) {
            return isCriminalWin ? '変態が最後まで生き残りました！' : '変態を捕まえました！';
        }
        switch (victoryInfo.victoryType) {
            case 'DETECTIVE':
                return '警察が変態を見抜きました！';
            case 'DOG':
                return '正常者が変態カードを引き当てました！';
            case 'CULPRIT_ESCAPE':
                return '変態が最後までカードを出し切りました！';
            default:
                return isCriminalWin ? '変態が最後まで生き残りました！' : '変態を捕まえました！';
        }
    };

    // MVP（メイン勝者）を取得
    const mvpResult = victoryInfo?.playerResults?.find(r => r.isMVP);
    const mvpPlayer = mvpResult ? gameState.players.find(p => p.id === mvpResult.playerId) : null;

    // 勝者・敗者を分類（victoryInfoがある場合はそれを使用）
    const winners: (Player & { isAccomplice?: boolean })[] = [];
    const losers: Player[] = [];

    if (victoryInfo?.playerResults) {
        // victoryInfoから勝敗を取得
        victoryInfo.playerResults.forEach(result => {
            const player = gameState.players.find(p => p.id === result.playerId);
            if (player) {
                if (result.isWinner) {
                    winners.push({ ...player, isAccomplice: result.isAccompliceWinner });
                } else {
                    losers.push(player);
                }
            }
        });
    } else {
        // 後方互換: victoryInfoがない場合は従来のロジック
        gameState.players.forEach(player => {
            const isWinner =
                (isCriminalWin && player.team === 'CRIMINAL') ||
                (!isCriminalWin && player.team === 'CITIZEN');

            if (isWinner) {
                winners.push(player);
            } else {
                losers.push(player);
            }
        });
    }


    return (
        <div className="min-h-screen p-4">
            {/* 紙吹雪 */}
            {showConfetti && (
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={false}
                    numberOfPieces={200}
                    colors={isCriminalWin ? ['#ef4444', '#f97316', '#eab308'] : ['#3b82f6', '#6366f1', '#8b5cf6']}
                />
            )}

            <div className="max-w-2xl mx-auto">
                {/* 結果発表 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="text-center mb-8"
                >
                    <div className="text-6xl mb-4">
                        {isCriminalWin ? '🎭' : '🚔'}
                    </div>
                    <h1 className="text-4xl font-black mb-2">
                        {isCriminalWin ? '変態の勝利！' : '警察の勝利！'}
                    </h1>
                    <p className="text-gray-400 mb-4">
                        {getVictoryMessage()}
                    </p>
                    {/* MVP表示 */}
                    {mvpPlayer && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <span className="text-yellow-300 font-bold">MVP: {mvpPlayer.name}</span>
                        </div>
                    )}
                </motion.div>

                {/* 勝者 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card-base p-4 mb-4"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Crown className="w-6 h-6 text-yellow-400" />
                        <h2 className="text-lg font-bold text-yellow-400">勝者</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {winners.map(player => (
                            <div
                                key={player.id}
                                className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border"
                                style={{ borderColor: player.color || 'rgba(234, 179, 8, 0.3)' }}
                            >
                                {player.isNpc ? (
                                    <Bot className="w-5 h-5 text-blue-400" />
                                ) : (
                                    <User className="w-5 h-5 text-purple-400" />
                                )}
                                <div className="flex-1">
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        {player.currentPrefix && (
                                            <span className={player.isCursed ? 'text-red-400' : 'text-gray-400'}>
                                                {player.currentPrefix}
                                            </span>
                                        )}
                                        {player.name}
                                        {/* MVP バッジ */}
                                        {mvpPlayer?.id === player.id && (
                                            <span className="px-1.5 py-0.5 text-xs bg-yellow-500/30 text-yellow-300 rounded font-bold">
                                                MVP
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {player.team === 'CRIMINAL' ? (
                                            <span className="text-red-400 flex items-center gap-1">
                                                <Skull className="w-3 h-3" />
                                                {player.hand.some(c => c.type === 'culprit') || (victoryInfo?.victoryType === 'CULPRIT_ESCAPE' && mvpPlayer?.id === player.id)
                                                    ? '変態として勝利'
                                                    : player.isAccomplice
                                                        ? '異常性癖者として勝利'
                                                        : '共犯者'}
                                            </span>
                                        ) : (
                                            /* 勝利タイプに応じた役割を表示（市民は非表示） */
                                            mvpPlayer?.id === player.id && (
                                                <span className="text-cyan-400 flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    {victoryInfo?.victoryType === 'DETECTIVE' && '逮捕で勝利'}
                                                    {victoryInfo?.victoryType === 'DOG' && '正常者で勝利'}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* 敗者 */}
                {losers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="card-base p-4 mb-4"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Skull className="w-6 h-6 text-gray-400" />
                            <h2 className="text-lg font-bold text-gray-400">敗者</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {losers.map(player => (
                                <div
                                    key={player.id}
                                    className="flex items-center gap-2 p-3 rounded-lg bg-gray-500/10 border opacity-60"
                                    style={{ borderColor: player.color || 'rgba(107, 114, 128, 0.3)' }}
                                >
                                    {player.isNpc ? (
                                        <Bot className="w-5 h-5 text-blue-400" />
                                    ) : (
                                        <User className="w-5 h-5 text-purple-400" />
                                    )}
                                    <div>
                                        <div className="font-medium text-sm">
                                            {player.currentPrefix && (
                                                <span className={player.isCursed ? 'text-red-400' : 'text-gray-400'}>
                                                    {player.currentPrefix}
                                                </span>
                                            )}
                                            {player.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {/* 変態表示: チームがCRIMINAL または 逮捕された対象 */}
                                            {player.team === 'CRIMINAL' || victoryInfo?.targetPlayerId === player.id ? (
                                                <span className="text-red-400 flex items-center gap-1">
                                                    <Skull className="w-3 h-3" />
                                                    {player.hand.some(c => c.type === 'culprit') || victoryInfo?.targetPlayerId === player.id
                                                        ? '変態'
                                                        : '異常性癖者'}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ゲーム統計 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="card-base p-4 mb-6"
                >
                    <h3 className="font-bold mb-3">ゲーム統計</h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-white/5">
                            <div className="text-2xl font-bold text-purple-400">{gameState.turnCount}</div>
                            <div className="text-xs text-gray-500">総ターン数</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                            <div className="text-2xl font-bold text-purple-400">{gameState.tableCards.length}</div>
                            <div className="text-xs text-gray-500">使用されたカード</div>
                        </div>
                    </div>
                </motion.div>

                {/* アクションボタン */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="space-y-3"
                >
                    <button
                        onClick={handlePlayAgain}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-5 h-5" />
                        もう一度遊ぶ
                    </button>

                    <button
                        onClick={handleHallOfFame}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        <Trophy className="w-5 h-5" />
                        殿堂入りを見る
                    </button>

                    <button
                        onClick={handleGoHome}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        <Home className="w-5 h-5" />
                        トップページへ
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
