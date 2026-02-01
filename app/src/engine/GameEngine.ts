// ====================================
// ゲームエンジン: 変態は踊る
// ====================================

import type { GameState, Player, Card, WinnerTeam, VictoryType, VictoryInfo, PlayerResult, ArrestAnimationInfo } from '../types';
import { GamePhase } from '../types';
import { generateDeck, dealCards, findFirstDiscovererIndex } from '../utils/deckFactory';
import { getRandomDangerWord } from '../data/wordList';
import { calculateHentaiLevel, generateDisplayName } from '../hooks/useHentaiSystem';

/**
 * ゲームを初期化する
 */
export function initializeGame(
    players: Player[]
): GameState {
    const playerCount = players.length;

    // プレイヤーの並び順をランダムにシャッフル
    const shuffledPlayers = [...players];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }
    console.log('[Init] Player order shuffled:', shuffledPlayers.map(p => p.name).join(' -> '));

    // デッキを生成してシャッフル（参加人数に応じて自動生成）
    const deck = generateDeck(playerCount);

    // カードを配布
    const hands = dealCards(deck, playerCount);

    // 枕詞を割り当て（ゲーム全体の危険ワード）
    const dangerWord = getRandomDangerWord();

    // 変態カードに個別の危険ワードを割り当て
    hands.forEach(hand => {
        const culpritCard = hand.find(c => c.type === 'culprit');
        if (culpritCard) {
            culpritCard.assignedDangerWord = getRandomDangerWord();
        }
    });

    // プレイヤーに手札と枕詞を設定（シャッフルされた順番で）
    const updatedPlayers = shuffledPlayers.map((player, index) => {
        const level = player.hentaiLevel || 0;

        // 既にcurrentPrefixが設定されている場合（前のゲームから引き継いだ場合）はそれを使用
        // 設定されていない場合のみ新しく生成
        let finalPrefix = player.currentPrefix;
        let finalAssignedWord = player.assignedWord;

        if (!finalPrefix) {
            console.log(`[Init] Generating name for ${player.name} (Lv${level})`);

            const { assignedWord: newAssignedWord, fullPrefix: newFullPrefix } = generateDisplayName(
                level,
                player.name,
                player.assignedWord || null
            );

            finalPrefix = newFullPrefix || '常識人な';
            finalAssignedWord = newAssignedWord;

            console.log(`[Init] -> Prefix: ${finalPrefix}, Assigned: ${finalAssignedWord}`);
        } else {
            console.log(`[Init] Using existing prefix for ${player.name}: ${finalPrefix}`);
        }

        return {
            ...player,
            name: player.name,
            hand: hands[index],
            currentPrefix: finalPrefix,
            assignedWord: finalAssignedWord,
            hentaiLevel: level,
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
        turnCount: 0,
        roundNumber: 1,
        tableCards: [],
        winner: null,
        victoryInfo: null,
        pendingAction: null,
        playedLog: [],
        dangerWord,
    };
}

/**
 * ゲームフェーズを次に進める
 */
export function advancePhase(state: GameState): GameState {
    // フェーズが進む際はシステムメッセージをクリアする
    const stateWithClearedMessage = {
        ...state,
        systemMessage: undefined
    };

    switch (state.phase) {
        case GamePhase.SETUP:
            return { ...stateWithClearedMessage, phase: GamePhase.TURN_START };

        case GamePhase.TURN_START:
            return { ...stateWithClearedMessage, phase: GamePhase.WAITING_FOR_PLAY, turnCount: state.turnCount + 1 };

        case GamePhase.WAITING_FOR_PLAY:
            return state; // カードプレイ待ち（playCardで遷移）

        case GamePhase.SELECTING_TARGET:
            return state; // 対象選択待ち（selectTargetで遷移）

        case GamePhase.RESOLVING_EFFECT:
            return { ...stateWithClearedMessage, phase: GamePhase.TURN_END };

        case GamePhase.EXCHANGE_PHASE:
            return { ...stateWithClearedMessage, phase: GamePhase.TURN_END };

        case GamePhase.TURN_END:
            return moveToNextPlayer(stateWithClearedMessage);

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
        playedLog: [
            ...state.playedLog,
            {
                cardId: card.id,
                cardType: card.type,
                playerId: player.id,
                turn: state.roundNumber
            }
        ],
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

    // 逮捕カードは通常1巡目は出せない（2巡目以降で使用可能）
    // ただし、手札が「逮捕」と「変態」のみで構成されている（他に出せるカードがない）場合は、特例として1巡目でもプレイ可能（この場合効果は発動しない）
    if (card.type === 'detective') {
        const playerCount = state.players.length;
        const currentRound = Math.floor(state.tableCards.length / playerCount) + 1;

        if (currentRound < 2) {
            // 他に出せるカードがあるかチェック
            // 変態以外のカードがあれば、そちらを優先しなければならない
            const hasOtherPlayableCard = player.hand.some(c => c.type !== 'detective' && c.type !== 'culprit');

            if (hasOtherPlayableCard) {
                return false;
            }
            // 他に出せるカードがない場合は true (許可)
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
            // 変態発見時の演出: 変態カードのDangerWordsを表示
            let dangerMessage = '変態の気配を感じます...';
            // 全プレイヤーの手札から変態カードを探す
            const culpritPlayer = state.players.find(p => p.hand.some(c => c.type === 'culprit'));
            if (culpritPlayer) {
                const culpritCard = culpritPlayer.hand.find(c => c.type === 'culprit');
                if (culpritCard && culpritCard.assignedDangerWord) {
                    dangerMessage = `「${culpritCard.assignedDangerWord}」変態を見てしまいました・・・`;
                }
            }

            return {
                ...state,
                phase: GamePhase.RESOLVING_EFFECT,
                systemMessage: dangerMessage
            };

        case 'culprit':
            // 変態を出した = 勝利判定
            if (player.hand.length === 0) {
                // 最後の1枚として出した = 変態の勝利 → 演出フェーズへ
                // 変態カードの危険ワードを取得
                const dangerWord = card.assignedDangerWord || state.dangerWord || undefined;

                return {
                    ...state,
                    phase: GamePhase.RESOLVING_EFFECT,
                    culpritVictoryAnimationInfo: {
                        culpritPlayerId: player.id,
                        dangerWord: dangerWord
                    }
                };
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

        case 'detective': {
            // 1巡目の場合は効果を発動せず、ただの捨て札として扱う
            // （playCard関数内で既にカードが場に出されているため、-1して計算）
            const playerCount = state.players.length;
            const currentRound = Math.floor((state.tableCards.length - 1) / playerCount) + 1;
            if (currentRound < 2) {
                return { ...state, phase: GamePhase.RESOLVING_EFFECT };
            }
            // 2巡目以降は対象選択が必要
            return {
                ...state,
                phase: GamePhase.SELECTING_TARGET,
                pendingAction: {
                    type: 'SELECT_TARGET',
                    playerId: player.id,
                    cardType: card.type,
                },
            };
        }

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
            // 情報操作: 全員が左隣の人に手札を1枚渡す
            // NPCの選択を事前に決定
            const npcSelections: Record<string, string> = {};
            state.players.forEach(p => {
                if (p.isNpc && p.isAlive && p.hand.length > 0) {
                    const randomCard = p.hand[Math.floor(Math.random() * p.hand.length)];
                    npcSelections[p.id] = randomCard.id;
                }
            });

            const exchangeState = {
                type: 'INFORMATION' as const,
                selections: npcSelections
            };

            const infoState = {
                ...state,
                phase: GamePhase.EXCHANGE_PHASE,
                exchangeState
            };

            // 全員選択完了済みかチェック（手札0枚のプレイヤーがいる場合や、全員NPCの場合など）
            const isAllReady = infoState.players.every(p =>
                !p.isAlive || p.hand.length === 0 || !!npcSelections[p.id]
            );

            if (isAllReady) {
                return executeInformationExchange(infoState);
            }

            return infoState;

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
            const sourcePlayer = state.players[sourcePlayerIndex];

            // 演出情報を作成
            const detectiveAnimationInfo: ArrestAnimationInfo = {
                cardType: 'detective',
                sourcePlayerId: sourcePlayer.id,
                targetPlayerId: targetPlayerId,
                isSuccess: hasCulprit && !hasAlibi
            };

            if (hasCulprit && !hasAlibi) {
                // 変態を当てた！ → 演出フェーズへ
                return {
                    ...state,
                    phase: GamePhase.RESOLVING_EFFECT,
                    pendingAction: null,
                    arrestAnimationInfo: detectiveAnimationInfo
                };
            } else {
                // 外れ → 演出フェーズへ
                return {
                    ...state,
                    phase: GamePhase.RESOLVING_EFFECT,
                    pendingAction: null,
                    arrestAnimationInfo: detectiveAnimationInfo
                };
            }

        case 'witness':
            // 目撃者: 相手の手札を見る（画面で表示）
            {
                const sourcePlayer = state.players[sourcePlayerIndex];
                const targetPlayer = state.players[targetPlayerIndex];

                // ログ更新: 直近のこのプレイヤーの目撃者カード使用ログに対象IDを記録
                const newPlayedLog = [...state.playedLog];
                const lastLogIndex = [...newPlayedLog].reverse().findIndex(log =>
                    log.playerId === sourcePlayer.id && log.cardType === 'witness'
                );

                if (lastLogIndex !== -1) {
                    // reverseしているので、元のインデックスを計算
                    const realIndex = newPlayedLog.length - 1 - lastLogIndex;
                    newPlayedLog[realIndex] = {
                        ...newPlayedLog[realIndex],
                        targetId: targetPlayerId
                    };
                }

                return {
                    ...state,
                    phase: GamePhase.RESOLVING_EFFECT,
                    systemMessage: `${sourcePlayer.name}は${targetPlayer.name}を目撃した`,
                    playedLog: newPlayedLog,
                    pendingAction: {
                        ...state.pendingAction,
                        targetIds: [targetPlayerId],
                    },
                };
            }

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
            // 取り引き: カード交換選択フェーズへ移行
            {
                const initiatorId = state.pendingAction.playerId;
                const targetId = targetPlayerId;
                const initiatorPlayer = state.players.find(p => p.id === initiatorId);
                const targetPlayer = state.players.find(p => p.id === targetId);

                const initialSelections: Record<string, string> = {};

                // ターゲットがNPCの場合はランダムに選択済みにする
                if (targetPlayer && targetPlayer.isNpc && targetPlayer.hand.length > 0) {
                    const randomCard = targetPlayer.hand[Math.floor(Math.random() * targetPlayer.hand.length)];
                    initialSelections[targetId] = randomCard.id;
                }

                // 実行者がNPCの場合もランダムに選択済みにする
                if (initiatorPlayer && initiatorPlayer.isNpc && initiatorPlayer.hand.length > 0) {
                    const randomCard = initiatorPlayer.hand[Math.floor(Math.random() * initiatorPlayer.hand.length)];
                    initialSelections[initiatorId] = randomCard.id;
                }

                // 両者選択済みの場合は即実行
                // (例: NPC vs NPC, または何らかの理由で即時決定した場合)
                const hasInitiatorSelected = !initiatorPlayer || initiatorPlayer.hand.length === 0 || !!initialSelections[initiatorId];
                const hasTargetSelected = !targetPlayer || targetPlayer.hand.length === 0 || !!initialSelections[targetId];

                if (hasInitiatorSelected && hasTargetSelected) {
                    // 一時的なStateを作成して実行
                    const tempState: GameState = {
                        ...state,
                        exchangeState: {
                            type: 'TRADE',
                            selections: initialSelections,
                            targetIds: [initiatorId, targetId]
                        }
                    };
                    return executeTradeExchange(tempState, initiatorId, targetId);
                }

                return {
                    ...state,
                    phase: GamePhase.EXCHANGE_PHASE,
                    pendingAction: null,
                    exchangeState: {
                        type: 'TRADE',
                        selections: initialSelections,
                        targetIds: [initiatorId, targetId]
                    }
                };
            }

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

        let effectiveTeam: 'CITIZEN' | 'CRIMINAL' = player.team;
        if (usedPlotCard) {
            effectiveTeam = 'CRIMINAL';
        }

        let isWinner = false;
        if (isCriminalWin) {
            const isCulprit = player.id === culpritPlayerId || player.id === mvpPlayerId;
            isWinner = isCulprit || usedPlotCard;
        } else {
            // 警察側勝利の場合
            // MVPであっても、異常性癖者（usedPlotCard）なら勝利できない
            isWinner = (player.id === mvpPlayerId) && !usedPlotCard;
        }

        const isMVP = player.id === mvpPlayerId;
        const isAccompliceWinner = usedPlotCard && isWinner;

        const baseResult = {
            playerId: player.id,
            playerName: player.name,
            team: effectiveTeam,
            isWinner,
            isMVP,
            isAccompliceWinner,
            usedPlotCard,
        };

        // 変態度の計算
        // victoryInfo.targetPlayerIdがnullの場合、calculateHentaiLevel内でマッチングしないようにする
        const calcVictoryInfo: VictoryInfo = {
            winnerTeam: winner,
            victoryType,
            mvpPlayerId,
            targetPlayerId: targetPlayerId || '', // nullチェック: nullなら空文字にして誰にもマッチしないようにする
            playerResults: []
        };

        const currentLevel = player.hentaiLevel || 0;
        const newLevel = calculateHentaiLevel(currentLevel, baseResult as PlayerResult, calcVictoryInfo);

        // 変態敗北時はデンジャーワードを引き継ぐ
        let assignedWordForDisplay = player.assignedWord || null;
        if (winner === 'DETECTIVE_TEAM' && player.id === targetPlayerId) {
            // 変態カードのデンジャーワードを取得
            const culpritCard = player.hand.find(c => c.type === 'culprit');
            if (culpritCard?.assignedDangerWord) {
                assignedWordForDisplay = culpritCard.assignedDangerWord;
            }
        }

        // 次回の名前プレビュー
        const { displayName, assignedWord: newAssignedWord, fullPrefix: newPrefix } = generateDisplayName(
            newLevel,
            player.name,
            assignedWordForDisplay
        );

        // 変態敗北時はデンジャーワードを新しいassignedWordとして設定
        const finalAssignedWord = (winner === 'DETECTIVE_TEAM' && player.id === targetPlayerId)
            ? assignedWordForDisplay
            : newAssignedWord;

        return {
            ...baseResult,
            oldHentaiLevel: currentLevel,
            newHentaiLevel: newLevel,
            newDisplayName: displayName,
            newPrefix: newPrefix || '常識人な',
            newAssignedWord: finalAssignedWord || undefined
        };
    });

    // プレイヤーのチームと変態度を更新
    const newPlayers = state.players.map(player => {
        const result = playerResults.find(r => r.playerId === player.id);
        const newLevel = result?.newHentaiLevel ?? (player.hentaiLevel || 0);
        // チーム更新ロジック
        const usedPlotCard = plotCardUsers.includes(player.id);
        let effectiveTeam: 'CITIZEN' | 'CRIMINAL' = player.team;
        if (usedPlotCard) {
            effectiveTeam = 'CRIMINAL';
        }

        // 変態カード所持者が敗北した場合、カードのDangerWordsを継承する
        let assignedWord = player.assignedWord;
        if (winner === 'DETECTIVE_TEAM' && player.id === targetPlayerId) {
            // このプレイヤーが持っていた変態カードのDangerWordsを取得
            const culpritCard = player.hand.find(c => c.type === 'culprit');
            if (culpritCard?.assignedDangerWord) {
                assignedWord = culpritCard.assignedDangerWord;
            }
        }

        return {
            ...player,
            team: effectiveTeam,
            hentaiLevel: newLevel,
            assignedWord: assignedWord
        };
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
/**
 * 情報操作: 全員が左隣の人に手札を1枚渡す
 * （手札があるプレイヤー同士でのみ交換を行う）
 */
function executeInformationExchange(state: GameState): GameState {
    // 手札がある生存プレイヤーのみを対象とする（手札がないプレイヤーはスキップ）
    const participants = state.players.filter(p => p.isAlive && p.hand.length > 0);

    if (participants.length < 2) {
        // 交換相手がいない場合は何も起きない
        return {
            ...state,
            phase: GamePhase.RESOLVING_EFFECT,
            exchangeState: null,
            pendingAction: null
        };
    }

    // 選択されたカードを取得（ない場合はランダム）
    const selections = state.exchangeState?.selections || {};
    const cardsToPass = participants.map(player => {
        const cardId = selections[player.id];
        if (cardId) {
            const selected = player.hand.find(c => c.id === cardId);
            if (selected) return selected;
        }
        // フォールバック: ランダム
        return player.hand[Math.floor(Math.random() * player.hand.length)];
    });

    // プレイヤー状態を更新
    const newPlayers = [...state.players];
    const exchanges: { fromPlayerId: string; toPlayerId: string; cardId: string }[] = [];

    participants.forEach((player, index) => {
        const playerIndexInGlobal = state.players.findIndex(p => p.id === player.id);

        // 渡すカード
        const cardToGive = cardsToPass[index];

        // 受け取るカード（参加者リストの右隣＝前のインデックスの人から受け取る）
        // 左隣に渡す = 右隣から受け取る
        const rightNeighborIndex = (index + participants.length - 1) % participants.length;
        const cardToReceive = cardsToPass[rightNeighborIndex];
        const rightNeighbor = participants[rightNeighborIndex];

        // 手札を更新
        let newHand = [...player.hand];

        // 渡すカードを削除
        newHand = newHand.filter(c => c.id !== cardToGive.id);

        // 受け取るカードを追加
        newHand.push(cardToReceive);

        // ソート
        newHand.sort((a, b) => a.sortOrder - b.sortOrder);

        newPlayers[playerIndexInGlobal] = {
            ...player,
            hand: newHand
        };

        // 交換履歴を記録
        exchanges.push({
            fromPlayerId: rightNeighbor.id,
            toPlayerId: player.id,
            cardId: cardToReceive.id
        });
    });

    return {
        ...state,
        players: newPlayers,
        phase: GamePhase.RESOLVING_EFFECT,
        pendingAction: null,
        exchangeState: null, // 交換状態をリセット
        lastExchangeInfo: {  // 交換情報を記録
            type: 'INFORMATION',
            exchanges
        }
    };
}

/**
 * うわさ: 全員が右隣の人の手札から1枚引く
 */
/**
 * うわさ: 全員が右隣の人の手札から1枚引く
 * （手札があるプレイヤー同士でのみ交換を行う）
 */
function executeRumorExchange(state: GameState): GameState {
    // 手札がある生存プレイヤーのみを対象とする
    const participants = state.players.filter(p => p.isAlive && p.hand.length > 0);
    const participantCount = participants.length;

    if (participantCount < 2) {
        // 交換相手がいない場合は何も起きない
        return { ...state, phase: GamePhase.RESOLVING_EFFECT };
    }

    // 各プレイヤーが右隣から引くカードをランダムに選択
    const cardsToDraw = participants.map((_player, index) => {
        // 参加者リスト内での右隣（index - 1）
        // 左隣に渡す = 右隣から受け取る、というRumorの定義（時計回りにカードが動くイメージ）
        // 以前のロジック: index-1 が右隣として実装されていたのでそれに合わせる
        const rightNeighborIndex = (index - 1 + participantCount) % participantCount;
        const rightNeighbor = participants[rightNeighborIndex];

        // 参加者は必ず手札を持っているはずだが念のためチェック
        if (rightNeighbor.hand.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * rightNeighbor.hand.length);
        return rightNeighbor.hand[randomIndex];
    });

    // 交換情報を記録
    const exchanges: { fromPlayerId: string; toPlayerId: string; cardId: string }[] = [];

    // 新しいプレイヤー状態を作成
    const newPlayers = [...state.players];

    // 参加者ごとに手札を更新
    participants.forEach((player, index) => {
        const playerIndexInGlobal = state.players.findIndex(p => p.id === player.id);

        // このプレイヤーが引くカード
        const cardToDraw = cardsToDraw[index];
        if (!cardToDraw) return;

        // 引かれる相手（右隣）
        const rightNeighborIndex = (index - 1 + participantCount) % participantCount;
        const fromPlayer = participants[rightNeighborIndex];

        // 私からカードを引く人（左隣 = index + 1）
        // 左隣の人は、私のカードを引く
        const takerIndex = (index + 1) % participantCount;
        const cardToBeTaken = cardsToDraw[takerIndex];

        // 交換情報を記録
        exchanges.push({
            fromPlayerId: fromPlayer.id,
            toPlayerId: player.id,
            cardId: cardToDraw.id,
        });

        // 手札更新
        let newHand = [...player.hand];

        // 取られるカードを削除
        if (cardToBeTaken) {
            newHand = newHand.filter(c => c.id !== cardToBeTaken.id);
        }

        // 引くカードを追加
        newHand.push(cardToDraw);

        // ソート
        newHand.sort((a, b) => a.sortOrder - b.sortOrder);

        // Globalなプレイヤーリストを更新
        newPlayers[playerIndexInGlobal] = {
            ...player,
            hand: newHand
        };
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
        return { ...state, phase: GamePhase.RESOLVING_EFFECT, pendingAction: null, exchangeState: null };
    }

    const player = state.players[playerIndex];
    const target = state.players[targetIndex];

    // 両者に手札がない場合は交換なし
    if (player.hand.length === 0 || target.hand.length === 0) {
        return { ...state, phase: GamePhase.RESOLVING_EFFECT, pendingAction: null, exchangeState: null };
    }

    // 選択されたカードIDを取得
    const selections = state.exchangeState?.selections || {};
    const playerCardId = selections[playerId];
    const targetCardId = selections[targetPlayerId];

    if (!playerCardId || !targetCardId) {
        // 万が一選択がない場合（通常ありえない）
        return { ...state, phase: GamePhase.RESOLVING_EFFECT, pendingAction: null, exchangeState: null };
    }

    const playerCardIndex = player.hand.findIndex(c => c.id === playerCardId);
    const targetCardIndex = target.hand.findIndex(c => c.id === targetCardId);

    if (playerCardIndex === -1 || targetCardIndex === -1) {
        return { ...state, phase: GamePhase.RESOLVING_EFFECT, pendingAction: null, exchangeState: null };
    }

    const playerCard = player.hand[playerCardIndex];
    const targetCard = target.hand[targetCardIndex];

    // 手札を交換
    const newPlayers = [...state.players];

    // 履歴情報を付与した新しいカードを作成
    const cardForTarget = {
        ...playerCard,
        tradeHistory: {
            type: 'TRADE' as const,
            fromName: player.name,
            toName: target.name
        }
    };

    const cardForPlayer = {
        ...targetCard,
        tradeHistory: {
            type: 'TRADE' as const,
            fromName: target.name,
            toName: player.name
        }
    };

    // プレイヤーの手札を更新（ターゲットからのカードを受け取る）
    const newPlayerHand = [...player.hand];
    newPlayerHand.splice(playerCardIndex, 1, cardForPlayer);
    newPlayerHand.sort((a, b) => a.sortOrder - b.sortOrder);
    newPlayers[playerIndex] = { ...player, hand: newPlayerHand };

    // ターゲットの手札を更新（プレイヤーからのカードを受け取る）
    const newTargetHand = [...target.hand];
    newTargetHand.splice(targetCardIndex, 1, cardForTarget);
    newTargetHand.sort((a, b) => a.sortOrder - b.sortOrder);
    newPlayers[targetIndex] = { ...target, hand: newTargetHand };

    // tableCardsの取り引きカードにも交換履歴を付与
    const updatedTableCards = state.tableCards.map((card, index) => {
        // 最後に出されたカードが取り引きカードの場合、履歴を付与
        if (index === state.tableCards.length - 1 && card.type === 'trade') {
            return {
                ...card,
                tradeHistory: {
                    type: 'TRADE' as const,
                    fromName: player.name,
                    toName: target.name
                }
            };
        }
        return card;
    });

    return {
        ...state,
        players: newPlayers,
        tableCards: updatedTableCards,
        phase: GamePhase.RESOLVING_EFFECT,
        pendingAction: null,
        exchangeState: null, // Reset here
        lastExchangeInfo: {
            type: 'TRADE',
            exchanges: [
                {
                    fromPlayerId: playerId,
                    toPlayerId: targetPlayerId,
                    cardId: playerCard.id
                },
                {
                    fromPlayerId: targetPlayerId,
                    toPlayerId: playerId,
                    cardId: targetCard.id
                }
            ]
        }
    };
}


/**
 * 交換用カードを選択（情報操作など）
 */
export function submitExchangeCard(state: GameState, playerId: string, cardId: string): GameState {
    if (state.phase !== GamePhase.EXCHANGE_PHASE || !state.exchangeState) {
        return state;
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player || !player.hand.some(c => c.id === cardId)) {
        return state;
    }

    // 選択を保存
    const newSelections = {
        ...state.exchangeState.selections,
        [playerId]: cardId
    };

    const newState = {
        ...state,
        exchangeState: {
            ...state.exchangeState,
            selections: newSelections
        }
    };

    // 全員選択したかチェック
    let isAllReady = false;

    if (newState.exchangeState.type === 'TRADE' && newState.exchangeState.targetIds) {
        // TRADEの場合は対象者のみチェック
        isAllReady = newState.exchangeState.targetIds.every(id => {
            const player = newState.players.find(p => p.id === id);
            return !player || player.hand.length === 0 || !!newSelections[id];
        });
    } else {
        // INFORMATION 等
        const alivePlayers = newState.players.filter(p => p.isAlive);
        isAllReady = alivePlayers.every(p =>
            p.hand.length === 0 || // 手札がない場合は選択不要
            !!newSelections[p.id] // 選択済み
        );
    }

    if (isAllReady) {
        if (newState.exchangeState.type === 'INFORMATION') {
            return executeInformationExchange(newState);
        } else if (newState.exchangeState.type === 'TRADE' && newState.exchangeState.targetIds) {
            const [p1, p2] = newState.exchangeState.targetIds;
            return executeTradeExchange(newState, p1, p2);
        }
    }

    return newState;
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
    // 正常者(dog)によって選択されたカードが変態(culprit)だった場合、相手がアリバイを持っていても勝利となる
    const isDogAction = state.pendingAction.type === 'SELECT_CARD' && state.pendingAction.cardType === 'dog';

    if (isDogAction) {
        const activePlayer = state.players[state.activePlayerIndex];
        const isSuccess = selectedCard.type === 'culprit';

        // 演出情報を作成
        const dogAnimationInfo: ArrestAnimationInfo = {
            cardType: 'dog',
            sourcePlayerId: activePlayer.id,
            targetPlayerId: targetPlayerId,
            selectedCardId: selectedCard.id,
            selectedCardType: selectedCard.type,
            isSuccess: isSuccess
        };

        // 演出フェーズへ（勝敗判定は演出後に行う）
        return {
            ...state,
            phase: GamePhase.RESOLVING_EFFECT,
            pendingAction: null,
            arrestAnimationInfo: dogAnimationInfo
        };
    }

    // 他のカード効果でカード選択が必要な場合（現時点では正常者のみだが、将来的に拡張される可能性）
    // 現状は正常者以外のカード選択は想定されていないため、ここには到達しないはず
    return {
        ...state,
        phase: GamePhase.RESOLVING_EFFECT,
        pendingAction: null,
        systemMessage: '不明なカード選択アクションです',
    };
}

/**
 * 逮捕/通報演出完了後の処理
 * 演出が終了したらこの関数を呼び、勝利判定またはゲーム継続を行う
 */
export function completeArrestAnimation(state: GameState): GameState {
    if (!state.arrestAnimationInfo) {
        return state;
    }

    const { cardType, sourcePlayerId, targetPlayerId, isSuccess } = state.arrestAnimationInfo;

    // 演出情報をクリア
    const clearedState: GameState = {
        ...state,
        arrestAnimationInfo: null
    };

    if (isSuccess) {
        // 勝利！
        const victoryType: VictoryType = cardType === 'detective' ? 'DETECTIVE' : 'DOG';
        return declareWinner(
            clearedState,
            'DETECTIVE_TEAM',
            victoryType,
            sourcePlayerId,
            targetPlayerId
        );
    } else {
        // 失敗 → ゲーム継続
        return {
            ...clearedState,
            phase: GamePhase.TURN_END,
        };
    }
}

/**
 * 変態勝利演出完了後の処理
 * 演出が終了したらこの関数を呼び、勝利を確定させる
 */
export function completeCulpritVictoryAnimation(state: GameState): GameState {
    if (!state.culpritVictoryAnimationInfo) {
        return state;
    }

    const { culpritPlayerId } = state.culpritVictoryAnimationInfo;

    // 演出情報をクリアして勝利確定
    const clearedState: GameState = {
        ...state,
        culpritVictoryAnimationInfo: null
    };

    return declareWinner(
        clearedState,
        'CRIMINAL_TEAM',
        'CULPRIT_ESCAPE',
        culpritPlayerId,
        null
    );
}
