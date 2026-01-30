// ====================================
// オンラインロビー画面: 変態は踊る
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
    Lock,
    Copy,
    Check,
    Wifi
} from 'lucide-react';
import HentaiGauge from '../components/HentaiGauge';
import type { CardType, Player } from '../types';
import { useOnlineRoom, getOrCreateUserId } from '../hooks/useOnlineRoom';
import { CARD_DEFINITIONS } from '../data/cards';
import { CARD_INVENTORY } from '../utils/deckFactory';
import { initializeGame } from '../engine/GameEngine';

// NPC名リスト
const NPC_NAMES = [
    'AI太郎', 'AI花子', 'AI次郎', 'AI三郎',
    'ボット1号', 'ボット2号', 'ボット3号', 'ボット4号'
];

// 参加人数ごとの必須カード構成
const MANDATORY_CARDS_CONFIG: Record<number, Partial<Record<CardType, number>>> = {
    3: { first_discoverer: 1, culprit: 1, detective: 1, alibi: 2 },
    4: { first_discoverer: 1, culprit: 1, detective: 1, alibi: 2, plot: 1 },
    5: { first_discoverer: 1, culprit: 1, detective: 1, alibi: 2, plot: 1 },
    6: { first_discoverer: 1, culprit: 1, detective: 2, alibi: 2, plot: 2 },
    7: { first_discoverer: 1, culprit: 1, detective: 2, alibi: 3, plot: 2 },
    8: {},
};

