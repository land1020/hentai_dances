// ====================================
// ゲームエンジン: 変態は踊る
// ====================================

import type { GameState, Player, Card, WinnerTeam, VictoryType, VictoryInfo, PlayerResult } from '../types';
import { GamePhase } from '../types';
import { generateDeck, dealCards, findFirstDiscovererIndex } from '../utils/deckFactory';
import { getRandomDangerWord, shuffleWords, NORMAL_WORDS, popNormalWord } from '../data/wordList';

/**
 * ゲームを初期化する
 */
export function initializeGame(
    players: Player[]
): GameState {
    const playerCount = players.length;

    // デッキを生成してシャッフル（参加人数に応じて自動生成）
    const deck = generateDeck(playerCount);

    // カードを配布
    const hands = dealCards(deck, playerCount);

    // 枕詞を割り当て
    const dangerWord = getRandomDangerWord();
    const shuffledNormalWords = shuffleWords([...NORMAL_WORDS]);

    // プレイヤーに手札と枕詞を設定
    const updatedPlayers = players.map((player, index) => {
        let prefix = player.currentPrefix;

        // 呪われていなければ新しい枕詞を割り当て
        if (!player.isCursed) {
            prefix = popNormalWord(shuffledNormalWords) || '謎の';
        } else {
            // 呪われている場合は危険ワードをそのまま使用
            prefix = player.cursedPrefix;
        }

        return {
            ...player,
            hand: hands[index],
            currentPrefix: prefix,
            isAlive: true,
            team: 'CITIZEN' as const,
        };
    });

    // 変態目撃者を持っているプレイヤーを特定
    const firstPlayerIndex = findFirstDiscovererIndex(hands);

    return {
        phase: GamePhase.SETUP,
        players: updatedPlayers,
        activePlayerIndex: firstPlayerIndex,
        turnCount: 0,       // 総プレイ回数（カードを出すたびに+1）。初期値は0。
        roundNumber: 1,     // 1巡目からスタート
        tableCards: [],
        winner: null,
        victoryInfo: null,
        pendingAction: null,
        dangerWord,
    };
}

/**
 * ゲームフェーズを次に進める
 */
export function advancePhase(state: GameState): GameState {
    switch (state.phase) {
        case GamePhase.SETUP:
            return { ...state, phase: GamePhase.TURN_START };

        case GamePhase.TURN_START:
            return { ...state, phase: GamePhase.WAITING_FOR_PLAY, turnCount: state.turnCount + 1 };

        case GamePhase.WAITING_FOR_PLAY:
            return state; // カードプレイ待ち（playCardで遷移）

        case GamePhase.SELECTING_TARGET:
            return state; // 対象選択待ち（selectTargetで遷移）

        case GamePhase.RESOLVING_EFFECT:
            return { ...state, phase: GamePhase.TURN_END };

        case GamePhase.EXCHANGE_PHASE:
            return { ...state, phase: GamePhase.TURN_END };

        case GamePhase.TURN_END:
            return moveToNextPlayer(state);

        case GamePhase.GAME_OVER:
            return state;

        default:
            return state;
    }
}

/**
 * 次のプレイヤーに移動
 */
function moveToNextPlayer(state: GameState): GameState {
    const alivePlayers = state.players.filter(p => p.isAlive);
    if (alivePlayers.length <= 1) {
        return { ...state, phase: GamePhase.GAME_OVER };
    }

    let nextIndex = (state.activePlayerIndex + 1) % state.players.length;

    // 生存しているプレイヤーまでスキップ
    while (!state.players[nextIndex].isAlive) {
        nextIndex = (nextIndex + 1) % state.players.length;
    }

    // 巡数を計算: 場に出ているカード枚数 / プレイヤー数 + 1
    // ここでは既にカードが出された後なので、この時点で「次のプレイヤーにとってのラウンド数」が決まる
    // 例: 4人プレイ、4枚目が出た直後 state.tableCards.length=4。4/4+1=2巡目突入。
    const playerCount = state.players.length;
    const currentCardsCount = state.tableCards.length;
    const newRoundNumber = Math.floor(currentCardsCount / playerCount) + 1;

    return {
        ...state,
        activePlayerIndex: nextIndex,
        roundNumber: newRoundNumber, // 巡数を更新
        phase: GamePhase.TURN_START,
        pendingAction: null,
    };
}

