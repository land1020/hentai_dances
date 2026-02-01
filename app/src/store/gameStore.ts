// ====================================
// ゲーム状態管理ストア（ローカルモード）
// ====================================

import type { Player, GameState, Card } from '../types';
import { GamePhase } from '../types';

// ルーム状態の型（deckConfigは削除 - 自動生成されるため）
export interface LocalRoomState {
    roomId: string;
    hostId: string;
    players: Player[];
    status: 'WAITING' | 'PLAYING' | 'FINISHED';
    gameState: GameState | null;
    debugMode: boolean;
}

// ローカルストレージキー
const ROOM_STATE_KEY = 'hentai_room_state';


export const PLAYER_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal/Cyan
    '#FFE66D', // Yellow
    '#1A535C', // Dark Blue
    '#FF9F1C', // Orange
    '#9B5DE5', // Purple
    '#F15BB5', // Pink
    '#00BBF9', // Blue
    '#8AC926', // Lime Green
    '#CD84F1', // Lavender
    '#ED4C67', // Rose
    '#795548', // Brown
];

// 初期状態を作成
export function createInitialRoomState(roomId: string, hostId: string, hostName: string): LocalRoomState {
    return {
        roomId,
        hostId,
        players: [{
            id: hostId,
            name: hostName,
            hand: [],
            isNpc: false,
            isAlive: true,
            team: 'CITIZEN',
            currentPrefix: '常識人な',
            assignedWord: null,
            hentaiLevel: 0,
            isCursed: false,
            cursedPrefix: null,
            color: PLAYER_COLORS[0],
        }],
        status: 'WAITING',
        gameState: null,
        debugMode: true,
    };
}

// ルーム状態を保存
export function saveRoomState(state: LocalRoomState): void {
    localStorage.setItem(ROOM_STATE_KEY, JSON.stringify(state));
}

// ルーム状態を読み込み
export function loadRoomState(): LocalRoomState | null {
    const saved = localStorage.getItem(ROOM_STATE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return null;
        }
    }
    return null;
}

// ルーム状態をクリア
export function clearRoomState(): void {
    localStorage.removeItem(ROOM_STATE_KEY);
}

// NPCを追加
export function addNpc(state: LocalRoomState): LocalRoomState {
    if (state.players.length >= 8) {
        return state;
    }

    const npcNumber = state.players.filter(p => p.isNpc).length + 1;
    const npcId = `npc-${Date.now()}-${npcNumber}`;

    const newPlayer: Player = {
        id: npcId,
        name: `NPC ${npcNumber}`,
        hand: [],
        isNpc: true,
        isAlive: true,
        team: 'CITIZEN',
        currentPrefix: '常識人な',
        assignedWord: null,
        hentaiLevel: 0,
        isCursed: false,
        cursedPrefix: null,
        color: PLAYER_COLORS[state.players.length % PLAYER_COLORS.length],
    };

    const newState = {
        ...state,
        players: [...state.players, newPlayer],
    };

    saveRoomState(newState);
    return newState;
}

// NPCを削除（最後のNPCを削除）
export function removeNpc(state: LocalRoomState): LocalRoomState {
    const npcPlayers = state.players.filter(p => p.isNpc);
    if (npcPlayers.length === 0) {
        return state;
    }

    const lastNpcId = npcPlayers[npcPlayers.length - 1].id;

    const newState = {
        ...state,
        players: state.players.filter(p => p.id !== lastNpcId),
    };

    saveRoomState(newState);
    return newState;
}

// プレイヤーカラーを更新
export function updatePlayerColor(state: LocalRoomState, playerId: string, color: string): LocalRoomState {
    const newState = {
        ...state,
        players: state.players.map(p =>
            p.id === playerId ? { ...p, color } : p
        ),
    };
    saveRoomState(newState);
    return newState;
}

// プレイヤー名を更新
export function updatePlayerName(state: LocalRoomState, playerId: string, name: string): LocalRoomState {
    const newState = {
        ...state,
        players: state.players.map(p =>
            p.id === playerId ? { ...p, name } : p
        ),
    };
    saveRoomState(newState);
    return newState;
}

// ゲーム開始
export function startGame(state: LocalRoomState): LocalRoomState {
    const newState = {
        ...state,
        status: 'PLAYING' as const,
        gameState: {
            phase: GamePhase.SETUP,
            players: state.players,
            activePlayerIndex: 0,
            turnCount: 0,
            roundNumber: 1,
            tableCards: [] as Card[],
            winner: null,
            victoryInfo: null,
            pendingAction: null,
            dangerWord: null,
            playedLog: [],
        },
    };

    saveRoomState(newState);
    return newState;
}
