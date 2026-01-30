# オンライン化実装計画

## 概要
「変態は踊る」ゲームをローカルプレイからオンラインマルチプレイに対応させる。

## 現状
- ローカルストレージベースでゲーム状態を保存
- NPCとのローカルプレイのみ可能
- Firebase設定ファイルは存在（word-wolf-1432f プロジェクト）

## 目標
- 複数プレイヤーがリアルタイムで同じゲームに参加できる
- ルームIDを共有して友人を招待できる
- Firebase Firestoreでゲーム状態を同期
- Firebase Hostingまたは外部サービスでホスティング

---

## Phase 1: Firestoreサービス層の作成

### 1.1 データモデル設計
```
rooms/{roomId}
├── hostId: string
├── status: 'WAITING' | 'PLAYING' | 'FINISHED'
├── createdAt: timestamp
├── players: Player[] (公開情報のみ)
└── gameState: GameState (進行状態)

rooms/{roomId}/privateData/{odplayerId}
└── hand: Card[] (その人だけが見れる手札)
```

### 1.2 作成するファイル
- `src/services/roomService.ts` - Firestoreとの通信処理
- `src/hooks/useRoom.ts` - リアルタイム監視用フック
- `src/hooks/useOnlineGame.ts` - オンラインゲーム状態管理

---

## Phase 2: ロビー画面のオンライン対応

### 2.1 エントランス画面の修正
- ルーム作成時にFirestoreに書き込み
- ルーム参加時にFirestoreから読み込み

### 2.2 ロビー画面の修正
- onSnapshotでリアルタイム同期
- プレイヤー参加/退出の検知
- ゲーム開始の同期

---

## Phase 3: ゲーム画面のオンライン対応

### 3.1 ゲーム状態の同期
- カードプレイ時にFirestoreを更新
- 全プレイヤーで状態変化を監視

### 3.2 手札の秘匿管理
- 各プレイヤーの手札は別ドキュメントに保存
- 自分の手札のみ取得可能

---

## Phase 4: デプロイ

### 4.1 GitHub設定
- リモートリポジトリ作成
- プッシュ

### 4.2 ホスティング
- Firebase Hosting または Vercel へデプロイ

---

## 進捗状況
- [ ] Phase 1: Firestoreサービス層
- [ ] Phase 2: ロビーのオンライン化  
- [ ] Phase 3: ゲームのオンライン化
- [ ] Phase 4: デプロイ
