// ====================================
// 枕詞（二つ名）ワードリスト: 変態は踊る
// ====================================

// 通常の枕詞リスト
export const NORMAL_WORDS: string[] = [
    // ポジティブ系
    '駆け出しの',
    '噂の',
    '期待の',
    '話題の',
    '伝説の',
    '最強の',
    '無敵の',
    '孤高の',
    '誇り高き',
    '高貴な',
    '美しき',
    '優雅な',
    '魅惑の',
    '華麗な',
    '気高き',

    // 中立～コミカル系
    '腹ペコの',
    '眠れる',
    '泣き虫の',
    '怒りん坊の',
    '甘えん坊の',
    '夢見る',
    'うっかり',
    'そそっかしい',
    'のんびり屋の',
    '天然系の',
    '不思議な',
    'ささやかな',
    'ちょっとした',
    '紳士的な',
    '淑女風の',
    'ミステリアスな',
    '秘密主義の',
    '正義感あふれる',
    'クールな',
    'ホットな',
    '情熱の',
    '青春の',
    '憧れの',
    '仮面の',
    '真面目な',
    'おちゃめな',
    '天才的な',
    '奇跡の',
    '運命の',
    '約束された',
];

// 危険ワードリスト（変態敗北時に付与される）
export const DANGER_WORDS: string[] = [
    // 犯罪・追放系
    '指名手配の',
    '獄中の',
    '追放された',
    '裏切りの',
    '堕落した',
    '闇堕ちした',
    '呪われた',
    '忌まわしき',
    '禁断の',
    '破滅の',

    // 変態・異常系
    '変態的な',
    '異常性癖の',
    '露出狂の',
    '痴漢常習犯の',
    '覗き魔の',
    '下着泥棒の',

    // ダメ人間系
    '失墜した',
    '没落した',
    '転落人生の',
    '社会的に終わった',
    '詰んでる',
    'オワコンの',
    '黒歴史持ちの',
    '前科持ちの',

    // コミカル系
    'ド変態の',
    '救いようのない',
    '末期の',
    '重症の',
    '手遅れの',
    '筋金入りの',
];

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
    const index = Math.floor(Math.random() * DANGER_WORDS.length);
    return DANGER_WORDS[index];
}

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
