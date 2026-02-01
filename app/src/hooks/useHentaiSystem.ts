import type { PlayerResult, VictoryInfo } from '../types';
import {
    NormalWords,
    AbnormalWords,
    DangerWords,
    DecorationWords
} from '../data/wordList';

/**
 * 変態度レベルを計算する
 * @param currentLevel 現在のレベル
 * @param result プレイヤーの勝敗結果
 * @param victoryInfo 勝利情報全体（文脈判断用）
 */
export function calculateHentaiLevel(
    currentLevel: number,
    result: PlayerResult,
    victoryInfo: VictoryInfo
): number {
    let newLevel = currentLevel;
    const isCriminalWin = victoryInfo.winnerTeam === 'CRIMINAL_TEAM';

    // A. 変態（犯人）が勝利した場合
    if (isCriminalWin) {
        if (result.isWinner) {
            // 変態本人（MVP）は-1
            if (result.isMVP) {
                newLevel = 0;
            } else if (result.usedPlotCard) {
                // 異常性癖者（たくらみ）: -1
                newLevel -= 1;
            }
            // その他の勝者（いる場合）: 変動なし
        } else {
            // 敗北したプレイヤー（市民など）: +1
            newLevel += 1;
        }
    }
    // B. 変態（犯人）が逮捕され敗北した場合（または正常者勝利）
    else {
        // 変態（犯人）自身（MVPのターゲットになった人、または逮捕された人）
        // victoryInfo.targetPlayerId が変態のID
        const isCulprit = result.playerId === victoryInfo.targetPlayerId;

        if (isCulprit) {
            if (currentLevel >= 3) {
                newLevel = 4;
            } else {
                newLevel = 3;
            }
        } else if (result.usedPlotCard) {
            // 異常性癖者: 敗北扱いとなり +1
            newLevel += 1;
        } else if (result.isWinner) {
            // 逮捕したプレイヤー または その他の勝利プレイヤー: -1
            newLevel -= 1;
        } else {
            // 敗北した市民: 変動なし
            /* 
            if (result.team === 'CITIZEN') {
                newLevel -= 1;
            } 
            */
        }
    }

    // 0〜4にクランプ
    return Math.max(0, Math.min(4, newLevel));
}

/**
 * 表示名と割り当て単語を生成する
 * @param level 変態度レベル
 * @param playerName プレイヤー名
 * @param currentAssignedWord 現在割り当てられている単語（Lv3->Lv4引き継ぎ用）
 */
export function generateDisplayName(
    level: number,
    playerName: string,
    currentAssignedWord: string | null = null
): { displayName: string, assignedWord: string | null, fullPrefix: string | null } {
    let assignedWord: string | null = null;
    let fullPrefix: string | null = null;
    let displayName = playerName;

    // 単語リストからランダムに選出するヘルパー（安全策付き）
    const pick = (list: string[], defaultWord: string) => {
        if (!list || list.length === 0) return defaultWord;
        const word = list[Math.floor(Math.random() * list.length)];
        return word || defaultWord;
    };

    // 引き継ぎ判定ヘルパー: 現在の単語がリストに含まれていればそれを返す
    const resolveWord = (list: string[], defaultWord: string) => {
        if (currentAssignedWord && list.includes(currentAssignedWord)) {
            return currentAssignedWord;
        }
        return pick(list, defaultWord);
    };

    switch (level) {
        case 0:
            // 通常表示 (レベル0でも称号を表示)
            assignedWord = null;
            fullPrefix = "常識人な";
            displayName = `${fullPrefix}${playerName}`;
            break;

        case 1:
            assignedWord = resolveWord(NormalWords, "噂の");
            fullPrefix = assignedWord;
            displayName = `${fullPrefix}${playerName}`;
            break;

        case 2:
            assignedWord = resolveWord(AbnormalWords, "あやしい");
            fullPrefix = assignedWord;
            displayName = `${fullPrefix}${playerName}`;
            break;

        case 3:
            // Lv3の場合、DangerWordsに含まれているか、あるいはDangerWords機能で強制セットされた任意の文字列であれば引き継ぐ
            // (リストに含まれていなくても、Lv3相当として既に入っている値は保持する)
            if (currentAssignedWord) {
                assignedWord = currentAssignedWord;
            } else {
                assignedWord = pick(DangerWords, "変態");
            }
            fullPrefix = assignedWord;
            displayName = `${fullPrefix}${playerName}`;
            break;

        case 4:
            // Lv4の場合、基本単語部分は引き継ぐ
            const baseWord = currentAssignedWord || pick(DangerWords, "変態");
            // ※ここでDecorationWordsがつくとassignedWord自体が変わってしまうため、
            // Lv4のassignedWordは「装飾済み」のものとして扱うか、ベースのみ扱うか設計が必要だが、
            // ここではシンプルにベースワード(DangerWord)をassignedWordとして保持し続ける運用とする。
            // ただし、Lv4になった時点でcurrentAssignedWordには「真・〇〇」のような完全形は入っていない（GameEngine側でassignedWordにセットするのはベースのみであるべきだが...）
            // 実際の実装（GameEngine.js）を見ると、assignedWordには「単語そのもの」が入っている。
            // なので、ここでDecorationをつけるのは表示用のみで、assignedWordにはDecorationをつけない方が管理しやすい。
            // しかし、ResultScreenの「Next」表示と整合性を取る必要がある。

            // 現状の実装に合わせる：assignedWordにはベースの単語(DangerWord)を入れる。
            // fullPrefixに装飾を含める。
            assignedWord = baseWord;
            const decoration = pick(DecorationWords, "真・"); // 装飾は毎回ランダムで良い？ それとも固定？ 今回はランダムのままにする（要望は「ワード」の固定と思われるため）
            fullPrefix = `${decoration}${baseWord}`;
            displayName = `${fullPrefix}${playerName}`;
            break;

        default:
            // 想定外のレベルの場合も何か設定する
            assignedWord = null;
            fullPrefix = "常識人な";
            displayName = `${fullPrefix}${playerName}`;
            break;
    }

    return { displayName, assignedWord, fullPrefix };
}

// React Hook (Optional usage)
export function useHentaiSystem() {
    return {
        calculateHentaiLevel,
        generateDisplayName
    };
}