/**
 * カードをプレイする
 */
export function playCard(state: GameState, playerId: string, cardId: string): GameState {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1 || playerIndex !== state.activePlayerIndex) {
        return state; // 無効なプレイ
    }

    const player = state.players[playerIndex];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        return state; // カードが見つからない
    }

    const card = player.hand[cardIndex];

    // カードをプレイできるか検証
    if (!canPlayCard(state, player, card)) {
        return state;
    }

    // カードを手札から削除し、場に出す
    const newHand = player.hand.filter(c => c.id !== cardId);
    const newPlayers = [...state.players];
    newPlayers[playerIndex] = { ...player, hand: newHand };

    let newState: GameState = {
        ...state,
        players: newPlayers,
        tableCards: [...state.tableCards, card],
        turnCount: state.turnCount + 1, // プレイ回数を+1
    };

    // カード効果を処理
    return processCardEffect(newState, playerIndex, card);
}

/**
 * カードをプレイできるか検証
 */
export function canPlayCard(state: GameState, player: Player, card: Card): boolean {
    // 変態目撃者を持っている場合、変態目撃者以外のカードは出せない
    const hasFirstDiscoverer = player.hand.some(c => c.type === 'first_discoverer');
    if (hasFirstDiscoverer && card.type !== 'first_discoverer') {
        return false;
    }

    // 1巡目の最初（変態発見者を持つプレイヤーの最初のターン）は変態発見者のみ出せる
    // ただし変態発見者を持っている場合は上の条件で既に制限されている
    // ゲーム開始直後の最初のプレイは変態発見者のみ
    if (state.tableCards.length === 0 && card.type !== 'first_discoverer') {
        return false;
    }

    // 変態カードは最後の1枚でないと出せない
    if (card.type === 'culprit' && player.hand.length !== 1) {
        return false;
    }

    // 逮捕カードは1巡目は出せない（2巡目以降で使用可能）
    if (card.type === 'detective') {
        const playerCount = state.players.length;
        // 現在のラウンドを動的に計算: (場に出ているカード枚数 / 人数) + 1
        // 注意: 自分がこれから出すカードは含まれていないので、純粋に「今何巡目か」を判定
        const currentRound = Math.floor(state.tableCards.length / playerCount) + 1;

        if (currentRound < 2) {
            return false;
        }
    }

    return true;
}


/**
 * カード効果を処理
 */
