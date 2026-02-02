
import { useState, useEffect } from 'react';
import { X, AlertCircle, Save, RotateCcw } from 'lucide-react';
import type { DeckConfig, CardType } from '../types';
import { CARD_DEFINITIONS } from '../data/cards';
import { DEFAULT_INVENTORY, DEFAULT_MANDATORY_CARDS } from '../utils/deckFactory';

interface DeckConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: DeckConfig) => void;
    initialConfig: DeckConfig;
}

export default function DeckConfigModal({ isOpen, onClose, onSave, initialConfig }: DeckConfigModalProps) {
    const [config, setConfig] = useState<DeckConfig>(initialConfig);
    const [activeTab, setActiveTab] = useState<'inventory' | number>('inventory');

    // 初期化
    useEffect(() => {
        if (isOpen) {
            setConfig(JSON.parse(JSON.stringify(initialConfig)));
        }
    }, [isOpen, initialConfig]);

    if (!isOpen) return null;

    // ---------------------------
    // ハンドラー
    // ---------------------------
    const updateInventory = (type: CardType, delta: number) => {
        setConfig(prev => {
            const current = prev.inventory[type] || 0;
            const newValue = Math.max(0, current + delta);
            return {
                ...prev,
                inventory: {
                    ...prev.inventory,
                    [type]: newValue
                }
            };
        });
    };

    const updateMandatory = (playerCount: number, type: CardType, delta: number) => {
        setConfig(prev => {
            const currentMap = prev.mandatory[playerCount] || {};
            const current = currentMap[type] || 0;
            const newValue = Math.max(0, current + delta);

            return {
                ...prev,
                mandatory: {
                    ...prev.mandatory,
                    [playerCount]: {
                        ...currentMap,
                        [type]: newValue
                    }
                }
            };
        });
    };

    const resetToDefault = () => {
        if (window.confirm('設定をデフォルトに戻しますか？')) {
            setConfig({
                inventory: { ...DEFAULT_INVENTORY },
                mandatory: JSON.parse(JSON.stringify(DEFAULT_MANDATORY_CARDS))
            });
        }
    };

    // ---------------------------
    // 計算・バリデーション
    // ---------------------------
    const inventoryTotal = Object.values(config.inventory).reduce((sum, n) => sum + n, 0);
    const isInventoryValid = inventoryTotal === 32;

    const getMandatoryCount = (playerCount: number) => {
        const map = config.mandatory[playerCount] || {};
        return Object.values(map).reduce((sum, n) => sum + (n || 0), 0);
    };

    // ---------------------------
    // レンダリング用データ
    // ---------------------------
    const cardTypes = Object.keys(CARD_DEFINITIONS) as CardType[];

    // カードタイプを役割ごとにグループ化（表示順序のため）
    const sortedCardTypes = cardTypes.sort((a, b) => {
        return CARD_DEFINITIONS[a].sortOrder - CARD_DEFINITIONS[b].sortOrder;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-purple-500/30 w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-purple-500/20 bg-purple-900/10">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            デッキ構成設定
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={resetToDefault}
                            className="p-2 text-sm text-gray-400 hover:text-white flex items-center gap-1 hover:bg-white/10 rounded"
                            title="初期設定に戻す"
                        >
                            <RotateCcw className="w-4 h-4" />
                            リセット
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'inventory'
                            ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-500'
                            : 'text-gray-400 hover:bg-white/5'
                            }`}
                    >
                        全体在庫 (32枚)
                    </button>
                    {[3, 4, 5, 6, 7].map(n => (
                        <button
                            key={n}
                            onClick={() => setActiveTab(n)}
                            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === n
                                ? 'bg-blue-500/20 text-blue-300 border-b-2 border-blue-500'
                                : 'text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            {n}人プレイ
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Error Message if inventory invalid */}
                    {!isInventoryValid && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 animate-pulse">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                            <div>
                                <h3 className="font-bold text-red-400">総枚数エラー</h3>
                                <p className="text-sm text-red-300">
                                    カードの合計を32枚にしてください（現在: {inventoryTotal}枚）
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inventory' ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-200">
                                    総カード在庫の設定
                                </h3>
                                <span className={`text-xl font-bold ${isInventoryValid ? 'text-green-400' : 'text-red-400'}`}>
                                    合計: {inventoryTotal} / 32
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {sortedCardTypes.map(type => {
                                    const count = config.inventory[type] || 0;
                                    return (
                                        <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <img
                                                    src={CARD_DEFINITIONS[type].icon}
                                                    alt=""
                                                    className="w-8 h-8 object-contain"
                                                    onError={() => {
                                                        // console.error failed image 
                                                        // (e.target as HTMLImageElement).src = '/fallback.png';
                                                    }}
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-medium truncate">{CARD_DEFINITIONS[type].name}</span>
                                                    <span className="text-xs text-gray-500 truncate">{CARD_DEFINITIONS[type].type}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateInventory(type, -1)}
                                                    className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg"
                                                    disabled={count <= 0}
                                                >
                                                    -
                                                </button>
                                                <span className="w-8 text-center font-bold text-xl">{count}</span>
                                                <button
                                                    onClick={() => updateInventory(type, 1)}
                                                    className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <div className='flex flex-col'>
                                    <h3 className="text-lg font-bold text-gray-200">
                                        {activeTab}人プレイ時の必須カード設定
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        残りの枠がランダムカードになります
                                    </p>
                                </div>
                                <div className='text-right'>
                                    <div className="text-xl font-bold text-blue-400">
                                        必須: {getMandatoryCount(activeTab as number)}枚
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        (目標: {(activeTab as number) * 4}枚)
                                    </div>
                                </div>
                            </div>

                            {/* Validation Warning for Mandatory */}
                            {getMandatoryCount(activeTab as number) > (activeTab as number) * 4 && (
                                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-300 text-sm">
                                    警告: 必須カード枚数が使用カード総数を超えています。
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {sortedCardTypes.map(type => {
                                    const mandatoryMap = config.mandatory[activeTab as number] || {};
                                    const count = mandatoryMap[type] || 0;
                                    const inventoryLimit = config.inventory[type] || 0;
                                    const isOverInventory = count > inventoryLimit;

                                    return (
                                        <div
                                            key={type}
                                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isOverInventory
                                                ? 'bg-red-500/10 border-red-500/50'
                                                : count > 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-medium truncate">{CARD_DEFINITIONS[type].name}</span>
                                                    <span className="text-xs text-gray-500">在庫: {inventoryLimit}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateMandatory(activeTab as number, type, -1)}
                                                    className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg"
                                                    disabled={count <= 0}
                                                >
                                                    -
                                                </button>
                                                <span className={`w-8 text-center font-bold text-xl ${isOverInventory ? 'text-red-400' : ''}`}>
                                                    {count}
                                                </span>
                                                <button
                                                    onClick={() => updateMandatory(activeTab as number, type, 1)}
                                                    className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg"
                                                    disabled={count >= inventoryLimit}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => onSave(config)}
                        disabled={!isInventoryValid}
                        className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${isInventoryValid
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105 shadow-lg shadow-purple-500/20'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <Save className="w-5 h-5" />
                        設定を保存
                    </button>
                </div>
            </div>
        </div>
    );
}
