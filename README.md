# 🏎️ Super Mario Kart — ブラウザ3Dレーシングゲーム

> ブラウザで遊べる無料の3Dカートレーシングゲーム。Three.jsで構築され、Manusプラットフォーム上でフルスタックWebアプリとして動作します。

---

## OGP プレビュー画像

![Super Mario Kart OGP](https://d2xsxph8kpxj0f.cloudfront.net/310419663027084947/bpznXanX6BYebP8WAUGLgJ/ogp-mario-kart-TUkuzv5sGKg5cseWLKBmfr.png)

---

## アプリ概要

**Super Mario Kart** は、Nintendo 64のマリオカートシリーズにインスパイアされたブラウザベースの3Dカートレーシングゲームです。インストール不要で、ブラウザを開くだけで即座にプレイできます。

プレイヤーは3つのコース（マリオサーキット・フラッペスノーランド・クッパキャッスル）から選択し、3段階の難易度（50cc・100cc・150cc）でAI対戦相手と競い合います。ドリフトによるミニターボブースト、アイテム（コウラ・バナナ・キノコなど）の活用、そしてグローバルリーダーボードへの登録が本作の主要な特徴です。

---

## ゲーム機能

| 機能 | 詳細 |
|------|------|
| コース数 | 3コース（マリオサーキット・フラッペスノーランド・クッパキャッスル） |
| 難易度 | 50cc / 100cc / 150cc |
| ドリフトシステム | ドリフト中にミニターボブーストを蓄積 |
| アイテム | コウラ・バナナ・キノコ・スーパースター・サンダーボルト |
| AI対戦相手 | 最大7体のAIカートと同時レース |
| リーダーボード | コース・難易度別のグローバルトップ10ランキング |
| BGM | 4トラックのオリジナルサウンドトラック（S3 CDN配信） |
| 操作方法 | キーボード（WASD / 矢印キー）、Escキーでポーズ |

---

## 技術仕様

### フロントエンド

| 項目 | 技術 |
|------|------|
| UIフレームワーク | React 19 + TypeScript |
| スタイリング | Tailwind CSS 4 |
| ゲームエンジン | Three.js r128（WebGL） |
| ルーティング | Wouter 3 |
| ビルドツール | Vite 7 |
| フォント | Press Start 2P（Google Fonts） |

### バックエンド

| 項目 | 技術 |
|------|------|
| サーバー | Node.js + Express 4 |
| API（React向け） | tRPC 11 |
| API（ゲーム向け） | REST API（Express直接実装） |
| ORM | Drizzle ORM |
| データベース | MySQL（TiDB互換） |
| 型安全 | TypeScript + Zod バリデーション |

### インフラ・デプロイ

| 項目 | 技術 |
|------|------|
| ホスティング | Manus Platform |
| 静的アセット | S3 CDN（CloudFront） |
| 認証基盤 | Manus OAuth（オプション） |
| テスト | Vitest 2 |

---

## アーキテクチャ

### アーキテクチャ図

![アーキテクチャ図](https://d2xsxph8kpxj0f.cloudfront.net/310419663027084947/bpznXanX6BYebP8WAUGLgJ/architecture-diagram-cgEK9r4BzA2rEpy9o9vFGi.png)

### レイヤー構成

本アプリケーションは3層アーキテクチャで構成されています。

**クライアント層（ブラウザ）** では、React SPAの`Home.tsx`がエントリーポイントとして機能し、100ミリ秒後に`game.html`へリダイレクトします。`game.html`はThree.jsを核とした純粋なJavaScriptゲームエンジンであり、10個のモジュール（`game.js`・`kart.js`・`track.js`・`ai.js`・`ui.js`・`items.js`・`audio.js`・`particles.js`・`textures.js`・`utils.js`）で構成されています。

**サーバー層（Express）** では、ゲームのバニラJSから直接呼び出されるREST APIと、ReactコンポーネントからtRPCクライアント経由で呼び出されるtRPC APIの2系統が並存します。REST APIはリーダーボードの取得・スコアのチェック・スコアの保存を担い、tRPC APIはスコアの保存・上位スコアの取得・最近のスコアの取得を担います。

**データ層（MySQL）** では、Drizzle ORMを介してMySQLデータベースに接続します。`game_scores`テーブルにレース結果（プレイヤー名・コース・難易度・順位・タイム）を保存し、`users`テーブルでManus OAuth認証ユーザーを管理します。

### データフロー

レース終了時のデータフローは以下の通りです。

1. `game.js`の`finishRace()`が呼び出される
2. `/api/leaderboard?course=...&difficulty=...`（GET）でリーダーボードを取得
3. `/api/leaderboard/check`（POST）でプレイヤーのタイムがトップ10に入るか確認
4. トップ10に入る場合、プレイヤー名入力UIを表示
5. `/api/leaderboard/save`（POST）でスコアをデータベースに保存
6. リーダーボード画面を更新して表示

---

## データベーススキーマ

### `game_scores` テーブル

| カラム名 | 型 | 説明 |
|----------|-----|------|
| `id` | INT AUTO_INCREMENT | 主キー |
| `playerName` | VARCHAR(64) | プレイヤー名（デフォルト: "Player"） |
| `course` | VARCHAR(32) | コース名（grassland / snow / castle） |
| `difficulty` | VARCHAR(16) | 難易度（easy / normal / hard） |
| `position` | INT | レース最終順位（1〜8） |
| `raceTimeMs` | BIGINT | レースタイム（ミリ秒） |
| `totalLaps` | INT | 総ラップ数（デフォルト: 3） |
| `createdAt` | TIMESTAMP | 記録日時 |

### `users` テーブル

| カラム名 | 型 | 説明 |
|----------|-----|------|
| `id` | INT AUTO_INCREMENT | 主キー |
| `openId` | VARCHAR(64) UNIQUE | Manus OAuth識別子 |
| `name` | TEXT | ユーザー名 |
| `email` | VARCHAR(320) | メールアドレス |
| `role` | ENUM('user','admin') | ロール |
| `createdAt` | TIMESTAMP | 作成日時 |

---

## API エンドポイント

### REST API（ゲーム用）

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/api/leaderboard` | コース・難易度別トップ10取得 |
| `POST` | `/api/leaderboard/check` | タイムがトップ10に入るか確認 |
| `POST` | `/api/leaderboard/save` | プレイヤー名付きでスコア保存 |
| `GET` | `/api/scores` | 全スコア取得（フィルタ可） |
| `POST` | `/api/scores` | スコア保存 |

### tRPC API（React用）

| プロシージャ | 種別 | 説明 |
|-------------|------|------|
| `scores.save` | mutation | スコア保存 |
| `scores.top` | query | 上位スコア取得 |
| `scores.recent` | query | 最近のスコア取得 |
| `auth.me` | query | ログインユーザー情報取得 |
| `auth.logout` | mutation | ログアウト |

---

## ファイル構成

```
super-mario-kart/
├── client/
│   ├── index.html              # React SPAエントリー（OGP/SNSメタタグ設定済み）
│   ├── public/
│   │   ├── game.html           # ゲーム本体HTML（OGP/SNSメタタグ設定済み）
│   │   └── js/
│   │       ├── game.js         # ゲームメインロジック・レース管理
│   │       ├── kart.js         # カート物理・ドリフト・衝突
│   │       ├── track.js        # コースデータ・3Dメッシュ生成
│   │       ├── ai.js           # AIドライバーロジック
│   │       ├── ui.js           # UI描画・リーダーボード表示
│   │       ├── items.js        # アイテムシステム
│   │       ├── audio.js        # BGM・効果音管理（S3 CDN参照）
│   │       ├── particles.js    # パーティクルエフェクト
│   │       ├── textures.js     # テクスチャ生成
│   │       └── utils.js        # ユーティリティ関数
│   └── src/
│       ├── pages/Home.tsx      # /game.htmlへのリダイレクト＋SEOコンテンツ
│       └── App.tsx             # Reactルーティング
├── server/
│   ├── _core/
│   │   └── index.ts            # Expressサーバー＋REST APIエンドポイント
│   ├── db.ts                   # Drizzle ORMクエリヘルパー
│   ├── routers.ts              # tRPCルーター
│   ├── storage.ts              # S3ストレージヘルパー
│   ├── leaderboard.test.ts     # リーダーボードAPIテスト（Vitest）
│   └── auth.logout.test.ts     # 認証テスト（Vitest）
├── drizzle/
│   ├── schema.ts               # DBスキーマ定義
│   └── relations.ts            # テーブルリレーション
├── shared/
│   ├── const.ts                # 共通定数
│   └── types.ts                # 共通型定義
├── todo.md                     # 実装タスク管理
└── README.md                   # このファイル
```

---

## SNS / OGP メタタグ設定

本アプリケーションは、X（Twitter）・Facebook・LINE・その他主要SNSでシェアされた際に適切なプレビューが表示されるよう、包括的なOGPメタタグを設定しています。

| メタタグ | 値 |
|----------|-----|
| `og:type` | `website` |
| `og:locale` | `ja_JP` |
| `og:locale:alternate` | `en_US` |
| `og:image` | CloudFront CDN URL（1344×768px PNG） |
| `og:image:secure_url` | HTTPS CDN URL |
| `twitter:card` | `summary_large_image` |
| `twitter:image` | CloudFront CDN URL |

OGP画像はAIで生成したオリジナル画像（1344×768px）を使用しており、S3 CDN（CloudFront）から配信されます。`client/index.html`と`client/public/game.html`の両方に同一のメタタグが設定されています。

---

## ローカル開発

```bash
# 依存関係のインストール
pnpm install

# データベースのマイグレーション
pnpm db:push

# 開発サーバーの起動
pnpm dev

# テストの実行
pnpm test

# プロダクションビルド
pnpm build
```

---

## デプロイ

本アプリケーションはManusプラットフォーム上にデプロイされています。デプロイはManusの管理UIから「Publish」ボタンをクリックすることで実行できます。

環境変数はManusプラットフォームにより自動的に注入されます（`DATABASE_URL`・`JWT_SECRET`・`BUILT_IN_FORGE_API_KEY`など）。

---

## ライセンス

MIT License

---

*このREADMEはManus AIにより自動生成されました。*
