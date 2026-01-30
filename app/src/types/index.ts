// ====================================
// 型定義: 変態は踊る
// ====================================

// カード種別
export type CardType =
    | 'first_discoverer'  // 変態目撃者（第一発見者）
    | 'culprit'           // 変態（犯人）
    | 'detective'         // 警察（探偵）
    | 'alibi'             // アリバイ
    | 'plot'              // 異常性癖者（たくらみ）
    | 'witness'           // 目撃者
    | 'information'       // 情報操作
    | 'rumor'             // うわさ
    | 'dog'               // 正常者（いぬ）
    | 'boy'               // 少年
    | 'trade'             // 取り引き
    | 'common';           // 一般人

// カード効果のターゲットタイプ
export type TargetType =
    | 'NONE'        // ターゲット不要
    | 'SINGLE_USER' // 他プレイヤー1人を選択
    | 'ALL_USERS';  // 全プレイヤーに影響

// カードインターフェース
export interface Card {
    id: string;           // 一意のID
    type: CardType;       // カード種別
    name: string;         // 表示名
    description: string;  // 効果の説明文
    imagePath?: string;   // 画像パス
    icon?: string;        // アイコン画像パス
    targetType: TargetType;
    sortOrder: number;    // ソート順（表示順序）
    assignedDangerWord?: string; // 変態カードに割り当てられた危険ワード
    tradeHistory?: {
        type: 'TRADE' | 'INFORMATION' | 'RUMOR';
        fromName: string;
        toName: string;
    };
}

// プレイヤー情報
export interface Player {
    id: string;          // プレイヤーID
    name: string;        // 表示名
    hand: Card[];        // 手札
    isNpc: boolean;      // NPCフラグ
    isAlive: boolean;    // 生存フラグ
    team: 'CITIZEN' | 'CRIMINAL'; // 所属チーム
    avatarUrl?: string;  // アバター画像URL

    // 枕詞（二つ名）＆変態度システム
    hentaiLevel: number;           // 変態度レベル (0-4)
    currentPrefix: string | null;  // 現在の枕詞（全体）
    assignedWord: string | null;   // 割り当てられた単語（単体）
    isCursed: boolean;             // (Legacy) 呪われているか
    cursedPrefix: string | null;   // (Legacy) 固定化された危険ワード
    color: string;                 // プレイヤーカラー
}

// ゲームフェーズ
export const GamePhase = {
    SETUP: 'SETUP',                     // ゲーム開始前・配布
    TURN_START: 'TURN_START',           // ターン開始処理
    WAITING_FOR_PLAY: 'WAITING_FOR_PLAY', // カード提出待ち
    SELECTING_TARGET: 'SELECTING_TARGET', // カード効果の対象選択中
    SELECTING_CARD: 'SELECTING_CARD',     // カード選択中（正常者用）
    RESOLVING_EFFECT: 'RESOLVING_EFFECT', // 効果処理中
    EXCHANGE_PHASE: 'EXCHANGE_PHASE',   // カード交換中
    TURN_END: 'TURN_END',               // ターン終了処理
    GAME_OVER: 'GAME_OVER',             // 決着
} as const;

export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

// ルーム状態
export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

// 勝者チーム
export type WinnerTeam = 'CRIMINAL_TEAM' | 'DETECTIVE_TEAM' | null;

// 勝利タイプ（どのカードで勝利したか）
export type VictoryType =
    | 'DETECTIVE'      // 警察が変態を当てた
    | 'DOG'            // 正常者が変態カードを引いた
    | 'CULPRIT_ESCAPE' // 変態が最後までカードを出し切った
    | null;

// プレイヤーの勝敗結果
export interface PlayerResult {
    playerId: string;
    playerName: string;
    team: 'CITIZEN' | 'CRIMINAL';
    isWinner: boolean;
    isMVP: boolean;                    // メイン勝者（変態/警察/正常者）か
    isAccompliceWinner: boolean;       // 異常性癖者として勝利したか
    usedPlotCard: boolean;             // 異常性癖者カードを使用したか

    // 変態度変動
    oldHentaiLevel?: number;
    newHentaiLevel?: number;
    newDisplayName?: string;
    newPrefix?: string;                // 次のゲームで使用する二つ名
    newAssignedWord?: string;          // 次のゲームで使用する割り当てワード
}

