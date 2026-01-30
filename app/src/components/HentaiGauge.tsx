import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface HentaiGaugeProps {
    level: number;
    className?: string;
}

export default function HentaiGauge({ level, className = '' }: HentaiGaugeProps) {
    // レベルに応じたスタイル定義
    const getLevelStyle = (lvl: number) => {
        switch (lvl) {
            case 1:
                return { color: 'text-pink-400', animation: '' };
            case 2:
                // 少し濃いピンク
                return { color: 'text-pink-500', animation: '' };
            case 3:
                // 警告色（オレンジ/黄色）
                return { color: 'text-orange-500', animation: 'animate-bounce-slow' };
            case 4:
                // 危険色（紫/赤）+ 点滅
                return { color: 'text-purple-600', animation: 'animate-pulse' };
            default:
                // レベル0（グレー）
                return { color: 'text-gray-600', animation: '' };
        }
    };

    const style = getLevelStyle(level);
    const maxLevel = 4;

    // 常に4つのハートを表示
    const hearts = Array.from({ length: maxLevel }, (_, i) => i + 1);

    return (
        <div className={`flex items-center gap-0.5 ${className}`} title={`変態度 Lv.${level}`}>
            {hearts.map((i) => {
                const isFilled = i <= level;
                return (
                    <motion.div
                        key={i}
                        initial={false}
                        animate={{ scale: isFilled ? 1 : 0.8 }}
                        className={`${isFilled ? style.color : 'text-gray-700/50'} ${isFilled && level === 4 ? 'animate-pulse' : ''}`}
                    >
                        <Heart
                            className={`w-3 h-3 md:w-4 md:h-4 ${isFilled ? 'fill-current' : 'stroke-current fill-none'} drop-shadow-sm`}
                            strokeWidth={isFilled ? 0 : 2}
                        />
                    </motion.div>
                );
            })}

            {/* レベル4のエフェクト（オーラ的な） */}
            {level === 4 && (
                <motion.div
                    className="absolute inset-0 bg-purple-500/20 blur-lg rounded-full -z-10"
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}
        </div>
    );
}
