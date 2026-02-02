// ====================================
// ロビー画面: 変態は踊る（ローカルモード）
// ====================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    UserPlus,
    UserMinus,
    Play,
    Users,
    Settings,
    Crown,
    Bot,
    AlertCircle,
    Shuffle,
    Lock
} from 'lucide-react';
import HentaiGauge from '../components/HentaiGauge';
import type { CardType, Player } from '../types';
import {
    createInitialRoomState,
    loadRoomState,
    saveRoomState,
    addNpc,
    removeNpc,
    updatePlayerColor,
    updatePlayerName,
    PLAYER_COLORS,
    type LocalRoomState
} from '../store/gameStore';
import { CARD_DEFINITIONS } from '../data/cards';
import { initializeGame } from '../engine/GameEngine';
import type { OnlineRoomState } from '../services/roomService';
import { updateDeckConfig } from '../store/gameStore';
import { DEFAULT_INVENTORY, DEFAULT_MANDATORY_CARDS } from '../utils/deckFactory';
import DeckConfigModal from '../components/DeckConfigModal';
import type { DeckConfig } from '../types';

interface LobbyScreenProps {
    isOnlineMode?: boolean;
    onlineRoomId?: string;
    onlineRoomState?: OnlineRoomState | null;
    currentUserId?: string;
    onAddNpc?: () => Promise<void>;
    onRemoveNpc?: () => Promise<void>;
    onStartGame?: () => Promise<void>;
    onUpdatePlayerName?: (playerId: string, name: string) => Promise<void>;
    onUpdatePlayerColor?: (playerId: string, color: string) => Promise<void>;
    onUpdateDeckConfig?: (config: DeckConfig) => Promise<void>;
    onLeave?: () => void;
}

// 参加人数ごとの必須カード構成 (Deprecated: Now utilizing DEFAULT_MANDATORY_CARDS from deckFactory and roomState)
// const MANDATORY_CARDS_CONFIG... removed