export default function OnlineLobbyScreen() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const userId = getOrCreateUserId();

    const {
        room,
        isLoading,
        error,
        isConnected,
        addNpc,
        removeNpc,
        updatePlayerName,
        startGame,
        leaveCurrentRoom
    } = useOnlineRoom(roomId || null);

    const [copied, setCopied] = useState(false);
    const [editingNpcId, setEditingNpcId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // ルームがなくなったらエントランスへ
    useEffect(() => {
        if (!isLoading && !room && !error) {
            navigate('/');
        }
    }, [room, isLoading, error, navigate]);

    // ゲーム開始されたらゲーム画面へ
    useEffect(() => {
        if (room?.status === 'PLAYING' && room.gameState) {
            navigate(`/online-game/${roomId}`);
        }
    }, [room?.status, room?.gameState, roomId, navigate]);

    // ルームIDをコピー
    const handleCopyRoomId = async () => {
        if (!roomId) return;
        try {
            await navigator.clipboard.writeText(roomId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // フォールバック
            const input = document.createElement('input');
            input.value = roomId;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // NPC追加
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
            currentPrefix: null,
            assignedWord: null,
            isCursed: false,
            cursedPrefix: null,
            color: '#3B82F6',
        };

        await addNpc(npc);
    };

    // NPC削除
    const handleRemoveNpc = async () => {
        if (!room) return;
        const npcs = room.players.filter(p => p.isNpc);
        if (npcs.length === 0) return;

        const lastNpc = npcs[npcs.length - 1];
        await removeNpc(lastNpc.id);
    };

    // ゲーム開始
    const handleStartGame = async () => {
        if (!room) return;

        // ゲームを初期化（カードを配布）
        const gameState = initializeGame(room.players);
        await startGame(gameState);
    };

    // 退出
    const handleLeave = async () => {
        await leaveCurrentRoom(userId);
        navigate('/');
    };

    // NPC名編集
    const handleStartEditNpcName = (playerId: string, currentName: string) => {
        setEditingNpcId(playerId);
        setEditingName(currentName);
    };

    const handleConfirmNpcName = async () => {
        if (editingNpcId && editingName.trim()) {
            await updatePlayerName(editingNpcId, editingName.trim());
        }
        setEditingNpcId(null);
        setEditingName('');
    };

    const handleCancelEditNpcName = () => {
        setEditingNpcId(null);
        setEditingName('');
    };

    // デッキ情報を計算
    const deckInfo = useMemo(() => {
        if (!room) return null;

        const playerCount = room.players.length;
        const targetTotal = playerCount * 4;

        if (playerCount === 8) {
            const allCards: { type: CardType; count: number; isMandatory: boolean }[] = [];
            for (const [type, count] of Object.entries(CARD_INVENTORY)) {
                if (count > 0) {
                    allCards.push({ type: type as CardType, count, isMandatory: true });
                }
            }
            return {
                playerCount, targetTotal,
                mandatoryCards: allCards, mandatoryTotal: 32, randomCount: 0, isFullDeck: true,
            };
        }

        const mandatoryConfig = MANDATORY_CARDS_CONFIG[playerCount] || {};
        const mandatoryCards: { type: CardType; count: number; isMandatory: boolean }[] = [];
        let mandatoryTotal = 0;

        for (const [type, count] of Object.entries(mandatoryConfig)) {
            if (count > 0) {
                mandatoryCards.push({ type: type as CardType, count, isMandatory: true });
                mandatoryTotal += count;
            }
        }

        const randomCount = targetTotal - mandatoryTotal;
        return { playerCount, targetTotal, mandatoryCards, mandatoryTotal, randomCount, isFullDeck: false };
    }, [room?.players.length]);

    // ランダム候補カード一覧
    const randomPoolCards = useMemo(() => {
        if (!deckInfo || deckInfo.isFullDeck) return [];

        const pool: { type: CardType; name: string; maxCount: number }[] = [];
        for (const [type, inventoryCount] of Object.entries(CARD_INVENTORY)) {
            const cardType = type as CardType;
            const mandatoryUsed = deckInfo.mandatoryCards.find(c => c.type === cardType)?.count || 0;
            const remaining = inventoryCount - mandatoryUsed;
            if (remaining > 0) {
                pool.push({ type: cardType, name: CARD_DEFINITIONS[cardType].name, maxCount: remaining });
            }
        }
        return pool;
    }, [deckInfo]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">接続中...</div>
            </div>
        );
    }

    if (error || !room) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-xl text-red-400 mb-4">{error || 'ルームが見つかりません'}</div>
                    <button onClick={() => navigate('/')} className="btn-primary">
                        トップに戻る
                    </button>
                </div>
            </div>
        );
    }

    const isHost = room.hostId === userId;
    const canStart = room.players.length >= 3 && room.players.length <= 8;
    const npcCount = room.players.filter(p => p.isNpc).length;

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
                            <h1 className="text-2xl font-bold">オンラインロビー</h1>
                            <div className="flex items-center gap-2">
                                <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                                <span className="text-gray-400 text-sm">ルームID: </span>
                                <button
                                    onClick={handleCopyRoomId}
                                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono font-bold"
                                >
                                    {roomId}
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-green-400">🌐 オンラインモード</div>
                    </div>
                </div>

                {/* 参加者リスト */}
                <div className="card-base p-4 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-bold">参加者 ({room.players.length}/8)</h2>
                    </div>

                    <div className="space-y-2">
                        {room.players.map((player, index) => (
                            <div
                                key={player.id}
                                className={`flex items-center justify-between p-3 rounded-lg ${player.isNpc
                                    ? 'bg-blue-500/10 border border-blue-500/30'
                                    : player.id === userId
                                        ? 'bg-green-500/10 border border-green-500/30'
                                        : 'bg-purple-500/10 border border-purple-500/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {player.isNpc ? (
                                        <Bot className="w-6 h-6 text-blue-400" />
                                    ) : (
                                        <div className={`w-6 h-6 rounded-full ${player.id === userId ? 'bg-green-500' : 'bg-purple-500'} flex items-center justify-center text-sm font-bold`}>
                                            {index + 1}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            {player.isNpc && isHost && editingNpcId === player.id ? (
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
                                                    className={`font-medium ${player.isNpc && isHost ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
                                                    onClick={() => player.isNpc && isHost && handleStartEditNpcName(player.id, player.name)}
                                                    title={player.isNpc && isHost ? 'クリックして名前を編集' : undefined}
                                                >
                                                    {player.name}
                                                    {player.id === userId && <span className="text-green-400 text-xs ml-2">(あなた)</span>}
                                                </span>
                                            )}
                                            <HentaiGauge level={player.hentaiLevel || 0} />
                                        </div>
                                        {player.currentPrefix && (
                                            <span className="text-xs text-gray-400">{player.currentPrefix}</span>
                                        )}
                                    </div>
                                    {player.id === room.hostId && (
                                        <span className="flex items-center gap-1 text-yellow-500 text-xs ml-2">
                                            <Crown className="w-4 h-4" />
                                            HOST
                                        </span>
                                    )}
                                </div>
                                {player.isNpc && <span className="text-xs text-blue-400">AI</span>}
                            </div>
                        ))}
                    </div>

                    {/* NPC管理（ホストのみ） */}
                    {isHost && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">NPC設定 ({npcCount}人)</span>
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
                                        disabled={room.players.length >= 8}
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

                {/* デッキ構成 */}
                <div className="card-base p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-purple-400" />
                            <h2 className="text-lg font-bold">デッキ構成</h2>
                        </div>
                        <div className="text-xs text-gray-400">自動生成</div>
                    </div>

                    {deckInfo && (
                        <>
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

                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Lock className="w-4 h-4 text-yellow-400" />
                                    <span className="text-sm font-bold text-yellow-400">必須カード</span>
                                    <span className="text-xs text-gray-400">({deckInfo.mandatoryTotal}枚)</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {deckInfo.mandatoryCards.map(({ type, count }) => (
                                        <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                            <span className="text-sm font-medium truncate">{CARD_DEFINITIONS[type].name}</span>
                                            <span className="text-sm font-bold text-yellow-400 ml-2">×{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

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
                                                <span key={type} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/10 text-gray-300">
                                                    {name}
                                                    <span className="ml-1 text-cyan-400">(~{maxCount})</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

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
                {room.players.length < 3 && (
                    <div className="card-base p-4 mb-4 bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-center gap-2 text-yellow-400">
                            <AlertCircle className="w-5 h-5" />
                            <span>ゲーム開始には最低3人必要です（現在: {room.players.length}人）</span>
                        </div>
                    </div>
                )}

                {/* アクションボタン */}
                <div className="space-y-3">
                    {isHost ? (
                        <button
                            onClick={handleStartGame}
                            disabled={!canStart}
                            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
                        >
                            <Play className="w-5 h-5" />
                            ゲームスタート
                        </button>
                    ) : (
                        <div className="text-center p-4 bg-white/5 rounded-lg">
                            <p className="text-gray-400">ホストがゲームを開始するのを待っています...</p>
                        </div>
                    )}

                    <button onClick={handleLeave} className="btn-secondary w-full">
                        退出する
                    </button>
                </div>
            </div>
        </div>
    );
}
