// ====================================
// 逮捕/通報カード演出オーバーレイ
// ====================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ArrestAnimationInfo, CardType, Player } from '../types';
import { CARD_DEFINITIONS } from '../data/cards';
import arrestImage from '../assets/変態逮捕.png';

interface ArrestAnimationOverlayProps {
    animationInfo: ArrestAnimationInfo | null | undefined;
    players: Player[];
    onComplete: () => void;
}

type AnimationPhase = 'idle' | 'flip' | 'reveal' | 'result' | 'done';

export default function ArrestAnimationOverlay({
    animationInfo,
    players,
    onComplete
}: ArrestAnimationOverlayProps) {
    const [phase, setPhase] = useState<AnimationPhase>('idle');
    const [showOverlay, setShowOverlay] = useState(false);

    // 対象プレイヤーを取得
    const targetPlayer = animationInfo
        ? players.find(p => p.id === animationInfo.targetPlayerId)
        : null;

    // 表示するカードタイプ（成功時は変態、失敗時は選択されたカード）
    const displayCardType: CardType | null = animationInfo
        ? animationInfo.isSuccess
            ? 'culprit'
            : animationInfo.cardType === 'dog'
                ? animationInfo.selectedCardType || null
                : null
        : null;

    // カード定義
    const cardDef = displayCardType ? CARD_DEFINITIONS[displayCardType] : null;

    // アニメーション開始
    useEffect(() => {
        if (animationInfo) {
            setShowOverlay(true);
            setPhase('flip');

            // フェーズ遷移タイマー
            const flipTimer = setTimeout(() => {
                setPhase('reveal');
            }, 1200); // カード回転アニメーション

            const revealTimer = setTimeout(() => {
                setPhase('result');
            }, 2400); // カード表示

            const resultTimer = setTimeout(() => {
                setPhase('done');
            }, animationInfo.isSuccess ? 4500 : 3500); // 結果表示

            const completeTimer = setTimeout(() => {
                setShowOverlay(false);
                setPhase('idle');
                onComplete();
            }, animationInfo.isSuccess ? 5000 : 4000);

            return () => {
                clearTimeout(flipTimer);
                clearTimeout(revealTimer);
                clearTimeout(resultTimer);
                clearTimeout(completeTimer);
            };
        }
    }, [animationInfo, onComplete]);

    if (!animationInfo || !showOverlay) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* 背景エフェクト */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {animationInfo.isSuccess && phase === 'result' && (
                        <>
                            {/* 成功時の紙吹雪エフェクト */}
                            {[...Array(30)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-3 h-3 rounded-sm"
                                    style={{
                                        backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B5DE5', '#F15BB5'][i % 5],
                                        left: `${Math.random() * 100}%`,
                                        top: '-20px',
                                    }}
                                    animate={{
                                        y: ['0vh', '110vh'],
                                        x: [0, (Math.random() - 0.5) * 200],
                                        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                                    }}
                                    transition={{
                                        duration: 3 + Math.random() * 2,
                                        delay: Math.random() * 0.5,
                                        ease: 'linear',
                                    }}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* メインコンテンツ */}
                <div className="relative flex flex-col items-center gap-6">
                    {/* ターゲットプレイヤー名 */}
                    <motion.div
                        className="text-2xl font-bold text-white"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {targetPlayer?.name} のカードは...
                    </motion.div>

                    {/* カード */}
                    <div className="relative" style={{ perspective: '1000px' }}>
                        <motion.div
                            className="relative w-48 h-72 rounded-xl shadow-2xl"
                            style={{
                                transformStyle: 'preserve-3d',
                            }}
                            animate={{
                                rotateY: phase === 'flip' ? 90 : phase === 'reveal' || phase === 'result' || phase === 'done' ? 180 : 0,
                            }}
                            transition={{
                                duration: 0.6,
                                ease: 'easeInOut',
                            }}
                        >
                            {/* カード裏面 */}
                            <div
                                className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-800 border-4 border-white/30 flex items-center justify-center"
                                style={{
                                    backfaceVisibility: 'hidden',
                                }}
                            >
                                <span className="text-6xl">🎴</span>
                            </div>

                            {/* カード表面 */}
                            <div
                                className={`absolute inset-0 rounded-xl border-4 flex flex-col items-center justify-center p-4 ${displayCardType === 'culprit'
                                        ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-yellow-400'
                                        : 'bg-gradient-to-br from-gray-600 to-gray-800 border-white/30'
                                    }`}
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                }}
                            >
                                {cardDef && (
                                    <>
                                        <div className="text-lg font-bold text-white mb-2 bg-black/30 px-3 py-1 rounded-full">
                                            {cardDef.name}
                                        </div>
                                        {cardDef.icon && (
                                            <img
                                                src={cardDef.icon}
                                                alt={cardDef.name}
                                                className="w-24 h-24 object-contain drop-shadow-lg"
                                            />
                                        )}
                                    </>
                                )}
                                {!cardDef && animationInfo.cardType === 'detective' && !animationInfo.isSuccess && (
                                    <div className="text-5xl">❌</div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* 結果テキスト・画像 */}
                    <AnimatePresence>
                        {phase === 'result' && (
                            <>
                                {animationInfo.isSuccess ? (
                                    <motion.div
                                        className="flex flex-col items-center gap-4"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200 }}
                                    >
                                        <img
                                            src={arrestImage}
                                            alt="変態逮捕"
                                            className="w-64 h-auto drop-shadow-2xl"
                                        />
                                        <motion.div
                                            className="text-4xl font-bold text-yellow-400 text-center"
                                            animate={{
                                                scale: [1, 1.1, 1],
                                            }}
                                            transition={{
                                                duration: 0.5,
                                                repeat: Infinity,
                                            }}
                                        >
                                            市民チームの勝利！
                                        </motion.div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        className="text-3xl font-bold text-gray-300 text-center"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        変態ではなかった...
                                    </motion.div>
                                )}
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