function processCardEffect(state: GameState, playerIndex: number, card: Card): GameState {
    const player = state.players[playerIndex];

    switch (card.type) {
        case 'first_discoverer':
            // 効果なし、ログのみ
            return { ...state, phase: GamePhase.RESOLVING_EFFECT };

        case 'culprit':
            // 変態を出した = 勝利判定
            if (player.hand.length === 0) {
                // 最後の1枚として出した = 変態の勝利
                return declareWinner(
                    state,
                    'CRIMINAL_TEAM',
                    'CULPRIT_ESCAPE',
                    player.id,  // MVP: 変態カードを出したプレイヤー
                    null
                );
            } else {
                // それ以外で出した = 変態の敗北（このチェックは通常canPlayCardで弾かれる）
                return declareWinner(
                    state,
                    'DETECTIVE_TEAM',
                    null,
                    null,
                    player.id  // 対象: 変態カードを出してしまったプレイヤー
                );
            }

        case 'detective':
        case 'witness':
        case 'dog':
        case 'trade':
            // 対象選択が必要
            return {
                ...state,
                phase: GamePhase.SELECTING_TARGET,
                pendingAction: {
                    type: 'SELECT_TARGET',
                    playerId: player.id,
                    cardType: card.type,
                },
            };

        case 'alibi':
        case 'common':
            // 効果なし
            return { ...state, phase: GamePhase.RESOLVING_EFFECT };

        case 'plot':
            // 異常性癖者: チームを変態側に変更
            const newPlayers = [...state.players];
            newPlayers[playerIndex] = { ...player, team: 'CRIMINAL' };
            return { ...state, players: newPlayers, phase: GamePhase.RESOLVING_EFFECT };

        case 'boy':
            // 少年: 変態を知る（画面で表示）
            return { ...state, phase: GamePhase.RESOLVING_EFFECT };

        case 'information':
            // 情報操作: 全員が左隣の人に手札を1枚渡す（自動実行）
            return executeInformationExchange(state);

        case 'rumor':
            // うわさ: 全員が右隣の人の手札から1枚引く（自動実行）
            return executeRumorExchange(state);

        default:
            return { ...state, phase: GamePhase.RESOLVING_EFFECT };
    }
}

/**
 * 対象を選択
 */
export function selectTarget(state: GameState, targetPlayerId: string): GameState {
    if (!state.pendingAction || state.pendingAction.type !== 'SELECT_TARGET') {
        return state;
    }

    const sourcePlayerIndex = state.players.findIndex(p => p.id === state.pendingAction!.playerId);
    const targetPlayerIndex = state.players.findIndex(p => p.id === targetPlayerId);

    if (sourcePlayerIndex === -1 || targetPlayerIndex === -1) {
        return state;
    }

    const targetPlayer = state.players[targetPlayerIndex];
    const cardType = state.pendingAction.cardType;

    switch (cardType) {
        case 'detective':
            // 警察: 変態を持っているか判定
            const hasCulprit = targetPlayer.hand.some(c => c.type === 'culprit');
            const hasAlibi = targetPlayer.hand.some(c => c.type === 'alibi');

            if (hasCulprit && !hasAlibi) {
                // 変態を当てた！
                const sourcePlayer = state.players[sourcePlayerIndex];
                return declareWinner(
                    state,
                    'DETECTIVE_TEAM',
                    'DETECTIVE',
                    sourcePlayer.id,  // MVP: 警察カードを使用したプレイヤー
                    targetPlayerId    // 対象: 変態カードを持っていたプレイヤー
                );
            } else {
                // 外れ
                return { ...state, phase: GamePhase.RESOLVING_EFFECT, pendingAction: null };
            }

        case 'witness':
            // 目撃者: 相手の手札を見る（画面で表示）
            return {
                ...state,
                phase: GamePhase.RESOLVING_EFFECT,
                pendingAction: {
                    ...state.pendingAction,
                    targetIds: [targetPlayerId],
                },
            };

        case 'dog':
            // 正常者: 対象を指定した後、カード選択フェーズへ移行（手動で選択）
            return {
                ...state,
                phase: GamePhase.SELECTING_CARD,
                pendingAction: {
                    ...state.pendingAction,
                    targetIds: [targetPlayerId],
                    type: 'SELECT_CARD',
                },
            };

        case 'trade':
            // 取り引き: カード交換を自動実行
            return executeTradeExchange(state, state.pendingAction.playerId, targetPlayerId);

        default:
            return { ...state, phase: GamePhase.RESOLVING_EFFECT, pendingAction: null };
    }
}

/**
 * 勝者を宣言
 * @param state 現在のゲーム状態
 * @param winner 勝利チーム
 * @param victoryType 勝利タイプ（逮捕/正常者/変態逃亡）
 * @param mvpPlayerId メイン勝者のプレイヤーID
 * @param targetPlayerId 対象プレイヤーID（逮捕/正常者の場合は変態）
 */
