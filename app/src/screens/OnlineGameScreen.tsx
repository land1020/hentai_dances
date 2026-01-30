// ====================================
// オンラインゲーム画面: 変態は踊る
// ====================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    User,
    Bot,
    Wifi
} from 'lucide-react';
import HentaiGauge from '../components/HentaiGauge';
import { CARD_DEFINITIONS } from '../data/cards';
import type { GameState, Card } from '../types';
import { GamePhase } from '../types';
import { useOnlineRoom, getOrCreateUserId } from '../hooks/useOnlineRoom';
import {
    playCard,
    canPlayCard,
    selectTarget,
    completeArrestAnimation,
    completeCulpritVictoryAnimation
} from '../engine/GameEngine';
import ArrestAnimationOverlay from '../components/ArrestAnimationOverlay';
import CulpritVictoryAnimationOverlay from '../components/CulpritVictoryAnimationOverlay';

/**
 * オンラインゲーム画面
 * Firestoreと同期しながらゲームを進行
 */
export default function OnlineGameScreen() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const userId = getOrCreateUserId();

    const { room, isLoading, error, syncGameState } = useOnlineRoom(roomId || null);

    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [_showCulpritInfo, _setShowCulpritInfo] = useState(false);
    const [_showWitnessInfo, _setShowWitnessInfo] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [_detailedCardInfo, _setDetailedCardInfo] = useState<{ card: Card, isPlayable: boolean } | null>(null);

    // ゲーム状態
    const gameState = room?.gameState || null;

    // 自分のプレイヤー情報
    const myPlayer = useMemo(() => {
        if (!gameState) return null;
        return gameState.players.find(p => p.id === userId) || null;
    }, [gameState, userId]);

    // ホストかどうか
    const isHost = room?.hostId === userId;

    // ゲーム状態を更新する関数（ホストのみ）
    const updateGameState = useCallback(async (newState: GameState) => {
        // ホストのみが状態を更新
        if (isHost) {
            await syncGameState(newState);
        }
    }, [isHost, syncGameState]);

    // ゲーム終了時にリザルト画面へ遷移
    useEffect(() => {
        if (gameState?.winner) {
            navigate(`/result/${roomId}`);
        }
    }, [gameState?.winner, roomId, navigate]);

    // NPCの自動行動（ホストのみ実行）
    useEffect(() => {
        if (!gameState || !isHost) return;
        if (gameState.phase !== GamePhase.WAITING_FOR_PLAY) return;

        const activePlayer = gameState.players[gameState.activePlayerIndex];
        if (!activePlayer?.isNpc) return;

        // NPCの思考時間
        const timer = setTimeout(async () => {
            const playableCards = activePlayer.hand.filter(card =>
                canPlayCard(gameState, activePlayer, card)
            );

            if (playableCards.length > 0) {
                const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
                const newState = playCard(gameState, activePlayer.id, randomCard.id);
                await updateGameState(newState);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [gameState, isHost, updateGameState]);

    // カードをプレイ
    const handlePlayCard = useCallback(async (cardId: string) => {
        if (!gameState || !myPlayer) return;

        const card = myPlayer.hand.find(c => c.id === cardId);
        if (!card) return;

        if (!canPlayCard(gameState, myPlayer, card)) {
            setMessage('このカードは今出せません');
            return;
        }

        const newState = playCard(gameState, myPlayer.id, cardId);
        await updateGameState(newState);
        setSelectedCardId(null);
    }, [gameState, myPlayer, updateGameState]);

    // ターゲット選択
    const handleSelectTarget = useCallback(async (targetId: string) => {
        if (!gameState) return;

        const newState = selectTarget(gameState, targetId);
        await updateGameState(newState);
    }, [gameState, updateGameState]);

    // ローディング中
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">接続中...</div>
            </div>
        );
    }

    // エラー
    if (error || !room || !gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-xl text-red-400 mb-4">{error || 'ゲームデータがありません'}</div>
                    <button onClick={() => navigate('/')} className="btn-primary">
                        トップに戻る
                    </button>
                </div>
            </div>
        );
    }

    const activePlayer = gameState.players[gameState.activePlayerIndex];
    const isMyTurn = activePlayer?.id === userId;

    return (
        <div className="min-h-screen p-2 relative">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-2 px-2">
                <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-400">オンライン</span>
                </div>
                <div className="text-center">
                    <div className="text-xs text-gray-500">ターン {gameState.turnCount}</div>
                    <div className="text-sm font-bold">
                        {activePlayer?.name}のターン
                        {isMyTurn && <span className="text-green-400 ml-2">(あなた)</span>}
                    </div>
                </div>
                <div className="text-xs text-gray-500">
                    {roomId}
                </div>
            </div>

            {/* メッセージ */}
            {message && (
                <div className="text-center text-yellow-400 text-sm mb-2">{message}</div>
            )}

            {/* プレイヤーエリア */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                {gameState.players.map((player, _index) => (
                    <div
                        key={player.id}
                        className={`p-3 rounded-lg ${player.id === activePlayer?.id
                            ? 'bg-yellow-500/20 border-2 border-yellow-500'
                            : player.id === userId
                                ? 'bg-green-500/10 border border-green-500/30'
                                : 'bg-white/5 border border-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            {player.isNpc ? (
                                <Bot className="w-4 h-4 text-blue-400" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                            <span className="font-bold text-sm truncate">
                                {player.name}
                                {player.id === userId && <span className="text-green-400 text-xs ml-1">(自分)</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <HentaiGauge level={player.hentaiLevel || 0} />
                            <span className="text-xs text-gray-400">
                                手札: {player.hand.length}枚
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 自分の手札 */}
            {myPlayer && (
                <div className="card-base p-4">
                    <h3 className="text-sm font-bold mb-2 text-gray-400">あなたの手札</h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {myPlayer.hand.map(card => {
                            const definition = CARD_DEFINITIONS[card.type];
                            const isPlayable = isMyTurn && canPlayCard(gameState, myPlayer, card);
                            const isSelected = selectedCardId === card.id;

                            return (
                                <motion.div
                                    key={card.id}
                                    onClick={() => {
                                        if (isPlayable) {
                                            if (isSelected) {
                                                handlePlayCard(card.id);
                                            } else {
                                                setSelectedCardId(card.id);
                                            }
                                        }
                                    }}
                                    className={`
                                        w-20 h-28 rounded-lg cursor-pointer transition-all
                                        bg-gradient-to-br from-purple-600 to-pink-600
                                        border-2 ${isSelected ? 'border-yellow-400 scale-110' : 'border-white/20'}
                                        ${!isPlayable ? 'opacity-50 grayscale' : 'hover:scale-105'}
                                        p-2 flex flex-col items-center justify-center
                                    `}
                                    whileHover={isPlayable ? { y: -5 } : {}}
                                >
                                    {definition.icon && (
                                        <img src={definition.icon} className="w-10 h-10 object-contain mb-1" />
                                    )}
                                    <div className="text-[10px] text-center font-bold">{definition.name}</div>
                                </motion.div>
                            );
                        })}
                    </div>
                    {isMyTurn && selectedCardId && (
                        <div className="text-center mt-3">
                            <button
                                onClick={() => handlePlayCard(selectedCardId)}
                                className="btn-primary px-6 py-2"
                            >
                                カードを出す
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ターゲット選択モード */}
            {gameState.phase === GamePhase.SELECTING_TARGET && isMyTurn && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="card-base p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold mb-4 text-center">ターゲットを選択</h3>
                        <div className="space-y-2">
                            {gameState.players
                                .filter(p => p.id !== userId && p.isAlive)
                                .map(player => (
                                    <button
                                        key={player.id}
                                        onClick={() => handleSelectTarget(player.id)}
                                        className="w-full p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-left"
                                    >
                                        {player.name}
                                    </button>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* 逮捕アニメーション */}
            <ArrestAnimationOverlay
                animationInfo={gameState.arrestAnimationInfo}
                players={gameState.players}
                onComplete={async () => {
                    const newState = completeArrestAnimation(gameState);
                    await updateGameState(newState);
                }}
            />

            {/* 変態勝利アニメーション */}
            <CulpritVictoryAnimationOverlay
                animationInfo={gameState.culpritVictoryAnimationInfo}
                players={gameState.players}
                onComplete={async () => {
                    const newState = completeCulpritVictoryAnimation(gameState);
                    await updateGameState(newState);
                }}
            />
        </div>
    );
}
