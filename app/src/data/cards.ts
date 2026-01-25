// ====================================
// カードデータ定義: 変態は踊る
// ====================================

import type { Card, CardType } from '../types';

// カード定義マスターデータ
export const CARD_DEFINITIONS: Record<CardType, Omit<Card, 'id'>> = {
    first_discoverer: {
        type: 'first_discoverer',
        name: '変態発見者',
        description: 'このカードを持っている人からゲーム開始。',
        targetType: 'NONE',
        sortOrder: 10,
    },
    culprit: {
        type: 'culprit',
        name: '変態',
        description: '最後の手札として出せれば勝利。それ以外で出すと即座に敗北。',
        targetType: 'NONE',
        sortOrder: 99,
    },
    detective: {
        type: 'detective',
        name: '逮捕',
        description: '変態だと思う人を指名して当てる。当てれば勝利。（1巡目は使用不可）',
        targetType: 'SINGLE_USER',
        sortOrder: 20,
    },
    alibi: {
        type: 'alibi',
        name: 'アリバイ',
        description: '手札にあれば、警察に指名されても「変態ではありません」と答えられる。出して捨てても効果なし。',
        targetType: 'NONE',
        sortOrder: 30,
    },
    plot: {
        type: 'plot',
        name: '異常性癖者',
        description: '変態が勝てば自分も勝利。変態が負ければ自分も敗北。',
        targetType: 'NONE',
        sortOrder: 40,
    },
    witness: {
        type: 'witness',
        name: '目撃者',
        description: '誰か1人の手札を全て見る。',
        targetType: 'SINGLE_USER',
        sortOrder: 50,
    },
    information: {
        type: 'information',
        name: '情報操作',
        description: '全員が左隣の人に手札を1枚渡す。変態カードも移動可能。',
        targetType: 'ALL_USERS',
        sortOrder: 60,
    },
    rumor: {
        type: 'rumor',
        name: 'うわさ',
        description: '全員が右隣の人の手札から1枚引く。',
        targetType: 'ALL_USERS',
        sortOrder: 65,
    },
    dog: {
        type: 'dog',
        name: '正常者',
        description: '誰か1人の手札から1枚を選んで当てる。変態を当てれば勝利。',
        targetType: 'SINGLE_USER',
        sortOrder: 70,
    },
    boy: {
        type: 'boy',
        name: '少年',
        description: '変態を知る。（自分だけに変態の名前が通知される）',
        targetType: 'NONE',
        sortOrder: 75,
    },
    trade: {
        type: 'trade',
        name: '取り引き',
        description: '誰か1人と手札を1枚交換する。',
        targetType: 'SINGLE_USER',
        sortOrder: 80,
    },
    common: {
        type: 'common',
        name: '一般人',
        description: '何も起きない。手札調整用。',
        targetType: 'NONE',
        sortOrder: 90,
    },
};

// カードIDを生成する関数
let cardIdCounter = 0;
export function createCard(type: CardType): Card {
    const definition = CARD_DEFINITIONS[type];
    return {
        ...definition,
        id: `${type}-${++cardIdCounter}`,
    };
}

// カード配列を生成する関数
export function createCards(type: CardType, count: number): Card[] {
    return Array.from({ length: count }, () => createCard(type));
}

// カードIDカウンターをリセット（新しいゲーム開始時）
export function resetCardIdCounter(): void {
    cardIdCounter = 0;
}

// 人数ごとのデフォルトデッキ構成
export const DEFAULT_DECK_CONFIG: Record<number, Record<CardType, number>> = {
    3: {
        first_discoverer: 1,
        culprit: 1,
        detective: 1,
        alibi: 2,
        plot: 0,
        witness: 1,
        information: 1,
        rumor: 1,
        dog: 1,
        boy: 1,
        trade: 1,
        common: 1,
    },
    4: {
        first_discoverer: 1,
        culprit: 1,
        detective: 1,
        alibi: 2,
        plot: 1,
        witness: 1,
        information: 1,
        rumor: 1,
        dog: 1,
        boy: 1,
        trade: 1,
        common: 4,
    },
    5: {
        first_discoverer: 1,
        culprit: 1,
        detective: 1,
        alibi: 2,
        plot: 1,
        witness: 1,
        information: 1,
        rumor: 1,
        dog: 1,
        boy: 1,
        trade: 1,
        common: 8,
    },
    6: {
        first_discoverer: 1,
        culprit: 1,
        detective: 2,
        alibi: 2,
        plot: 2,
        witness: 1,
        information: 1,
        rumor: 1,
        dog: 1,
        boy: 1,
        trade: 1,
        common: 10,
    },
    7: {
        first_discoverer: 1,
        culprit: 1,
        detective: 2,
        alibi: 3,
        plot: 2,
        witness: 1,
        information: 1,
        rumor: 1,
        dog: 1,
        boy: 1,
        trade: 1,
        common: 13,
    },
    8: {
        first_discoverer: 1,
        culprit: 1,
        detective: 2,
        alibi: 3,
        plot: 2,
        witness: 1,
        information: 1,
        rumor: 1,
        dog: 1,
        boy: 1,
        trade: 1,
        common: 17,
    },
};

// カード名から日本語名を取得
export function getCardName(type: CardType): string {
    return CARD_DEFINITIONS[type].name;
}

// カードの説明を取得
export function getCardDescription(type: CardType): string {
    return CARD_DEFINITIONS[type].description;
}
