// ====================================
// 枕詞（二つ名）ワードリスト: 変態は踊る
// ====================================

// レベル1: 通常 (Normal)
export const NormalWords: string[] = [
    '尿意を我慢している', '便秘気味な', '首輪を付けた', 'ぶっぱなす', '濡れてる',
    '早すぎる', '硬すぎる', '太すぎる', '敏感な', '生がいい', '踏んでくれ',
    '高笑いの', '無表情の', 'イケメンの', 'ぶっとももな', '団地妻',
    'ムッチムチ', '四つん這いの', '誘い受けの', '男の娘', 'ぽこち～ん',
    '贅沢な名だねぇ', '興奮気味の', '何かに目覚めた', '肉食系の', '飢えた', '荒ぶる'
];

// レベル2: 異常 (Abnormal) - ちょっと怪しい、または変な
export const AbnormalWords: string[] = [
    'バカ', '肉便器の', '寝取られの', '乳首責めの', 'ショタちんこな',
    '童貞の', 'フル勃起の', 'パイズリ大好き', '立ちバック好きな', 'おパンティを被った',
    'ど変態の', 'パパ活の', 'ポコチンティヌス・', '隠し撮り常習犯', '露出狂の',
    '手コキのプロ', '名器の', 'パイパンの', '即ハメの', '騎乗位大好き',
    '駅弁が得意な', '尻を振れ', 'お尻好きの', 'ほらイクぞ', '跪け',
    '豚野郎', 'ザコちんぽの', 'アヘ顔の', '絶頂中の', '陥没乳首の',
    '援助交際の', '仮性包茎の', 'オフパコ希望の', '飛べねぇ豚はただの',
    'ゴムは絶対付けない', 'バイアグラ常中'
];

// レベル3: 危険 (Danger) - 明らかに変態・犯罪的
export const DangerWords: string[] = [
    '変態', '露出狂', '指名手配の', '伝説の（悪い意味で）', '下着泥棒の',
    '覗き魔の', '痴漢常習犯の', '獄中の', '追放された', '裏切りの',
    '堕落した', '闇堕ちした', '呪われた', '忌まわしき', '禁断の',
    '破滅の', '変態的な', '異常性癖の', 'ド変態の', '救いようのない',
    '末期の', '重症の', '手遅れの', '筋金入りの', 'パンツを被った',
    '全裸の', '社会的に終わった'
];

// レベル4: 装飾 (Decoration) - レベル3の言葉につく接頭語
export const DecorationWords: string[] = [
    'キング・オブ・', 'アルティメット', '真・', 'スーパー', 'ハイパー',
    '絶対王者', '終身名誉', 'ワールドクラスの', '銀河級の', '神聖なる',
    '暗黒の', '覚醒した', '極上の', '1000年に1人の', '選ばれし'
];

// 後方互換性用エイリアス（既存コードが壊れないように）
export const NORMAL_WORDS = NormalWords;
export const DANGER_WORDS = DangerWords;

/**
 * ワードリストをシャッフル
 */
export function shuffleWords(words: string[]): string[] {
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * 通常ワードからランダムに1つ取得（重複なしでpop）
 */
export function popNormalWord(shuffledWords: string[]): string | null {
    return shuffledWords.pop() || null;
}

/**
 * 危険ワードからランダムに1つ取得
 */
export function getRandomDangerWord(): string {
    const index = Math.floor(Math.random() * DangerWords.length);
    return DangerWords[index];
}

/**
 * レベルに応じたワードリストを取得
 */
export function getWordListByLevel(level: number): string[] {
    switch (level) {
        case 1: return NormalWords;
        case 2: return AbnormalWords;
        case 3: return DangerWords;
        case 4: return DecorationWords; // レベル4は特殊処理だがリストとしてはこれを返す
        default: return [];
    }
}
