// ====================================
// 殿堂入り画面: 変態は踊る
// ====================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Trophy,
    Crown,
    Trash2,
    User
} from 'lucide-react';
import type { GameResult } from '../types';

// ローカルストレージキー
const HALL_OF_FAME_KEY = 'hentai_hall_of_fame';

// 殿堂入りデータを読み込み
function loadHallOfFame(): GameResult[] {
    const saved = localStorage.getItem(HALL_OF_FAME_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return [];
        }
    }
    return [];
}

// 殿堂入りデータを保存
function saveHallOfFame(data: GameResult[]): void {
    localStorage.setItem(HALL_OF_FAME_KEY, JSON.stringify(data));
}

// 殿堂入りデータを追加
export function addToHallOfFame(result: GameResult): void {
    const existing = loadHallOfFame();
    existing.unshift(result); // 新しいものを先頭に
    // 最大20件まで保持
    const limited = existing.slice(0, 20);
    saveHallOfFame(limited);
}

export default function HallOfFameScreen() {
    const navigate = useNavigate();
    const [records, setRecords] = useState<GameResult[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    useEffect(() => {
        setRecords(loadHallOfFame());
    }, []);

    // 削除モード切り替え
    const toggleDeleteMode = () => {
        setIsDeleteMode(!isDeleteMode);
        setSelectedIds(new Set());
    };

    // 選択切り替え
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // 選択したものを削除
    const handleDelete = () => {
        const newRecords = records.filter(r => !selectedIds.has(r.id));
        saveHallOfFame(newRecords);
        setRecords(newRecords);
        setSelectedIds(new Set());
        setIsDeleteMode(false);
    };

    // トップへ戻る
    const handleBack = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-2xl mx-auto animate-fadeIn">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                            <h1 className="text-2xl font-bold">殿堂入り</h1>
                        </div>
                    </div>

                    {records.length > 0 && (
                        <button
                            onClick={toggleDeleteMode}
                            className={`p-2 rounded-lg transition-colors ${isDeleteMode ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'
                                }`}
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* 削除モードバー */}
                {isDeleteMode && selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-base p-3 mb-4 flex items-center justify-between bg-red-500/10 border border-red-500/30"
                    >
                        <span className="text-sm">{selectedIds.size}件選択中</span>
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1 rounded bg-red-500 text-white text-sm font-medium"
                        >
                            削除する
                        </button>
                    </motion.div>
                )}

                {/* 記録リスト */}
                {records.length === 0 ? (
                    <div className="card-base p-8 text-center">
                        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400">まだ記録がありません</p>
                        <p className="text-gray-500 text-sm mt-1">
                            ゲームをプレイすると、ここに結果が記録されます
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {records.map((record, index) => (
                            <motion.div
                                key={record.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => isDeleteMode && toggleSelect(record.id)}
                                className={`card-base p-4 transition-all ${isDeleteMode ? 'cursor-pointer' : ''
                                    } ${selectedIds.has(record.id) ? 'ring-2 ring-red-500 bg-red-500/10' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {index === 0 && (
                                            <Crown className="w-5 h-5 text-yellow-500" />
                                        )}
                                        <span className="font-bold">
                                            {record.winnerName}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${record.winnerRole === 'CULPRIT' || record.winnerRole === 'DETECTIVE'
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {record.winnerRole === 'CULPRIT' && '変態'}
                                            {record.winnerRole === 'DETECTIVE' && '警察'}
                                            {record.winnerRole === 'DOG' && '正常者'}
                                            {record.winnerRole === 'CITIZEN' && '市民'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(record.playedAt).toLocaleDateString('ja-JP')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {record.members.length}人
                                    </span>
                                    <span>{record.totalTurns}ターン</span>
                                </div>

                                {record.players && (
                                    <div className="mt-3 space-y-1">
                                        {[...record.players]
                                            .sort((a, b) => (b.hentaiLevel || 0) - (a.hentaiLevel || 0))
                                            .map((player, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex items-center justify-between text-xs px-2 py-1 rounded ${player.isWinner
                                                            ? 'bg-yellow-500/20'
                                                            : 'bg-gray-500/10'
                                                        }`}
                                                >
                                                    <span className={player.isWinner ? 'text-yellow-400' : 'text-gray-300'}>
                                                        {player.prefix}{player.name}
                                                    </span>
                                                    <span className={`font-bold ${(player.hentaiLevel || 0) >= 3 ? 'text-red-400' :
                                                            (player.hentaiLevel || 0) >= 2 ? 'text-orange-400' :
                                                                (player.hentaiLevel || 0) >= 1 ? 'text-yellow-400' :
                                                                    'text-gray-500'
                                                        }`}>
                                                        Lv.{player.hentaiLevel || 0}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
