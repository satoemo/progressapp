# Phase 0: 技術的負債の解消 - 実装ガイド

## 開始前チェックリスト
- [ ] 現在のビルドが成功することを確認
- [ ] バックアップまたはgitコミット済み
- [ ] テスト環境の準備完了

## Step 0.1: 削除済みクラスへの参照削除

### 対象ファイルと修正内容

#### 1. `/src/domain/events/CutEvents.ts:89`
```typescript
// 削除
// src/archive/phase1-deletion-legacy/events/CutDeletedEvent.ts を参照

// 修正後
// CutDeletedEventは削除済み
```

#### 2. `/src/utils/IdGenerator.ts:12`
```typescript
// 現在
static generateCutAggregateId(cutNumber: number | string): string

// 修正後
static generateCutId(cutNumber: number | string): string
```

#### 3. `/src/application/services/ReadModelUpdateService.ts`
```typescript
// 現在
interface CutAggregateData { ... }
interface MemoAggregateData { ... }

// 修正後
interface CutData { ... }
interface MemoData { ... }
```

#### 4. `/src/models/UnifiedCutModel.ts`
```typescript
// コメントから以下を削除
// * - CutAggregate (Write Model) - Event Sourcingで状態管理
// * 旧: CutAggregate.getCompletionRate()
// * 旧: CutAggregate.getTotalCost()
// * 旧: CutAggregate.updateProgress(), updateCost(), updateBasicInfo()
```

#### 5. `/src/application/UnifiedEventCoordinator.ts`
```typescript
// 現在
interface CutAggregateData { ... }
private repository: ExtendedRepository<CutAggregateData>
let allCuts: CutAggregateData[] = [];

// 修正後
interface CutData { ... }
private repository: ExtendedRepository<CutData>
let allCuts: CutData[] = [];
```

#### 6. `/src/domain/events/DomainEvent.ts:21`
```typescript
// 削除
// eventVersionとaggregateVersionはEventSourcedAggregateRootが設定
```

### レガシーコメントの削除

#### 対象ファイル一覧
1. `/src/main-browser.ts:14,214` - "レガシーサービスは削除済み"
2. `/src/application/ServiceContainer.ts:3,154,201,225,247` - "レガシーサービスは削除済み"
3. `/src/application/ApplicationFacade.ts:25` - "レガシーサービスは削除済み"
4. `/src/application/ServiceContainer.ts:8` - "一時的な型定義（リファクタリング後に整理予定）"
5. `/src/application/ApplicationFacade.ts:27` - "一時的な型定義（リファクタリング後に整理予定）"
6. `/src/infrastructure/UnifiedDataStore.ts:5` - "Event Sourcing削除済み"
7. `/src/models/UnifiedCutModel.ts:108` - "削除済みかどうか"
8. `/src/application/state/UnifiedStateManager.ts:96` - "アーカイブ機能削除済み"

## Step 0.2: 型定義の整理

### 1. IRepositoryを独立ファイルに移動

#### 新規作成: `/src/types/repository.ts`
```typescript
/**
 * リポジトリインターフェース
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Record<string, unknown>): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

#### 更新対象ファイル
1. `/src/application/ServiceContainer.ts` - IRepositoryの定義を削除、importに変更
2. `/src/types/service-registry.ts` - importパスを変更
3. その他IRepositoryを使用しているファイル

### 2. 型名の統一

#### 変更リスト
- `CutAggregateData` → `CutData`
- `MemoAggregateData` → `MemoData`
- `generateCutAggregateId` → `generateCutId`

## Step 0.3: 不要なインポートの削除

### 自動削除スクリプト
```bash
# TypeScriptの未使用インポートを検出
npx tsc --noEmit --listFiles | xargs -I {} npx eslint {} --fix --rule 'no-unused-vars: error'

# または手動で各ファイルをチェック
npm run lint:fix
```

### 手動確認が必要なファイル
- `/src/main-browser.ts`
- `/src/application/ApplicationFacade.ts`
- `/src/application/ServiceContainer.ts`
- `/src/application/UnifiedEventCoordinator.ts`

## テスト手順

### 各Step完了後のテスト
```bash
# ビルドテスト
npm run build:test

# TypeScriptコンパイルチェック
npx tsc --noEmit

# リントチェック
npm run lint
```

### 動作確認項目
1. [ ] ビルドエラーがない
2. [ ] TypeScriptエラーがない
3. [ ] ランタイムエラーがない
4. [ ] 既存機能が正常動作

## 完了条件

### Step 0.1
- [ ] 削除済みクラスへの参照が0件
- [ ] レガシーコメントが0件
- [ ] アーカイブディレクトリへの参照が0件

### Step 0.2
- [ ] IRepositoryが独立ファイルに存在
- [ ] 全ての型名が統一されている
- [ ] importパスが正しい

### Step 0.3
- [ ] 未使用インポートが0件
- [ ] 循環参照がない
- [ ] ビルドが成功

## トラブルシューティング

### ビルドエラーが発生した場合
1. エラーメッセージを確認
2. 型定義の不整合を確認
3. importパスを確認

### 機能が動作しない場合
1. ブラウザコンソールでエラーを確認
2. 変更前のコードと比較
3. 段階的にロールバック

## 次のステップ

Phase 0完了後は、Phase 1（ServiceContainer統合）に進みます。
`/docs/phase1-implementation-guide.md`を参照してください。