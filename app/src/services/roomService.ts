// ====================================
// ルームサービス: Firestore通信
// ====================================

import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    deleteDoc,
    runTransaction,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import type { Player, GameState } from '../types';

// オンラインルーム状態の型
export interface OnlineRoomState {
    roomId: string;
    hostId: string;
    players: Player[];
    status: 'WAITING' | 'PLAYING' | 'FINISHED';
    gameState: GameState | null;
    createdAt: Date;
    debugMode: boolean;
}

// Firestoreドキュメントの型
interface RoomDocument {
    hostId: string;
    players: Player[];
    status: 'WAITING' | 'PLAYING' | 'FINISHED';
    gameState: GameState | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: any; // Firestore Timestamp or FieldValue
    debugMode: boolean;
}

const ROOMS_COLLECTION = 'hentai_rooms';

/**
 * 新しいルームを作成
 */
export async function createRoom(
    roomId: string,
    hostId: string,
    hostPlayer: Player
): Promise<void> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);

    const roomData: RoomDocument = {
        hostId,
        players: [hostPlayer],
        status: 'WAITING',
        gameState: null,
        createdAt: serverTimestamp(),
        debugMode: false,
    };

    await setDoc(roomRef, roomData);
}

/**
 * ルームが存在するか確認
 */
export async function roomExists(roomId: string): Promise<boolean> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    const snapshot = await getDoc(roomRef);
    return snapshot.exists();
}

/**
 * ルームを取得
 */
export async function getRoom(roomId: string): Promise<OnlineRoomState | null> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    const snapshot = await getDoc(roomRef);

    if (!snapshot.exists()) {
        return null;
    }

    const data = snapshot.data() as RoomDocument;
    return {
        roomId,
        hostId: data.hostId,
        players: data.players,
        status: data.status,
        gameState: data.gameState,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        debugMode: data.debugMode,
    };
}

/**
 * ルームにプレイヤーを追加
 */
export async function joinRoom(roomId: string, player: Player): Promise<boolean> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    const snapshot = await getDoc(roomRef);

    if (!snapshot.exists()) {
        return false;
    }

    const data = snapshot.data() as RoomDocument;

    // 既に参加している場合は何もしない
    if (data.players.some(p => p.id === player.id)) {
        return true;
    }

    // 8人制限
    if (data.players.length >= 8) {
        return false;
    }

    // ゲーム中は参加不可
    if (data.status !== 'WAITING') {
        return false;
    }

    await updateDoc(roomRef, {
        players: [...data.players, player],
    });

    return true;
}

/**
 * プレイヤーのカラーを更新
 */
export async function updatePlayerColor(roomId: string, playerId: string, color: string): Promise<void> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    const snapshot = await getDoc(roomRef);

    if (!snapshot.exists()) {
        return;
    }

    const data = snapshot.data() as RoomDocument;
    const newPlayers = data.players.map(p =>
        p.id === playerId ? { ...p, color } : p
    );

    await updateDoc(roomRef, { players: newPlayers });
}

/**
 * ルームからプレイヤーを削除（退出）
 */
export async function leaveRoom(roomId: string, playerId: string): Promise<void> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    const snapshot = await getDoc(roomRef);

    if (!snapshot.exists()) {
        return;
    }

    const data = snapshot.data() as RoomDocument;
    const newPlayers = data.players.filter(p => p.id !== playerId);

    // プレイヤーがいなくなったらルームを削除
    if (newPlayers.length === 0) {
        await deleteDoc(roomRef);
        return;
    }

    // ホストが抜けた場合は次のプレイヤーをホストに
    let newHostId = data.hostId;
    if (playerId === data.hostId && newPlayers.length > 0) {
        const humanPlayers = newPlayers.filter(p => !p.isNpc);
        newHostId = humanPlayers.length > 0 ? humanPlayers[0].id : newPlayers[0].id;
    }

    await updateDoc(roomRef, {
        players: newPlayers,
        hostId: newHostId,
    });
}

/**
 * プレイヤーリストを更新
 */
export async function updatePlayers(roomId: string, players: Player[]): Promise<void> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(roomRef, { players });
}

/**
 * ゲーム状態を更新
 */
export async function updateGameState(roomId: string, gameState: GameState): Promise<void> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(roomRef, { gameState });
}

/**
 * カード選択を送信（トランザクション処理）
 * 同時更新による上書きを防ぐため、現在のServer状態に対して自分の選択だけをマージする
 */
export async function submitCardSelectionTransaction(
    roomId: string,
    playerId: string,
    cardId: string
): Promise<void> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) {
            throw new Error("Room does not exist!");
        }

        const data = roomDoc.data() as RoomDocument;
        const currentGameState = data.gameState;

        if (!currentGameState || !currentGameState.exchangeState) {
            // 交換フェーズでない、または状態がおかしい場合は何もしない（あるいはエラー）
            return;
        }

        // 既存の選択状態を維持しつつ、自分の選択を追加
        const newSelections = {
            ...currentGameState.exchangeState.selections,
            [playerId]: cardId
        };

        const newExchangeState = {
            ...currentGameState.exchangeState,
            selections: newSelections
        };

        // gameStateを更新（exchangeStateのみ書き換え）
        const newGameState = {
            ...currentGameState,
            exchangeState: newExchangeState
        };

        transaction.update(roomRef, { gameState: newGameState });
    });
}

/**
 * ルームステータスを更新
 */
export async function updateRoomStatus(
    roomId: string,
    status: 'WAITING' | 'PLAYING' | 'FINISHED'
): Promise<void> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(roomRef, { status });
}

/**
 * ルーム全体を更新
 */
export async function updateRoom(roomId: string, data: Partial<OnlineRoomState>): Promise<void> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    const updateData: Record<string, unknown> = {};

    if (data.players !== undefined) updateData.players = data.players;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.gameState !== undefined) updateData.gameState = data.gameState;
    if (data.debugMode !== undefined) updateData.debugMode = data.debugMode;

    await updateDoc(roomRef, updateData);
}

/**
 * ルームをリアルタイム監視
 */
export function subscribeToRoom(
    roomId: string,
    callback: (room: OnlineRoomState | null) => void
): Unsubscribe {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);

    return onSnapshot(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }

        const data = snapshot.data() as RoomDocument;
        callback({
            roomId,
            hostId: data.hostId,
            players: data.players,
            status: data.status,
            gameState: data.gameState,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            debugMode: data.debugMode,
        });
    });
}

/**
 * ユニークなルームIDを生成
 */
export function generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * ルームを強制削除（リセット用）
 */
export async function deleteRoom(roomId: string): Promise<void> {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await deleteDoc(roomRef);
}