function declareWinner(
    state: GameState,
    winner: WinnerTeam,
    victoryType: VictoryType = null,
    mvpPlayerId: string | null = null,
    targetPlayerId: string | null = null
): GameState {
    const isCriminalWin = winner === 'CRIMINAL_TEAM';

    // 異常性癖者カードを使用したプレイヤーを特定
    const plotCardUsers = findPlotCardUsers(state);

    // 変態カードを持っているプレイヤーを特定
    const culpritPlayer = state.players.find(p =>
        p.hand.some(c => c.type === 'culprit')
    );
    const culpritPlayerId = culpritPlayer?.id || null;

    // 各プレイヤーの勝敗結果を生成
    const playerResults: PlayerResult[] = state.players.map(player => {
        const usedPlotCard = plotCardUsers.includes(player.id);

        // 異常性癖者使用者はCRIMINALチームに所属（変態側）
        const effectiveTeam = usedPlotCard ? 'CRIMINAL' : player.team;

        // 勝利判定（新ルール）
        let isWinner = false;

        if (isCriminalWin) {
            // 変態チーム勝利の場合:
            // - 変態カードを持っている人（または変態カードを出した人）が勝利
            // - 異常性癖者を使用した人も勝利
            const isCulprit = player.id === culpritPlayerId || player.id === mvpPlayerId;
            isWinner = isCulprit || usedPlotCard;
        } else {
            // 逮捕/正常者勝利の場合:
            // - カードを使用した人（MVP）のみが勝者
            // - 他の市民は勝者ではない
            isWinner = player.id === mvpPlayerId;
        }

        // MVP判定（このアクションで勝利を決めたプレイヤー）
        const isMVP = player.id === mvpPlayerId;

        // 異常性癖者として勝利したか
        const isAccompliceWinner = usedPlotCard && isWinner;

        return {
            playerId: player.id,
            playerName: player.name,
            team: effectiveTeam,
            isWinner,
            isMVP,
            isAccompliceWinner,
            usedPlotCard,
        };
    });

    // プレイヤーのチームを更新（異常性癖者使用者をCRIMINALに変更）
    const newPlayers = state.players.map(player => {
        const usedPlotCard = plotCardUsers.includes(player.id);
        if (usedPlotCard) {
            return { ...player, team: 'CRIMINAL' as const };
        }
        return player;
    });

    // 勝利詳細情報を作成
    const victoryInfo: VictoryInfo = {
        winnerTeam: winner,
        victoryType,
        mvpPlayerId,
        targetPlayerId,
        playerResults,
    };

    return {
        ...state,
        players: newPlayers,
        winner,
        victoryInfo,
        phase: GamePhase.GAME_OVER,
        pendingAction: null,
    };
}

/**
 * 異常性癖者カードを使用したプレイヤーのIDリストを取得
 * - 場に出された plotカードを確認
 * - または player.team === 'CRIMINAL' かつ変態カードを持っていないプレイヤー
 */
function findPlotCardUsers(state: GameState): string[] {
    const plotUsers: string[] = [];

    // 1. CRIMINALチームだが変態カードを持っていないプレイヤー
    state.players.forEach(player => {
        if (player.team === 'CRIMINAL') {
            const hasCulprit = player.hand.some(c => c.type === 'culprit');
            if (!hasCulprit) {
                plotUsers.push(player.id);
            }
        }
    });

    return plotUsers;
}


/**
 * 変態を持っているプレイヤーを取得
 */
export function getCulpritPlayer(state: GameState): Player | null {
    for (const player of state.players) {
        if (player.hand.some(c => c.type === 'culprit')) {
            return player;
        }
    }
    return null;
}

/**
 * 情報操作: 全員が左隣の人に手札を1枚渡す
 * （ローカルモードでは各自ランダムに1枚選んで渡す）
 */
