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
    'ケツアクメの', 'デスアクメの', 'ザコまんこの', '鬱勃起の', '二穴責めの',
    'エネマグラ装着中の', 'オナホばれした', '実は3P経験者の', 'アナルセックスしたい',
    'ザーメン大好き', '顔騎で屁をこく', 'アヘ顔晒す', '感度千倍の', 'ドリルちんちんの',
    '駅弁大好き❤', '三角木馬経験者', '亀甲縛りのプロ', 'チンカス香る', 'おしりを舐める',
    'くぎ打ち騎乗位の', 'アナルを掘る', 'アナル拡張中の', '露出プレイの', 'がばがばアナルの',
    '濁点喘ぎの', 'アヘ顔ダブピ', 'バキバキ童貞の', 'ぽこちんフィーバー', 'ノンケを喰らう',
    '真正包茎の', 'おぼ”っｲｸﾞ❤❤❤'
];

// レベル4: 装飾 (Decoration) - レベル3の言葉につく接頭語
export const DecorationWords: string[] = [
    '超弩級の', 'フルパワー', '完熟', '末期の', '国宝級の',
    '今夜は', '妻に', '三回戦', '極上の', 'くっさい',
    '覚醒した', 'キメセクで', '24時間', '超高校級', '誰よりも',
    'ほんのり', '禁断の', '選ばれし', '犬のように', '伝説の',
    '真・', '365日', 'マイクロビキニで', '連続絶頂', '限界突破',
    '道具使って', '元気100倍', '伝説の'
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

// デバッグ用ログ
console.log('[WordList] Loaded. DangerWords count:', DangerWords.length);
console.log('[WordList] Sample:', DangerWords[0]);
