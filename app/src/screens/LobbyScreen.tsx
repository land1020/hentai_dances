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
import type { CardType } from '../types';
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
import { CARD_INVENTORY } from '../utils/deckFactory';
import { initializeGame } from '../engine/GameEngine';

// 参加人数ごとの必須カード構成
const MANDATORY_CARDS_CONFIG: Record<number, Partial<Record<CardType, number>>> = {
    3: {
        first_discoverer: 1,
        culprit: 1,
        detective: 1,
        alibi: 2,
    },
    4: {
        first_discoverer: 1,
        culprit: 1,
        detective: 1,
        alibi: 2,
        plot: 1,
    },
    5: {
        first_discoverer: 1,
        culprit: 1,
        detective: 1,
        alibi: 2,
        plot: 1,
    },
    6: {
        first_discoverer: 1,
        culprit: 1,
        detective: 2,
        alibi: 2,
        plot: 2,
    },
    7: {
        first_discoverer: 1,
        culprit: 1,
        detective: 2,
        alibi: 3,
        plot: 2,
    },
    8: {
        // 8人は全カード使用
    },
};

export default function LobbyScreen() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [roomState, setRoomState] = useState<LocalRoomState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingNpcId, setEditingNpcId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // 初期化
    useEffect(() => {
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

        setRoomState(state);
        setIsLoading(false);
    }, [roomId, navigate]);

    // NPC追加
    const handleAddNpc = () => {
        if (roomState) {
            const newState = addNpc(roomState);
            setRoomState(newState);
        }
    };

    // NPC削除
    const handleRemoveNpc = () => {
        if (roomState) {
            const newState = removeNpc(roomState);
            setRoomState(newState);
        }
    };

    // ゲーム開始
    const handleStartGame = () => {
        if (roomState) {
            // ゲームを初期化（カードを配布）
            const gameState = initializeGame(roomState.players);

            const newState: LocalRoomState = {
                ...roomState,
                status: 'PLAYING',
                gameState,
            };

            saveRoomState(newState);
            setRoomState(newState);
            navigate(`/game/${roomId}`);
        }
    };

    // 退出
    const handleLeave = () => {
        navigate('/');
    };

    // NPC名編集開始
    const handleStartEditNpcName = (playerId: string, currentName: string) => {
        setEditingNpcId(playerId);
        setEditingName(currentName);
    };

    // NPC名編集確定
    const handleConfirmNpcName = () => {
        if (roomState && editingNpcId && editingName.trim()) {
            const newState = updatePlayerName(roomState, editingNpcId, editingName.trim());
            setRoomState(newState);
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

        // 8人の場合は全カード使用
        if (playerCount === 8) {
            const allCards: { type: CardType; count: number; isMandatory: boolean }[] = [];
            for (const [type, count] of Object.entries(CARD_INVENTORY)) {
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
                mandatoryTotal: 32,
                randomCount: 0,
                isFullDeck: true,
            };
        }

        // 必須カードを取得
        const mandatoryConfig = MANDATORY_CARDS_CONFIG[playerCount] || {};
        const mandatoryCards: { type: CardType; count: number; isMandatory: boolean }[] = [];
        let mandatoryTotal = 0;

        for (const [type, count] of Object.entries(mandatoryConfig)) {
            if (count > 0) {
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

        const pool: { type: CardType; name: string; maxCount: number }[] = [];

        for (const [type, inventoryCount] of Object.entries(CARD_INVENTORY)) {
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
    const npcCount = roomState.players.filter(p => p.isNpc).length;

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
                        <div className="text-sm text-yellow-500">🔧 ローカルモード</div>
                    </div>
                </div>

                {/* 参加者リスト */}
                <div className="card-base p-4 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-bold">参加者 ({roomState.players.length}/8)</h2>
                    </div>

                    <div className="space-y-2">
                        {roomState.players.map((player, index) => (
                            <div
                                key={player.id}
                                className={`flex items-center justify-between p-3 rounded-lg ${player.isNpc
                                    ? 'bg-blue-500/10 border border-blue-500/30'
                                    : 'bg-purple-500/10 border border-purple-500/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {player.isNpc ? (
                                        <Bot className="w-6 h-6 text-blue-400" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold">
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

                    {/* NPC管理（デバッグモード） */}
                    {roomState.debugMode && (
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
                            const isSelected = roomState.players.find(p => p.id === roomState.hostId)?.color === color;
                            const isTaken = roomState.players.some(p => p.color === color && p.id !== roomState.hostId);

                            return (
                                <button
                                    key={color}
                                    onClick={() => {
                                        if (roomState) {
                                            const newState = updatePlayerColor(roomState, roomState.hostId, color);
                                            setRoomState(newState);
                                        }
                                    }}
                                    disabled={isTaken}
                                    className={`
                                        w-10 h-10 rounded-full transition-all flex items-center justify-center
                                        ${isSelected ? 'ring-4 ring-white scale-110' : 'hover:scale-110'}
                                        ${isTaken ? 'opacity-30 cursor-not-allowed ring-2 ring-gray-500' : ''}
                                    `}
                                    style={{ backgroundColor: color }}
                                >
                                    {isSelected && <Crown className="w-5 h-5 text-white drop-shadow-md" />}
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
                        <div className="text-xs text-gray-400">
                            自動生成
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

                {/* アクションボタン */}
                <div className="space-y-3">
                    <button
                        onClick={handleStartGame}
                        disabled={!canStart}
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
        </div>
    );
}