function executeInformationExchange(state: GameState): GameState {
    const alivePlayers = state.players.filter(p => p.isAlive);
    const playerCount = alivePlayers.length;

    if (playerCount < 2) {
        return { ...state, phase: GamePhase.RESOLVING_EFFECT };
    }

    // 各プレイヤーが左隣に渡すカードをランダムに選択
    const cardsToPass: (Card | null)[] = alivePlayers.map(player => {
        if (player.hand.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * player.hand.length);
        return player.hand[randomIndex];
    });

    // カードを移動
    const newPlayers = state.players.map(player => {
        const aliveIndex = alivePlayers.findIndex(p => p.id === player.id);
        if (aliveIndex === -1 || !player.isAlive) {
            return player;
        }

        // 左隣のインデックス（プレイヤーの右隣がこのプレイヤーにカードを渡す）
        const rightNeighborIndex = (aliveIndex + playerCount - 1) % playerCount;
        const cardToReceive = cardsToPass[rightNeighborIndex];
        const cardToGive = cardsToPass[aliveIndex];

        // 手札を更新
        let newHand = [...player.hand];

        // 渡すカードを削除
        if (cardToGive) {
            newHand = newHand.filter(c => c.id !== cardToGive.id);
        }

        // 受け取るカードを追加
        if (cardToReceive) {
            newHand.push(cardToReceive);
        }

        // ソート
        newHand.sort((a, b) => a.sortOrder - b.sortOrder);

        return { ...player, hand: newHand };
    });

    return {
        ...state,
        players: newPlayers,
        phase: GamePhase.RESOLVING_EFFECT,
        pendingAction: null,
    };
}

/**
 * うわさ: 全員が右隣の人の手札から1枚引く
 */
function executeRumorExchange(state: GameState): GameState {
    const alivePlayers = state.players.filter(p => p.isAlive);
    const playerCount = alivePlayers.length;

    if (playerCount < 2) {
        return { ...state, phase: GamePhase.RESOLVING_EFFECT };
    }

    // 各プレイヤーが右隣から引くカードをランダムに選択
    const cardsToDraw: (Card | null)[] = alivePlayers.map((_player, index) => {
        // 右隣のプレイヤー
        const rightNeighborIndex = (index + 1) % playerCount;
        const rightNeighbor = alivePlayers[rightNeighborIndex];

        if (rightNeighbor.hand.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * rightNeighbor.hand.length);
        return rightNeighbor.hand[randomIndex];
    });

    // 交換情報を記録
    const exchanges: { fromPlayerId: string; toPlayerId: string; cardId: string }[] = [];

    // カードを移動
    const newPlayers = state.players.map(player => {
        const aliveIndex = alivePlayers.findIndex(p => p.id === player.id);
        if (aliveIndex === -1 || !player.isAlive) {
            return player;
        }

        // このプレイヤーが引くカード（右隣から引く）
        const cardToDraw = cardsToDraw[aliveIndex];

        // 交換情報を記録
        if (cardToDraw) {
            const rightNeighborIndex = (aliveIndex + 1) % playerCount;
            const rightNeighbor = alivePlayers[rightNeighborIndex];
            exchanges.push({
                fromPlayerId: rightNeighbor.id,
                toPlayerId: player.id,
                cardId: cardToDraw.id,
            });
        }

        // 左隣のプレイヤーがこのプレイヤーから引くカード
        const leftNeighborIndex = (aliveIndex + playerCount - 1) % playerCount;
        const cardToBeTaken = cardsToDraw[leftNeighborIndex];

        // 手札を更新
        let newHand = [...player.hand];

        // 取られるカードを削除
        if (cardToBeTaken) {
            newHand = newHand.filter(c => c.id !== cardToBeTaken.id);
        }

        // 引くカードを追加
        if (cardToDraw) {
            newHand.push(cardToDraw);
        }

        // ソート
        newHand.sort((a, b) => a.sortOrder - b.sortOrder);

        return { ...player, hand: newHand };
    });

    return {
        ...state,
        players: newPlayers,
        phase: GamePhase.RESOLVING_EFFECT,
        pendingAction: null,
        lastExchangeInfo: {
            type: 'RUMOR',
            exchanges,
        },
    };
}

