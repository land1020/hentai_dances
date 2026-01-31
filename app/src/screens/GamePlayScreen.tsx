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
    X,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import HentaiGauge from '../components/HentaiGauge';
import { CARD_DEFINITIONS, createCard } from '../data/cards';
import type { GameState, Player, Card, CardType } from '../types';
import { GamePhase } from '../types';
import {
    loadRoomState,
    saveRoomState,
    type LocalRoomState
} from '../store/gameStore';
import { submitCardSelectionTransaction } from '../services/roomService'; // Import transaction function
import { initializeGame, advancePhase, playCard, canPlayCard, selectTarget, getCulpritPlayer, selectCard, submitExchangeCard, completeArrestAnimation, completeCulpritVictoryAnimation } from '../engine/GameEngine';
import ArrestAnimationOverlay from '../components/ArrestAnimationOverlay';
import CulpritVictoryAnimationOverlay from '../components/CulpritVictoryAnimationOverlay';




// カード詳細モーダル
function CardDetailModal({
    card,
    isPlayable,
    onClose,
    onPlay
}: {
    card: Card;
    isPlayable: boolean;
    onClose: () => void;
    onPlay: () => void;
}) {
    const definition = CARD_DEFINITIONS[card.type];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="relative bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-2xl border-2 border-white/20 max-w-sm w-full z-10"
            >
                {/* 閉じるボタン */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center gap-6">
                    {/* カード画像エリア */}
                    <div className={`
                        w-48 h-64 rounded-xl shadow-2xl relative overflow-hidden
                        bg-gradient-to-br from-purple-600 to-pink-600
                        border-4 border-white/20
                    `}>
                        <div className="absolute inset-0 p-4 flex flex-col items-center">
                            {/* カード名 */}
                            {/* カード名 */}
                            <div className={`
                                font-bold text-center text-white drop-shadow-md mb-4 bg-black/20 px-4 py-1 rounded-full w-full
                                ${card.assignedDangerWord && card.assignedDangerWord.length > 5 ? 'text-lg' : 'text-xl'}
                            `}>
                                {card.assignedDangerWord && (
                                    <span className="text-yellow-400 mr-1 block sm:inline">
                                        {card.assignedDangerWord}
                                    </span>
                                )}
                                <span>{definition.name}</span>
                            </div>

                            {/* アイコン */}
                            <div className="flex-1 flex items-center justify-center w-full">
                                {definition.icon ? (
                                    <img
                                        src={definition.icon}
                                        alt={definition.name}
                                        className="w-32 h-32 object-contain drop-shadow-2xl"
                                    />
                                ) : (
                                    <div className="text-6xl animate-bounce">🎴</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 説明文 */}
                    <div className="text-center space-y-2 bg-white/5 p-4 rounded-xl w-full border border-white/10">
                        <h3 className="text-lg font-bold text-yellow-400">効果</h3>
                        <p className="text-sm leading-relaxed text-gray-200">
                            {definition.description}
                        </p>
                    </div>

                    {/* 交換履歴 */}
                    {card.tradeHistory && (
                        <div className="text-center space-y-1 bg-purple-500/10 p-3 rounded-xl w-full border border-purple-500/30">
                            <h3 className="text-sm font-bold text-purple-400">交換履歴</h3>
                            <p className="text-xs text-gray-300">
                                {card.tradeHistory.fromName} と {card.tradeHistory.toName} は<br />取り引きを行った
                            </p>
                        </div>
                    )}

                    {/* アクションボタン */}
                    {isPlayable ? (
                        <button
                            onClick={onPlay}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 font-bold text-lg shadow-lg hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Play className="w-6 h-6 fill-white" />
                            このカードを出す
                        </button>
                    ) : (
                        <div className="text-gray-400 text-sm bg-black/20 px-4 py-2 rounded-full">
                            現在は使用できません
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// カードコンポーネント（アイコン対応・クリックで詳細表示）
// カードコンポーネント（アイコン対応・クリックで詳細表示）
function GameCard({
    card,
    isSelected,
    isPlayable,
    isRevealed = true,
    size = 'normal',
    onClick,
    onDetailClick
}: {
    card: Card;
    isSelected: boolean;
    isPlayable: boolean;
    isRevealed?: boolean;
    size?: 'normal' | 'small';
    onClick?: () => void;
    onDetailClick?: () => void;
}) {
    const definition = CARD_DEFINITIONS[card.type];

    // サイズ定義
    const isSmall = size === 'small';
    const containerClass = isSmall ? 'w-14 h-20' : 'w-20 h-28';
    const titleClass = isSmall ? 'text-[8px] px-0.5' : 'text-[9px] px-0.5';
    const iconMaxHeight = isSmall ? 'max-h-[40px]' : 'max-h-[60px]';

    return (
        <motion.div
            onClick={onClick}
            className={`
        relative ${containerClass} rounded-lg cursor-pointer transition-all overflow-hidden
        ${isRevealed
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600'
                    : 'bg-gradient-to-br from-gray-700 to-gray-800'}
        ${isSelected ? 'ring-4 ring-yellow-400 scale-110 -translate-y-2' : ''}
        ${!isPlayable ? 'opacity-80 grayscale-[0.5]' : 'hover:scale-105 shadow-lg'}
        border border-white/20
      `}
            whileHover={isPlayable ? { y: -5 } : {}}
            whileTap={isPlayable ? { scale: 0.95 } : {}}
            layoutId={`card-${card.id}`}
        >
            {isRevealed ? (
                <div className="p-1 h-full flex flex-col items-center relative">
                    {/* カード名 */}
                    <div
                        className={`font-bold ${titleClass} text-center w-full mb-1 bg-black/20 rounded-full text-white shadow-sm flex-shrink-0 whitespace-nowrap overflow-hidden hover:bg-black/40 transition-colors z-20`}
                        onClick={(e) => {
                            if (onDetailClick) {
                                e.stopPropagation();
                                onDetailClick();
                            }
                        }}
                    >
                        {card.assignedDangerWord ? (
                            <span className={`text-yellow-300 ${card.assignedDangerWord.length > 5 ? 'text-[7px]' : ''}`}>
                                {card.assignedDangerWord} {definition.name}
                            </span>
                        ) : (
                            definition.name
                        )}
                    </div>

                    {/* アイコンエリア */}
                    <div className="flex-1 w-full flex items-center justify-center relative my-0.5">
                        {definition.icon ? (
                            <img
                                src={definition.icon}
                                alt={definition.name}
                                className={`w-full h-full object-contain ${iconMaxHeight} drop-shadow-md`}
                            />
                        ) : (
                            <div className={`${isSmall ? 'text-xl' : 'text-3xl'} opacity-50`}>🎴</div>
                        )}
                    </div>

                    {/* 拡大アイコン（右下） */}
                    <div className="absolute top-1 right-1 opacity-50">
                        <Eye className="w-3 h-3" />
                    </div>
                </div>
            ) : (
                <div className="h-full flex items-center justify-center">
                    <div className="text-2xl">🎴</div>
                </div>
            )}

            {!isPlayable && isRevealed && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg pointer-events-none">
                    {/* 色を少し暗くするだけで、詳細は見れるようにXは出さない */}
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
    playedCards?: { type: CardType, turn: number, id: string }[];
    onClick?: () => void;
    position: 'bottom' | 'left' | 'right' | 'top';
    onCardClick?: (cardType: CardType, cardId?: string) => void;
}) {
    // 位置に応じたクラス
    const containerClasses = {
        bottom: 'w-full max-w-md mx-auto hidden', // 自分は別コンポーネントで表示
        left: 'w-full max-w-[340px] md:w-[280px]',
        right: 'w-full max-w-[340px] md:w-[280px]',
        top: 'w-full max-w-[340px] md:w-[280px]'
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
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                    {/* 性癖 */}
                    <div className="flex-shrink-0 max-w-[70%] flex">
                        <span className="bg-black/20 px-1.5 py-0.5 rounded text-xs truncate block">
                            {player.currentPrefix || '???'}
                        </span>
                    </div>
                    {/* 名前 */}
                    <span className="truncate font-bold text-sm flex-1">
                        {player.name}
                    </span>
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
                    <div className="absolute top-1 right-2 scale-75 origin-right">
                        <HentaiGauge level={player.hentaiLevel || 0} />
                    </div>

                    <div className="flex gap-1 items-center justify-start pl-1">
                        <AnimatePresence>
                            {cards.length > 0 ? (
                                cards.map((cardInfo, _idx) => {
                                    // 表示用のダミーカードオブジェクト
                                    const dummyCard: Card = {
                                        id: cardInfo.id,
                                        type: cardInfo.type,
                                        name: CARD_DEFINITIONS[cardInfo.type].name,
                                        description: CARD_DEFINITIONS[cardInfo.type].description,
                                        icon: CARD_DEFINITIONS[cardInfo.type].icon,
                                        targetType: CARD_DEFINITIONS[cardInfo.type].targetType,
                                        sortOrder: 0
                                    } as Card;

                                    return (
                                        <div
                                            key={dummyCard.id}
                                            className="relative"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCardClick && onCardClick(cardInfo.type, cardInfo.id);
                                            }}
                                        >
                                            <GameCard
                                                card={dummyCard}
                                                isSelected={false}
                                                isPlayable={false}
                                                isRevealed={true}
                                                size="small"
                                            // GameCard内部のonClickは使わず、親divで制御
                                            />
                                            {/* ターンバッジ */}
                                            <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gray-700 border-2 border-white flex items-center justify-center shadow-md z-10 pointer-events-none">
                                                <span className="text-[10px] font-bold text-white">{cardInfo.turn}</span>
                                            </div>
                                        </div>
                                    );
                                })
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
        </motion.div >
    );
}

// オンライン用のProps型定義
interface GamePlayScreenProps {
    isOnlineMode?: boolean;
    onlineRoomId?: string;
    onlineUserId?: string;
    initialGameState?: GameState | null;
    onGameStateChange?: (newState: GameState) => Promise<void>;
    isHost?: boolean;
    hostId?: string;
}

export default function GamePlayScreen({
    isOnlineMode = false,
    onlineUserId,
    initialGameState,
    onGameStateChange,
    isHost = true, // ローカルモードではデフォルトでホスト
    hostId
}: GamePlayScreenProps = {}) {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [roomState, setRoomState] = useState<LocalRoomState | null>(null);
    // 初期状態をPropsから受け取る（オンライン時）か、nullで開始（ローカル時）
    const [gameState, setGameStateRaw] = useState<GameState | null>(initialGameState || null);

    // オンライン状態で外部から更新があった場合に同期する
    useEffect(() => {
        if (isOnlineMode && initialGameState) {
            setGameStateRaw(initialGameState);
        }
    }, [isOnlineMode, initialGameState]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [showCulpritInfo, setShowCulpritInfo] = useState(false);
    const [showWitnessInfo, setShowWitnessInfo] = useState<string | null>(null); // 目撃者で見た相手のID
    const [message, setMessage] = useState('');


    // プレイ履歴から各プレイヤーの直近のカードを取得
    const lastPlayedCards = useMemo(() => {
        if (!gameState || !gameState.playedLog) return {};

        const history: Record<string, { type: CardType, turn: number, id: string }[]> = {};

        // ログを時系列順に処理
        gameState.playedLog.forEach(log => {
            if (!history[log.playerId]) {
                history[log.playerId] = [];
            }
            // 各プレイヤーごとの履歴に追加
            history[log.playerId].push({ type: log.cardType, turn: log.turn, id: log.cardId });
        });

        // 各プレイヤーの履歴を最新の4件に制限
        Object.keys(history).forEach(playerId => {
            // 末尾（最新）から4件を取得
            history[playerId] = history[playerId].slice(-4);
        });

        return history;
    }, [gameState?.playedLog]);

    // 手札の移動履歴（in/out）
    const [transferHistory, setTransferHistory] = useState<{
        in: { card: Card, fromPlayerId: string } | null;
        out: { card: Card, toPlayerId: string } | null;
    }>({ in: null, out: null });

    // wrapper for setGameState to handle online sync
    const setGameState = async (newStateOrUpdater: GameState | ((prev: GameState | null) => GameState | null) | null) => {
        if (newStateOrUpdater === null) {
            setGameStateRaw(null);
            return;
        }

        let newState: GameState | null;
        if (typeof newStateOrUpdater === 'function') {
            newState = newStateOrUpdater(gameState);
        } else {
            newState = newStateOrUpdater;
        }

        if (!newState) {
            // nullにする場合
            setGameStateRaw(null);
            return;
        }

        setGameStateRaw(newState);

        if (isOnlineMode && onGameStateChange) {
            await onGameStateChange(newState);
        }
    };

    // 既存のuseEffectとの競合を避けるため、ローカル保存ロジックもここに統合するのが理想的だが、
    // 既存のuseEffect (507行目) が roomState と gameState の両方を監視しているので、
    // そちらを利用するほうが安全かもしれない。

    // しかし、オンライン同期は明示的に行いたい。


    // 詳細表示中のカード
    const [detailedCardInfo, setDetailedCardInfo] = useState<{ card: Card, isPlayable: boolean } | null>(null);





    // 初期化
    useEffect(() => {
        // オンラインモードなら初期ロード処理はスキップ
        if (isOnlineMode) return;

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

    // ゲーム状態が変わったら保存（ローカルモードのみ）
    useEffect(() => {
        if (!isOnlineMode && roomState && gameState) {
            const updatedRoom = { ...roomState, gameState };
            saveRoomState(updatedRoom);
        }
    }, [gameState, isOnlineMode]);

    // フェーズを自動で進める
    useEffect(() => {
        if (!gameState) return;

        // オンラインモードの場合、ホスト以外は自動進行しない（ホストからのState更新を待つ）
        if (isOnlineMode && !isHost) return;

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
            // 逮捕/通報カード演出中は自動進行しない（演出コンポーネントが制御）
            if (gameState.arrestAnimationInfo) {
                return;
            }

            // 変態勝利演出中も自動進行しない
            if (gameState.culpritVictoryAnimationInfo) {
                return;
            }

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

        // オンライン対応: 全員交換選択完了時の自動実行（ホストのみ）
        if (gameState.phase === GamePhase.EXCHANGE_PHASE && gameState.exchangeState) {
            const alivePlayers = gameState.players.filter(p => p.isAlive);
            let isAllReady = false;

            if (gameState.exchangeState.type === 'TRADE' && gameState.exchangeState.targetIds) {
                isAllReady = gameState.exchangeState.targetIds.every(id => {
                    const p = gameState.players.find(pl => pl.id === id);
                    return !p || p.hand.length === 0 || !!gameState.exchangeState!.selections[id];
                });
            } else {
                // INFORMATION / RUMOR
                isAllReady = alivePlayers.every(p =>
                    p.hand.length === 0 || !!gameState.exchangeState!.selections[p.id]
                );
            }

            if (isAllReady) {
                const timer = setTimeout(() => {
                    // 実行トリガーとして、既に選択済みの誰かのデータを使ってsubmitExchangeCardを呼ぶ
                    const firstSelectorId = Object.keys(gameState.exchangeState!.selections)[0];
                    if (firstSelectorId) {
                        const cardId = gameState.exchangeState!.selections[firstSelectorId];
                        const newState = submitExchangeCard(gameState, firstSelectorId, cardId);
                        setGameState(newState);
                        setMessage(gameState.exchangeState!.type === 'TRADE' ? '取り引き成立！' : '情報操作を実行しました！');
                    } else if (alivePlayers.every(p => p.hand.length === 0)) {
                        // 全員手札なしの場合の進行（レアケース）
                        // 手札なしでも進行できるロジックが必要だが、現状はselectionがないと進まない可能性がある
                        // この場合は強制的にGameEngine側でempty処理を通す必要があるが、
                        // submitExchangeCardはcardId必須。
                        // ここは一旦手札あり前提で実装。
                    }
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [gameState?.phase, gameState?.exchangeState]); // exchangeStateの変化も監視対象に追加

    // NPC自動行動
    useEffect(() => {
        if (!gameState || gameState.phase !== GamePhase.WAITING_FOR_PLAY) return;

        // オンラインモードの場合、ホスト以外はNPCを操作しない
        if (isOnlineMode && !isHost) return;

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
                setMessage(`${activePlayer.name}が${CARD_DEFINITIONS[randomCard.type].name}を出しました！`);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [gameState?.phase, gameState?.activePlayerIndex]);

    // NPC対象選択
    useEffect(() => {
        if (!gameState || gameState.phase !== GamePhase.SELECTING_TARGET) return;
        if (!gameState.pendingAction) return;

        // オンラインモードの場合、ホスト以外はNPCを操作しない
        if (isOnlineMode && !isHost) return;

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

        if (isOnlineMode && onlineUserId) {
            return gameState.players.find(p => p.id === onlineUserId) || null;
        }

        // ローカルモードでは最初の非NPCプレイヤーをコントロール
        return gameState.players.find(p => !p.isNpc) || gameState.players[0];
    }, [gameState, isOnlineMode, onlineUserId]);

    // 自分のターンかどうか
    const isMyTurn = useMemo(() => {
        if (!gameState || !myPlayer) return false;
        return gameState.players[gameState.activePlayerIndex].id === myPlayer.id;
    }, [gameState, myPlayer]);

    // カードをプレイ
    const handlePlayCard = (cardToPlay?: Card) => {
        if (!gameState || !myPlayer) return;

        const targetCardId = cardToPlay ? cardToPlay.id : selectedCardId;
        if (!targetCardId) return;

        if (gameState.phase !== GamePhase.WAITING_FOR_PLAY) return;

        const card = myPlayer.hand.find(c => c.id === targetCardId);
        if (!card || !canPlayCard(gameState, myPlayer, card)) return;

        const newState = playCard(gameState, myPlayer.id, targetCardId);
        setGameState(newState);
        setSelectedCardId(null);
        setMessage(`${CARD_DEFINITIONS[card.type].name}を出しました！`);

        setMessage(`${CARD_DEFINITIONS[card.type].name}を出しました！`);

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


    // カード交換（情報操作）
    const handleExchangeCard = async (cardId: string) => {
        if (!gameState || !myPlayer) return;

        if (isOnlineMode && roomId) {
            // オンラインモード: トランザクション処理で自身の選択のみを送信
            try {
                await submitCardSelectionTransaction(roomId, myPlayer.id, cardId);
                setMessage('カードを選択しました。他のプレイヤーを待っています...');
            } catch (error) {
                console.error("Exchange Error:", error);
                setMessage('通信エラーが発生しました。もう一度試してください。');
            }
        } else {
            // ローカルモード: 即座に反映
            const newState = submitExchangeCard(gameState, myPlayer.id, cardId);
            setGameState(newState);

            // 交換が完了したかチェック（フェーズが進んだか）
            if (newState.phase === GamePhase.RESOLVING_EFFECT) {
                setMessage('カード交換が実行されました！');
            } else {
                setMessage('カードを選択しました。他のプレイヤーを待っています...');
            }
        }
    };



    // カード移動履歴の更新監視
    useEffect(() => {
        if (!gameState || !myPlayer || !gameState.lastExchangeInfo) return;

        const { exchanges } = gameState.lastExchangeInfo;
        let newIn = transferHistory.in;
        let newOut = transferHistory.out;
        let hasUpdate = false;

        // 自分へのIN（受け取ったカード）
        const inExchange = exchanges.find(e => e.toPlayerId === myPlayer.id);
        if (inExchange) {
            // カードIDから情報を復元（player.handにあるはずだが、描画タイミングによっては...
            // ここでは簡易的にIDからタイプを復元してダミーカードを作成）
            // ID形式: type-number (例: culprit-1)
            const type = inExchange.cardId.split('-')[0] as CardType;
            if (type && CARD_DEFINITIONS[type]) {
                const card = createCard(type);
                card.id = inExchange.cardId; // IDは維持
                newIn = { card, fromPlayerId: inExchange.fromPlayerId };
                hasUpdate = true;
            }
        }

        // 自分からのOUT（渡した/取られたカード）
        const outExchange = exchanges.find(e => e.fromPlayerId === myPlayer.id);
        if (outExchange) {
            const type = outExchange.cardId.split('-')[0] as CardType;
            if (type && CARD_DEFINITIONS[type]) {
                const card = createCard(type);
                card.id = outExchange.cardId;
                newOut = { card, toPlayerId: outExchange.toPlayerId };
                hasUpdate = true;
            }
        }

        if (hasUpdate) {
            setTransferHistory({ in: newIn, out: newOut });
        }
    }, [gameState?.lastExchangeInfo]); // lastExchangeInfoが変わるたびにチェック

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

    // プレイエリアのカードクリック時に詳細を表示
    const handlePlayedCardClick = (cardType: CardType, cardId?: string) => {
        const definition = CARD_DEFINITIONS[cardType];
        let tradeHistory = undefined;

        // cardIdがあれば、実際のTableCardsから詳細情報を検索（交換履歴などを取得）
        if (cardId && gameState) {
            const tableCard = gameState.tableCards.find(c => c.id === cardId);
            if (tableCard && tableCard.tradeHistory) {
                tradeHistory = tableCard.tradeHistory;
            }
        }

        // 詳細表示用の一時カードオブジェクト
        const tempCard: Card = {
            id: cardId || `view-detail-${cardType}`,
            type: cardType,
            name: definition.name,
            description: definition.description,
            icon: definition.icon,
            targetType: definition.targetType,
            sortOrder: definition.sortOrder,
            tradeHistory: tradeHistory
        };

        setDetailedCardInfo({ card: tempCard, isPlayable: false });
    };

    // リザルトへ
    const handleGoToResult = () => {
        // 現在のgameStateを保存してリザルト画面へ渡す
        if (gameState && roomId) {
            // オンラインモードの場合、roomStateがnull（または古い）可能性があるため、
            // 現在のgameStateを使って新しい保存用Stateを構築する
            const stateToSave: LocalRoomState = {
                roomId,
                hostId: hostId || roomState?.hostId || (isHost ? myPlayer?.id || '' : ''),
                players: gameState.players, // 最新のプレイヤー情報（レベル変動済み）を使用
                status: 'FINISHED',
                gameState: gameState,
                debugMode: roomState?.debugMode ?? false
            };
            saveRoomState(stateToSave);
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
                                onCardClick={handlePlayedCardClick}
                            />
                        );
                    }
                    return null;
                })}
            </div>

            {/* 中央: 左プレイヤー / メイン画面 / 右プレイヤー */}
            <div className="flex-1 flex flex-col md:flex-row items-center md:items-stretch px-2 gap-4 md:gap-2 min-h-0 overflow-y-auto md:overflow-visible scrollbar-hide py-2">

                {/* 左側プレイヤー（次のプレイヤー） */}
                <div className="w-full md:w-[280px] flex-shrink-0 flex items-center justify-center order-2 md:order-none">
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
                                    onCardClick={handlePlayedCardClick}
                                />
                            );
                        }
                        return null;
                    })}
                </div>

                {/* メイン画面（中央） */}
                <div className="w-full md:flex-1 flex items-center justify-center py-2 md:py-0 order-1 md:order-none">
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
                <div className="w-full md:w-[280px] flex-shrink-0 flex items-center justify-center order-3 md:order-none">
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
                                    onCardClick={handlePlayedCardClick}
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
                                <span className="bg-black/20 px-3 py-0.5 rounded text-base">
                                    {myPlayer.currentPrefix || '???'}
                                </span>
                                <span className="truncate text-xl">{myPlayer.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* ボディエリア */}
                    <div className="p-4 flex gap-4 relative bg-black/10 items-stretch">

                        {/* [左カラム] 履歴エリア (OUT/IN) */}
                        <div className="flex-shrink-0 bg-black/40 p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2">
                            <div className="flex gap-4">
                                {/* OUT */}
                                <div className="flex flex-col items-center gap-2">
                                    <div
                                        className="w-10 h-10 flex items-center justify-center rounded-full shadow-md border border-white/10 transition-colors"
                                        style={{ backgroundColor: transferHistory.out ? (gameState.players.find(p => p.id === transferHistory.out!.toPlayerId)?.color || '#374151') : '#1f2937' }}
                                    >
                                        {transferHistory.out ? (
                                            <ArrowUp className="w-6 h-6 text-white font-bold" />
                                        ) : (
                                            <div className="w-6 h-6 opacity-20" />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OUT</span>
                                    {transferHistory.out ? (
                                        <div className="relative group">
                                            <GameCard
                                                card={transferHistory.out.card}
                                                isSelected={false}
                                                isPlayable={false}
                                                isRevealed={true}
                                                size="small"
                                                onClick={() => setDetailedCardInfo({ card: transferHistory.out!.card, isPlayable: false })}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-20 bg-white/5 rounded-lg border border-white/5 flex items-center justify-center">
                                            <span className="text-2xl opacity-10">?</span>
                                        </div>
                                    )}
                                </div>

                                {/* Vertical Divider */}
                                <div className="w-[1px] bg-white/10 h-32 self-center"></div>

                                {/* IN */}
                                <div className="flex flex-col items-center gap-2">
                                    <div
                                        className="w-10 h-10 flex items-center justify-center rounded-full shadow-md border border-white/10 transition-colors"
                                        style={{ backgroundColor: transferHistory.in ? (gameState.players.find(p => p.id === transferHistory.in!.fromPlayerId)?.color || '#374151') : '#1f2937' }}
                                    >
                                        {transferHistory.in ? (
                                            <ArrowDown className="w-6 h-6 text-white font-bold" />
                                        ) : (
                                            <div className="w-6 h-6 opacity-20" />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IN</span>
                                    {transferHistory.in ? (
                                        <div className="relative group">
                                            <GameCard
                                                card={transferHistory.in.card}
                                                isSelected={false}
                                                isPlayable={false}
                                                isRevealed={true}
                                                size="small"
                                                onClick={() => setDetailedCardInfo({ card: transferHistory.in!.card, isPlayable: false })}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-20 bg-white/5 rounded-lg border border-white/5 flex items-center justify-center">
                                            <span className="text-2xl opacity-10">?</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* [右カラム] プレイエリア & 手札エリア */}
                        <div className="flex-1 flex flex-col gap-3 min-w-0">

                            {/* プレイエリア（上部） */}
                            <div className="h-32 w-full bg-black/20 rounded-lg relative flex items-center p-3 border border-white/5 overflow-x-auto">
                                <span className="absolute top-1 left-2 text-[10px] text-white/40 font-bold pointer-events-none">
                                    プレイエリア
                                </span>
                                <div className="absolute top-1 right-2 scale-75 origin-right">
                                    <HentaiGauge level={myPlayer.hentaiLevel || 0} />
                                </div>

                                <div className="flex gap-2 items-center justify-start pl-1 mt-2">
                                    <AnimatePresence>
                                        {(lastPlayedCards[myPlayer.id] && lastPlayedCards[myPlayer.id].length > 0) ? (
                                            lastPlayedCards[myPlayer.id].map((cardInfo, _idx) => {
                                                const dummyCard: Card = {
                                                    id: cardInfo.id,
                                                    type: cardInfo.type,
                                                    name: CARD_DEFINITIONS[cardInfo.type].name,
                                                    description: CARD_DEFINITIONS[cardInfo.type].description,
                                                    icon: CARD_DEFINITIONS[cardInfo.type].icon,
                                                    targetType: CARD_DEFINITIONS[cardInfo.type].targetType,
                                                    sortOrder: 0
                                                } as Card;

                                                return (
                                                    <div
                                                        key={dummyCard.id}
                                                        className="relative flex-shrink-0"
                                                    >
                                                        <GameCard
                                                            card={dummyCard}
                                                            isSelected={false}
                                                            isPlayable={false}
                                                            isRevealed={true}
                                                            size="small"
                                                            onClick={() => handlePlayedCardClick(cardInfo.type, cardInfo.id)}
                                                        />
                                                        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gray-700 border-2 border-white flex items-center justify-center shadow-md z-10 pointer-events-none">
                                                            <span className="text-[10px] font-bold text-white">{cardInfo.turn}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="w-full text-left pl-2 text-white/20 text-lg font-bold">出したカードなし</div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* 手札エリア（下部） */}
                            <div className="flex-1 bg-black/20 rounded-lg border border-white/5 relative p-2 flex flex-col justify-center items-center h-[140px]"> {/* 高さを明示的に確保 */}

                                <div className="flex justify-center -space-x-4 hover:space-x-1 transition-all duration-300 overflow-visible px-4 w-full">
                                    <AnimatePresence>
                                        {myPlayer.hand.map((card, index) => {
                                            const canPlay = isMyTurn && gameState.phase === GamePhase.WAITING_FOR_PLAY && canPlayCard(gameState, myPlayer, card);
                                            return (
                                                <motion.div
                                                    key={card.id}
                                                    initial={{ y: 50, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    style={{ zIndex: index }}
                                                >
                                                    <GameCard
                                                        card={card}
                                                        isSelected={selectedCardId === card.id}
                                                        isPlayable={canPlay}
                                                        isRevealed={true}
                                                        onClick={() => {
                                                            if (canPlay) {
                                                                if (selectedCardId === card.id) {
                                                                    handlePlayCard(card);
                                                                } else {
                                                                    setSelectedCardId(card.id);
                                                                }
                                                            } else {
                                                                setDetailedCardInfo({ card, isPlayable: canPlay });
                                                            }
                                                        }}
                                                        onDetailClick={() => setDetailedCardInfo({ card, isPlayable: canPlay })}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>

                                {/* アクションボタンエリア */}
                                <div className="h-12 flex justify-center items-center absolute bottom-2 left-0 right-0 z-20 pointer-events-none">
                                    <div className="pointer-events-auto">
                                        <AnimatePresence>
                                            {selectedCardId && isMyTurn && gameState.phase === GamePhase.WAITING_FOR_PLAY && (
                                                <motion.button
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    onClick={() => handlePlayCard()}
                                                    className="btn-primary w-full max-w-sm py-2 text-lg font-bold shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2"
                                                >
                                                    <Play className="w-5 h-5 fill-current" />
                                                    カードを出す
                                                </motion.button>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                                {/* 手札枚数バッジ (右下) */}
                                <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white/70 border border-white/10 font-bold pointer-events-none">
                                    {myPlayer.hand.length}枚
                                </div>
                            </div>
                        </div>
                    </div>


                </motion.div >
            </div >



            {/* 対象選択ガイド（画面上部に固定表示、クリックスルー可能） */}
            <AnimatePresence>
                {
                    isSelectingTarget && (
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
                    )
                }
            </AnimatePresence >

            {/* モーダル類（オーバーレイ）- 対象選択モードは除外 */}
            {/* モーダル類（オーバーレイ） */}
            <div className="absolute inset-0 pointer-events-none z-50">
                {(showCulpritInfo || showWitnessInfo || gameState.phase === GamePhase.GAME_OVER) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <div className="relative z-10 w-full max-w-lg">
                            {/* ゲームオーバー */}
                            {gameState.phase === GamePhase.GAME_OVER && (
                                <div className="text-center">
                                    <h2 className={`text-6xl font-black mb-8 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] ${gameState.winner === 'CRIMINAL_TEAM' ? 'text-purple-500' : 'text-blue-500'}`}>
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
                                            <GameCard
                                                key={card.id}
                                                card={card}
                                                isSelected={false}
                                                isPlayable={false}
                                                isRevealed={true}
                                                onClick={() => setDetailedCardInfo({ card, isPlayable: false })}
                                            />
                                        ))}
                                    </div>
                                    <button onClick={() => setShowWitnessInfo(null)} className="btn-secondary w-full">閉じる</button>
                                </motion.div>
                            ))()}
                        </div>
                    </div>
                )}

                {/* カード選択モーダル（正常者用） */}
                {gameState.phase === GamePhase.SELECTING_CARD && gameState.pendingAction?.targetIds && (
                    function () {
                        const activePlayer = gameState.players[gameState.activePlayerIndex];
                        if (!myPlayer || activePlayer.id !== myPlayer.id) return null;
                        const targetId = gameState.pendingAction!.targetIds![0];
                        const targetPlayer = gameState.players.find(p => p.id === targetId);
                        if (!targetPlayer) return null;
                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative z-10 bg-gray-900 border-2 border-yellow-500 rounded-2xl p-6 shadow-2xl w-full max-w-2xl"
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



            {/* カード情報エリア（ターゲット選択時など） */}

            {
                gameState.phase === GamePhase.EXCHANGE_PHASE && gameState.exchangeState?.type === 'INFORMATION' && (
                    (function () {
                        const hasSelected = gameState.exchangeState.selections[myPlayer.id];
                        const alivePlayers = gameState.players.filter(p => p.isAlive);
                        // 選択済みの人数カウント
                        const selectedCount = alivePlayers.filter(p => gameState.exchangeState!.selections[p.id]).length;
                        const totalAlive = alivePlayers.length;

                        if (!hasSelected) {
                            return (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto"
                                    />
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="relative z-10 bg-gray-900 border-2 border-cyan-500 rounded-2xl p-6 shadow-2xl w-full max-w-2xl pointer-events-auto text-center"
                                    >
                                        <div className="mb-6">
                                            <div className="inline-block bg-cyan-500/20 px-3 py-1 rounded-full text-cyan-300 font-bold mb-2">
                                                情報操作
                                            </div>
                                            <h3 className="text-xl font-bold text-white">左隣に渡すカードを選択してください</h3>
                                            <p className="text-gray-400 text-sm mt-1">選択状況: {selectedCount}/{totalAlive}</p>
                                        </div>

                                        <div className="flex flex-wrap justify-center gap-4 mb-2">
                                            {myPlayer.hand.map((card) => (
                                                <div key={card.id} className="relative group">
                                                    <GameCard
                                                        card={card}
                                                        isSelected={false}
                                                        isPlayable={true}
                                                        onClick={() => handleExchangeCard(card.id)}
                                                    />
                                                    <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 rounded-lg transition-colors pointer-events-none" />
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        } else {
                            // 選択完了・待機中ステータス
                            return (
                                <motion.div
                                    initial={{ y: -50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur text-white px-6 py-3 rounded-full border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center gap-3"
                                >
                                    <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="font-bold">
                                        情報操作: 全員の選択を待っています ({selectedCount}/{totalAlive})
                                    </span>
                                </motion.div>
                            );
                        }
                    })()
                )
            }

            {/* TRADE交換 UI */}
            {gameState.phase === GamePhase.EXCHANGE_PHASE && gameState.exchangeState?.type === 'TRADE' && (
                (function () {
                    const targetIds = gameState.exchangeState.targetIds || [];
                    const isTarget = targetIds.includes(myPlayer.id);
                    const hasSelected = gameState.exchangeState.selections[myPlayer.id];

                    if (!isTarget) {
                        return (
                            <motion.div
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur text-white px-6 py-3 rounded-full border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center gap-3"
                            >
                                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                <span className="font-bold">
                                    取り引き中...
                                </span>
                            </motion.div>
                        );
                    }

                    if (!hasSelected) {
                        if (myPlayer.hand.length === 0) return null;
                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto"
                                />
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative z-10 bg-gray-900 border-2 border-purple-500 rounded-2xl p-6 shadow-2xl w-full max-w-2xl text-center pointer-events-auto"
                                >
                                    <div className="mb-6">
                                        <div className="inline-block bg-purple-500/20 px-3 py-1 rounded-full text-purple-300 font-bold mb-2">
                                            取り引き
                                        </div>
                                        <h3 className="text-xl font-bold text-white">相手に渡すカードを選択してください</h3>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-4 mb-2">
                                        {myPlayer.hand.map((card) => (
                                            <div key={card.id} className="relative group">
                                                <GameCard
                                                    card={card}
                                                    isSelected={false}
                                                    isPlayable={true}
                                                    onClick={() => handleExchangeCard(card.id)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        );
                    } else {
                        return (
                            <motion.div
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur text-white px-6 py-3 rounded-full border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center gap-3"
                            >
                                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                <span className="font-bold">
                                    取り引き: 相手の選択を待っています
                                </span>
                            </motion.div>
                        );
                    }
                })()
            )}

            {/* 詳細表示モーダル */}
            <AnimatePresence>
                {
                    detailedCardInfo && (
                        <CardDetailModal
                            card={detailedCardInfo.card}
                            isPlayable={detailedCardInfo.isPlayable}
                            onClose={() => setDetailedCardInfo(null)}
                            onPlay={() => {
                                const { card } = detailedCardInfo;
                                setDetailedCardInfo(null);

                                // ターゲット選択の有無に関わらず、即座にプレイ
                                handlePlayCard(card);
                            }}
                        />
                    )
                }
            </AnimatePresence >

            {/* 逮捕/通報カード演出オーバーレイ */}
            <ArrestAnimationOverlay
                animationInfo={gameState.arrestAnimationInfo}
                players={gameState.players}
                onComplete={() => {
                    // オンラインモードの場合、ホスト以外はState更新しない
                    if (isOnlineMode && !isHost) return;

                    // 演出終了後、勝敗判定を実行
                    const newState = completeArrestAnimation(gameState);
                    setGameState(newState);
                }}
            />

            {/* 変態勝利演出オーバーレイ */}
            <CulpritVictoryAnimationOverlay
                animationInfo={gameState.culpritVictoryAnimationInfo}
                players={gameState.players}
                onComplete={() => {
                    // オンラインモードの場合、ホスト以外はState更新しない
                    if (isOnlineMode && !isHost) return;

                    // 演出終了後、勝利を確定
                    const newState = completeCulpritVictoryAnimation(gameState);
                    setGameState(newState);
                }}
            />

        </div >
    );

}

// カード交換アニメーション
