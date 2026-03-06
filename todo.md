# Project TODO - Super Mario Kart

## ファイル統合
- [x] game.html を client/public/ にコピー
- [x] JS ファイル (ai.js, audio.js, game.js, items.js, kart.js, particles.js, textures.js, track.js, ui.js, utils.js) を client/public/js/ にコピー
- [x] __manus__/debug-collector.js を client/public/__manus__/ にコピー

## データベース統合
- [x] drizzle/schema.ts に game_scores テーブルを追加
- [x] server/db.ts にゲームスコアのクエリヘルパーを追加 (insertGameScore, getLeaderboard, checkLeaderboardRank, getTopScores, getRecentScores)
- [x] drizzle/relations.ts を更新
- [x] shared/types.ts を更新
- [x] pnpm db:push でマイグレーション実行

## REST API 統合
- [x] server/_core/index.ts に /api/scores (GET/POST) エンドポイントを追加
- [x] server/_core/index.ts に /api/leaderboard (GET) エンドポイントを追加
- [x] server/_core/index.ts に /api/leaderboard/check (POST) エンドポイントを追加
- [x] server/_core/index.ts に /api/leaderboard/save (POST) エンドポイントを追加

## tRPC ルーター統合
- [x] server/routers.ts に scores ルーターを追加 (save, top, recent)

## フロントエンド
- [x] client/src/pages/Home.tsx を /game.html へのリダイレクトに更新

## OGP / SNS メタタグ
- [x] 新しい OGP 画像を生成・S3 アップロード
- [x] client/index.html に包括的な SNS メタタグを設定 (og:locale:ja_JP 含む)
- [x] client/public/game.html に包括的な SNS メタタグを設定

## テスト
- [x] server/leaderboard.test.ts にリーダーボード API のビテストを作成
- [x] pnpm test で全テスト通過確認（12テスト全通過）

## ドキュメント
- [x] README.md を日本語で作成 (概要・OGP 画像・技術仕様・アーキテクチャ図)

## デプロイ
- [x] webdev_save_checkpoint でチェックポイント作成
