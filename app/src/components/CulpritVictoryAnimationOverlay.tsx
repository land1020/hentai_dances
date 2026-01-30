// ====================================
// 変態勝利演出オーバーレイ
// ====================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CulpritVictoryAnimationInfo, Player } from '../types';
import { CARD_DEFINITIONS } from '../data/cards';
import culpritVictoryImage from '../assets/変態勝利.jpg';

interface CulpritVictoryAnimationOverlayProps {
    animationInfo: CulpritVictoryAnimationInfo | null | undefined;
    players: Player[];
    onComplete: () => void;
}

type AnimationPhase = 'idle' | 'cardAppear' | 'cardReveal' | 'victory' | 'done';

export default function CulpritVictoryAnimationOverlay({
    animationInfo,
    players,
    onComplete
}: CulpritVictoryAnimationOverlayProps) {
    const [phase, setPhase] = useState<AnimationPhase>('idle');
    const [showOverlay, setShowOverlay] = useState(false);

    // 変態プレイヤーを取得
    const culpritPlayer = animationInfo
        ? players.find(p => p.id === animationInfo.culpritPlayerId)
        : null;

    // カード定義
    const cardDef = CARD_DEFINITIONS['culprit'];

    // アニメーション開始
    useEffect(() => {
        if (animationInfo) {
            setShowOverlay(true);
            setPhase('cardAppear');

            // フェーズ遷移タイマー
            const appearTimer = setTimeout(() => {
                setPhase('cardReveal');
            }, 800);

            const revealTimer = setTimeout(() => {
                setPhase('victory');
            }, 2000);

            const doneTimer = setTimeout(() => {
                setPhase('done');
            }, 5000);

            const completeTimer = setTimeout(() => {
                setShowOverlay(false);
                setPhase('idle');
                onComplete();
            }, 5500);

            return () => {
                clearTimeout(appearTimer);
                clearTimeout(revealTimer);
                clearTimeout(doneTimer);
                clearTimeout(completeTimer);
            };
        }
    }, [animationInfo, onComplete]);

    if (!animationInfo || !showOverlay) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* 背景 - 渦巻きエフェクト風 */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900"
                    animate={{
                        background: [
                            'linear-gradient(to bottom right, #581c87, #831843, #581c87)',
                            'linear-gradient(to bottom right, #831843, #581c87, #831843)',
                            'linear-gradient(to bottom right, #581c87, #831843, #581c87)',
                        ]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                />

                {/* 稲妻エフェクト */}
                {phase === 'cardReveal' && (
                    <>
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute bg-yellow-400/60"
                                style={{
                                    width: '4px',
                                    height: `${100 + Math.random() * 200}px`,
                                    left: `${10 + Math.random() * 80}%`,
                                    top: 0,
                                    transformOrigin: 'top center',
                                    filter: 'blur(2px)',
                                }}
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    scaleY: [0, 1, 1],
                                }}
                                transition={{
                                    duration: 0.3,
                                    delay: i * 0.1,
                                }}
                            />
                        ))}
                    </>
                )}

                {/* 紙吹雪エフェクト */}
                {(phase === 'victory' || phase === 'done') && (
                    <>
                        {[...Array(40)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: ['#9B5DE5', '#F15BB5', '#00BBF9', '#00F5D4', '#FEE440'][i % 5],
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

                {/* メインコンテンツ */}
                <div className="relative flex flex-col items-center gap-6 z-10">
                    {/* プレイヤー名 */}
                    <AnimatePresence>
                        {phase !== 'idle' && (
                            <motion.div
                                className="text-2xl font-bold text-white text-shadow-lg"
                                initial={{ opacity: 0, y: -30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                            >
                                {culpritPlayer?.name} が最後のカードを出した！
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* カード */}
                    <div className="relative" style={{ perspective: '1000px' }}>
                        <motion.div
                            className="relative w-52 h-80 rounded-xl shadow-2xl"
                            style={{
                                transformStyle: 'preserve-3d',
                            }}
                            initial={{ scale: 0, rotateY: 0 }}
                            animate={{
                                scale: phase === 'cardAppear' ? 1 : 1,
                                rotateY: phase === 'cardReveal' || phase === 'victory' || phase === 'done' ? 180 : 0,
                            }}
                            transition={{
                                scale: { duration: 0.5, type: 'spring' },
                                rotateY: { duration: 0.8, ease: 'easeInOut' },
                            }}
                        >
                            {/* カード裏面 */}
                            <div
                                className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-800 border-4 border-white/30 flex items-center justify-center"
                                style={{
                                    backfaceVisibility: 'hidden',
                                }}
                            >
                                <span className="text-7xl">🎴</span>
                            </div>

                            {/* カード表面（変態カード） */}
                            <div
                                className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 border-4 border-yellow-400 flex flex-col items-center justify-center p-4"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                }}
                            >
                                {/* DangerWord */}
                                {animationInfo.dangerWord && (
                                    <div className="text-yellow-300 font-bold text-lg mb-2 bg-black/30 px-3 py-1 rounded-full">
                                        {animationInfo.dangerWord}
                                    </div>
                                )}
                                <div className="text-xl font-bold text-white mb-3 bg-black/30 px-4 py-1 rounded-full">
                                    {cardDef.name}
                                </div>
                                {cardDef.icon && (
                                    <img
                                        src={cardDef.icon}
                                        alt={cardDef.name}
                                        className="w-28 h-28 object-contain drop-shadow-lg"
                                    />
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* 勝利画像 & テキスト */}
                    <AnimatePresence>
                        {(phase === 'victory' || phase === 'done') && (
                            <motion.div
                                className="flex flex-col items-center gap-4"
                                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                            >
                                <img
                                    src={culpritVictoryImage}
                                    alt="変態勝利"
                                    className="w-72 h-auto rounded-lg shadow-2xl border-4 border-purple-400"
                                />
                                <motion.div
                                    className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 text-center"
                                    animate={{
                                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                    }}
                                    style={{ backgroundSize: '200% 100%' }}
                                >
                                    変態チームの勝利！
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
