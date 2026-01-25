// ====================================
// デッキ生成ロジック: 変態は踊る
// ====================================

import type { Card, CardType } from '../types';
import { CARD_DEFINITIONS } from '../data/cards';

// ====================================
// 1. カードプール定義 (Total Card Pool)
// ====================================

/**
 * 全32枚のカード在庫（Inventory）
 * ゲームに含まれる全カードの総枚数を定義
 */
export const CARD_INVENTORY: Record<CardType, number> = {
    first_discoverer: 1,  // 変態目撃者
    culprit: 1,           // 変態
    detective: 4,         // 警察
    alibi: 5,             // アリバイ
    plot: 2,              // 異常性癖者
    rumor: 3,             // うわさ
    information: 3,       // 情報操作
    dog: 4,               // 正常者
    boy: 4,               // 少年
    witness: 3,           // 目撃者
    trade: 2,             // 取り引き
    common: 0,            // 一般人（在庫なし - 計32枚）
};

// 在庫の総枚数を計算（デバッグ用）
const TOTAL_INVENTORY = Object.values(CARD_INVENTORY).reduce((sum, count) => sum + count, 0);
console.assert(TOTAL_INVENTORY === 32, `在庫総数が32枚ではありません: ${TOTAL_INVENTORY}枚`);

/**
 * 参加人数ごとの必須カード構成
 */
const MANDATORY_CARDS: Record<number, Partial<Record<CardType, number>>> = {
    3: {
        first_discoverer: 1,
        culprit: 1,
        detective: 1,
        alibi: 2,
    },
    4: {
        first_discoverer: 1,
        culprit: 1,
        detective: 1,
        alibi: 2,
        plot: 1,
    },
    5: {
        first_discoverer: 1,
        culprit: 1,
        detective: 1,
        alibi: 2,
        plot: 1,
    },
    6: {
        first_discoverer: 1,
        culprit: 1,
        detective: 2,
        alibi: 2,
        plot: 2,
    },
    7: {
        first_discoverer: 1,
        culprit: 1,
        detective: 2,
        alibi: 3,
        plot: 2,
    },
    8: {
        // 8人は全カードを使用するため、必須カード定義は不要
        // （ステップA・Bをスキップして在庫全てを使用）
    },
};

// ====================================
// 2. ユーティリティ関数
// ====================================

/**
 * シャッフル関数（Fisher-Yates）
 */
function shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * カードIDカウンター
 */
let cardIdCounter = 0;

/**
 * カードIDカウンターをリセット
 */
export function resetCardIdCounter(): void {
    cardIdCounter = 0;
}

/**
 * カードを1枚生成
 */
function createCard(type: CardType): Card {
    const definition = CARD_DEFINITIONS[type];
    return {
        ...definition,
        id: `${type}-${++cardIdCounter}`,
    };
}

/**
 * 指定タイプのカードを複数枚生成
 */
function createCards(type: CardType, count: number): Card[] {
    return Array.from({ length: count }, () => createCard(type));
}

// ====================================
// 3. デッキ生成フロー (Generation Steps)
// ====================================

/**
 * デッキを生成する
 * @param playerCount プレイ人数（3〜8人）
 * @returns シャッフルされたカード配列
 * @throws Error プレイ人数が範囲外、または在庫不足の場合
 */
export function generateDeck(playerCount: number): Card[] {
    // ====================================
    // エラーハンドリング: 人数バリデーション
    // ====================================
    if (playerCount < 3 || playerCount > 8) {
        throw new Error(`プレイ人数は3〜8人です。現在: ${playerCount}人`);
    }

    // カードIDカウンターをリセット
    resetCardIdCounter();

    // 目標枚数を算出
    const targetCount = playerCount * 4;

    // ====================================
    // 8人プレイの場合: 全カード使用
    // ====================================
    if (playerCount === 8) {
        const deck: Card[] = [];
        for (const [cardType, count] of Object.entries(CARD_INVENTORY)) {
            if (count > 0) {
                deck.push(...createCards(cardType as CardType, count));
            }
        }

        // 総枚数検証
        if (deck.length !== targetCount) {
            throw new Error(
                `8人プレイ用のデッキ枚数が不正です。期待値: ${targetCount}枚, 実際: ${deck.length}枚`
            );
        }

        // 最終シャッフル
        return shuffle(deck);
    }

    // ====================================
    // ステップA: 必須カードの確保 (Mandatory Cards)
    // ====================================
    const mandatoryConfig = MANDATORY_CARDS[playerCount];
    if (!mandatoryConfig) {
        throw new Error(`${playerCount}人用の必須カード構成が定義されていません。`);
    }

    const mandatoryCards: Card[] = [];
    const usedInventory: Record<CardType, number> = {} as Record<CardType, number>;

    // 在庫を初期化
    for (const cardType of Object.keys(CARD_INVENTORY) as CardType[]) {
        usedInventory[cardType] = 0;
    }

    // 必須カードを生成
    for (const [cardType, count] of Object.entries(mandatoryConfig)) {
        const type = cardType as CardType;
        const inventoryCount = CARD_INVENTORY[type];

        if (count > inventoryCount) {
            throw new Error(
                `必須カード「${CARD_DEFINITIONS[type].name}」の枚数(${count})が在庫(${inventoryCount})を超えています。`
            );
        }

        mandatoryCards.push(...createCards(type, count));
        usedInventory[type] = count;
    }

    // ====================================
    // ステップB: ランダム枠の充填 (Random Pool Selection)
    // ====================================
    const mandatoryCount = mandatoryCards.length;
    const neededCount = targetCount - mandatoryCount;

    if (neededCount < 0) {
        throw new Error(
            `必須カード枚数(${mandatoryCount})が目標枚数(${targetCount})を超えています。`
        );
    }

    // 候補リストを作成（在庫から使用済み分を差し引く）
    const remainingPool: Card[] = [];
    for (const [cardType, inventoryCount] of Object.entries(CARD_INVENTORY)) {
        const type = cardType as CardType;
        const used = usedInventory[type] || 0;
        const remaining = inventoryCount - used;

        if (remaining > 0) {
            remainingPool.push(...createCards(type, remaining));
        }
    }

    // ランダム抽出のため候補リストをシャッフル
    const shuffledPool = shuffle(remainingPool);

    // 候補が不足している場合はエラー
    if (shuffledPool.length < neededCount) {
        throw new Error(
            `ランダム枠を充填するためのカードが不足しています。必要: ${neededCount}枚, 候補: ${shuffledPool.length}枚`
        );
    }

    // 先頭から必要枚数を取り出す
    const randomCards = shuffledPool.slice(0, neededCount);

    // ====================================
    // ステップC: 最終シャッフルとID付与 (Finalize)
    // ====================================
    const deck = [...mandatoryCards, ...randomCards];

    // 総枚数の最終検証
    if (deck.length !== targetCount) {
        throw new Error(
            `デッキ枚数が不正です。期待値: ${targetCount}枚, 実際: ${deck.length}枚`
        );
    }

    // 最終シャッフル
    return shuffle(deck);
}

