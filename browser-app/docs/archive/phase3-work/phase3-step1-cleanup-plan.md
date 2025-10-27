# Phase 3 Step 1 クリーンアップ計画

## 現在の状況分析

### SimplifiedStore.ts
- **ステータス**: 既に削除済み ✅
- **対応不要**

### ReadModelStore.ts
- **ステータス**: ブリッジファイルとして存在
- **内容**: UnifiedDataStoreをReadModelStoreとして再エクスポート
- **依存ファイル**: 5つのUIコンポーネント + ApplicationService.ts

## ReadModelStore.ts削除計画

### 依存ファイル一覧
1. `/src/ui/staff/StaffView.ts`
2. `/src/ui/simulation/SimulationView.ts`
3. `/src/ui/simulation/NormaTable.ts`
4. `/src/services/NormaDataService.ts`
5. `/src/application/ApplicationService.ts`

### 段階的移行計画

#### Step 1: インポート文の更新（15分）
各ファイルのインポート文を以下のように変更：

**変更前**:
```typescript
import { ReadModelStore } from '@/infrastructure/ReadModelStore';
```

**変更後**:
```typescript
import { UnifiedDataStore } from '@/infrastructure/UnifiedDataStore';
```

#### Step 2: 型名の更新（10分）
各ファイル内の型参照を更新：

**変更前**:
```typescript
private readModelStore: ReadModelStore
```

**変更後**:
```typescript
private readModelStore: UnifiedDataStore
```

#### Step 3: ServiceContainerの更新確認（5分）
ServiceContainerが既にUnifiedDataStoreを返していることを確認

#### Step 4: ReadModelStore.tsの削除（5分）
- ファイル削除
- ビルド確認

### 実装順序

1. **ApplicationService.ts** - 基盤サービスから開始
2. **NormaDataService.ts** - データサービス層
3. **StaffView.ts** - UI層（比較的独立）
4. **NormaTable.ts** - UI層（Simulation関連）
5. **SimulationView.ts** - UI層（最も複雑）

### リスク評価

#### 低リスク
- ReadModelStoreは単なるブリッジファイル
- UnifiedDataStoreは既に全機能を実装済み
- 型名の変更のみで機能影響なし

#### 中リスク
- UIコンポーネントのテストが必要
- 5ファイルの同時変更が必要

### 成功指標
- [ ] ビルドエラーなし
- [ ] test-api-mock.htmlでの動作確認
- [ ] データ表示の正常動作
- [ ] ReadModelStore.tsの削除完了

## 実装詳細

### 変更対象ファイルと行番号

#### 1. ApplicationService.ts
- インポート文の変更が必要
- ReadModelStore型参照の変更

#### 2. NormaDataService.ts
- インポート文の変更が必要
- コンストラクタパラメータの型変更

#### 3. StaffView.ts
- インポート文の変更が必要
- プロパティの型変更

#### 4. NormaTable.ts
- インポート文の変更が必要
- コンストラクタパラメータの型変更

#### 5. SimulationView.ts
- インポート文の変更が必要
- プロパティの型変更

## 実装チェックリスト

### 準備
- [ ] 現在のテスト環境で動作確認
- [ ] バックアップブランチ作成（任意）

### 実装
- [ ] ApplicationService.ts更新
- [ ] NormaDataService.ts更新
- [ ] StaffView.ts更新
- [ ] NormaTable.ts更新
- [ ] SimulationView.ts更新
- [ ] ReadModelStore.ts削除

### 確認
- [ ] TypeScriptビルド成功
- [ ] Webpackビルド成功
- [ ] test-api-mock.htmlでの動作確認
- [ ] データ永続性の確認

## 期待される効果

### コード削減
- 削除ファイル: 1ファイル（ReadModelStore.ts）
- 削除行数: 約20行

### 保守性向上
- ブリッジファイルの削除により複雑性が減少
- UnifiedDataStoreへの統一によりデータフローが明確化

### 表示バグの削減
- 単一データソースの確立
- データアクセスパスの統一
- 中間層の削除による予期しない動作の削減

## 次のステップ

ReadModelStore.ts削除後：
1. SimplifiedReadModel完全削除の検討
2. ServiceContainerとServiceLocatorの統合
3. 型定義の整理（any型の削減）