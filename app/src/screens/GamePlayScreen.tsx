// ====================================
// ゲームプレイ画面: 変態は踊る
// ====================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    User,
    Bot,
    Crown,
    Eye,
    Play,
    AlertCircle,
    X
} from 'lucide-react';
import type { GameState, Player, Card, CardType } from '../types';
import { GamePhase } from '../types';
import {
    loadRoomState,
    saveRoomState,
    type LocalRoomState
} from '../store/gameStore';
import { initializeGame, advancePhase, playCard, canPlayCard, selectTarget, getCulpritPlayer, selectCard } from '../engine/GameEngine';
import { CARD_DEFINITIONS } from '../data/cards';

// カードコンポーネント
function GameCard({
    card,
    isSelected,
    isPlayable,
    isRevealed = true,
    onClick
}: {
    card: Card;
    isSelected: boolean;
    isPlayable: boolean;
    isRevealed?: boolean;
    onClick?: () => void;
}) {
    const definition = CARD_DEFINITIONS[card.type];

    return (
        <motion.div
            onClick={isPlayable ? onClick : undefined}
            className={`
        relative w-20 h-28 rounded-lg cursor-pointer transition-all
        ${isRevealed
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600'
                    : 'bg-gradient-to-br from-gray-700 to-gray-800'}
        ${isSelected ? 'ring-4 ring-yellow-400 scale-110 -translate-y-2' : ''}
        ${!isPlayable ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105'}
      `}
            whileHover={isPlayable ? { y: -5 } : {}}
            whileTap={isPlayable ? { scale: 0.95 } : {}}
        >
            {isRevealed ? (
                <div className="p-2 h-full flex flex-col justify-between text-xs">
                    <div className="font-bold text-center leading-tight">{definition.name}</div>
                    <div className="text-[8px] text-white/70 text-center leading-tight line-clamp-3">
                        {definition.description}
                    </div>
                </div>
            ) : (
                <div className="h-full flex items-center justify-center">
                    <div className="text-2xl">🎴</div>
                </div>
            )}

            {!isPlayable && isRevealed && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <X className="w-8 h-8 text-red-400" />
                </div>
            )}
        </motion.div>
    );
}

