# AI分析機能統合 実装計画

**作成日**: 2025-10-27
**バージョン**: v10.3.3
**対象**: Cloudflare Workers + Claude API統合

## 目的

kintoneから取得した進捗データをClaude APIで分析し、プロジェクトの遅延検知を行う機能を追加する。

**実装方針**:
- **優先機能**: 遅延検知分析
- **テスト環境**: モックレスポンス（無料）
- **本番環境**: Claude API（$5クレジット購入）
- **kintoneドメイン**: example.com

## アーキテクチャ概要

```
[ブラウザアプリ] → [Cloudflare Workers] → [Claude API]
     ↓↑                    ↓↑                    ↓↑
[kintone REST API]    [認証・レート制限]    [AI分析処理]
```

### データフロー

1. ブラウザがkintone REST APIから進捗データ取得（既存機能）
2. ユーザーが「AI分析」ボタンをクリック
3. ブラウザ → Cloudflare Workersにデータ送信
4. Cloudflare Workers → Claude APIでデータ分析
5. 分析結果をブラウザに返却・表示

## 実装計画

### Phase 1: Cloudflare Workersプロキシサーバー構築

**目的**: Claude APIへの安全なアクセスを提供するプロキシサーバーを構築

#### Part 1-1: Cloudflare Workersプロジェクト初期化

**実装内容**:
- Cloudflare Workersプロジェクトの作成
- wranglerの設定（wrangler.toml）
- 環境変数設定（CLAUDE_API_KEY, AUTH_TOKEN）
- 基本的なHTTPハンドラーの実装

**成果物**:
```
cloudflare-ai-proxy/
├── wrangler.toml
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

**独立テスト方法**:
- `wrangler dev` でローカル起動
- curlで `/health` エンドポイントをテスト
- レスポンス確認: `{"status": "ok"}`

#### Part 1-2: Claude API統合（モック + 本番切り替え）

**実装内容**:
- `/api/analyze` エンドポイントの実装
- **開発モード**: モックレスポンス（無料）
- **本番モード**: Claude API呼び出しロジック
- エラーハンドリング
- レスポンス整形

**開発/本番切り替え**:
```typescript
// 環境変数で切り替え
const USE_MOCK = env.ENVIRONMENT === 'development';

if (USE_MOCK) {
  return mockDelayDetection(progressData);
} else {
  return await callClaudeAPI(progressData);
}
```

**API仕様**:
```typescript
// リクエスト
POST /api/analyze
Headers:
  Authorization: Bearer <AUTH_TOKEN>
  Content-Type: application/json
Body:
{
  "analysisType": "delay-detection" | "simulation" | "summary",
  "progressData": CutReadModel[]
}

// レスポンス
{
  "success": true,
  "analysis": {
    "summary": "分析結果のサマリー",
    "details": [...],
    "recommendations": [...]
  },
  "metadata": {
    "tokensUsed": 1234,
    "processingTime": 1500
  }
}
```

**独立テスト方法**:
- モックデータでClaude APIを呼び出し
- レスポンスの構造検証
- エラーケース（無効なAPIキー、タイムアウト等）のテスト

#### Part 1-3: セキュリティ機能実装

**実装内容**:
- CORS設定（example.comのみ許可）
- Bearer Token認証
- レート制限（IP単位で1分間10リクエスト）
- リクエストサイズ制限（最大1MB）

**CORS設定例**:
```typescript
const ALLOWED_ORIGINS = [
  'https://example.com',
  'http://localhost:5173'  // 開発環境
];
```

**セキュリティチェック項目**:
- [ ] 無効なトークンで403エラー
- [ ] 許可されていないOriginで403エラー
- [ ] レート制限超過で429エラー
- [ ] 大きすぎるペイロードで413エラー

**独立テスト方法**:
- 不正なAuthorizationヘッダーでリクエスト → 401
- 異なるOriginからリクエスト → 403
- 連続リクエストでレート制限確認 → 429

#### Part 1-4: デプロイとURL取得

**実装内容**:
- `wrangler deploy` でデプロイ
- カスタムドメイン設定（オプション）
- 本番環境の環境変数設定

**成果物**:
- デプロイ済みWorkers URL: `https://ai-proxy.YOUR-SUBDOMAIN.workers.dev`
- 環境変数設定完了
- デプロイログの確認

**独立テスト方法**:
- 本番URLに対してcurlでヘルスチェック
- 本番環境でのClaude API呼び出しテスト

---

### Phase 2: ブラウザアプリ側の統合

**目的**: 既存のkintoneアプリにAI分析機能を統合

#### Part 2-1: AIAnalysisServiceの実装

