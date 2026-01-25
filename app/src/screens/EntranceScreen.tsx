// ====================================
// 入室画面: 変態は踊る（ローカルモード）
// ====================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Trophy, RefreshCw } from 'lucide-react';

export default function EntranceScreen() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [isDebugMode, setIsDebugMode] = useState(true); // ローカルではデフォルトでON
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // 保存された名前を復元
    useEffect(() => {
        const savedName = localStorage.getItem('hentai_player_name');
        if (savedName) {
            setName(savedName);
        }
    }, []);

    // 入室処理（ローカルモード）
    const handleJoinRoom = async () => {
        // バリデーション
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
            // ローカルモード: localStorageに保存
            const userId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            localStorage.setItem('hentai_player_name', name.trim());
            localStorage.setItem('hentai_room_id', roomId);
            localStorage.setItem('hentai_user_id', userId);
            localStorage.setItem('hentai_debug_mode', String(isDebugMode));

            // ロビー画面へ遷移
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
        localStorage.removeItem('hentai_room_id');
        localStorage.removeItem('hentai_user_id');
        localStorage.removeItem('hentai_debug_mode');
        setRoomId('');
        setIsDebugMode(true);
        window.location.reload();
    };

    // 殿堂入りページへ
    const handleHallOfFame = () => {
        navigate('/hall-of-fame');
    };

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
                    <p className="text-yellow-500 text-xs mt-1">
                        🔧 ローカルデバッグモード
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
                        <p className="text-xs text-gray-500 mt-1">
                            最大10文字
                        </p>
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
                        <p className="text-xs text-gray-500 mt-1">
                            ローカルモードでは部屋番号は識別用です
                        </p>
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
                        onClick={handleJoinRoom}
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
                </div>

                {/* サブ機能 */}
                <div className="mt-6 space-y-3">
                    {/* ルーム情報リセット */}
                    <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">
                            前回のルーム情報をリセットしたい場合
                        </p>
                        <button
                            onClick={handleReset}
                            className="btn-secondary text-sm px-4 py-2"
                        >
                            ルーム情報をリセット
                        </button>
                    </div>

                    {/* 殿堂入りボタン */}
                    <div className="text-center">
                        <button
                            onClick={handleHallOfFame}
                            className="flex items-center justify-center gap-2 mx-auto text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                            <Trophy className="w-5 h-5" />
                            殿堂入りを見る
                        </button>
                    </div>
                </div>

                {/* フッター */}
                <div className="text-center mt-8 text-xs text-gray-600">
                    © 2024 変態は踊る - All Rights Reserved
                </div>
            </div>
        </div>
    );
}
