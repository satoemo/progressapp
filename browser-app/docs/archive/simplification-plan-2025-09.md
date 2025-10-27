# v10.3.3 簡素化計画

## 目標
シンプルで一貫性のあるコードベースの実現

## 即座に削除可能なもの

### 1. アーカイブディレクトリ（約2,000行削減）
```bash
rm -rf src/archive/phase1-deletion-legacy/
rm -rf src/archive/phase2-legacy/
rm -rf src/archive/phase3-legacy/
# restoration-scriptsは必要に応じて保持
```

### 2. 未使用のimport/export
- レガシーサービスへの参照
- アーカイブ済みコマンド/クエリパターンへの参照

### 3. 重複するユーティリティメソッド
```typescript
// 削除対象
ValidationHelper.deepClone() // DataProcessor.deepClone()を使用
DataProcessor.formatDate()   // DateHelper.format()を使用
```

## 統合可能なクラス

### データアクセス層の統合案
```typescript
// 現在: 3つのシステム
ApplicationFacade    →
ServiceContainer     → UnifiedDataService
UnifiedDataStore     →

// 統合後: 1つのシステム
class UnifiedDataService {
  // CRUDメソッド（シンプルなインターフェース）
  async create(data: CutData): Promise<Cut>
  async read(id: string): Promise<Cut>
  async update(id: string, data: Partial<CutData>): Promise<Cut>
  async delete(id: string): Promise<void>
  async list(options?: ListOptions): Promise<Cut[]>

  // メモ管理（独立したサービスに移動も検討）
  async getMemo(cutId: string, field: string): Promise<CellMemo>
  async updateMemo(cutId: string, field: string, memo: string): Promise<void>
}
```

### 状態管理の統合案
```typescript
// 現在: 4つのシステム
UnifiedStateManager
DebouncedSyncManager
RealtimeSyncService
UnifiedEventCoordinator

// 統合後: 1つのシステム
class SimpleStateManager {
  private state: AppState
  private listeners: Set<(state: AppState) => void>

  // シンプルなAPI
  getState(): AppState
  setState(updater: (state: AppState) => AppState): void
  subscribe(listener: (state: AppState) => void): () => void

  // 同期機能（オプション）
  enableSync(adapter: SyncAdapter): void
}
```

### ユーティリティの統合案
```typescript
// 現在: 分散した機能
src/utils/
  ├── DataProcessor.ts
  ├── ErrorHandler.ts
  ├── ValidationHelper.ts
  ├── StorageHelper.ts
  ├── DateHelper.ts
  └── DOMUtils.ts

// 統合後: 機能別に整理
src/utils/
  ├── data.ts      // clone, merge, transform
  ├── date.ts      // format, parse, calculate
  ├── storage.ts   // localStorage操作
  ├── dom.ts       // DOM操作
  └── error.ts     // エラーハンドリング
```

## 簡素化のための具体的アクション

### Step 1: クリーンアップ（1日）
- [ ] アーカイブディレクトリを削除
- [ ] 未使用importを削除
- [ ] デッドコードを削除

### Step 2: ユーティリティ統合（2日）
- [ ] 重複メソッドを特定して削除
- [ ] ユーティリティを機能別に再編成
- [ ] テストを追加

### Step 3: ApplicationService削除（1日）
- [ ] ApplicationServiceの使用箇所をApplicationFacadeに置換
- [ ] ApplicationServiceファイルを削除
- [ ] 関連テストを更新

### Step 4: データアクセス層統合（3-5日）
- [ ] UnifiedDataServiceを作成
- [ ] ApplicationFacadeから機能を移行
- [ ] ServiceContainerの役割を明確化
- [ ] UnifiedDataStoreとの統合

### Step 5: 状態管理簡素化（3-5日）
- [ ] SimpleStateManagerを作成
- [ ] 既存の状態管理を移行
- [ ] イベントシステムを簡素化

## コード削減の見込み

| 項目 | 現在の行数 | 削減後 | 削減率 |
|-----|-----------|--------|--------|
| アーカイブコード | 2,000 | 0 | 100% |
| ApplicationFacade | 669 | 300 | 55% |
| UnifiedDataStore | 946 | 400 | 58% |
| ServiceContainer | 500 | 200 | 60% |
| ユーティリティ | 800 | 400 | 50% |
| **合計** | **4,915** | **1,300** | **73%削減** |

## ファイル構造の簡素化

### 現在の構造（複雑）
```
src/
├── application/       # 8ファイル
│   ├── interfaces/    # 2ファイル
│   ├── services/      # 6ファイル
│   ├── state/         # 2ファイル
│   └── types/         # 1ファイル
├── infrastructure/    # 10ファイル
├── domain/           # 15ファイル
├── archive/          # 30+ファイル（削除対象）
└── ui/               # 50+ファイル
```

### 簡素化後の構造
```
src/
├── services/         # 5-6ファイル（統合済み）
├── models/           # 5-6ファイル（ドメインモデル）
├── ui/               # そのまま
├── utils/            # 5ファイル（統合済み）
└── config/           # 設定ファイル
```

## パフォーマンスへの影響

### 予想される改善
- **起動時間**: 20-30%高速化（コード量削減による）
- **メモリ使用量**: 15-20%削減（重複オブジェクトの削減）
- **ビルド時間**: 30-40%短縮（ファイル数削減による）

## リスクと対策

### リスク1: 後方互換性の破壊
**対策**:
- 段階的な移行
- デプリケーション警告の追加
- 互換性レイヤーの一時的な提供

### リスク2: 機能の欠落
**対策**:
- 包括的なテストの作成
- 機能マッピングドキュメントの作成
- 段階的なリリース

### リスク3: チーム理解の困難
**対策**:
- 詳細なドキュメントの作成
- コードレビューの徹底
- ペアプログラミングの実施

## 成功の指標

1. **コード量**: 15,000行 → 10,000行以下
2. **ファイル数**: 150+ → 100以下
3. **最大ファイルサイズ**: 946行 → 300行以下
4. **重複コード**: 15-20% → 5%以下
5. **ビルド時間**: 現在の60%以下
6. **テストカバレッジ**: 80%以上

## タイムライン

### Week 1
- Day 1: クリーンアップ
- Day 2-3: ユーティリティ統合
- Day 4: ApplicationService削除
- Day 5: テスト・検証

### Week 2
- Day 1-3: データアクセス層統合
- Day 4-5: 状態管理簡素化

### Week 3
- Day 1-2: 統合テスト
- Day 3: パフォーマンス測定
- Day 4-5: ドキュメント更新

## 次のステップ

1. **承認取得**: この計画をチームでレビュー
2. **ブランチ作成**: `feature/v10.3.3-simplification`
3. **Step 1実施**: アーカイブコードの削除から開始

この簡素化により、コードベースがより理解しやすく、保守しやすくなることが期待されます。