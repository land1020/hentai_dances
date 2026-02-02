// ====================================
// リザルト画面: 変態は踊る
// ====================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
    Shield,
    LogOut
} from 'lucide-react';
import { loadRoomState, saveRoomState, clearRoomState, type LocalRoomState } from '../store/gameStore';
import type { Player, GameResult } from '../types';
import { initializeGame } from '../engine/GameEngine';
import HentaiGauge from '../components/HentaiGauge';
import { addToHallOfFame } from './HallOfFameScreen';
import { useOnlineRoom, getOrCreateUserId } from '../hooks/useOnlineRoom';
import { updateRoom } from '../services/roomService';

export default function ResultScreen() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isOnline = location.state?.isOnline;
    const userId = getOrCreateUserId();

    const { room } = useOnlineRoom(isOnline ? roomId || null : null);

    const [roomState, setRoomState] = useState<LocalRoomState | null>(null);
    const [showConfetti, setShowConfetti] = useState(true);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [isRegistered, setIsRegistered] = useState(false);

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

    // オンライン: ルーム状態監視と自動遷移
    useEffect(() => {
        if (!isOnline || !room || !roomId) return;

        if (room.status === 'PLAYING') {
            navigate(`/online-game/${roomId}`);
        } else if (room.status === 'WAITING') {
            navigate(`/online-lobby/${roomId}`);
        }
    }, [isOnline, room?.status, roomId, navigate]);

    // 次のゲームのためのプレイヤー情報を生成
    const getNextPlayers = () => {
        if (!roomState || !roomState.players) return [];

        const victoryInfo = roomState.gameState?.victoryInfo;

        return roomState.players.map(p => {
            const gamePlayer = roomState.gameState?.players.find(gp => gp.id === p.id);
            const playerResult = victoryInfo?.playerResults?.find(r => r.playerId === p.id);

            if (gamePlayer) {
                return {
                    ...p,
                    hentaiLevel: gamePlayer.hentaiLevel,
                    assignedWord: playerResult?.newAssignedWord || gamePlayer.assignedWord,
                    // リザルト画面で計算された二つ名を引き継ぐ
                    currentPrefix: playerResult?.newPrefix || gamePlayer.currentPrefix,
                };
            }
            return p;
        });
    };

    // もう一度遊ぶ（即時リスタート）
    const handlePlayAgain = async () => {
        if (roomState) {
            const updatedPlayers = getNextPlayers();
            // deckConfigを取得（オンラインはroomから、ローカルはroomStateから）
            const deckConfig = isOnline && room ? room.deckConfig : roomState.deckConfig;
            // ゲーム開始処理（deckConfigを渡す）
            const newGameState = initializeGame(updatedPlayers, deckConfig);

            if (isOnline && roomId) {
                // オンライン: 全員の画面を切り替えるためにFirestoreを更新
                await updateRoom(roomId, {
                    players: updatedPlayers,
                    gameState: newGameState,
                    status: 'PLAYING'
                });
                // ホスト自身の画面遷移はuseEffectで検知して行う（または念のためここでも呼ぶ？いや、useEffectに任せるのが安全）
            } else {
                // ローカル
                const newState: LocalRoomState = {
                    ...roomState,
                    players: updatedPlayers,
                    status: 'PLAYING' as const,
                    gameState: newGameState,
                };
                saveRoomState(newState);
                navigate(`/game/${roomId}`);
            }
        }
    };

    // ロビーに戻る
    const handleBackToLobby = async () => {
        if (roomState) {
            const updatedPlayers = getNextPlayers();

            if (isOnline && roomId) {
                // オンライン: 全員ロビーへ
                await updateRoom(roomId, {
                    players: updatedPlayers,
                    status: 'WAITING',
                    gameState: null // ゲーム状態クリア
                });
            } else {
                // ローカル: ロビー待機状態へ
                const newState: LocalRoomState = {
                    ...roomState,
                    players: updatedPlayers,
                    status: 'WAITING' as const,
                    gameState: null,
                };
                saveRoomState(newState);
                navigate(`/lobby/${roomId}`);
            }
        }
    };

    // トップへ戻る
    const handleGoHome = () => {
        clearRoomState();
        navigate('/');
    };

    // 殿堂入りに登録
    const handleRegisterHallOfFame = () => {
        if (!roomState || !roomState.gameState || isRegistered) return;

        const { gameState } = roomState;
        const victoryInfo = gameState.victoryInfo;
        const mvpResult = victoryInfo?.playerResults?.find(r => r.isMVP);
        const mvpPlayer = mvpResult ? gameState.players.find(p => p.id === mvpResult.playerId) : null;

        // 勝者の役職を決定
        let winnerRole: 'CULPRIT' | 'DETECTIVE' | 'DOG' | 'CITIZEN' = 'CITIZEN';
        if (victoryInfo?.victoryType === 'CULPRIT_ESCAPE') {
            winnerRole = 'CULPRIT';
        } else if (victoryInfo?.victoryType === 'DETECTIVE') {
            winnerRole = 'DETECTIVE';
        } else if (victoryInfo?.victoryType === 'DOG') {
            winnerRole = 'DOG';
        }

        const result: GameResult = {
            id: `game-${Date.now()}`,
            roomId: roomState.roomId,
            playedAt: new Date(),
            winnerName: mvpPlayer?.name || '不明',
            winnerRole,
            mvp: mvpPlayer?.name,
            totalTurns: gameState.turnCount,
            members: gameState.players.map(p => p.name),
            players: gameState.players.map(p => {
                const playerResult = victoryInfo?.playerResults?.find(r => r.playerId === p.id);
                return {
                    id: p.id,
                    name: p.name,
                    prefix: playerResult?.newPrefix || p.currentPrefix || '',
                    hentaiLevel: p.hentaiLevel || 0,
                    score: p.hentaiLevel || 0,
                    team: p.team,
                    isWinner: playerResult?.isWinner || false,
                };
            })
        };

        addToHallOfFame(result);
        setIsRegistered(true);
    };

    // ルームマスターかどうかを判定
    const isRoomMaster = isOnline
        ? room?.hostId === userId
        : roomState?.hostId === roomState?.players.find(p => !p.isNpc)?.id;

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

    // 変態プレイヤーと変態カードを取得
    const culpritPlayer = gameState.players.find(p => p.hand.some(c => c.type === 'culprit'));
    const culpritCard = culpritPlayer?.hand.find(c => c.type === 'culprit');
    // 変態カードのデンジャーワードを使用、なければgameStateのdangerWordを使用
    const dangerWord = culpritCard?.assignedDangerWord || gameState.dangerWord || '';
    const culpritDisplayName = dangerWord ? `${dangerWord}変態` : '変態';

    // MVP（メイン勝者）を取得
    const mvpResult = victoryInfo?.playerResults?.find(r => r.isMVP);
    const mvpPlayer = mvpResult ? gameState.players.find(p => p.id === mvpResult.playerId) : null;

    // 勝者・敗者リストの生成
    const resultList = victoryInfo?.playerResults || [];

    // 結果データとプレイヤーデータを結合
    const combinedResults = resultList.map(result => {
        const player = gameState.players.find(p => p.id === result.playerId);
        return { result, player };
    }).filter((item): item is { result: typeof resultList[0], player: Player } => !!item.player);

    // victoryInfoがない場合（後方互換）のフォールバック
    if (combinedResults.length === 0) {
        gameState.players.forEach(player => {
            const isWinner = (isCriminalWin && player.team === 'CRIMINAL') || (!isCriminalWin && player.team === 'CITIZEN');
            combinedResults.push({
                player,
                result: {
                    playerId: player.id,
                    playerName: player.name,
                    team: player.team,
                    isWinner,
                    isMVP: false,
                    isAccompliceWinner: false,
                    usedPlotCard: false,
                    // 互換性のため古いレベルを使用
                    oldHentaiLevel: player.hentaiLevel,
                    newHentaiLevel: player.hentaiLevel
                }
            });
        });
    }

    const winners = combinedResults.filter(item => item.result.isWinner);
    const losers = combinedResults.filter(item => !item.result.isWinner);
    const isNoWinner = winners.length === 0;

    // 勝利タイプに応じたメッセージを取得
    const getVictoryMessage = () => {
        if (isNoWinner) {
            return `${culpritDisplayName}を見抜きましたが、異常性癖者だったためまとめて逮捕しました`;
        }
        if (!victoryInfo) {
            return isCriminalWin ? `${culpritDisplayName}が最後まで生き残りました！` : `${culpritDisplayName}を捕まえました！`;
        }
        switch (victoryInfo.victoryType) {
            case 'DETECTIVE':
                return `警察が${culpritDisplayName}を見抜きました！`;
            case 'DOG':
                return `通報カードで${culpritDisplayName}を発見しました！`;
            case 'CULPRIT_ESCAPE':
                return `${culpritDisplayName}が最後までカードを出し切りました！`;
            default:
                return isCriminalWin ? `${culpritDisplayName}が最後まで生き残りました！` : `${culpritDisplayName}を捕まえました！`;
        }
    };

    // プレイヤーカードのレンダリング関数
    const renderPlayerCard = (item: { result: any, player: Player }, isWinner: boolean) => {
        const { result, player } = item;
        const levelDiff = (result.newHentaiLevel ?? 0) - (result.oldHentaiLevel ?? 0);

        // 変態度表示: 敗北した変態で強制レベル3の場合は「UP(3)」と表示
        const isCulpritLoser = !isWinner && player.team === 'CRIMINAL';
        const newLevel = result.newHentaiLevel ?? player.hentaiLevel ?? 0;
        const isForced3 = isCulpritLoser && newLevel === 3 && (result.oldHentaiLevel ?? 0) < 3;

        return (
            <div
                key={player.id}
                className={`flex flex-col p-3 rounded-lg border relative ${isWinner ? 'bg-yellow-500/10' : 'bg-gray-500/10 opacity-80'
                    }`}
                style={{ borderColor: player.color || (isWinner ? 'rgba(234, 179, 8, 0.3)' : 'rgba(107, 114, 128, 0.3)') }}
            >
                <div className="flex items-center gap-2 mb-2">
                    {player.isNpc ? (
                        <Bot className="w-5 h-5 text-blue-400" />
                    ) : (
                        <User className="w-5 h-5 text-purple-400" />
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">
                            {player.name}
                        </div>
                        {/* 称号表示 */}
                        <div className="font-medium text-xs flex items-center gap-2 flex-wrap">
                            {player.currentPrefix && (
                                <span className={player.isCursed ? 'text-red-400' : 'text-gray-400'}>
                                    {player.currentPrefix}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* MVP バッジ */}
                    {result.isMVP && (
                        <span className="px-1.5 py-0.5 text-xs bg-yellow-500/30 text-yellow-300 rounded font-bold whitespace-nowrap">
                            MVP
                        </span>
                    )}
                </div>

                {/* 変態度ゲージ & 変動 */}
                <div className="flex items-center justify-between bg-black/20 rounded p-1 mb-2">
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">変態度:</span>
                        <HentaiGauge level={newLevel} />
                    </div>
                    {/* 変態度変動表示 */}
                    {isForced3 ? (
                        // 強制レベル3（敗北した変態）
                        <span className="text-xs font-bold text-orange-400">
                            UP (3)
                        </span>
                    ) : levelDiff !== 0 ? (
                        <span className={`text-xs font-bold ${levelDiff > 0 ? 'text-orange-400' : 'text-blue-400'}`}>
                            {levelDiff > 0 ? `UP (+${levelDiff})` : `DOWN (${levelDiff})`}
                        </span>
                    ) : null}
                </div>

                {/* 新しい名前（次回予告） */}
                {result.newDisplayName && result.newDisplayName !== (player.currentPrefix ? player.currentPrefix + player.name : player.name) && (
                    <div className="text-xs text-pink-300 mt-1 animate-pulse">
                        Next: {result.newDisplayName}
                    </div>
                )}

                <div className="text-xs text-gray-500 mt-1">
                    {(() => {
                        // 変態かどうかを判定
                        // - 手札に変態カードを持っている
                        // - teamがCRIMINAL
                        // - 変態チーム勝利時のMVP（変態カードを出して勝利した）
                        const hasCulpritCard = item.player.hand.some(c => c.type === 'culprit');
                        const isCulpritMVP = isCriminalWin && result.isMVP && victoryInfo?.victoryType === 'CULPRIT_ESCAPE';
                        const isCulpritPlayer = hasCulpritCard || isCulpritMVP || item.player.team === 'CRIMINAL';

                        if (isCulpritPlayer) {
                            // 変態本人かどうか
                            const isCulprit = hasCulpritCard || isCulpritMVP;
                            return (
                                <span className="text-red-400 flex items-center gap-1">
                                    <Skull className="w-3 h-3" />
                                    {isCulprit
                                        ? '変態'
                                        : result.usedPlotCard
                                            ? '異常性癖者'
                                            : '共犯者'}
                                </span>
                            );
                        } else {
                            return mvpPlayer?.id === item.player.id && (
                                <span className="text-cyan-400 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    {victoryInfo?.victoryType === 'DETECTIVE' && '逮捕で勝利'}
                                    {victoryInfo?.victoryType === 'DOG' && '通報で勝利'}
                                </span>
                            );
                        }
                    })()}
                </div>
            </div>
        );
    };

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
                        {isNoWinner ? '勝利？' : (isCriminalWin ? '変態の勝利！' : '警察の勝利！')}
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
                        {winners.map(item => renderPlayerCard(item, true))}
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
                            {losers.map(item => renderPlayerCard(item, false))}
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
                    {/* オンラインの場合、ホスト以外には待機メッセージを表示 */}
                    {isOnline && !isRoomMaster && (
                        <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10 animate-pulse">
                            <p className="text-gray-300">ホストの操作を待っています...</p>
                        </div>
                    )}

                    {/* ホストまたはローカルの場合のみ操作可能 */}
                    {(!isOnline || isRoomMaster) && (
                        <>
                            <button
                                onClick={handlePlayAgain}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-5 h-5" />
                                もう一度遊ぶ
                            </button>

                            <button
                                onClick={handleBackToLobby}
                                className="btn-secondary w-full flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-5 h-5" />
                                ロビーに戻る
                            </button>
                        </>
                    )}

                    {isRoomMaster && (
                        <button
                            onClick={handleRegisterHallOfFame}
                            disabled={isRegistered}
                            className={`w-full flex items-center justify-center gap-2 ${isRegistered
                                ? 'btn-secondary opacity-50 cursor-not-allowed'
                                : 'btn-secondary hover:bg-yellow-500/20 border-yellow-500/50'
                                }`}
                        >
                            <Trophy className="w-5 h-5" />
                            {isRegistered ? '殿堂入りに登録済み' : '殿堂入りに登録'}
                        </button>
                    )}

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
