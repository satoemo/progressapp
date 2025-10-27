# 型統一移行戦略 - Phase 1 Week 1 Day 1-2

## 概要

削除状態の型不統一問題（string ↔ boolean）を段階的に解決するための詳細移行戦略。
Phase1計画書の実装前に、安全な移行手順を確定する。

## 現状問題の整理

### 型不統一の現状
```typescript
// 1. domain/types.ts (オプショナルstring)
isDeleted?: string;

// 2. CutAggregate.ts (private boolean)
private _isDeleted: boolean = false;

// 3. CutAggregate.getData() (boolean→string変換)
return { ...this.data, isDeleted: this._isDeleted ? 'true' : 'false' };

// 4. createEmptyData() (string初期化)
isDeleted: 'false'

// 5. CutReadModel.ts (string型定義)
isDeleted: string;

// 6. ReadModelStore.ts (string比較)
const isDeleted = existingModel.isDeleted === 'true';

// 7. GetAllCutsQueryHandler.ts (string比較)
cuts.filter(cut => cut.isDeleted !== 'true');

// 8. UnifiedEventCoordinator.ts (string比較)
allReadModels.filter(rm => rm.isDeleted === 'true');
```

## 目標型システム

### 統一後の型定義
```typescript
// 基盤型（統一）
interface CutData {
  id: string;
  isDeleted: boolean;  // required boolean型
  // その他78フィールド
}

interface CutReadModel extends CutData {
  completionRate: number;
  totalCost: number;
  progressSummary: any;
  // isDeletedはCutDataから継承（boolean型）
}

// Aggregateクラス（統一）
class CutAggregate {
  private isDeleted: boolean = false;  // アンダースコア削除
  
  isDeleted(): boolean {
    return this.isDeleted;
  }
  
  getData(): CutData {
    return { ...this.data, isDeleted: this.isDeleted };  // 直接boolean
  }
  
  static createEmptyData(): CutData {
    return {
      id: '',
      isDeleted: false,  // boolean初期化
      // その他フィールド
    };
  }
}

// 比較処理（統一）
// ReadModelStore.ts
const isDeleted = existingModel.isDeleted === true;

// GetAllCutsQueryHandler.ts
cuts.filter(cut => !cut.isDeleted);

// UnifiedEventCoordinator.ts
allReadModels.filter(rm => rm.isDeleted);
```

## 段階的移行戦略

### Stage 1: 基盤型修正（Day 3-4）
**目標**: 最も基盤となるCutData型とCutAggregateを修正

#### Step 1.1: domain/types.ts修正
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

#### Step 1.2: CutAggregate.ts修正
```typescript
// 修正前
class CutAggregate {
  private _isDeleted: boolean = false;
  
  getData(): CutData {
    return { ...this.data, isDeleted: this._isDeleted ? 'true' : 'false' };
  }
  
  private createEmptyData(id: string): CutData {
    return {
      // ...
      isDeleted: 'false'
    };
  }
}

// 修正後
class CutAggregate {
  private isDeleted: boolean = false;  // アンダースコア削除
  
  isDeleted(): boolean {
    return this.isDeleted;
  }
  
  getData(): CutData {
    return { ...this.data, isDeleted: this.isDeleted };  // 直接boolean
  }
  
  private createEmptyData(id: string): CutData {
    return {
      // ...
      isDeleted: false  // boolean初期化
    };
  }
}
```

**検証方法**:
- TypeScriptコンパイル実行
- 依存ファイルでのエラー特定
- 一時的な型キャストでエラー回避

### Stage 2: ReadModel層修正（Day 5 - Week 2）
**目標**: ReadModel定義とReadModelStoreの型整合

