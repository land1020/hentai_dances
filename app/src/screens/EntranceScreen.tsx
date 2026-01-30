// ====================================
// 入室画面: 変態は踊る（オンライン/ローカル対応）
// ====================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Trophy, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { loadRoomState, clearRoomState } from '../store/gameStore';
import {
    createRoom,
    joinRoom,
    roomExists
} from '../services/roomService';
import { getOrCreateUserId, setPlayerName } from '../hooks/useOnlineRoom';
import type { Player } from '../types';

type GameMode = 'select' | 'online' | 'local';

export default function EntranceScreen() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [isDebugMode, setIsDebugMode] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [gameMode, setGameMode] = useState<GameMode>('select');

    // 保存された名前を復元
    useEffect(() => {
        const savedName = localStorage.getItem('hentai_player_name');
        if (savedName) {
            setName(savedName);
        }
    }, []);

    // オンラインモード入室（作成または参加）（ローカルモードと同じ挙動）
    const handleEnterOnlineRoom = async () => {
        if (!name.trim()) {
            setError('名前を入力してください');
            return;
        }
        if (name.length > 10) {
            setError('名前は10文字以内で入力してください');
            return;
        }
        if (!roomId.match(/^\d{4}$/)) {
            setError('部屋番号は4桁の数字で入力してください');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const userId = getOrCreateUserId();
            setPlayerName(name.trim());

            const player: Player = {
                id: userId,
                name: name.trim(),
                isNpc: false,
                hand: [],
                isAlive: true,
                team: 'CITIZEN',
                hentaiLevel: 0,
                currentPrefix: null,
                assignedWord: null,
                isCursed: false,
                cursedPrefix: null,
                color: '#8B5CF6',
            };

            // 存在確認
            const exists = await roomExists(roomId);

            if (exists) {
                // 参加
                const success = await joinRoom(roomId, player);
                if (!success) {
                    setError('ルームに参加できません（満員またはゲーム中）');
                    setIsLoading(false);
                    return;
                }
            } else {
                // 作成
                await createRoom(roomId, userId, player);
            }

            // オンラインフラグ保存
            localStorage.setItem('hentai_game_mode', 'online');
            localStorage.setItem('hentai_room_id', roomId);

            navigate(`/online-lobby/${roomId}`);
        } catch (err) {
            console.error('オンライン入室エラー:', err);
            setError('エラーが発生しました。もう一度お試しください。');
        } finally {
            setIsLoading(false);
        }
    };

    // ローカルモード入室
    const handleJoinLocalRoom = async () => {
        if (!name.trim()) {
            setError('名前を入力してください');
            return;
        }
        if (name.length > 10) {
            setError('名前は10文字以内で入力してください');
            return;
        }
        if (!roomId.match(/^\d{4}$/)) {
            setError('部屋番号は4桁の数字で入力してください');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const userId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            localStorage.setItem('hentai_player_name', name.trim());
            localStorage.setItem('hentai_room_id', roomId);
            localStorage.setItem('hentai_user_id', userId);
            localStorage.setItem('hentai_debug_mode', String(isDebugMode));
            localStorage.setItem('hentai_game_mode', 'local');

            navigate(`/lobby/${roomId}`);
        } catch (err) {
            console.error('入室エラー:', err);
            setError('入室に失敗しました。もう一度お試しください。');
        } finally {
            setIsLoading(false);
        }
    };

    // ルーム情報リセット
    const handleReset = () => {
        if (!roomId.match(/^\d{4}$/)) {
            setError('リセットしたい部屋番号（4桁）を入力欄に入力してください');
            return;
        }

        if (!window.confirm(`部屋番号 ${roomId} のデータを本当にリセットしますか？\nこの操作は取り消せません。`)) {
            return;
        }

        const savedState = loadRoomState();

        if (savedState && savedState.roomId === roomId) {
            clearRoomState();
            localStorage.removeItem('hentai_room_id');
            alert(`部屋番号 ${roomId} の情報をリセットしました。`);
            setRoomId('');
            window.location.reload();
        } else if (!savedState) {
            setError('保存されているルーム情報はありません。');
        } else {
            setError(`入力された部屋番号と保存データの部屋番号が一致しません。\n(保存されている部屋: ${savedState.roomId})`);
        }
    };

    // 殿堂入りページへ
    const handleHallOfFame = () => {
        navigate('/hall-of-fame');
    };

    // モード選択画面
    if (gameMode === 'select') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md animate-fadeIn">
                    {/* タイトル */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-2">
                            変態は踊る
                        </h1>
                        <p className="text-gray-400 text-sm">
                            心理戦カードゲーム
                        </p>
                    </div>

                    {/* モード選択カード */}
                    <div className="space-y-4">
                        {/* オンラインモード */}
                        <button
                            onClick={() => setGameMode('online')}
                            className="w-full card-base p-6 hover:bg-white/10 transition-colors text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                                    <Wifi className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                                        オンラインで遊ぶ
                                    </h2>
                                    <p className="text-sm text-gray-400">
                                        友達とリアルタイムで対戦
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* ローカルモード */}
                        <button
                            onClick={() => setGameMode('local')}
                            className="w-full card-base p-6 hover:bg-white/10 transition-colors text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                                    <WifiOff className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                                        ローカルで遊ぶ
                                    </h2>
                                    <p className="text-sm text-gray-400">
                                        NPCと練習・テストプレイ
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* 殿堂入りボタン */}
                    <div className="text-center mt-8">
                        <button
                            onClick={handleHallOfFame}
                            className="flex items-center justify-center gap-2 mx-auto text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                            <Trophy className="w-5 h-5" />
                            殿堂入りを見る
                        </button>
                    </div>

                    {/* フッター */}
                    <div className="text-center mt-8 text-xs text-gray-600">
                        © 2024 変態は踊る - All Rights Reserved
                    </div>
                </div>
            </div>
        );
    }

    // オンラインモード画面
    if (gameMode === 'online') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md animate-fadeIn">
                    {/* ヘッダー */}
                    <div className="text-center mb-6">
                        <button
                            onClick={() => setGameMode('select')}
                            className="text-gray-400 hover:text-white mb-4 inline-block"
                        >
                            ← 戻る
                        </button>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500 mb-2">
                            オンラインモード
                        </h1>
                        <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
                            <Wifi className="w-4 h-4 text-green-500" />
                            友達とリアルタイムで対戦
                        </p>
                    </div>

                    {/* メインカード */}
                    <div className="card-base p-6 space-y-6">
                        {/* エラー表示 */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {/* 名前入力 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                お名前
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例: ど変態"
                                maxLength={10}
                                className="input-field"
                            />
                        </div>

                        {/* 部屋番号入力 (4桁) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                部屋番号（4桁）
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="1234"
                                maxLength={4}
                                className="input-field text-center text-xl tracking-widest"
                            />
                        </div>

                        {/* 参加/作成ボタン */}
                        <button
                            onClick={handleEnterOnlineRoom}
                            disabled={isLoading}
                            className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Trophy className="w-5 h-5" />
                                    部屋に入る / 作る
                                </>
                            )}
                        </button>
                    </div>

                    {/* 下部リセットボタン等 */}
                    <div className="pt-2">
                        <button
                            onClick={handleReset}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm transition-colors border border-white/10"
                        >
                            ルーム情報をリセット
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ローカルモード画面
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-fadeIn">
                {/* ヘッダー */}
                <div className="text-center mb-6">
                    <button
                        onClick={() => setGameMode('select')}
                        className="text-gray-400 hover:text-white mb-4 inline-block"
                    >
                        ← 戻る
                    </button>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                        ローカルモード
                    </h1>
                    <p className="text-yellow-500 text-sm flex items-center justify-center gap-2">
                        <Wrench className="w-4 h-4" />
                        NPCと練習・テストプレイ
                    </p>
                </div>

                {/* メインカード */}
                <div className="card-base p-6 space-y-6">
                    {/* エラー表示 */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* 名前入力 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            お名前
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例: ど変態"
                            maxLength={10}
                            className="input-field"
                        />
                    </div>

                    {/* 部屋番号入力 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            部屋番号（4桁）
                        </label>
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setRoomId(value);
                            }}
                            placeholder="1234"
                            maxLength={4}
                            className="input-field text-center text-2xl tracking-widest"
                        />
                    </div>

                    {/* テストモード */}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <input
                            type="checkbox"
                            id="debugMode"
                            checked={isDebugMode}
                            onChange={(e) => setIsDebugMode(e.target.checked)}
                            className="w-5 h-5 accent-purple-500"
                        />
                        <label htmlFor="debugMode" className="flex items-center gap-2 cursor-pointer">
                            <Wrench className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm">テストモード（NPC機能など）</span>
                        </label>
                    </div>

                    {/* 入室ボタン */}
                    <button
                        onClick={handleJoinLocalRoom}
                        disabled={isLoading || !name.trim() || roomId.length !== 4}
                        className="btn-primary w-full text-lg py-4"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                接続中...
                            </span>
                        ) : (
                            '部屋に入る / 作る'
                        )}
                    </button>

                    {/* リセットボタン */}
                    <button
                        onClick={handleReset}
                        className="btn-secondary w-full text-sm"
                    >
                        ルーム情報をリセット
                    </button>
                </div>
            </div>
        </div>
    );
}
