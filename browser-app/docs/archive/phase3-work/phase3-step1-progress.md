# Phase 3 Step 1: データストア統合 - 実装記録

## 実施日: 2025-09-09

## Day 1: UnifiedDataStore実装（完了）

### 実施内容

#### 1. UnifiedDataStore.ts作成（✅完了）
- **ファイル**: `/src/infrastructure/UnifiedDataStore.ts`（749行）
- **統合内容**:
  - SimplifiedStoreの全機能（スナップショット保存、LRUキャッシュ、バックアップ）
  - ReadModelStoreの全機能（ReadModel管理、イベント処理）
  - 統一LocalStorageAdapter実装
  - 統一MemoryStorageAdapter実装

#### 2. 既存参照の更新（✅完了）

| ファイル | 変更内容 |
|---------|----------|
| ServiceLocator.ts | SimplifiedStore → UnifiedDataStore |
| ServiceContainer.ts | ReadModelStore → UnifiedDataStore |
| ApplicationFacade.ts | ReadModelStore → UnifiedDataStore |
| UnifiedEventCoordinator.ts | ReadModelStore → UnifiedDataStore |
| UnifiedStateManager.ts | ReadModelStore → UnifiedDataStore |
| ReadModelUpdateService.ts | ReadModelStore → UnifiedDataStore |
| BaseProgressTable.ts | ReadModelStore → UnifiedDataStore |

### 主な変更点

#### ServiceLocator.ts
```typescript
// 変更前
import { SimplifiedStore, LocalStorageAdapter, MemoryStorageAdapter } from '@/infrastructure/SimplifiedStore';
getStore(): SimplifiedStore<CutData>

// 変更後
import { UnifiedDataStore, LocalStorageAdapter, MemoryStorageAdapter } from '@/infrastructure/UnifiedDataStore';
getStore(): UnifiedDataStore
```

#### ServiceContainer.ts
```typescript
// 変更前
private readModelStore: ReadModelStore;
getReadModelStore(): ReadModelStore

// 変更後
private unifiedStore: UnifiedDataStore;
getReadModelStore(): UnifiedDataStore  // 後方互換性維持
getUnifiedStore(): UnifiedDataStore     // 新メソッド
```

#### ApplicationFacade.ts
```typescript
// 変更前
const readModelStore = this.serviceContainer.getReadModelStore();
const allData = readModelStore.getAll();

// 変更後
const unifiedStore = this.serviceContainer.getUnifiedStore();
const allData = unifiedStore.getAllReadModels();
```

### APIマッピング

| 旧API (SimplifiedStore) | 新API (UnifiedDataStore) |
|------------------------|-------------------------|
| store.save(entity) | store.save(id, entity) |
| store.load(id) | store.load(id) |
| store.delete(id) | store.delete(id) |
| store.loadAll() | store.loadAll() |
| store.exists(id) | load(id) !== null |

| 旧API (ReadModelStore) | 新API (UnifiedDataStore) |
|----------------------|-------------------------|
| store.getAll() | store.getAllReadModels() |
| store.getById(id) | store.getReadModelById(id) |
| store.update(id, data) | store.updateReadModel(id, data) |
| store.remove(id) | store.removeReadModel(id) |
| store.handleCutCreated(event) | store.handleCutCreated(event) |
| store.updateMemoReadModel(memos) | store.updateMemoReadModel(memos) |

### ビルド結果
```
✅ ビルド成功
webpack 5.101.3 compiled successfully in 4594 ms
```

### 削減効果
- **削除予定ファイル**: 2ファイル
  - SimplifiedStore.ts（524行）
  - ReadModelStore.ts（105行）
- **正味追加**: 749行 - 629行 = 120行増加
  - 機能統合による一時的な増加（後続のステップで最適化予定）

### 残作業（Day 2予定）

#### 不要ファイルの削除
- [ ] SimplifiedStore.tsの削除
- [ ] ReadModelStore.tsの削除

#### 追加の参照更新（必要に応じて）
- [ ] StaffView.ts
- [ ] SimulationView.ts
- [ ] NormaTable.ts
- [ ] 他のUI関連ファイル

### 次のステップ
1. SimplifiedStoreとReadModelStoreの削除
2. パフォーマンステストの実施
3. メモリ使用量の測定
4. Phase 3 Step 2（型定義の統一）へ進む

## 成功のポイント
- 後方互換性を維持（既存のメソッド名を保持）
- 段階的な移行（まず参照を更新、次に不要ファイル削除）
- ビルドエラーなし達成
- 統合によりコードの一元管理を実現