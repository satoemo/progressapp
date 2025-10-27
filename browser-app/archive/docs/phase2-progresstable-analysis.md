# ProgressTable.ts 責任分析レポート - Phase 2 Week 1

## 現状概要

- **ファイルサイズ**: 1707行
- **クラス**: ProgressTable extends BaseProgressTable
- **問題**: 8つの異なる責任が1つのクラスに集約（神クラス問題）

## 現在の責任分析

### 1. テーブル構造描画責任 (約400行)
**対象メソッド**:
- `createTableStructure()` - テーブル全体構造
- `createTableHeader()` - ヘッダー作成
- `createGroupHeaderRow()` - グループヘッダー
- `createFieldHeaderRow()` - フィールドヘッダー
- `createColGroup()` - 列幅定義
- `calculateTotalWidth()` - 幅計算

**詳細責任**:
- DOM要素作成・構成
- CSS クラス適用
- テーブル構造の組み立て
- 列幅・スタイル管理

### 2. データ行描画責任 (約300行)
**対象メソッド**:
- `render()` - メインレンダリング
- `createRow()` - 行作成（推定）
- `createCell()` - セル作成（推定）
- `formatFieldValue()` - 値フォーマット
- `formatKenyoValue()` - 兼用値フォーマット

**詳細責任**:
- データ行のDOM生成
- セル内容の描画
- 値のフォーマット・表示

### 3. イベント処理責任 (約250行)
**対象メソッド**:
- `handleDeleteClick()` - 削除処理
- `sort()` - ソート処理
- 各種ボタンのonclick処理
- セル編集イベント
- キーボードアクセシビリティ

**詳細責任**:
- ユーザー操作の検知
- イベント委譲・処理
- コマンド実行

### 4. データ管理責任 (約200行)
**対象メソッド**:
- `allCuts`, `cuts` データ管理
- フィルタリング処理（FilterManager利用）
- ソートロジック
- データ同期

**詳細責任**:
- データの保持・更新
- フィルタ・ソート適用
- 状態との同期

### 5. 状態管理責任 (約150行)
**対象メソッド**:
- `ViewStateManager` 利用
- `saveState()`, `restoreState()`
- `currentSort` 管理

**詳細責任**:
- 表示状態の保存・復元
- ソート・フィルタ状態管理

### 6. セル編集責任 (約200行)
**対象メソッド**:
- `CellEditorFactory` 利用
- セル編集関連の処理
- `updateCellContent()`

**詳細責任**:
- セル編集UI
- 編集値の検証・更新

### 7. メモ機能責任 (約100行)
**対象メソッド**:
- `updateCellMemoIndicator()`
- `showMemoTooltip()`
- メモ表示UI

**詳細責任**:
- メモインジケーター表示
- ツールチップ管理

### 8. 外部機能責任 (約100行)
**対象メソッド**:
- `exportToPDF()` - PDF出力
- `addNewCut()` - 新規追加
- `generateDummyData()` - ダミーデータ

**詳細責任**:
- PDF出力処理
- データ操作機能

## 分割設計案

### ProgressDataService (データ管理特化)
**責任**:
- データの読み込み・保持
- フィルタリング・ソートロジック
- データ同期・更新監視

**推定行数**: 150行
**主要メソッド**:
```typescript
class ProgressDataService {
  async loadData(): Promise<CutReadModel[]>
  filterData(criteria: FilterCriteria): CutReadModel[]
  sortData(config: SortConfig): CutReadModel[]
  updateData(cutId: string, updates: Partial<CutData>): void
  subscribeToUpdates(callback: (data: CutReadModel[]) => void): void
}
```

### TableRenderService (描画特化)
**責任**:
- テーブル構造・ヘッダー描画
- データ行・セル描画
- スタイル・レイアウト管理

**推定行数**: 200行
**主要メソッド**:
```typescript
class TableRenderService {
  renderTable(container: HTMLElement, data: CutReadModel[]): void
  renderTableStructure(): HTMLTableElement
  renderTableHeader(fields: FieldDefinition[]): HTMLTableSectionElement
  renderTableBody(data: CutReadModel[]): HTMLTableSectionElement
  renderRow(cut: CutReadModel): HTMLTableRowElement
  renderCell(value: any, field: FieldDefinition): HTMLTableCellElement
}
```

### TableEventService (イベント処理特化)
**責任**:
- ユーザー操作検知・処理
- イベント委譲
- コマンド実行・非同期処理

**推定行数**: 150行
**主要メソッド**:
```typescript
class TableEventService {
  setupEventListeners(table: HTMLTableElement): void
  handleCellEdit(event: Event): void
  handleSort(event: Event): void
  handleDelete(cutId: string): Promise<void>
  handleCellClick(event: Event): void
}
```

### ProgressTable (メインクラス)
**責任**:
- サービス統合・調整
- 公開API提供
- 初期化・ライフサイクル管理

**推定行数**: 150行
**主要メソッド**:
```typescript
class ProgressTable {
  constructor(
    private dataService: ProgressDataService,
    private renderService: TableRenderService,
    private eventService: TableEventService
  ) {}
  
  async initialize(): Promise<void>
  refresh(): void
  destroy(): void
  // 既存公開APIの維持
}
```

## 分割のメリット

### 1. 単一責任原則の実現
- 各クラスが明確な責任を持つ
- 変更の影響範囲が限定される

### 2. テスト容易性
- 各サービス単体でのテスト可能
- モック・スタブが容易

### 3. 保守性向上
- 機能追加時の影響範囲明確
- コードリーディング容易

### 4. 再利用性
- 他のテーブルでサービス再利用可能
- コンポーネント化促進

## 移行戦略

### Phase 2.1: 分析・設計 (Week 1) ✅
現在完了

### Phase 2.2: ProgressDataService実装 (Week 2)
1. データ管理ロジックの抽出
2. フィルタ・ソート機能の移行
3. 単体テスト作成

### Phase 2.3: TableRenderService実装 (Week 3)
1. 描画ロジックの抽出
2. DOM操作の集約
3. レンダリングパフォーマンス最適化

### Phase 2.4: TableEventService実装 (Week 4)
1. イベント処理の抽出
2. イベント委譲の実装
3. 非同期処理の整理

### Phase 2.5: ProgressTable統合 (Week 5)
1. 分割したサービスの統合
2. 既存APIとの互換性確保
3. 統合テスト実施

### Phase 2.6: 検証 (Week 6)
1. 全機能動作確認
2. パフォーマンス比較
3. メモリ使用量測定

## リスク要因

### 高リスク
- **最重要機能への影響**: 進捗管理表の機能停止リスク
- **複雑な依存関係**: BaseProgressTable継承の影響

### 中リスク
- **状態管理の複雑さ**: ViewStateManagerとの連携
- **イベント処理の分散**: 処理順序・タイミング問題

### 軽減策
- **段階的移行**: 各Week完了時に動作確認
- **既存API維持**: 外部から見た振る舞い変更なし
- **ロールバック計画**: 各段階でのバックアップ

## 成功指標

### 定量指標
- **ファイルサイズ**: 最大200行以下×4ファイル
- **TypeScript型エラー**: 0件維持
- **既存テスト**: 全通過
- **パフォーマンス**: 劣化なし

### 定性指標
- **コード理解性**: 責任分離による向上
- **保守性**: 機能追加・修正の容易さ
- **テスト容易性**: 単体テスト可能性

次週からProgressDataService実装に着手します。