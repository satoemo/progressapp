# progressapp

kintone進捗管理アプリケーションとAI分析機能の統合プロジェクト

## プロジェクト構成

このプロジェクトは2つのサブプロジェクトで構成されています：

### browser-app

kintone進捗管理ブラウザアプリケーション（v10.3.3）

**主要機能:**
- kintone REST APIを使用した進捗データの取得
- プロジェクト進捗の可視化
- シミュレーション機能
- AI分析機能との連携

**技術スタック:**
- TypeScript
- Jest（テストフレームワーク）

### cloudflare-workers

AI分析プロキシサーバー（Cloudflare Workers）

**主要機能:**
- Claude APIへの安全なプロキシアクセス
- Bearer Token認証
- CORS制御
- レート制限（デフォルト: 10リクエスト/分）
- 開発環境用モックレスポンス

**技術スタック:**
- TypeScript
- Cloudflare Workers
- Claude API

## 開発環境

### 必要な環境

- Node.js（推奨: LTS版）
- npm または yarn
- Cloudflare アカウント（cloudflare-workers用）
- Claude API キー（本番環境用）

### セットアップ

#### browser-app

```bash
cd browser-app
npm install
npm run build
```

#### cloudflare-workers

```bash
cd cloudflare-workers
npm install
# wrangler のセットアップ
npx wrangler login
```

詳細は各サブプロジェクトのREADMEを参照してください。

## ドキュメント

- [AI分析統合実装計画](browser-app/docs/phase1-ai-analysis-integration-plan-2025-10-27-1013.md)
- [学習記録](browser-app/docs/learning/README.md)
- [Cloudflare Workers セットアップガイド](cloudflare-workers/README.md)

## 開発フロー

1. 計画フェーズ: 実装計画ドキュメントの作成
2. 実装フェーズ: 段階的な機能実装
3. 確認フェーズ: ビルドとテスト
4. 進捗更新フェーズ: ドキュメント更新

詳細は各サブプロジェクトのドキュメントを参照してください。

## コードレビュー

このプロジェクトはCodeRabbitによる自動コードレビューを使用しています。
Pull Requestを作成すると、自動的にレビューが実行されます。

## ライセンス

プライベートプロジェクト