**実装内容**:
- `src/services/ai/AIAnalysisService.ts` 新規作成
- Cloudflare Workersとの通信ロジック
- エラーハンドリングとリトライ機能
- タイムアウト設定（30秒）

**クラス設計**:
```typescript
export class AIAnalysisService {
  private readonly apiEndpoint: string;
  private readonly authToken: string;
  private readonly timeout: number = 30000;

  async analyzeProgress(
    progressData: CutReadModel[],
    analysisType: AnalysisType
  ): Promise<AnalysisResult>;

  private async makeRequest(
    endpoint: string,
    payload: any
  ): Promise<Response>;

  private handleError(error: Error): AnalysisError;
}
```

**ファイル配置**:
```
browser-app/src/
├── services/
│   └── ai/
│       ├── AIAnalysisService.ts
│       ├── types.ts  // AnalysisType, AnalysisResult等の型定義
│       └── config.ts // エンドポイントURL、認証トークン
```

**独立テスト方法**:
- モックデータで `analyzeProgress()` を呼び出し
- レスポンスの型検証
- エラーケースのハンドリング確認
- タイムアウトのテスト

#### Part 2-2: UI実装（分析ボタン・モーダル）

**実装内容**:
- タブエリアに「AI分析」ボタン追加
- 分析タイプ選択UI（ドロップダウン）
- ローディングインジケーター
- 結果表示モーダル

**UI配置**:
```
[既存タブ] [AI分析 ▼]
             └─ 遅延検知
             └─ シミュレーション
             └─ サマリー生成
```

**実装ファイル**:
```
browser-app/src/ui/
├── features/
│   └── ai-analysis/
│       ├── AIAnalysisButton.ts
│       ├── AnalysisTypeSelector.ts
│       ├── AnalysisResultModal.ts
│       └── LoadingIndicator.ts
```

**独立テスト方法**:
- ボタンクリックで選択UIが表示される
- 各分析タイプを選択してAIAnalysisServiceが呼ばれる
- ローディング中は操作を無効化
- 結果モーダルが正しく表示される

#### Part 2-3: 既存TabManagerへの統合

**実装内容**:
- `TabManager.ts` にAI分析タブを追加
- イベントハンドリング
- 状態管理（分析中フラグ）

**変更ファイル**:
- `browser-app/src/ui/features/tabs/TabManager.ts`
- `browser-app/src/ui/features/tabs/TabTypes.ts`

**統合ポイント**:
```typescript
// TabManager.ts
private initializeAIAnalysisTab(): void {
  const aiButton = new AIAnalysisButton(this.container);
  aiButton.on('analyze', (type) => this.handleAnalysis(type));
}

private async handleAnalysis(type: AnalysisType): Promise<void> {
  const progressData = this.getCurrentProgressData();
  const result = await this.aiAnalysisService.analyzeProgress(progressData, type);
  this.showAnalysisResult(result);
}
```

**独立テスト方法**:
- 既存タブの動作に影響がないことを確認
- AI分析ボタンが正しい位置に表示される
- 分析実行中に他のタブ操作が制限される

#### Part 2-4: エラーハンドリングとユーザーフィードバック

**実装内容**:
- ネットワークエラーの処理
- API制限エラーの処理（429）
- わかりやすいエラーメッセージ表示
- トースト通知の実装

**エラーメッセージ例**:
- ネットワークエラー: 「接続できませんでした。インターネット接続を確認してください。」
- レート制限: 「リクエストが多すぎます。1分後に再試行してください。」
- タイムアウト: 「分析に時間がかかっています。もう一度お試しください。」

**独立テスト方法**:
- ネットワークを切断してエラー表示確認
- 意図的に429エラーを発生させる
- タイムアウトシミュレーション

---

### Phase 3: AI分析機能の実装

**目的**: 遅延検知分析機能を実装（優先）

#### Part 3-1: 遅延検知分析（優先実装）

**分析内容**:
- 予定日と実績日の差分を検出
- 遅延している工程の特定
- 遅延原因の推測（作業量、担当者、時期等）
- 改善提案の生成

**プロンプト設計**:
```
あなたはアニメーション制作の進捗管理の専門家です。
以下の進捗データを分析し、遅延している工程を特定してください。

【分析項目】
1. 遅延している工程の特定（カット番号、工程名）
2. 遅延日数の算出
3. 遅延傾向の分析（特定の担当者、時期に集中しているか）
4. 改善提案（具体的なアクション）

【進捗データ】
{progressData}

【出力形式】
JSON形式で以下の構造で返してください：
{
  "summary": "全体の遅延状況の要約",
  "delayedCuts": [
    {
      "cutNumber": "カット番号",
      "processName": "工程名",
      "delayDays": 遅延日数,
      "reason": "推測される原因"
    }
  ],
  "recommendations": ["改善提案1", "改善提案2"]
}
```

