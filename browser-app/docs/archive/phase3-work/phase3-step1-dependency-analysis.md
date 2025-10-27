# Phase 3 Step 1: 依存関係調査結果と移行計画

## 調査結果サマリー

### 1. ReadModelStore
**状況**: ファイルが存在しない
- `src/infrastructure/ReadModelStore.ts`が存在しない
- しかし、3つのUIコンポーネントが`ReadModelStore`をimportしている
  - SimulationView.ts
  - NormaTable.ts
  - StaffView.ts
- ServiceContainer.getReadModelStore()はUnifiedDataStoreを返している
- **ビルドが成功する理由**: ts-loaderが`transpileOnly: true`で型チェックを無効化している

**使用箇所**:
- ServiceContainer（getReadModelStore() → UnifiedDataStore返却）
- ApplicationFacade（getReadModelStore()を使用）
- ApplicationService（getReadModelStore()を使用）
- NormaDataService（パラメータとして使用）
- UIコンポーネント3つ（直接import）

### 2. SimplifiedReadModel
**状況**: 現在も使用中（グローバルシングルトン）
- `src/services/model/SimplifiedReadModel.ts`に実装
- getSimplifiedReadModel()でグローバルインスタンスを取得

**主要な使用箇所**:
- UnifiedCutService（メインの使用箇所、readModelとして使用）
- ApplicationFacade（getCellMemo、updateCellMemoで直接使用）
- UnifiedEventCoordinator（syncReadModelsで同期処理）

### 3. SimplifiedStore
**状況**: 既に削除済み
- ファイルが存在しない
- UnifiedDataStoreに機能が統合済み
- 参照箇所なし（コメントのみ）

## 発見された問題

### 問題1: ReadModelStoreファイルの欠落
- 3つのUIコンポーネントがimportしているが、ファイルが存在しない
- 型チェック無効のためビルドは通るが、実行時エラーの可能性
- TypeScriptの型安全性が失われている

### 問題2: 二重のReadModel管理
- UnifiedDataStore内部のreadModels Map
- SimplifiedReadModelグローバルシングルトン
- 両方の同期が必要（今回のバグの原因）

### 問題3: インターフェースの不整合
- ServiceContainerはUnifiedDataStoreを返すがReadModelStoreとして宣言
- 型定義の不一致が潜在的バグの原因

## 移行計画（詳細版）

### Phase A: ReadModelStore問題の解決（優先度：高）

#### Option 1: ブリッジファイルの作成（推奨・低リスク）
```typescript
// src/infrastructure/ReadModelStore.ts
export { UnifiedDataStore as ReadModelStore } from './UnifiedDataStore';
export type { UnifiedDataStore as ReadModelStore } from './UnifiedDataStore';
```

**メリット**: 
- 既存コードの変更不要
- 即座に実装可能
- リスクが最小

**デメリット**: 
- 一時的な解決策
- 将来的に削除が必要

#### Option 2: UIコンポーネントの修正（中リスク）
- SimulationView.ts、NormaTable.ts、StaffView.tsのimportを修正
- ReadModelStore → UnifiedDataStoreに変更
- 型定義も同時に変更

**メリット**: 
- 正しい実装
- 技術的負債を残さない

**デメリット**: 
- 3ファイルの変更が必要
- テストが必要

### Phase B: SimplifiedReadModel統合（優先度：中）

#### Step 1: UnifiedDataStoreに機能追加
```typescript
// UnifiedDataStore.tsに以下を追加
findByCutNumber(cutNumber: string): unknown | undefined
findByFilter(filter: (cut: unknown) => boolean): unknown[]
getCellMemo(cutId: string): string | undefined
updateCellMemo(cutId: string, memo: string): void
```

#### Step 2: UnifiedCutServiceの移行
- SimplifiedReadModel → UnifiedDataStore使用に変更
- getSimplifiedReadModel() → ServiceContainer.getUnifiedStore()

#### Step 3: ApplicationFacadeの更新
- getCellMemo、updateCellMemoをUnifiedDataStore経由に変更

#### Step 4: SimplifiedReadModel削除
- ファイル削除
- import文の削除

### Phase C: クリーンアップ（優先度：低）

1. **型チェックの有効化**
   - ts-loaderの`transpileOnly: false`に変更
   - 型エラーの修正

2. **不要なコメントの削除**
   - ReadModelStore関連のコメント削除
   - SimplifiedStore関連のコメント削除

3. **ドキュメント更新**
   - アーキテクチャ図の更新
   - 開発者ガイドの更新

## 実装順序（推奨）

### 今日（Day 2）
1. **Phase A Option 1を実装**（15分）
   - ReadModelStore.tsブリッジファイル作成
   - ビルドとテスト確認

2. **Phase B Step 1-2を実装**（2時間）
   - UnifiedDataStoreに機能追加
   - UnifiedCutServiceの移行

### 明日（Day 3）
3. **Phase B Step 3-4を実装**（2時間）
   - ApplicationFacade更新
   - SimplifiedReadModel削除

4. **Phase Cを実装**（1時間）
   - クリーンアップ作業

## リスク評価

### 高リスク項目
- SimplifiedReadModel削除による既存機能への影響
- 型チェック有効化による大量のエラー発生

### 中リスク項目
- UIコンポーネントの動作変更
- パフォーマンスへの影響

### 低リスク項目
- ReadModelStoreブリッジファイルの作成
- コメント削除

## 成功指標

- [ ] TypeScriptビルドエラーなし
- [ ] 全テストパス
- [ ] リロード後のデータ永続性維持
- [ ] パフォーマンス劣化なし
- [ ] コード行数10%以上削減