// ====================================
// 4. カード配布・ユーティリティ関数
// ====================================

/**
 * デッキ構成の妥当性を検証
 * @param playerCount プレイ人数
 * @param config デッキ構成
 * @returns 検証結果
 */
export function validateDeckConfig(
    playerCount: number,
    config: Record<CardType, number>
): { isValid: boolean; currentTotal: number; expectedTotal: number; message: string } {
    const currentTotal = Object.values(config).reduce((sum, count) => sum + count, 0);
    const expectedTotal = playerCount * 4;

    if (currentTotal !== expectedTotal) {
        return {
            isValid: false,
            currentTotal,
            expectedTotal,
            message: `カード枚数が一致しません。現在: ${currentTotal}枚 / 必要: ${expectedTotal}枚`,
        };
    }

    // 必須カードの検証
    if (!config.first_discoverer || config.first_discoverer < 1) {
        return {
            isValid: false,
            currentTotal,
            expectedTotal,
            message: '変態目撃者は最低1枚必要です。',
        };
    }

    if (!config.culprit || config.culprit < 1) {
        return {
            isValid: false,
            currentTotal,
            expectedTotal,
            message: '変態カードは最低1枚必要です。',
        };
    }

    // 在庫オーバーチェック
    for (const [cardType, count] of Object.entries(config)) {
        const type = cardType as CardType;
        const inventoryCount = CARD_INVENTORY[type];
        if (count > inventoryCount) {
            return {
                isValid: false,
                currentTotal,
                expectedTotal,
                message: `「${CARD_DEFINITIONS[type].name}」の枚数(${count})が在庫(${inventoryCount})を超えています。`,
            };
        }
    }

    return {
        isValid: true,
        currentTotal,
        expectedTotal,
        message: 'デッキ構成は有効です。',
    };
}

/**
 * カードを配布する（手札を生成）
 * @param deck シャッフル済みデッキ
 * @param playerCount プレイ人数
 * @returns 各プレイヤーの手札（配列の配列）
 */
export function dealCards(deck: Card[], playerCount: number): Card[][] {
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);

    // ラウンドロビン方式で配布
    for (let cardIndex = 0; cardIndex < deck.length; cardIndex++) {
        const playerIndex = cardIndex % playerCount;
        hands[playerIndex].push(deck[cardIndex]);
    }

    // 各プレイヤーの手札をソート（sortOrder順）
    return hands.map(hand =>
        hand.sort((a, b) => a.sortOrder - b.sortOrder)
    );
}

/**
 * 変態目撃者を持っているプレイヤーのインデックスを取得
 * @param hands 各プレイヤーの手札
 * @returns 変態目撃者を持つプレイヤーのインデックス
 */
export function findFirstDiscovererIndex(hands: Card[][]): number {
    for (let i = 0; i < hands.length; i++) {
        if (hands[i].some(card => card.type === 'first_discoverer')) {
            return i;
        }
    }
    return 0; // フォールバック
}

/**
 * 変態を持っているプレイヤーのインデックスを取得
 * @param hands 各プレイヤーの手札
 * @returns 変態を持つプレイヤーのインデックス
 */
export function findCulpritIndex(hands: Card[][]): number {
    for (let i = 0; i < hands.length; i++) {
        if (hands[i].some(card => card.type === 'culprit')) {
            return i;
        }
    }
    return -1; // 見つからない場合
}

/**
 * デッキ内容を確認用にログ出力（デバッグ用）
 */
export function logDeckContents(deck: Card[]): void {
    const counts: Record<string, number> = {};
    for (const card of deck) {
        counts[card.type] = (counts[card.type] || 0) + 1;
    }
    console.log('=== デッキ内容 ===');
    console.log(`総枚数: ${deck.length}枚`);
    for (const [type, count] of Object.entries(counts)) {
        console.log(`  ${CARD_DEFINITIONS[type as CardType].name}: ${count}枚`);
    }
}
