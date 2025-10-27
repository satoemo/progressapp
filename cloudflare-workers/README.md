# Cloudflare Workers - AI分析プロキシサーバー

kintone進捗管理アプリ（browser-app）のためのAI分析プロキシサーバー。

## 概要

このCloudflare Workersは、ブラウザアプリとClaude API間のプロキシとして動作し、以下の機能を提供します：

- **セキュアなAPI呼び出し**: APIキーをブラウザに露出させずにClaude APIを利用
- **認証・認可**: Bearer Tokenによるアクセス制御
- **レート制限**: IP単位でのリクエスト制限
- **CORS制御**: 許可されたドメインからのみアクセス可能
- **開発/本番切り替え**: モックレスポンスと実際のAPI呼び出しを環境変数で切り替え

## プロジェクト構成

```
cloudflare-workers/
├── src/
│   ├── index.ts          # メインハンドラー
│   ├── mock.ts           # モックレスポンス（開発環境用）
│   ├── claude-api.ts     # Claude API呼び出しロジック
│   ├── security.ts       # 認証・CORS・レート制限
│   └── types.ts          # 型定義
├── wrangler.toml         # Cloudflare Workers設定
├── package.json
├── tsconfig.json
└── README.md
```

## セットアップ

### 前提条件

- Node.js 18以上
- Cloudflareアカウント
- wrangler CLI

### 1. wranglerのインストール

```bash
npm install -g wrangler
```

### 2. Cloudflareにログイン

```bash
wrangler login
```

### 3. 依存関係のインストール

```bash
cd cloudflare-workers
npm install
```

### 4. 環境変数の設定

#### 開発環境（モックモード）

```bash
# 開発モード設定
wrangler secret put ENVIRONMENT
# "development" と入力

# 認証トークン（開発用）
wrangler secret put AUTH_TOKEN
# 任意の安全な文字列を入力（例: dev-secret-token-12345）
```

#### 本番環境（Claude API使用）

```bash
# 本番モード設定
wrangler secret put ENVIRONMENT
# "production" と入力

# Claude APIキー
wrangler secret put CLAUDE_API_KEY
# Anthropic Consoleで取得したAPIキーを入力

# 認証トークン（本番用）
wrangler secret put AUTH_TOKEN
# 強力な文字列を生成して入力（例: openssl rand -base64 32）
```

### 5. CORS設定（wrangler.toml）

```toml
[vars]
ALLOWED_ORIGINS = ["https://example.com", "http://localhost:5173"]
RATE_LIMIT_PER_MINUTE = 10
```

## ローカル開発

### 開発サーバー起動

```bash
wrangler dev
```

デフォルトで `http://localhost:8787` で起動します。

### テストリクエスト

```bash
# ヘルスチェック
curl http://localhost:8787/health

# 分析リクエスト（モックモード）
curl -X POST http://localhost:8787/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-secret-token-12345" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "analysisType": "delay-detection",
    "progressData": [
      {
        "cutNumber": "C001",
        "processName": "原画",
        "scheduledDate": "2025-10-01",
        "actualDate": "2025-10-06"
      }
    ]
  }'
```

## デプロイ

### 本番環境へのデプロイ

```bash
wrangler deploy
```

デプロイ後、以下のようなURLが発行されます：
```
https://ai-proxy.YOUR-SUBDOMAIN.workers.dev
```

### デプロイ確認

```bash
# ヘルスチェック
curl https://ai-proxy.YOUR-SUBDOMAIN.workers.dev/health

# 結果
# {"status":"ok","environment":"development","timestamp":"2025-10-27T..."}
```

## API仕様

### POST /api/analyze

進捗データを分析します。

**リクエスト**:
```json
{
  "analysisType": "delay-detection",
  "progressData": [
    {
      "cutNumber": "C001",
      "processName": "原画",
      "scheduledDate": "2025-10-01",
      "actualDate": "2025-10-06",
      "assignee": "山田太郎"
    }
  ]
}
```

**レスポンス**:
```json
{
  "success": true,
  "analysis": {
    "summary": "3件の遅延を検出しました",
    "delayedCuts": [
      {
        "cutNumber": "C001",
        "processName": "原画",
        "delayDays": 5,
        "reason": "担当者の負荷集中"
      }
    ],
    "recommendations": [
      "C001の原画作業を別の担当者に分散",
      "素材共有の効率化を検討"
    ]
  },
  "metadata": {
    "tokensUsed": 1234,
    "processingTime": 1500,
    "isMock": false
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

### GET /health

サーバーの状態を確認します。

**レスポンス**:
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2025-10-27T10:30:00.000Z"
}
```

## セキュリティ

### 認証

すべてのリクエストは `Authorization: Bearer <TOKEN>` ヘッダーが必要です。

### CORS

`wrangler.toml` の `ALLOWED_ORIGINS` に設定されたドメインからのみアクセス可能です。

### レート制限

IP単位で1分間に10リクエストまで（`RATE_LIMIT_PER_MINUTE` で調整可能）。

## モニタリング

### Cloudflare Dashboard

- リクエスト数
- エラー率
- レスポンスタイム
- 帯域使用量

https://dash.cloudflare.com/ → Workers → 該当のWorker

### 使用量監視（Claude API）

Anthropic Console: https://console.anthropic.com/
- トークン使用量
- コスト推移
- API呼び出し回数

## トラブルシューティング

### 401 Unauthorized

- `AUTH_TOKEN` が正しく設定されているか確認
- ブラウザアプリの `AI_CONFIG.AUTH_TOKEN` と一致しているか確認

### 403 Forbidden (CORS)

- リクエストの `Origin` ヘッダーが `ALLOWED_ORIGINS` に含まれているか確認
- ブラウザアプリのURLが正しく設定されているか確認

### 429 Too Many Requests

- レート制限に達しています
- 1分待ってから再試行
- または `RATE_LIMIT_PER_MINUTE` を増やす

### 500 Internal Server Error (Claude API)

- Claude APIキーが正しく設定されているか確認
- Anthropic Consoleでクレジット残高を確認
- Claude APIのステータスページを確認: https://status.anthropic.com/

## 環境変数一覧

| 変数名 | 必須 | 説明 | 例 |
|-------|------|------|-----|
| `ENVIRONMENT` | ✅ | 動作モード | `development` / `production` |
| `AUTH_TOKEN` | ✅ | 認証トークン | `your-secret-token` |
| `CLAUDE_API_KEY` | 本番のみ | Claude APIキー | `sk-ant-...` |
| `ALLOWED_ORIGINS` | ✅ | 許可ドメイン | `["https://example.com"]` |
| `RATE_LIMIT_PER_MINUTE` | - | レート制限 | `10` (デフォルト) |

## 関連ドキュメント

- [実装計画](../browser-app/docs/phase1-ai-analysis-integration-plan-2025-10-27-1013.md)
- [Cloudflare Workers公式ドキュメント](https://developers.cloudflare.com/workers/)
- [Claude API公式ドキュメント](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

## ライセンス

プロジェクト全体のライセンスに準拠