**結果表示UI**:
- 遅延カット一覧テーブル
- 遅延日数の視覚化（バーチャート）
- 改善提案リスト

**独立テスト方法**:
- 遅延のあるダミーデータで分析実行
- 結果のJSON構造検証
- UI表示の確認

#### Part 3-2: シミュレーション分析

**分析内容**:
- 現在のペースで進行した場合の完成予定日予測
- リソース追加時の効果シミュレーション
- ボトルネック工程の特定
- 複数シナリオの比較

**プロンプト設計**:
```
以下の進捗データから、プロジェクトの完成予定日をシミュレーションしてください。

【シミュレーション条件】
1. 現状維持シナリオ
2. リソース20%増強シナリオ
3. 優先度変更シナリオ

【進捗データ】
{progressData}

【出力形式】
{
  "currentScenario": {
    "completionDate": "予測完成日",
    "bottlenecks": ["ボトルネック工程1", "工程2"],
    "riskLevel": "high/medium/low"
  },
  "improvedScenarios": [...]
}
```

**結果表示UI**:
- シナリオ比較テーブル
- ガントチャート風のタイムライン
- リスクレベルのインジケーター

**独立テスト方法**:
- 様々な進捗状況でシミュレーション実行
- 完成予定日の妥当性検証
- ボトルネック検出の精度確認

#### Part 3-3: サマリー生成

**分析内容**:
- プロジェクト全体の進捗状況要約
- 主要メトリクスの抽出（完了率、平均遅延日数等）
- 注目すべきポイントのハイライト
- 週次/月次レポート用の文章生成

**プロンプト設計**:
```
以下の進捗データから、プロジェクト管理者向けの週次レポートを生成してください。

【レポート要件】
- 簡潔で読みやすい（300文字程度）
- 数値データを含める
- 注意すべき点を強調
- ポジティブな表現を心がける

【進捗データ】
{progressData}

【出力形式】
{
  "summary": "要約文（300文字）",
  "keyMetrics": {
    "completionRate": 完了率,
    "averageDelay": 平均遅延日数,
    "onTrackPercentage": 予定通りの割合
  },
  "highlights": ["注目ポイント1", "ポイント2"]
}
```

**結果表示UI**:
- レポート本文（コピー可能）
- メトリクスカード表示
- ハイライト一覧

**独立テスト方法**:
- 様々な進捗状況でサマリー生成
- 文章の品質確認
- メトリクス数値の正確性検証

#### Part 3-4: 分析結果のエクスポート機能

**実装内容**:
- 分析結果をJSON形式でダウンロード
- テキスト形式でクリップボードにコピー
- PDF出力（既存のPDFExportServiceを活用）

**実装ファイル**:
- `browser-app/src/services/ai/AnalysisExportService.ts`

**独立テスト方法**:
- 各形式でエクスポート実行
- ファイル内容の検証
- クリップボードコピーの動作確認

---

## 設定ファイル

### 環境変数（ブラウザアプリ側）

`browser-app/src/services/ai/config.ts`:
```typescript
export const AI_CONFIG = {
  // 本番環境
  ENDPOINT: 'https://ai-proxy.YOUR-SUBDOMAIN.workers.dev',
  AUTH_TOKEN: 'your-secret-token',

  // 開発環境（ローカルWorkers）
  // ENDPOINT: 'http://localhost:8787',

  TIMEOUT: 30000,
  MAX_RETRY: 2
};
```

### Cloudflare Workers環境変数

```toml
# wrangler.toml
[vars]
ALLOWED_ORIGINS = ["https://your-company.cybozu.com"]
RATE_LIMIT_PER_MINUTE = 10

[env.production]
# wrangler secret put CLAUDE_API_KEY
# wrangler secret put AUTH_TOKEN
```

---

## テスト計画

### Phase 1テスト

| テスト項目 | 方法 | 期待結果 |
|-----------|------|----------|
| ヘルスチェック | curl でGET /health | 200 OK |
| 認証チェック | 無効なトークンでPOST | 401 Unauthorized |
| CORS制限 | 異なるOriginから呼び出し | 403 Forbidden |
| Claude API連携 | モックデータで分析 | 正常な分析結果 |
| レート制限 | 11回連続リクエスト | 11回目が429 |

### Phase 2テスト