export default function LobbyScreen({
    isOnlineMode = false,
    onlineRoomId,
    onlineRoomState,
    onAddNpc,
    onRemoveNpc,
    onStartGame,
    onUpdatePlayerName,
    onUpdatePlayerColor,
    onUpdateDeckConfig,
    onLeave
}: LobbyScreenProps = {}) {
    const { roomId: paramRoomId } = useParams();
    const roomId = isOnlineMode ? onlineRoomId : paramRoomId;

    const navigate = useNavigate();
    const [localRoomState, setLocalRoomState] = useState<LocalRoomState | null>(null);
    const roomState = isOnlineMode ? (onlineRoomState as any) : localRoomState;
    const currentUserId = localStorage.getItem('hentai_user_id');

    const [isInitializing, setIsInitializing] = useState(true);

    const isLoading = isOnlineMode ? !onlineRoomState : isInitializing;
    const [editingNpcId, setEditingNpcId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [showDeckConfigModal, setShowDeckConfigModal] = useState(false);

    // ホスト判定
    const isHost = isOnlineMode
        ? (onlineRoomState?.hostId === currentUserId)
        : true;

    // 初期化
    // 初期化（ローカルモードのみ）
    useEffect(() => {
        if (isOnlineMode) return;

        if (!roomId) {
            navigate('/');
            return;
        }

        // 既存のルーム状態を読み込み
        let state = loadRoomState();

        // ルームIDが違う場合は新規作成
        if (!state || state.roomId !== roomId) {
            const userId = localStorage.getItem('hentai_user_id') || `local-${Date.now()}`;
            const playerName = localStorage.getItem('hentai_player_name') || 'プレイヤー';
            state = createInitialRoomState(roomId, userId, playerName);
            saveRoomState(state);
        }

        setLocalRoomState(state);
        setIsInitializing(false);
    }, [roomId, navigate, isOnlineMode]);

    // NPC追加
    // NPC追加
    const handleAddNpc = async () => {
        if (isOnlineMode) {
            if (onAddNpc) await onAddNpc();
        } else if (localRoomState) {
            const newState = addNpc(localRoomState);
            setLocalRoomState(newState);
        }
    };

    // NPC削除
    // NPC削除
    const handleRemoveNpc = async () => {
        if (isOnlineMode) {
            if (onRemoveNpc) await onRemoveNpc();
        } else if (localRoomState) {
            const newState = removeNpc(localRoomState);
            setLocalRoomState(newState);
        }
    };

    // ゲーム開始
    // ゲーム開始
    const handleStartGame = async () => {
        if (isOnlineMode) {
            if (onStartGame) await onStartGame();
        } else if (localRoomState) {
            // ゲームを初期化（カードを配布）
            // 古いデータでdeckConfigがない場合のフォールバック
            const deckConfig: DeckConfig = localRoomState.deckConfig || {
                inventory: DEFAULT_INVENTORY,
                mandatory: DEFAULT_MANDATORY_CARDS
            };

            const gameState = initializeGame(localRoomState.players, deckConfig);

            const newState: LocalRoomState = {
                ...localRoomState,
                status: 'PLAYING',
                gameState,
            };

            saveRoomState(newState);
            setLocalRoomState(newState);
            navigate(`/game/${roomId}`);
        }
    };

    // 退出
    const handleLeave = () => {
        if (onLeave) {
            onLeave();
        } else {
            navigate('/');
        }
    };

    // NPC名編集開始
    const handleStartEditNpcName = (playerId: string, currentName: string) => {
        setEditingNpcId(playerId);
        setEditingName(currentName);
    };

    // NPC名編集確定
    // NPC名編集確定
    const handleConfirmNpcName = async () => {
        if (editingNpcId && editingName.trim()) {
            if (isOnlineMode) {
                if (onUpdatePlayerName) await onUpdatePlayerName(editingNpcId, editingName.trim());
            } else if (localRoomState) {
                const newState = updatePlayerName(localRoomState, editingNpcId, editingName.trim());
                setLocalRoomState(newState);
            }
        }
        setEditingNpcId(null);
        setEditingName('');
    };

    // NPC名編集キャンセル
    const handleCancelEditNpcName = () => {
        setEditingNpcId(null);
        setEditingName('');
    };

    // デッキ情報を計算
    const deckInfo = useMemo(() => {
        if (!roomState) return null;

        const playerCount = roomState.players.length;
        const targetTotal = playerCount * 4;

        // デッキ設定を取得（フォールバック付き）
        const deckConfig: DeckConfig = roomState?.deckConfig || {
            inventory: DEFAULT_INVENTORY,
            mandatory: DEFAULT_MANDATORY_CARDS
        };
        const inventory = deckConfig.inventory;

        // 8人の場合は全カード使用（在庫にあるものすべて）
        if (playerCount === 8) {
            const allCards: { type: CardType; count: number; isMandatory: boolean }[] = [];
            for (const [type, count] of Object.entries(inventory)) {
                if (count > 0) {
                    allCards.push({
                        type: type as CardType,
                        count,
                        isMandatory: true, // 8人は全て必須
                    });
                }
            }
            return {
                playerCount,
                targetTotal,
                mandatoryCards: allCards,
                mandatoryTotal: 32, // ここは在庫総数と一致すべき
                randomCount: 0,
                isFullDeck: true,
                config: deckConfig
            };
        }

        // 必須カードを取得
        const mandatoryConfig = deckConfig.mandatory[playerCount] || {};
        const mandatoryCards: { type: CardType; count: number; isMandatory: boolean }[] = [];
        let mandatoryTotal = 0;

        for (const [type, count] of Object.entries(mandatoryConfig)) {
            if (count && count > 0) {
                mandatoryCards.push({
                    type: type as CardType,
                    count,
                    isMandatory: true,
                });
                mandatoryTotal += count;
            }
        }

        const randomCount = targetTotal - mandatoryTotal;

        return {
            playerCount,
            targetTotal,
            mandatoryCards,
            mandatoryTotal,
            randomCount,
            isFullDeck: false,
        };
    }, [roomState?.players.length]);

    // ランダム候補カード一覧
    const randomPoolCards = useMemo(() => {
        if (!deckInfo || deckInfo.isFullDeck) return [];

        const inventory = deckInfo.config?.inventory || DEFAULT_INVENTORY;
        const pool: { type: CardType; name: string; maxCount: number }[] = [];

        for (const [type, inventoryCount] of Object.entries(inventory)) {
            const cardType = type as CardType;
            const mandatoryUsed = deckInfo.mandatoryCards.find(c => c.type === cardType)?.count || 0;
            const remaining = inventoryCount - mandatoryUsed;

            if (remaining > 0) {
                pool.push({
                    type: cardType,
                    name: CARD_DEFINITIONS[cardType].name,
                    maxCount: remaining,
                });
            }
        }

        return pool;
    }, [deckInfo]);

    if (isLoading || !roomState) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">読み込み中...</div>
            </div>
        );
    }

    const canStart = roomState.players.length >= 3 && roomState.players.length <= 8;
    const npcCount = roomState.players.filter((p: Player) => p.isNpc).length;

    // デッキバリデーション
    const deckValidation = useMemo(() => {
        const config: DeckConfig = roomState?.deckConfig || {
            inventory: DEFAULT_INVENTORY,
            mandatory: DEFAULT_MANDATORY_CARDS
        };
        const currentTotal = Object.values(config.inventory).reduce((sum, n) => sum + n, 0);

        // 必須カード過多チェック
        const playerCount = roomState.players.length;
        if (playerCount >= 3 && playerCount <= 8) {
            // check mandatory logic similar to deckFactory
        }

        return {
            isValid: currentTotal === 32,
            message: currentTotal !== 32 ? `カード合計が32枚ではありません（現在${currentTotal}枚）` : ''
        };
    }, [roomState]);

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-2xl mx-auto animate-fadeIn">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLeave}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">ロビー</h1>
                            <p className="text-gray-400 text-sm">部屋番号: {roomId}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        {/* ローカルモード表記削除 */}
                    </div>
                </div>

                {/* 参加者リスト */}
                <div className="card-base p-4 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-bold">参加者 ({roomState.players.length}/8)</h2>
                    </div>

                    <div className="space-y-2">
                        {roomState.players.map((player: Player, index: number) => (
                            <div
                                key={player.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${player.isNpc
                                    ? 'bg-blue-500/10 border-blue-500/30'
                                    : ''
                                    }`}
                                style={!player.isNpc ? {
                                    backgroundColor: `${player.color}20`, // 20 = ~12% opacity
                                    borderColor: `${player.color}50`      // 50 = ~30% opacity
                                } : undefined}
                            >
                                <div className="flex items-center gap-3">
                                    {player.isNpc ? (
                                        <Bot className="w-6 h-6 text-blue-400" />
                                    ) : (
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                                            style={{ backgroundColor: player.color }}
                                        >
                                            {index + 1}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            {player.isNpc && editingNpcId === player.id ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleConfirmNpcName();
                                                        if (e.key === 'Escape') handleCancelEditNpcName();
                                                    }}
                                                    onBlur={handleConfirmNpcName}
                                                    autoFocus
                                                    className="bg-white/10 border border-blue-500/50 rounded px-2 py-0.5 text-sm w-24 focus:outline-none focus:border-blue-400"
                                                    maxLength={10}
                                                />
                                            ) : (
                                                <span
                                                    className={`font-medium ${player.isNpc ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
                                                    onClick={() => player.isNpc && handleStartEditNpcName(player.id, player.name)}
                                                    title={player.isNpc ? 'クリックして名前を編集' : undefined}
                                                >
                                                    {player.name}
                                                </span>
                                            )}
                                            <HentaiGauge level={player.hentaiLevel || 0} />
                                        </div>
                                        {player.currentPrefix && (
                                            <span className="text-xs text-gray-400">
                                                {player.currentPrefix}
                                            </span>
                                        )}
                                    </div>
                                    {player.id === roomState.hostId && (
                                        <span className="flex items-center gap-1 text-yellow-500 text-xs ml-2">
                                            <Crown className="w-4 h-4" />
                                            MASTER
                                        </span>
                                    )}
                                </div>
                                {player.isNpc && (
                                    <span className="text-xs text-blue-400">AI</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* NPC管理（ホストのみ、またはローカルモード） */}
                    {(!isOnlineMode || (roomState.hostId === currentUserId)) && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">
                                    NPC設定 ({npcCount}人)
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleRemoveNpc}
                                        disabled={npcCount === 0}
                                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <UserMinus className="w-4 h-4" />
                                        <span className="text-sm">削除</span>
                                    </button>
                                    <button
                                        onClick={handleAddNpc}
                                        disabled={roomState.players.length >= 8}
                                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        <span className="text-sm">追加</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* プレイヤーカラー選択 */}
                <div className="card-base p-4 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-500" />
                        <h2 className="text-lg font-bold">プレイヤーカラー</h2>
                    </div>
                    <div className="flex gap-3 flex-wrap justify-center">
                        {PLAYER_COLORS.map((color) => {
                            // 現在のユーザーID（オンラインモードではlocalStorage、ローカルモードではhostId）
                            const myPlayerId = isOnlineMode
                                ? localStorage.getItem('hentai_user_id')
                                : localRoomState?.hostId;

                            // 自分がこのカラーを選択しているか
                            const isSelected = roomState.players.find((p: Player) => p.id === myPlayerId)?.color === color;

                            // このカラーを使用しているプレイヤー（自分以外）
                            const takenByPlayer = roomState.players.find((p: Player) => p.color === color && p.id !== myPlayerId);
                            const isTaken = !!takenByPlayer;

                            // 頭文字を取得（ひらがな・カタカナ・漢字・英数字対応）
                            const getInitial = (name: string) => {
                                if (!name) return '?';
                                return name.charAt(0).toUpperCase();
                            };

                            return (
                                <button
                                    key={color}
                                    onClick={async () => {
                                        // 既に他のプレイヤーが使用している場合は選択不可
                                        if (isTaken) return;

                                        if (isOnlineMode) {
                                            if (onUpdatePlayerColor) {
                                                const userId = localStorage.getItem('hentai_user_id');
                                                if (userId) {
                                                    await onUpdatePlayerColor(userId, color);
                                                }
                                            }
                                        } else if (localRoomState) {
                                            const newState = updatePlayerColor(localRoomState, localRoomState.hostId, color);
                                            setLocalRoomState(newState);
                                        }
                                    }}
                                    disabled={isTaken}
                                    className={`
                                        w-10 h-10 rounded-full transition-all flex items-center justify-center
                                        ${isSelected ? 'ring-4 ring-white scale-110' : 'hover:scale-110'}
                                        ${isTaken ? 'opacity-60 cursor-not-allowed ring-2 ring-gray-500' : ''}
                                    `}
                                    style={{ backgroundColor: color }}
                                    title={isTaken ? `${takenByPlayer.name}が選択中` : undefined}
                                >
                                    {isSelected ? (
                                        <Crown className="w-5 h-5 text-white drop-shadow-md" />
                                    ) : isTaken ? (
                                        <span className="text-white font-bold text-sm drop-shadow-md">
                                            {getInitial(takenByPlayer.name)}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* デッキ構成（自動生成表示） */}
                <div className="card-base p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-purple-400" />
                            <h2 className="text-lg font-bold">デッキ構成</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {isHost && (
                                <button
                                    onClick={() => setShowDeckConfigModal(true)}
                                    className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-sm transition-colors border border-purple-500/30"
                                >
                                    デッキ調整
                                </button>
                            )}
                            <div className="text-xs text-gray-400">
                                自動生成
                            </div>
                        </div>
                    </div>

                    {deckInfo && (
                        <>
                            {/* カード枚数サマリー */}
                            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white mb-1">
                                        合計 {deckInfo.targetTotal}枚
                                    </div>
                                    <div className="text-sm text-gray-300">
                                        {deckInfo.playerCount}人 × 4枚 = {deckInfo.targetTotal}枚
                                    </div>
                                </div>
                            </div>

                            {/* 必須カード */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Lock className="w-4 h-4 text-yellow-400" />
                                    <span className="text-sm font-bold text-yellow-400">必須カード</span>
                                    <span className="text-xs text-gray-400">({deckInfo.mandatoryTotal}枚)</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {deckInfo.mandatoryCards.map(({ type, count }) => (
                                        <div
                                            key={type}
                                            className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
                                        >
                                            <span className="text-sm font-medium truncate">
                                                {CARD_DEFINITIONS[type].name}
                                            </span>
                                            <span className="text-sm font-bold text-yellow-400 ml-2">
                                                ×{count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ランダム枠 */}
                            {!deckInfo.isFullDeck && deckInfo.randomCount > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shuffle className="w-4 h-4 text-cyan-400" />
                                        <span className="text-sm font-bold text-cyan-400">ランダム枠</span>
                                        <span className="text-xs text-gray-400">({deckInfo.randomCount}枚)</span>
                                    </div>
                                    <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                                        <div className="text-sm text-gray-300 mb-2">
                                            以下のカードからランダムに{deckInfo.randomCount}枚が選ばれます：
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {randomPoolCards.map(({ type, name, maxCount }) => (
                                                <span
                                                    key={type}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/10 text-gray-300"
                                                >
                                                    {name}
                                                    <span className="ml-1 text-cyan-400">(~{maxCount})</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 8人プレイ時の説明 */}
                            {deckInfo.isFullDeck && (
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                    <div className="text-sm text-green-400 text-center">
                                        🎴 8人プレイ: 全32枚のカードを使用します
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 警告表示 */}
                {roomState.players.length < 3 && (
                    <div className="card-base p-4 mb-4 bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-center gap-2 text-yellow-400">
                            <AlertCircle className="w-5 h-5" />
                            <span>ゲーム開始には最低3人必要です（現在: {roomState.players.length}人）</span>
                        </div>
                    </div>
                )}

                {/* デッキエラー警告 */}
                {!deckValidation.isValid && (
                    <div className="card-base p-4 mb-4 bg-red-500/10 border border-red-500/30">
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            <span>{deckValidation.message}</span>
                        </div>
                    </div>
                )}

                {/* アクションボタン */}
                <div className="space-y-3">
                    <button
                        onClick={handleStartGame}
                        disabled={!canStart || !deckValidation.isValid}
                        className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
                    >
                        <Play className="w-5 h-5" />
                        ゲームスタート
                    </button>

                    <button
                        onClick={handleLeave}
                        className="btn-secondary w-full"
                    >
                        退出する
                    </button>
                </div>
            </div>
            {/* デッキ設定モーダル */}
            {(localRoomState || (isOnlineMode && onlineRoomState)) && (
                <DeckConfigModal
                    isOpen={showDeckConfigModal}
                    onClose={() => setShowDeckConfigModal(false)}
                    onSave={(newConfig) => {
                        if (isOnlineMode && onUpdateDeckConfig) {
                            onUpdateDeckConfig(newConfig);
                        } else if (localRoomState) {
                            const newState = updateDeckConfig(localRoomState, newConfig);
                            setLocalRoomState(newState);
                        }
                        setShowDeckConfigModal(false);
                    }}
                    initialConfig={(isOnlineMode ? onlineRoomState?.deckConfig : localRoomState?.deckConfig) || {
                        inventory: DEFAULT_INVENTORY,
                        mandatory: DEFAULT_MANDATORY_CARDS
                    }}
                />
            )}
        </div>
    );
}
