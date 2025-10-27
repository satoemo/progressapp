# 型統一影響範囲分析 - Phase 1 Week 1 Day 1-2

## 概要

削除状態の型統一（string → boolean）による影響ファイルの詳細分析結果。
TypeScript型チェック、実行時エラーの可能性、修正優先度を整理。

## 影響ファイル一覧（8ファイル）

### 1. src/domain/types.ts
**現状**: `isDeleted?: string` (オプショナルstring型)
**影響度**: **🔥 最高** - 基盤型定義
**修正内容**:
```typescript
// 修正前
interface CutData {
  isDeleted?: string;
}

// 修正後  
interface CutData {
  isDeleted: boolean;  // required & boolean型
}
```
**TypeScript影響**: 他の全ファイルに波及
**実行時影響**: データ作成・比較処理全般

### 2. src/domain/aggregates/CutAggregate.ts
**現状**: 
- `private _isDeleted: boolean` (内部boolean)
- `getData()` → string変換
- `createEmptyData()` → string初期化

**影響度**: **🔥 最高** - 集約ルート
**修正内容**:
```typescript
// 修正前
private _isDeleted: boolean = false;
getData(): CutData {
  return { ...this.data, isDeleted: this._isDeleted ? 'true' : 'false' };
}
createEmptyData(): CutData {
  return { isDeleted: 'false' };
}

// 修正後
private isDeleted: boolean = false;  // アンダースコア削除
getData(): CutData {
  return { ...this.data, isDeleted: this.isDeleted };
}
createEmptyData(): CutData {
  return { isDeleted: false };
}
```
**TypeScript影響**: 中程度（内部実装のため）
**実行時影響**: データ出力の型が変わる

### 3. src/infrastructure/CutReadModel.ts  
**現状**: 
- `isDeleted: string` (明示的string型)
- string変換処理

**影響度**: **🔥 高** - ReadModel層の基盤
**修正内容**:
```typescript
// 修正前
interface CutReadModel extends CutData {
  isDeleted: string;
}
const actualIsDeleted = data.isDeleted !== undefined 
  ? data.isDeleted 
  : (isDeleted ? 'true' : 'false');

// 修正後
interface CutReadModel extends CutData {
  // isDeletedはCutDataから継承（boolean型）
}
const actualIsDeleted = data.isDeleted !== undefined 
  ? data.isDeleted 
  : isDeleted;
```
**TypeScript影響**: 高（ReadModel使用箇所に波及）
**実行時影響**: 中程度

### 4. src/infrastructure/ReadModelStore.ts
**現状**: string比較処理（`=== 'true'`）
**影響度**: **🔥 高** - データ管理核心
**修正内容**:
```typescript
// 修正前
const isDeleted = existingModel ? existingModel.isDeleted === 'true' : false;
const actualIsDeleted = data.isDeleted !== undefined 
  ? data.isDeleted === 'true' 
  : isDeleted;

// 修正後
const isDeleted = existingModel ? existingModel.isDeleted === true : false;
const actualIsDeleted = data.isDeleted !== undefined 
  ? data.isDeleted 
  : isDeleted;
```
**TypeScript影響**: 低（内部処理のため）
**実行時影響**: 中程度

### 5. src/application/queries/handlers/GetAllCutsQueryHandler.ts
**現状**: string比較によるフィルタリング（`!== 'true'`）
**影響度**: **🔥 高** - クエリ処理核心
**修正内容**:
```typescript
// 修正前
cuts = cuts.filter(cut => cut.isDeleted !== 'true');

// 修正後
cuts = cuts.filter(cut => !cut.isDeleted);
```
**TypeScript影響**: 低（内部処理のため）
**実行時影響**: 高（フィルタリング結果に直接影響）

### 6. src/application/UnifiedEventCoordinator.ts
**現状**: string比較による集計処理（`=== 'true'`）
**影響度**: **🟡 中** - 集計・ログ処理
**修正内容**:
```typescript
// 修正前
const deletedCount = allReadModels.filter(rm => rm.isDeleted === 'true').length;

// 修正後
const deletedCount = allReadModels.filter(rm => rm.isDeleted).length;
```
**TypeScript影響**: 低
**実行時影響**: 低（ログ処理のため）