#### Step 2.1: CutReadModel.ts修正
```typescript
// 修正前
interface CutReadModel extends CutData {
  isDeleted: string;  // 明示的string型
}

function createCutReadModel(data: CutData, isDeleted: boolean = false): CutReadModel {
  const actualIsDeleted = data.isDeleted !== undefined 
    ? data.isDeleted 
    : (isDeleted ? 'true' : 'false');
  
  return {
    ...data,
    isDeleted: actualIsDeleted
  };
}

// 修正後
interface CutReadModel extends CutData {
  // isDeletedはCutDataから継承（boolean型）
}

function createCutReadModel(data: CutData, isDeleted: boolean = false): CutReadModel {
  // CutDataのisDeletedフィールドを優先（既にboolean型）
  const actualIsDeleted = data.isDeleted !== undefined 
    ? data.isDeleted 
    : isDeleted;

  return {
    ...data,
    completionRate,
    totalCost,
    progressSummary,
    isDeleted: actualIsDeleted  // boolean型で統一
  };
}
```

#### Step 2.2: ReadModelStore.ts修正
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

// handleCutDeletedメソッドの簡素化
public handleCutDeleted(event: DomainEvent): void {
  const existingModel = this.models.get(event.aggregateId);
  if (existingModel) {
    // シンプルに削除フラグを更新
    const updatedModel = { ...existingModel, isDeleted: true };
    this.models.set(event.aggregateId, updatedModel);
  }
}
```

### Stage 3: Query・Coordinator層修正（Week 2）
**目標**: 比較処理とフィルタリング処理の統一

#### Step 3.1: GetAllCutsQueryHandler.ts修正
```typescript
// 修正前
if (!query.includeDeleted) {
  cuts = cuts.filter(cut => cut.isDeleted !== 'true');
}

// 修正後
if (!query.includeDeleted) {
  cuts = cuts.filter(cut => !cut.isDeleted);
}
```

#### Step 3.2: UnifiedEventCoordinator.ts修正
```typescript
// 修正前
const deletedCount = allReadModels.filter(rm => rm.isDeleted === 'true').length;

// 修正後
const deletedCount = allReadModels.filter(rm => rm.isDeleted).length;
```

## 互換性維持戦略

### 移行期間中の混在対応
```typescript
// 移行期間中のヘルパー関数
function safeIsDeleted(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

// 一時的な型キャスト（移行完了後に削除）
const tempIsDeleted = data.isDeleted as any;
```

### ロールバック手順
1. **Stage 1ロールバック**: domain/types.ts と CutAggregate.ts を元に戻す
2. **Stage 2ロールバック**: ReadModel関連ファイルを元に戻す  
3. **Stage 3ロールバック**: Query・Coordinator関連ファイルを元に戻す

各Stageは独立しているため、問題が発生した場合は該当Stageのみロールバック可能。

## リスク分析と対策

### 高リスク項目
1. **TypeScriptコンパイルエラー**
   - **リスク**: 型変更による大量のコンパイルエラー
   - **対策**: 段階的修正、一時的な型キャスト使用
   - **検証**: 各Stage完了時にコンパイル確認

2. **実行時型不整合**
   - **リスク**: boolean/string混在による予期しない動作
   - **対策**: safeIsDeleted()ヘルパー関数の使用
   - **検証**: 削除機能の手動テスト実行

3. **データ不整合**
   - **リスク**: 既存データのisDeletedフィールドが文字列のまま
   - **対策**: createCutReadModel()での型変換処理維持
   - **検証**: リロード後の削除データ確認

### 中リスク項目
1. **UIの一時的な不具合**
   - **リスク**: 削除状態の表示が一時的におかしくなる
   - **対策**: Stage完了時の動作確認
   - **検証**: 削除→リロード→非表示の確認

## 成功判定基準

### Stage 1完了基準
- [ ] TypeScriptコンパイル成功
- [ ] CutAggregate.getData()がboolean返却
- [ ] 削除機能の基本動作確認

### Stage 2完了基準  
- [ ] ReadModel作成でboolean型使用
- [ ] ReadModelStore比較処理がboolean
- [ ] 削除フラグ更新の動作確認

### Stage 3完了基準
- [ ] Query層でboolean比較
- [ ] Coordinator層でboolean比較
- [ ] 全機能の動作確認

### 最終完了基準
- [ ] TypeScript型エラー0件
- [ ] 削除機能完全動作
- [ ] 既存機能への影響なし
- [ ] パフォーマンス劣化なし

## 次ステップ

本移行戦略に基づき、Phase 1 Week 1 Day 3-4から実装開始する。