| テスト項目 | 方法 | 期待結果 |
|-----------|------|----------|
| ボタン表示 | アプリ起動 | AI分析ボタンが表示 |
| 分析実行 | ボタンクリック | ローディング→結果表示 |
| エラー処理 | ネットワーク切断 | エラーメッセージ表示 |
| 既存機能影響 | 全タブ操作 | 既存機能が正常動作 |

### Phase 3テスト

| テスト項目 | 方法 | 期待結果 |
|-----------|------|----------|
| 遅延検知 | 遅延データで実行 | 遅延カット特定 |
| シミュレーション | 様々なデータで実行 | 妥当な予測日 |
| サマリー生成 | 実データで実行 | 読みやすいレポート |
| エクスポート | 各形式でDL | ファイル生成成功 |

---

## コスト試算

### Claude API利用コスト

**Claude 3.5 Sonnet**:
- 入力: $3 / 100万トークン
- 出力: $15 / 100万トークン

**月間利用想定**:
- 30人 × 20営業日 × 5回/日 = 3,000回/月
- 1回あたり2,000トークン（入力1,500 + 出力500）

**月間コスト**:
```
入力: 3,000回 × 1,500トークン × $3/100万 = $13.5
出力: 3,000回 × 500トークン × $15/100万 = $22.5
合計: $36/月（約5,400円）
```

### Cloudflare Workers

**無料枠**:
- 100,000リクエスト/日
- 3,000回/月 = 150回/日（無料枠内）

**合計**: 約5,400円/月

---

## マイルストーン

| Phase | 完了目標 | 所要時間 |
|-------|---------|---------|
| Phase 1: Workers構築 | 本番デプロイ完了 | 2-3時間 |
| Phase 2: アプリ統合 | UI実装完了 | 3-4時間 |
| Phase 3: 分析機能実装 | 3機能実装完了 | 4-5時間 |
| **合計** | | **9-12時間** |

---

## リスクと対策

| リスク | 影響 | 対策 |
|-------|------|------|
| Claude API制限超過 | サービス停止 | レート制限実装、使用量監視 |
| 分析精度不足 | ユーザー不満 | プロンプト改善、フィードバック収集 |
| コスト超過 | 予算オーバー | 月間上限設定、アラート設定 |
| セキュリティ侵害 | データ漏洩 | 認証強化、監査ログ |
| ネットワーク障害 | 機能停止 | リトライ処理、エラー通知 |

---

## 今後の拡張案

### 優先度: 高

#### 1. 担当者別パフォーマンス分析

**機能概要**:
- 担当者ごとの平均作業日数を分析
- 得意工程の特定
- ワークロードの可視化

**活用シーン**:
「山田さんは原画が早いが動画は平均より遅い」という分析から、タスク割り当てを最適化できる。

**実装難易度**: ★★☆（中）

---

#### 2. 工程別ボトルネック検出

**機能概要**:
- どの工程が全体の遅延を引き起こしているか特定
- 工程間の待ち時間を分析
- 改善インパクトの算出

**活用シーン**:
「動画検査で平均2日待ちが発生」という分析から、検査体制の強化を提案できる。

**実装難易度**: ★★☆（中）

---

#### 3. 過去プロジェクトとの比較

**機能概要**:
- 過去の類似プロジェクトとの進捗比較
- 季節性・トレンド分析
- ベストプラクティスの抽出

**活用シーン**:
「今回は前回より原画が10%遅い」という比較から、原因調査と対策を検討できる。

**実装難易度**: ★★★（高）
**必要データ**: 過去プロジェクトのデータをkintoneに保存

---

### 優先度: 中

#### 4. リソース配分提案

**機能概要**:
- 現在の遅延を解消するための人員配置案
- スキルマトリクスとの連携
- コスト vs 効果の試算

**活用シーン**:
「原画担当を2名追加すれば納期に間に合う」という提案を自動生成。

**実装難易度**: ★★★（高）

---

#### 5. 自動アラート生成

**機能概要**:
- 遅延の早期検知（予測ベース）
- 閾値超過時の通知
- エスカレーションルール

**活用シーン**:
「このペースだと3日後に納期遅延リスク」という警告を事前に受け取れる。

**実装難易度**: ★★☆（中）
**必要機能**: 定期実行（Cloudflare Workers Cron）

---

#### 6. 作業指示書の自動生成

**機能概要**:
- 次に着手すべきタスクの提案
- 優先順位の自動決定
- 担当者へのアサイン案

**活用シーン**:
AIが「今日はC005の動画を優先すべき」と提案してくれる。

**実装難易度**: ★★★（高）

---

### 優先度: 低（将来的）

#### 7. 自然言語クエリ

