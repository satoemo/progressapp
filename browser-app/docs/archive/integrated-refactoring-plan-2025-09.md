# v10.3.3 統合リファクタリング実行計画書

## 計画概要
現在進行中のPhase 1-3リファクタリングと、新たな簡素化プランを統合した実行計画

## 現状
- **Phase 1-3進捗**: 大幅改善済み（削除クラス参照0、any型75%削減）
- **残作業**: ヘルパークラス活用拡大（約640箇所）
- **コードベース**: 約15,000行（アーカイブ2,000行含む）

## 実行計画

### Week 1（2025年9月16日〜22日）: Phase 1-3完了 + 並行作業

#### 月曜日〜火曜日: 並行作業開始
**並行タスク1: アーカイブディレクトリ削除**
```bash
# 削除対象（約2,000行削減）
rm -rf src/archive/phase1-deletion-legacy/
rm -rf src/archive/phase2-legacy/
rm -rf src/archive/phase3-legacy/
# restoration-scriptsは保持
```

**並行タスク2: ビルドツール統一**
- [ ] webpack関連ファイル削除
- [ ] viteに統一
- [ ] package.jsonスクリプト更新
- [ ] テスト環境もviteで構築

#### 水曜日〜木曜日: ヘルパークラス活用拡大
**Phase 1-3残作業（約640箇所）**
- [ ] try-catch直接記述 → ErrorHandler（190箇所）
- [ ] DOM操作直接記述 → DOMBuilder/DOMHelper（240箇所）
- [ ] 日付処理直接記述 → DateHelper（85箇所）
- [ ] localStorage直接操作 → StorageHelper（45箇所）
- [ ] null/undefinedチェック → ValidationHelper（80箇所）

#### 金曜日: ApplicationService削除
- [ ] ApplicationServiceの使用箇所をApplicationFacadeに置換
- [ ] ApplicationService.tsを削除
- [ ] main-browser.tsを更新
- [ ] テスト実行・動作確認

### Week 2（2025年9月23日〜29日）: ユーティリティ統合

#### 月曜日〜火曜日: ユーティリティクラス分析
- [ ] 重複メソッドの特定
- [ ] 統合計画の詳細化
- [ ] テストケースの準備

#### 水曜日〜金曜日: ユーティリティ統合実装
```typescript
// 統合前
src/utils/
├── DataProcessor.ts     // 15メソッド
├── ErrorHandler.ts      // 12メソッド
├── ValidationHelper.ts  // 20メソッド
├── StorageHelper.ts     // 18メソッド
├── DateHelper.ts        // 10メソッド
└── DOMUtils.ts          // 8メソッド

// 統合後
src/utils/
├── data.ts      // clone, merge, transform（10メソッド）
├── date.ts      // format, parse, calculate（8メソッド）
├── storage.ts   // localStorage操作（10メソッド）
├── dom.ts       // DOM操作（15メソッド）
└── error.ts     // エラーハンドリング（8メソッド）
```

### Week 3（2025年9月30日〜10月6日）: データアクセス層統合

#### 月曜日〜火曜日: 設計・準備
- [ ] UnifiedDataServiceインターフェース設計
- [ ] 既存3システムの機能マッピング
- [ ] 移行計画の詳細化

#### 水曜日〜金曜日: 実装
```typescript
// 新しい統一データサービス
class UnifiedDataService {
  // ApplicationFacade、ServiceContainer、UnifiedDataStoreの良い部分を統合

  // シンプルなCRUD API
  async create(data: CutData): Promise<Cut>
  async read(id: string): Promise<Cut>
  async update(id: string, data: Partial<CutData>): Promise<Cut>
  async delete(id: string): Promise<void>
  async list(options?: ListOptions): Promise<Cut[]>

  // メモ管理（分離も検討）
  async getMemo(cutId: string, field: string): Promise<CellMemo>
  async updateMemo(cutId: string, field: string, memo: string): Promise<void>
}
```

### Week 4（2025年10月7日〜13日）: 状態管理簡素化

#### 月曜日〜火曜日: 設計
- [ ] SimpleStateManager設計
- [ ] 既存4システムの機能分析
- [ ] 移行戦略策定

#### 水曜日〜金曜日: 実装
```typescript
// 統一状態管理
class SimpleStateManager {
  private state: AppState
  private listeners: Set<(state: AppState) => void>

  getState(): AppState
  setState(updater: (state: AppState) => AppState): void
  subscribe(listener: (state: AppState) => void): () => void

  // オプション機能
  enableSync(adapter: SyncAdapter): void
  enableDebounce(ms: number): void
}
```

## チェックポイント

### Week 1終了時
- [ ] アーカイブ削除完了（-2,000行）
- [ ] ビルドツール統一完了
- [ ] ヘルパークラス活用率90%以上
- [ ] ApplicationService削除完了
- [ ] 全テスト成功

### Week 2終了時
- [ ] ユーティリティ統合完了
- [ ] 重複コード50%削減
- [ ] ファイル数20%削減

### Week 3終了時
- [ ] データアクセス層統一完了
- [ ] ApplicationFacade責務分割完了
- [ ] コード量30%削減達成

### Week 4終了時
- [ ] 状態管理簡素化完了
- [ ] 全体コード量35%削減達成
- [ ] テストカバレッジ50%以上

## 成功指標

| 指標 | 現在 | Week 1後 | Week 2後 | Week 3後 | Week 4後 |
|-----|------|---------|---------|---------|---------|
| 総行数 | 15,000 | 13,000 | 12,000 | 11,000 | 10,000 |
| ファイル数 | 150+ | 120 | 100 | 90 | 80 |
| 最大ファイルサイズ | 946行 | 946行 | 500行 | 400行 | 300行 |
| 重複コード | 15-20% | 10% | 8% | 6% | 5% |
| ヘルパー活用率 | 50% | 90% | 95% | 95% | 95% |

## リスク管理

### リスク1: 実行時エラー
- **対策**: 段階的実装、包括的テスト
- **緩和策**: ロールバック計画準備

### リスク2: パフォーマンス劣化
- **対策**: 各週でパフォーマンス測定
- **緩和策**: ボトルネック特定と最適化

### リスク3: 開発チーム影響
- **対策**: 並行作業で影響最小化
- **緩和策**: 詳細なドキュメント、コードレビュー

## コミュニケーション計画

### 週次レポート
- 進捗状況
- 問題と解決策
- 次週の計画

### 日次スタンドアップ
- 完了タスク
- 本日のタスク
- ブロッカー

## ロールバック計画

各週の作業は独立したブランチで実施：
- Week 1: `feature/phase1-3-completion`
- Week 2: `feature/utility-consolidation`
- Week 3: `feature/data-layer-unification`
- Week 4: `feature/state-simplification`

問題発生時は前週の状態に即座にロールバック可能。

## 承認と開始

### 承認事項
- [ ] 計画内容の承認
- [ ] リソース割り当ての承認
- [ ] タイムラインの承認

### 開始条件
- [ ] 現在のコードのバックアップ完了
- [ ] テスト環境準備完了
- [ ] チーム全員への周知完了

---

**計画作成日**: 2025年9月15日
**計画開始日**: 2025年9月16日（予定）
**計画完了日**: 2025年10月13日（予定）