### 7. src/application/ApplicationFacade.ts
**現状**: isDeletedフィールドの除外処理
**影響度**: **🟡 低** - データ除外処理（今回のバグ修正で対応済み）
**修正内容**: 
```typescript
// 現在（修正不要）
const { completionRate, totalCost, progressSummary, isDeleted, ...cutData } = cut;
```
**TypeScript影響**: なし（フィールド除外のため型に依存しない）
**実行時影響**: なし

### 8. src/application/commands/handlers/DeleteCutCommandHandler.ts
**現状**: CutAggregate.isDeleted()メソッド呼び出し
**影響度**: **🟡 低** - メソッド呼び出しのみ
**修正内容**: 修正不要（メソッドは元からboolean型を返すため）
```typescript
// 現在（修正不要）
if (cut.isDeleted()) {  // メソッドは元からboolean返却
```
**TypeScript影響**: なし
**実行時影響**: なし

## TypeScript型エラー予測

### Stage 1 (domain/types.ts + CutAggregate修正) 実行後の予想エラー
```typescript
// CutReadModel.tsでエラー発生予想
interface CutReadModel extends CutData {
  isDeleted: string;  // ← CutDataのboolean型と不一致
}

// ReadModelStore.tsでエラー発生予想  
const isDeleted = existingModel.isDeleted === 'true';  // ← boolean型との比較エラー

// GetAllCutsQueryHandler.tsでエラー発生予想
cuts.filter(cut => cut.isDeleted !== 'true');  // ← boolean型との比較エラー
```

### 修正コストの見積もり
| ファイル | 行数変更 | 難易度 | 時間見積もり |
|---------|----------|--------|-------------|
| domain/types.ts | 1行 | 低 | 5分 |
| CutAggregate.ts | 4行 | 中 | 15分 |
| CutReadModel.ts | 6行 | 中 | 15分 |
| ReadModelStore.ts | 5行 | 中 | 20分 |
| GetAllCutsQueryHandler.ts | 2行 | 低 | 10分 |
| UnifiedEventCoordinator.ts | 1行 | 低 | 5分 |
| ApplicationFacade.ts | 0行 | - | 0分 |
| DeleteCutCommandHandler.ts | 0行 | - | 0分 |
| **合計** | **19行** | **中** | **70分** |

## 実行時エラーの可能性

### 高リスク箇所
1. **ReadModel生成**: createCutReadModel()での型不整合
2. **フィルタリング**: GetAllCutsQueryHandlerでの条件不一致
3. **比較処理**: ReadModelStoreでの状態判定

### 中リスク箇所
1. **データ出力**: CutAggregate.getData()の返却値変更
2. **集計処理**: UnifiedEventCoordinatorでの集計ロジック

### 軽減策
```typescript
// 移行期間中のセーフティ関数
function safeIsDeleted(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

// 一時的な使用例
const isDeleted = safeIsDeleted(cut.isDeleted);
```

## テスト必須箇所

### 単体テスト
1. **CutAggregate.getData()** - boolean型の返却確認
2. **createCutReadModel()** - boolean型の処理確認
3. **ReadModelStore比較処理** - boolean比較の確認

### 統合テスト
1. **削除機能フロー** - 削除→リロード→非表示
2. **フィルタリング** - 削除データの除外確認
3. **UI更新** - 削除状態の正確な反映

## 移行フェーズの影響予測

### Phase 1: domain/types.ts + CutAggregate修正
- **TypeScriptエラー**: 4ファイルでエラー発生予想
- **実行時エラー**: 中程度のリスク
- **機能影響**: 部分的な機能停止の可能性

### Phase 2: ReadModel・Store層修正
- **TypeScriptエラー**: 解消
- **実行時エラー**: 低リスク
- **機能影響**: 機能復旧

### Phase 3: Query・Coordinator層修正
- **TypeScriptエラー**: 完全解消
- **実行時エラー**: 最小限
- **機能影響**: 完全復旧

## 結論

**影響ファイル数**: 8ファイル（修正必要：6ファイル）
**修正工数**: 約70分
**TypeScript影響**: 中程度（段階的修正で管理可能）
**実行時影響**: 中程度（適切なテストで軽減可能）

型統一は複雑に見えるが、実際の修正箇所は少なく、段階的移行により安全に実行可能。
Phase1計画書の通りに実行すれば、リスクを最小化して型統一を完了できる。