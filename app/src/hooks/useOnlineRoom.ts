// ====================================
// オンラインルーム用フック
// ====================================

import { useState, useEffect, useCallback } from 'react';
import {
    subscribeToRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    updatePlayers,
    updateGameState,
    updateRoom,
    roomExists,
    generateRoomId,
    type OnlineRoomState
} from '../services/roomService';
import type { Player, GameState } from '../types';

interface UseOnlineRoomResult {
    room: OnlineRoomState | null;
    isLoading: boolean;
    error: string | null;
    isConnected: boolean;
    // アクション
    createNewRoom: (hostId: string, hostPlayer: Player) => Promise<string>;
    joinExistingRoom: (roomId: string, player: Player) => Promise<boolean>;
    leaveCurrentRoom: (playerId: string) => Promise<void>;
    addNpc: (npc: Player) => Promise<void>;
    removeNpc: (npcId: string) => Promise<void>;
    updatePlayerName: (playerId: string, name: string) => Promise<void>;
    startGame: (gameState: GameState) => Promise<void>;
    syncGameState: (gameState: GameState) => Promise<void>;
    enterRoom: (roomId: string, player: Player) => Promise<{ success: boolean; message?: string; isNewRoom?: boolean }>;
}

export function useOnlineRoom(roomId: string | null): UseOnlineRoomResult {
    const [room, setRoom] = useState<OnlineRoomState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // ルームの監視
    useEffect(() => {
        if (!roomId) {
            setRoom(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const unsubscribe = subscribeToRoom(roomId, (updatedRoom) => {
            setRoom(updatedRoom);
            setIsLoading(false);
            setIsConnected(updatedRoom !== null);

            if (!updatedRoom) {
                setError('ルームが見つかりません');
            }
        });

        return () => {
            unsubscribe();
        };
    }, [roomId]);

    // 新規ルーム作成
    const createNewRoom = useCallback(async (hostId: string, hostPlayer: Player): Promise<string> => {
        let newRoomId = generateRoomId();

        // 重複チェック（念のため）
        let attempts = 0;
        while (await roomExists(newRoomId) && attempts < 10) {
            newRoomId = generateRoomId();
            attempts++;
        }

        await createRoom(newRoomId, hostId, hostPlayer);
        return newRoomId;
    }, []);

    // 既存ルームに参加
    const joinExistingRoom = useCallback(async (targetRoomId: string, player: Player): Promise<boolean> => {
        const exists = await roomExists(targetRoomId);
        if (!exists) {
            setError('ルームが見つかりません');
            return false;
        }

        const success = await joinRoom(targetRoomId, player);
        if (!success) {
            setError('ルームに参加できません（満員またはゲーム中）');
        }
        return success;
    }, []);

    // ルームから退出
    const leaveCurrentRoom = useCallback(async (playerId: string): Promise<void> => {
        if (!roomId) return;
        await leaveRoom(roomId, playerId);
    }, [roomId]);

    // NPC追加
    const addNpc = useCallback(async (npc: Player): Promise<void> => {
        if (!room || !roomId) return;
        if (room.players.length >= 8) return;

        const newPlayers = [...room.players, npc];
        await updatePlayers(roomId, newPlayers);
    }, [room, roomId]);

    // NPC削除
    const removeNpc = useCallback(async (npcId: string): Promise<void> => {
        if (!room || !roomId) return;

        const newPlayers = room.players.filter(p => p.id !== npcId);
        await updatePlayers(roomId, newPlayers);
    }, [room, roomId]);

    // プレイヤー名更新
    const updatePlayerName = useCallback(async (playerId: string, name: string): Promise<void> => {
        if (!room || !roomId) return;

        const newPlayers = room.players.map(p =>
            p.id === playerId ? { ...p, name } : p
        );
        await updatePlayers(roomId, newPlayers);
    }, [room, roomId]);

    // ゲーム開始
    const startGame = useCallback(async (gameState: GameState): Promise<void> => {
        if (!roomId) return;

        await updateRoom(roomId, {
            status: 'PLAYING',
            gameState,
        });
    }, [roomId]);

    // ゲーム状態同期
    const syncGameState = useCallback(async (gameState: GameState): Promise<void> => {
        if (!roomId) return;
        await updateGameState(roomId, gameState);
    }, [roomId]);

    // 指定IDで部屋に参加または作成
    const enterRoom = useCallback(async (targetRoomId: string, player: Player): Promise<{ success: boolean; message?: string; isNewRoom?: boolean }> => {
        const exists = await roomExists(targetRoomId);

        if (exists) {
            // 参加
            const success = await joinRoom(targetRoomId, player);
            if (!success) {
                return { success: false, message: 'ルームに参加できません（満員またはゲーム中）' };
            }
            return { success: true, isNewRoom: false };
        } else {
            // 作成
            await createRoom(targetRoomId, player.id, player);
            return { success: true, isNewRoom: true };
        }
    }, []);

    return {
        room,
        isLoading,
        error,
        isConnected,
        createNewRoom,
        joinExistingRoom,
        leaveCurrentRoom,
        addNpc,
        removeNpc,
        updatePlayerName,
        startGame,
        syncGameState,
        enterRoom,
    };
}

/**
 * ユーザーIDを取得または生成
 */
export function getOrCreateUserId(): string {
    const stored = localStorage.getItem('hentai_user_id');
    if (stored) return stored;

    const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('hentai_user_id', newId);
    return newId;
}

/**
 * プレイヤー名を取得または設定
 */
export function getPlayerName(): string {
    return localStorage.getItem('hentai_player_name') || 'プレイヤー';
}

export function setPlayerName(name: string): void {
    localStorage.setItem('hentai_player_name', name);
}