// プレイヤー座席コンポーネント（リニューアル）
function PlayerMat({
    player,
    isActive,
    isTargetable,
    playedCards,
    onClick,
    position,
    onCardClick
}: {
    player: Player;
    isActive: boolean;
    isTargetable: boolean;
    playedCards?: { type: CardType, turn: number }[];
    onClick?: () => void;
    position: 'bottom' | 'left' | 'right' | 'top';
    onCardClick?: (cardType: CardType) => void;
}) {
    // 位置に応じたクラス
    const containerClasses = {
        bottom: 'w-full max-w-md mx-auto hidden', // 自分は別コンポーネントで表示
        left: 'w-[280px]',
        right: 'w-[280px]',
        top: 'w-[280px]'
    };

    if (position === 'bottom') return null;

    const cards = playedCards || [];

    return (
        <motion.div
            className={`
                relative rounded-xl overflow-hidden shadow-lg border-2 transition-all
                ${containerClasses[position]}
                ${isTargetable ? 'cursor-pointer ring-4 ring-green-400 z-50' : 'border-white/10'}
                ${isActive ? 'ring-4 ring-yellow-400 z-40' : ''}
            `}
            style={{
                backgroundColor: player.color || '#6B7280',
                borderColor: player.color || '#6B7280'
            }}
            onClick={isTargetable ? onClick : undefined}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            {/* ヘッダー: 性癖と名前 */}
            <div
                className="px-3 py-1.5 flex items-center justify-between text-white shadow-sm border-b border-white/20"
                style={{ backgroundColor: player.color || '#6B7280' }}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex items-center gap-1 font-bold text-sm truncate flex-1">
                        <span className="opacity-80 text-xs">性癖:</span>
                        <span className="bg-black/20 px-1.5 py-0.5 rounded text-xs">
                            「{player.currentPrefix || '???'}」
                        </span>
                        <span className="truncate">{player.name}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {player.isNpc ? <Bot className="w-3.5 h-3.5 opacity-70" /> : <User className="w-3.5 h-3.5 opacity-70" />}
                    {isActive && <Crown className="w-4 h-4 text-yellow-300 animate-bounce" />}
                </div>
            </div>

            {/* ボディエリア */}
            <div className="p-3 flex flex-col gap-3 relative bg-black/10">

                {/* プレイエリア（使用済カード - 最大4枚まで表示） */}
                <div className="h-28 bg-black/20 rounded-lg relative flex items-center p-2 border border-white/5 overflow-x-auto">
                    <span className="absolute top-1 left-2 text-[10px] text-white/20 font-bold pointer-events-none">
                        プレイエリア
                    </span>

                    <div className="flex gap-1 items-center justify-start pl-1">
                        <AnimatePresence>
                            {cards.length > 0 ? (
                                cards.map((cardInfo, idx) => (
                                    <motion.div
                                        key={`played-${idx}-${cardInfo.type}-${cardInfo.turn}`}
                                        initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        className="relative cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCardClick && onCardClick(cardInfo.type);
                                        }}
                                    >
                                        {/* カード本体 */}
                                        <div className="w-14 h-20 rounded bg-gradient-to-br from-white to-gray-200 shadow-md p-1 flex items-center justify-center border border-gray-300">
                                            <div className="text-[9px] font-bold text-gray-900 text-center leading-tight line-clamp-2">
                                                {CARD_DEFINITIONS[cardInfo.type].name}
                                            </div>
                                        </div>

                                        {/* ターンバッジ */}
                                        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gray-700 border-2 border-white flex items-center justify-center shadow-md z-10">
                                            <span className="text-[10px] font-bold text-white">{cardInfo.turn}</span>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="w-full text-center text-white/10 text-xs">
                                    No Card
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 手札エリア（下部） */}
                <div className="relative h-10 w-full flex items-end justify-center">
                    <div className="flex justify-center -space-x-3 absolute bottom-0">
                        {player.hand.map((_, i) => (
                            <div
                                key={i}
                                className="w-8 h-12 rounded bg-gradient-to-br from-indigo-900 to-slate-800 border border-white/20 shadow-md transform hover:-translate-y-1 transition-transform"
                                style={{
                                    transform: `rotate(${(i - (player.hand.length - 1) / 2) * 8}deg)`,
                                    zIndex: i
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* 手札枚数バッジ */}
                <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white/70 border border-white/10">
                    {player.hand.length}枚
                </div>
            </div>
        </motion.div>
    );
}

export default function GamePlayScreen() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [roomState, setRoomState] = useState<LocalRoomState | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [showCulpritInfo, setShowCulpritInfo] = useState(false);
    const [showWitnessInfo, setShowWitnessInfo] = useState<string | null>(null); // 目撃者で見た相手のID
    const [message, setMessage] = useState('');
    const [lastPlayedCards, setLastPlayedCards] = useState<Record<string, { type: CardType, turn: number }[]>>({});





    // 初期化
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

        // ゲームを初期化
        if (state.status === 'PLAYING' && !state.gameState) {
            const newGameState = initializeGame(state.players);
            setGameState(newGameState);

            // 保存
            const updatedRoom = { ...state, gameState: newGameState };
            saveRoomState(updatedRoom);
            setRoomState(updatedRoom);
        } else if (state.gameState) {
            setGameState(state.gameState);
        }
    }, [roomId, navigate]);

    // ゲーム状態が変わったら保存
    useEffect(() => {
        if (roomState && gameState) {
            const updatedRoom = { ...roomState, gameState };
            saveRoomState(updatedRoom);
        }
    }, [gameState]);

    // フェーズを自動で進める
    useEffect(() => {
        if (!gameState) return;

        if (gameState.phase === GamePhase.SETUP) {
            // セットアップ完了後、少し待ってからターン開始
            const timer = setTimeout(() => {
                setGameState(advancePhase(gameState));
                setMessage('ゲーム開始！変態目撃者を持っている人からスタート！');
            }, 1000);
            return () => clearTimeout(timer);
        }

        if (gameState.phase === GamePhase.TURN_START) {
            // TURN_STARTでのメッセージ設定は削除（前のメッセージを残すため）
            // const activePlayer = gameState.players[gameState.activePlayerIndex];
            // setMessage(`${activePlayer.name}のターン`);

            const timer = setTimeout(() => {
                setGameState(advancePhase(gameState));
            }, 1000);
            return () => clearTimeout(timer);
        }

        if (gameState.phase === GamePhase.RESOLVING_EFFECT) {
            // 効果解決後、次のターンへ
            const timer = setTimeout(() => {
                setGameState(advancePhase(gameState));
            }, 1500);
            return () => clearTimeout(timer);
        }

        if (gameState.phase === GamePhase.TURN_END) {
            const timer = setTimeout(() => {
                setGameState(advancePhase(gameState));
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [gameState?.phase]);

    // NPC自動行動
    useEffect(() => {
        if (!gameState || gameState.phase !== GamePhase.WAITING_FOR_PLAY) return;

        const activePlayer = gameState.players[gameState.activePlayerIndex];
        if (!activePlayer.isNpc) return;

        // NPCの思考時間
        const timer = setTimeout(() => {
            // プレイ可能なカードを選択
            const playableCards = activePlayer.hand.filter(card =>
                canPlayCard(gameState, activePlayer, card)
            );

            if (playableCards.length > 0) {
                const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
                const newState = playCard(gameState, activePlayer.id, randomCard.id);
                setGameState(newState);
                setMessage(`${activePlayer.name}が${CARD_DEFINITIONS[randomCard.type].name}を出しました！`);
                // 提出カードを記録
                setLastPlayedCards(prev => {
                    const existingCards = prev[activePlayer.id] || [];
                    const newCards = [...existingCards, { type: randomCard.type, turn: gameState.roundNumber }].slice(-4);
                    return { ...prev, [activePlayer.id]: newCards };
                });
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [gameState?.phase, gameState?.activePlayerIndex]);

    // NPC対象選択
    useEffect(() => {
        if (!gameState || gameState.phase !== GamePhase.SELECTING_TARGET) return;
        if (!gameState.pendingAction) return;

        const sourcePlayer = gameState.players.find(p => p.id === gameState.pendingAction!.playerId);
        if (!sourcePlayer?.isNpc) return;

        // NPCがランダムに対象を選択
        const timer = setTimeout(() => {
            const targetablePlayers = gameState.players.filter(p =>
                p.id !== sourcePlayer.id && p.isAlive
            );

            if (targetablePlayers.length > 0) {
                const randomTarget = targetablePlayers[Math.floor(Math.random() * targetablePlayers.length)];
                const newState = selectTarget(gameState, randomTarget.id);
                setGameState(newState);
                setMessage(`${sourcePlayer.name}が${randomTarget.name}を選びました`);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [gameState?.phase, gameState?.pendingAction?.playerId, gameState?.pendingAction?.cardType]);

    // NPCカード選択（正常者用）
    useEffect(() => {
        if (!gameState || gameState.phase !== GamePhase.SELECTING_CARD) return;
        if (!gameState.pendingAction) return;

        const sourcePlayer = gameState.players.find(p => p.id === gameState.pendingAction!.playerId);
        if (!sourcePlayer?.isNpc) return;

        // NPCがランダムにカードを選択
        const timer = setTimeout(() => {
            const targetId = gameState.pendingAction!.targetIds![0];
            const targetPlayer = gameState.players.find(p => p.id === targetId);

            if (targetPlayer && targetPlayer.hand.length > 0) {
                const randomCard = targetPlayer.hand[Math.floor(Math.random() * targetPlayer.hand.length)];
                const newState = selectCard(gameState, randomCard.id);
                setGameState(newState);
                setMessage(`${sourcePlayer.name}がカードを選びました`);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [gameState?.phase, gameState?.pendingAction?.playerId, gameState?.pendingAction?.targetIds]);

    // 現在の自分のプレイヤー情報
    const myPlayer = useMemo(() => {
        if (!gameState) return null;
        // ローカルモードでは最初の非NPCプレイヤーをコントロール
        return gameState.players.find(p => !p.isNpc) || gameState.players[0];
    }, [gameState]);

    // 自分のターンかどうか
    const isMyTurn = useMemo(() => {
        if (!gameState || !myPlayer) return false;
        return gameState.players[gameState.activePlayerIndex].id === myPlayer.id;
    }, [gameState, myPlayer]);

    // カードをプレイ
    const handlePlayCard = () => {
        if (!gameState || !myPlayer || !selectedCardId) return;
        if (gameState.phase !== GamePhase.WAITING_FOR_PLAY) return;

        const card = myPlayer.hand.find(c => c.id === selectedCardId);
        if (!card || !canPlayCard(gameState, myPlayer, card)) return;

        const newState = playCard(gameState, myPlayer.id, selectedCardId);
        setGameState(newState);
        setSelectedCardId(null);
        setMessage(`${CARD_DEFINITIONS[card.type].name}を出しました！`);

        setLastPlayedCards(prev => {
            const existingCards = prev[myPlayer.id] || [];
            const newCards = [...existingCards, { type: card.type, turn: gameState.roundNumber }].slice(-4);
            return { ...prev, [myPlayer.id]: newCards };
        });

        // 少年カードの場合は変態を表示
        if (card.type === 'boy') {
            setShowCulpritInfo(true);
        }
    };

    // カードを選択（正常者用）
    const handleSelectCard = (cardId: string) => {
        if (!gameState || gameState.phase !== GamePhase.SELECTING_CARD) return;

        const newState = selectCard(gameState, cardId);
        setGameState(newState);
    };

    // システムメッセージ検知
    useEffect(() => {
        if (gameState?.systemMessage) {
            setMessage(gameState.systemMessage);

            // メッセージを表示した後、フェーズを進める
            const timer = setTimeout(() => {
                if (gameState.phase === GamePhase.RESOLVING_EFFECT) {
                    const newState = advancePhase(gameState);
                    setGameState(newState);
                }
            }, 2000);

            // メッセージは一定時間（4秒）表示した後に消す
            const clearTimer = setTimeout(() => {
                setMessage(prev => prev === gameState.systemMessage ? '' : prev);
            }, 4000);

            return () => {
                clearTimeout(timer);
                clearTimeout(clearTimer);
            };
        }
    }, [gameState?.systemMessage, gameState?.phase]);

    // 対象を選択
    const handleSelectTarget = (targetId: string) => {
        if (!gameState || gameState.phase !== GamePhase.SELECTING_TARGET) return;

        // 目撃者カードの場合は手札表示
        if (gameState.pendingAction?.cardType === 'witness') {
            setShowWitnessInfo(targetId);
        }

        const newState = selectTarget(gameState, targetId);
        setGameState(newState);
    };

    // リザルトへ
    const handleGoToResult = () => {
        if (roomState && gameState) {
            const updatedRoom = {
                ...roomState,
                status: 'FINISHED' as const,
                gameState
            };
            saveRoomState(updatedRoom);
        }
        navigate(`/result/${roomId}`);
    };

    // ロビーへ戻る
    const handleBackToLobby = () => {
        navigate(`/lobby/${roomId}`);
    };

    if (!gameState || !myPlayer) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">読み込み中...</div>
            </div>
        );
    }

    const activePlayer = gameState.players[gameState.activePlayerIndex];

    // 対象選択モード: pendingActionのプレイヤーが対象を選択する必要がある
    const pendingPlayer = gameState.pendingAction
        ? gameState.players.find(p => p.id === gameState.pendingAction!.playerId)
        : null;
    const isSelectingTarget = gameState.phase === GamePhase.SELECTING_TARGET &&
        pendingPlayer && !pendingPlayer.isNpc;

    const culpritPlayer = getCulpritPlayer(gameState);

    const myIndex = gameState.players.findIndex(p => p.id === myPlayer.id);
    const playerCount = gameState.players.length;

    // 相対位置を取得 (左回り: 自分 -> 次の人(左側) -> ... -> 最後の人(右側))
    const getRelativePosition = (index: number) => {
        const diff = (index - myIndex + playerCount) % playerCount;
        if (diff === 0) return 'bottom';

        // 4人プレイの場合: 自分(bottom) -> 次(left) -> 対面(top) -> 前(right)
        // 3人プレイの場合: 自分(bottom) -> 次(left) -> 前(right)
        if (diff === 1) return 'left';
        if (diff === playerCount - 1) return 'right';
        return 'top';
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col overflow-hidden font-sans select-none">
            {/* バックグラウンド（装飾） */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 to-gray-950 -z-10" />

            {/* ヘッダー（左上） */}
            <div className="absolute top-4 left-4 z-50 flex gap-2">
                <button
                    onClick={handleBackToLobby}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                    <span className="text-sm font-bold text-gray-300">ターン: {gameState.roundNumber}</span>
                </div>
            </div>

            {/* メインゲームエリア: 3行構造 (上部プレイヤー / 中央エリア / 操作プレイヤー) */}

            {/* 上部: TOPプレイヤー */}
            <div className="flex-shrink-0 pt-16 pb-2 px-4 flex justify-center gap-4">
                {gameState.players.map((p, i) => {
                    if (getRelativePosition(i) === 'top') {
                        return (
                            <PlayerMat
                                key={p.id}
                                player={p}
                                isActive={i === gameState.activePlayerIndex}
                                isTargetable={!!(isSelectingTarget && p.isAlive)}
                                playedCards={lastPlayedCards[p.id]}
                                onClick={() => handleSelectTarget(p.id)}
                                position='top'
                            />
                        );
                    }
                    return null;
                })}
            </div>

            {/* 中央: 左プレイヤー / メイン画面 / 右プレイヤー */}
            <div className="flex-1 flex items-stretch px-2 gap-2 min-h-0">

                {/* 左側プレイヤー（次のプレイヤー） */}
                <div className="w-[280px] flex-shrink-0 flex items-center justify-center">
                    {gameState.players.map((p, i) => {
                        if (getRelativePosition(i) === 'left') {
                            return (
                                <PlayerMat
                                    key={p.id}
                                    player={p}
                                    isActive={i === gameState.activePlayerIndex}
                                    isTargetable={!!(isSelectingTarget && p.isAlive)}
                                    playedCards={lastPlayedCards[p.id]}
                                    onClick={() => handleSelectTarget(p.id)}
                                    position='left'
                                />
                            );
                        }
                        return null;
                    })}
                </div>

                {/* メイン画面（中央） */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-md aspect-[16/10] bg-yellow-400 rounded-2xl shadow-[0_0_40px_rgba(250,204,21,0.3)] flex flex-col items-center justify-center p-4 border-b-8 border-yellow-500 relative overflow-hidden">
                        {/* 背景パターン */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] [background-size:20px_20px]" />

                        <div className="relative z-10 text-center space-y-2">
                            <div className="inline-block bg-black/10 px-3 py-0.5 rounded-full text-yellow-900/70 font-bold text-xs">
                                メイン画面
                            </div>

                            <div className="text-2xl md:text-3xl font-black text-gray-900 tracking-wider">
                                {gameState.phase === GamePhase.WAITING_FOR_PLAY
                                    ? (activePlayer.id === myPlayer.id ? 'あなたの番です' : `${activePlayer.name}の番です`)
                                    : '処理中...'}
                            </div>

                            <AnimatePresence mode='wait'>
                                <motion.div
                                    key={message}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-base text-gray-800 font-bold"
                                >
                                    {message}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* 右側プレイヤー（最後のプレイヤー） */}
                <div className="w-[280px] flex-shrink-0 flex items-center justify-center">
                    {gameState.players.map((p, i) => {
                        if (getRelativePosition(i) === 'right') {
                            return (
                                <PlayerMat
                                    key={p.id}
                                    player={p}
                                    isActive={i === gameState.activePlayerIndex}
                                    isTargetable={!!(isSelectingTarget && p.isAlive)}
                                    playedCards={lastPlayedCards[p.id]}
                                    onClick={() => handleSelectTarget(p.id)}
                                    position='right'
                                />
                            );
                        }
                        return null;
                    })}
                </div>
            </div>

            {/* 自分（下部固定） */}{/* MyPlayerMatをPlayerMatのデザインに合わせるが、操作性を維持 */}
            <div className="relative z-30 pb-4 px-4 flex justify-center">
                <motion.div
                    className={`
                        relative rounded-xl overflow-visible shadow-2xl border-4 transition-all w-full max-w-2xl
                        ${isMyTurn && gameState.phase === GamePhase.WAITING_FOR_PLAY ? '' : ''}
                    `}
                    style={{
                        backgroundColor: myPlayer.color || '#6B7280',
                        borderColor: isMyTurn && gameState.phase === GamePhase.WAITING_FOR_PLAY ? (myPlayer.color || '#FBBF24') : (myPlayer.color || '#6B7280'),
                        boxShadow: isMyTurn && gameState.phase === GamePhase.WAITING_FOR_PLAY ? `0 0 20px ${myPlayer.color || '#FBBF24'}` : 'none'
                    }}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    {/* 自分の番アラート（吹き出し風） - 完全に見える位置へ調整 */}
                    {isMyTurn && gameState.phase === GamePhase.WAITING_FOR_PLAY && (
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-max z-50">
                            <div className="bg-yellow-400 text-black px-8 py-2 rounded-full font-black text-xl shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-bounce border-4 border-white">
                                あなたの番です！
                                <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-yellow-400" />
                            </div>
                        </div>
                    )}

                    {/* ヘッダー */}
                    <div className="px-4 py-2 flex items-center justify-between text-white shadow-sm border-b border-white/20">
                        <div className="flex items-center gap-3 overflow-hidden w-full">
                            <User className="w-6 h-6 opacity-90" />
                            <div className="flex items-center gap-2 font-bold text-lg truncate flex-1">
                                <span className="opacity-80 text-sm">性癖:</span>
                                <span className="bg-black/20 px-3 py-0.5 rounded text-base">
                                    「{myPlayer.currentPrefix || '???'}」
                                </span>
                                <span className="truncate text-xl">{myPlayer.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* ボディエリア */}
                    <div className="p-4 flex flex-col gap-4 relative bg-black/10">

                        {/* プレイエリア（自分の使用済カード - 最大4枚まで表示） - 上部配置 */}
                        <div className="h-24 w-full bg-black/20 rounded-lg relative flex items-center p-2 border border-white/5 mx-auto overflow-x-auto">
                            <span className="absolute top-1 left-2 text-[10px] text-white/40 font-bold pointer-events-none">
                                プレイエリア
                            </span>

                            <div className="flex gap-2 items-center justify-start pl-1">
                                <AnimatePresence>
                                    {(lastPlayedCards[myPlayer.id] && lastPlayedCards[myPlayer.id].length > 0) ? (
                                        lastPlayedCards[myPlayer.id].map((cardInfo, idx) => (
                                            <motion.div
                                                key={`my-played-${idx}-${cardInfo.type}-${cardInfo.turn}`}
                                                initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.5 }}
                                                className="relative flex-shrink-0"
                                            >
                                                <div className="w-14 h-18 rounded bg-gradient-to-br from-white to-gray-200 shadow-xl p-1 flex items-center justify-center border border-gray-300">
                                                    <div className="text-[9px] font-bold text-gray-900 text-center leading-tight">
                                                        {CARD_DEFINITIONS[cardInfo.type].name}
                                                    </div>
                                                </div>
                                                <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gray-700 border-2 border-white flex items-center justify-center shadow-md z-10">
                                                    <span className="text-[10px] font-bold text-white">{cardInfo.turn}</span>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="w-full text-center text-white/20 text-sm font-bold">出したカードなし</div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* 手札エリア - 下部配置 */}
                        <div className="flex-1 bg-black/20 rounded-lg border border-white/5 relative min-h-[160px] flex flex-col justify-end pt-8">
                            <div className="absolute top-2 left-2 flex items-center gap-2">
                                <span className="text-xs text-white/40 font-bold">手札</span>
                                <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/80">{myPlayer.hand.length}枚</span>
                            </div>

                            <div className="flex justify-center -space-x-4 pb-4 overflow-visible px-4">
                                <AnimatePresence>
                                    {myPlayer.hand.map((card) => (
                                        <GameCard
                                            key={card.id}
                                            card={card}
                                            isSelected={selectedCardId === card.id}
                                            isPlayable={isMyTurn && gameState.phase === GamePhase.WAITING_FOR_PLAY && canPlayCard(gameState, myPlayer, card)}
                                            isRevealed={true}
                                            onClick={() => {
                                                if (selectedCardId === card.id) {
                                                    setSelectedCardId(null);
                                                } else {
                                                    setSelectedCardId(card.id);
                                                }
                                            }}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* アクションボタンエリア */}
                            <div className="h-12 flex justify-center items-center absolute bottom-4 left-0 right-0 z-20 pointer-events-none">
                                <div className="pointer-events-auto">
                                    <AnimatePresence>
                                        {selectedCardId && isMyTurn && gameState.phase === GamePhase.WAITING_FOR_PLAY && (
                                            <motion.button
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                onClick={handlePlayCard}
                                                className="btn-primary w-full max-w-sm py-2 text-lg font-bold shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2"
                                            >
                                                <Play className="w-5 h-5 fill-current" />
                                                カードを出す
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>



            {/* 対象選択ガイド（画面上部に固定表示、クリックスルー可能） */}
            <AnimatePresence>
                {isSelectingTarget && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-purple-900/90 border-2 border-purple-500 rounded-2xl px-8 py-4 shadow-2xl text-center backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-8 h-8 text-purple-400" />
                                <div>
                                    <h3 className="text-xl font-bold text-white">対象を選択してください</h3>
                                    <p className="text-sm text-purple-300">
                                        {gameState.pendingAction?.cardType === 'detective' && '変態だと思うプレイヤーをタップ'}
                                        {gameState.pendingAction?.cardType === 'witness' && '手札を見たいプレイヤーをタップ'}
                                        {gameState.pendingAction?.cardType === 'dog' && '調査するプレイヤーをタップ'}
                                        {gameState.pendingAction?.cardType === 'trade' && 'カードを交換するプレイヤーをタップ'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* モーダル類（オーバーレイ）- 対象選択モードは除外 */}
            <div className="absolute inset-0 pointer-events-none z-50">
                {
                    (showCulpritInfo || showWitnessInfo || gameState.phase === GamePhase.GAME_OVER) && (
                        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
                            {/* 背景暗転 */}
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                            />

                            {/* コンテンツ */}
                            <div className="relative z-10 w-full max-w-lg pointer-events-auto">
                                {/* ゲームオーバー */}
                                {gameState.phase === GamePhase.GAME_OVER && (
                                    <div className="text-center">
                                        <h2 className={`text-6xl font-black mb-8 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] ${gameState.winner === 'CRIMINAL_TEAM' ? 'text-purple-500' : 'text-blue-500'
                                            }`}>
                                            {gameState.winner === 'CRIMINAL_TEAM' ? '変態の勝利' : '逮捕成功！'}
                                        </h2>
                                        <button onClick={handleGoToResult} className="btn-primary text-xl px-12 py-4">
                                            結果画面へ
                                        </button>
                                    </div>
                                )}

                                {/* 少年カード情報 */}
                                {showCulpritInfo && culpritPlayer && (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="bg-gray-900 border-2 border-red-500 rounded-2xl p-6 shadow-2xl text-center"
                                    >
                                        <Eye className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-red-400 mb-2">目撃情報！</h3>
                                        <p className="text-gray-300 mb-6">変態はこの人です...</p>
                                        <div className="text-4xl font-black text-white mb-8">{culpritPlayer.name}</div>
                                        <button onClick={() => setShowCulpritInfo(false)} className="btn-secondary w-full">閉じる</button>
                                    </motion.div>
                                )}

                                {/* 目撃者カード情報 */}
                                {showWitnessInfo && ((witnessTarget = gameState.players.find(p => p.id === showWitnessInfo)) => witnessTarget && (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="bg-gray-900 border-2 border-purple-500 rounded-2xl p-6 shadow-2xl"
                                    >
                                        <div className="text-center mb-6">
                                            <Eye className="w-10 h-10 text-purple-500 mx-auto mb-2" />
                                            <h3 className="text-xl font-bold">{witnessTarget.name}の手札</h3>
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                                            {witnessTarget.hand.map(card => (
                                                <div key={card.id} className="w-20 h-28 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-2 flex items-center justify-center text-center text-xs font-bold shadow-md">
                                                    {CARD_DEFINITIONS[card.type].name}
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => setShowWitnessInfo(null)} className="btn-secondary w-full">閉じる</button>
                                    </motion.div>
                                ))()}
                            </div>
                        </div>
                    )
                }

                {/* カード選択モーダル（正常者用） */}
                {gameState.phase === GamePhase.SELECTING_CARD && gameState.pendingAction?.targetIds && (
                    function () {
                        const activePlayer = gameState.players[gameState.activePlayerIndex];
                        if (!myPlayer || activePlayer.id !== myPlayer.id) return null;

                        const targetId = gameState.pendingAction!.targetIds![0];
                        const targetPlayer = gameState.players.find(p => p.id === targetId);

                        if (!targetPlayer) return null;

                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto"
                                />
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative z-10 bg-gray-900 border-2 border-yellow-500 rounded-2xl p-6 shadow-2xl w-full max-w-2xl pointer-events-auto"
                                >
                                    <div className="text-center mb-6">
                                        <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                                        <h3 className="text-xl font-bold text-white">カードを選択してください</h3>
                                        <p className="text-gray-400">変態だと思うカードをタップ！</p>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-4 mb-6">
                                        {targetPlayer.hand.map((card, index) => (
                                            <motion.div
                                                key={card.id}
                                                whileHover={{ scale: 1.1, rotate: 3 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleSelectCard(card.id)}
                                                className="w-24 h-36 bg-gradient-to-br from-indigo-800 to-purple-900 rounded-lg border-2 border-white/20 shadow-lg cursor-pointer flex items-center justify-center relative overflow-hidden group"
                                            >
                                                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:10px_10px]" />
                                                <div className="text-4xl filter grayscale group-hover:grayscale-0 transition-all duration-300">
                                                    🃏
                                                </div>
                                                <div className="absolute top-1 left-2 text-[10px] text-white/50">#{index + 1}</div>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="text-center text-sm text-gray-500">
                                        {targetPlayer.name}の手札: {targetPlayer.hand.length}枚
                                    </div>
                                </motion.div>
                            </div>
                        );
                    }()
                )}
            </div>


        </div >
    );
}

// カード交換アニメーション