/**
 * 取り引き: 2人のプレイヤー間でカードを1枚ずつ交換
 * （ローカルモードではランダムに1枚選んで交換）
 */
function executeTradeExchange(state: GameState, playerId: string, targetPlayerId: string): GameState {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    const targetIndex = state.players.findIndex(p => p.id === targetPlayerId);

    if (playerIndex === -1 || targetIndex === -1) {
        return { ...state, phase: GamePhase.RESOLVING_EFFECT, pendingAction: null };
    }

    const player = state.players[playerIndex];
    const target = state.players[targetIndex];

    // 両者に手札がない場合は交換なし
    if (player.hand.length === 0 || target.hand.length === 0) {
        return { ...state, phase: GamePhase.RESOLVING_EFFECT, pendingAction: null };
    }

    // ランダムに1枚ずつ選択
    const playerCardIndex = Math.floor(Math.random() * player.hand.length);
    const targetCardIndex = Math.floor(Math.random() * target.hand.length);

    const playerCard = player.hand[playerCardIndex];
    const targetCard = target.hand[targetCardIndex];

    // 手札を交換
    const newPlayers = [...state.players];

    // プレイヤーの手札を更新
    const newPlayerHand = [...player.hand];
    newPlayerHand.splice(playerCardIndex, 1, targetCard);
    newPlayerHand.sort((a, b) => a.sortOrder - b.sortOrder);
    newPlayers[playerIndex] = { ...player, hand: newPlayerHand };

    // ターゲットの手札を更新
    const newTargetHand = [...target.hand];
    newTargetHand.splice(targetCardIndex, 1, playerCard);
    newTargetHand.sort((a, b) => a.sortOrder - b.sortOrder);
    newPlayers[targetIndex] = { ...target, hand: newTargetHand };

    return {
        ...state,
        players: newPlayers,
        phase: GamePhase.RESOLVING_EFFECT,
        pendingAction: null,
    };
}

/**
 * カードを選択（正常者等の効果用）
 */
export function selectCard(state: GameState, cardId: string): GameState {
    if (state.phase !== GamePhase.SELECTING_CARD || !state.pendingAction || !state.pendingAction.targetIds) {
        return state;
    }

    const targetPlayerId = state.pendingAction.targetIds[0];
    const target = state.players.find(p => p.id === targetPlayerId);

    if (!target) {
        return { ...state, phase: GamePhase.RESOLVING_EFFECT, pendingAction: null };
    }

    const selectedCard = target.hand.find(c => c.id === cardId);
    if (!selectedCard) {
        return state;
    }

    // 正常者の判定
    if (state.pendingAction.cardType === 'dog') { // 元のカードがdogの場合（pendingActionにcardTypeを保存している前提）
        // 現状のpendingAction.cardTypeは processPendingAction での分岐に使われているが、
        // 正常者効果の実行中であることを知る必要がある。
        // processPendingActionで書き換える際に cardType を残しておけばOK。
    }

    // しかし processPendingAction では pendingAction を更新して返している。
    // pendingAction.cardType は 'dog' のままであるべきだが、 
    // 前の修正で `...state.pendingAction` を展開しているので `cardType` は保持されているはず。

    if (selectedCard.type === 'culprit') {
        // 変態を当てた！
        const activePlayer = state.players[state.activePlayerIndex];
        return declareWinner(
            state,
            'DETECTIVE_TEAM',
            'DOG',
            activePlayer.id,
            target.id
        );
    } else {
        // 外れ
        return {
            ...state,
            phase: GamePhase.RESOLVING_EFFECT,
            pendingAction: null,
            systemMessage: '変態ではありませんでした', // 判定結果メッセージ
        };
    }
}