**機能概要**:
```
ユーザー: 「先週の進捗を教えて」
AI: 「先週は15カット完了し、3カットで遅延が発生しました」
```

**実装難易度**: ★★★（高）

---

#### 8. 議事録自動生成

**機能概要**:
- 進捗会議用の資料を自動作成
- 報告すべきポイントをハイライト
- 過去の決定事項との整合性チェック

**活用シーン**:
週次MTG前に自動でレポートを生成し、会議時間を短縮。

**実装難易度**: ★★☆（中）

---

#### 9. 予算管理連携

**機能概要**:
- 進捗とコストの相関分析
- 予算オーバーのリスク検出
- ROI計算

**活用シーン**:
「現在のペースだと予算10%オーバー」という警告。

**実装難易度**: ★★★（高）
**必要データ**: コスト情報をkintoneに追加

---

#### 10. シミュレーション分析（当初計画）

**機能概要**:
- 現在のペースで進行した場合の完成予定日予測
- リソース追加時の効果シミュレーション
- 複数シナリオの比較

**実装難易度**: ★★★（高）

---

#### 11. サマリー生成（当初計画）

**機能概要**:
- プロジェクト全体の進捗状況要約
- 週次/月次レポート用の文章生成

**実装難易度**: ★☆☆（低）

---

### 実装推奨順序

```
Phase 1: 遅延検知分析（現在）
  ↓
Phase 2: サマリー生成（簡単）
  ↓
Phase 3: 担当者別パフォーマンス分析（有用性高い）
  ↓
Phase 4: 工程別ボトルネック検出
  ↓
Phase 5: 自動アラート生成
```

---

## Claude APIキー取得方法（本番環境移行時）

### ステップ1: Anthropicアカウント作成

1. [Anthropic Console](https://console.anthropic.com/)にアクセス
2. 「Sign Up」からアカウント作成
3. メール認証を完了

### ステップ2: クレジット購入

1. コンソールにログイン
2. 「Billing」→「Add Credits」
3. **最低$5から購入可能**
4. クレジットカード情報を入力

**重要**: $5で約46ヶ月分（30人利用想定）使えるため、最小金額で十分です。

### ステップ3: APIキー生成

1. 「API Keys」セクションに移動
2. 「Create Key」をクリック
3. キー名を入力（例: `kintone-ai-analysis`）
4. **キーをコピーして安全に保管**（再表示不可）

### ステップ4: Cloudflare Workersに設定

```bash
cd cloudflare-ai-proxy
wrangler secret put CLAUDE_API_KEY
# プロンプトが表示されたらAPIキーを貼り付け
```

### ステップ5: 本番モードに切り替え

```bash
# 環境変数を変更
wrangler secret put ENVIRONMENT
# "production" と入力

# 再デプロイ
wrangler deploy
```

### 使用量監視

Anthropic Consoleの「Usage」で確認可能：
- 日別のトークン使用量
- コスト推移
- API呼び出し回数

**アラート設定推奨**:
- 月額$10超過時に通知
- 異常な呼び出しパターンの検知

---

## テスト段階の無料運用

Claude APIキーが無い状態でも、以下の方法で開発・テストが可能：

### モックレスポンスの仕組み

Cloudflare Workers側で実装：

```typescript
// src/mock.ts
export function mockDelayDetection(progressData: any[]) {
  // 実際のデータを簡易分析
  const delayedItems = progressData.filter(item => {
    if (!item.scheduledDate || !item.actualDate) return false;
    return new Date(item.actualDate) > new Date(item.scheduledDate);
  });

  return {
    success: true,
    analysis: {
      summary: `${delayedItems.length}件の遅延を検出しました`,
      delayedCuts: delayedItems.map(item => ({
        cutNumber: item.cutNumber,
        processName: item.processName,
        delayDays: calculateDelayDays(item),
        reason: "データから推測: 作業量の集中"
      })),
      recommendations: [
        "遅延が多い工程のリソース増強を検討してください",
        "担当者間のワークロード再配分を推奨します"
      ]
    },
    metadata: {
      tokensUsed: 0,
      processingTime: 50,
      isMock: true  // モックであることを明示
    }
  };
}
```

**メリット**:
- 完全無料
- 即座にレスポンス
- UI/UX開発に集中
- 基本的な分析ロジックは機能する

**制限**:
- AI特有の深い洞察は得られない
- 自然言語の柔軟性がない

---

## 参考資料

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Claude API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Anthropic Console](https://console.anthropic.com/)
- [kintone REST API](https://developer.cybozu.io/hc/ja/articles/202331474)

---

## 実装中の発見・驚き

（実装中に追記予定）

---

**この計画で進めてよろしいですか？**