// 勝利詳細情報
export interface VictoryInfo {
    winnerTeam: WinnerTeam;
    victoryType: VictoryType;
    mvpPlayerId: string | null;        // メイン勝者のプレイヤーID
    targetPlayerId: string | null;     // 対象となったプレイヤーID（警察/正常者の場合は変態）
    playerResults: PlayerResult[];     // 各プレイヤーの結果
}

// 保留中のアクション
export interface PendingAction {
    type: 'SELECT_TARGET' | 'SELECT_CARD' | 'EXCHANGE';
    playerId: string;       // アクションを行うプレイヤー
    cardType?: CardType;    // 使用されたカード
    targetIds?: string[];   // 対象プレイヤーID
}

// ゲーム状態
export interface GameState {
    phase: GamePhase;
    players: Player[];
    activePlayerIndex: number;
    turnCount: number;          // 総プレイ回数（各プレイヤーがカードを出した回数の合計）
    roundNumber: number;        // 巡数（1巡目, 2巡目...）
    tableCards: Card[];         // 場に出されたカード（捨て札）
    winner: WinnerTeam;
    victoryInfo: VictoryInfo | null;  // 勝利詳細情報
    pendingAction: PendingAction | null;
    dangerWord: string | null;  // 今回の危険ワード（変態カード用）
    systemMessage?: string | null; // システム通知メッセージ
    exchangeState?: {
        type: 'INFORMATION' | 'RUMOR' | 'TRADE';
        selections: Record<string, string>; // playerId -> cardId
        targetIds?: string[]; // 交換対象のプレイヤーIDリスト（TRADE用）
    } | null;
    lastExchangeInfo?: {
        type: 'RUMOR' | 'INFORMATION' | 'TRADE';
        exchanges: {
            fromPlayerId: string;
            toPlayerId: string;
            cardId: string; // 移動したカードID（所有者の判定用）
        }[];
    } | null;
    playedLog: PlayLog[]; // カードプレイ履歴
    arrestAnimationInfo?: ArrestAnimationInfo | null; // 逮捕/通報カード演出情報
    culpritVictoryAnimationInfo?: CulpritVictoryAnimationInfo | null; // 変態勝利演出情報
}

// 逮捕/通報カード演出情報
export interface ArrestAnimationInfo {
    cardType: 'detective' | 'dog'; // どのカードで発動したか
    sourcePlayerId: string; // カードを使用したプレイヤー
    targetPlayerId: string; // 対象プレイヤー
    selectedCardId?: string; // 選択されたカードID（dogの場合）
    selectedCardType?: CardType; // 選択されたカードのタイプ
    isSuccess: boolean; // 変態を当てたかどうか
}

// 変態勝利演出情報
export interface CulpritVictoryAnimationInfo {
    culpritPlayerId: string; // 変態プレイヤーID
    dangerWord?: string; // 危険ワード
}

// プレイ履歴
export interface PlayLog {
    cardId: string;
    cardType: CardType;
    playerId: string;
    turn: number; // roundNumber
}

// ルームデータ（Firestore）
export interface RoomData {
    id: string;
    hostId: string;
    players: Player[];
    deckConfig: Record<CardType, number>;
    status: RoomStatus;
    gameState: GameState | null;
    debugMode: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ゲーム結果（殿堂入り用）
export interface GameResult {
    id: string;
    roomId: string;
    playedAt: Date;
    winnerName: string;
    winnerRole: 'CULPRIT' | 'DETECTIVE' | 'DOG' | 'CITIZEN';
    mvp?: string;
    totalTurns: number;
    members: string[];
    players: {
        id: string;
        name: string;
        prefix: string;  // 二つ名
        hentaiLevel: number;  // 変態度
        score: number;
        team: 'CITIZEN' | 'CRIMINAL';
        isWinner: boolean;
        winCount?: number;
    }[];
}

// デッキ構成設定
export interface DeckConfig {
    [key: string]: {
        min: number;  // 最小枚数
        max: number;  // 最大枚数
        fixed?: boolean; // 固定枚数かどうか
    };
}
