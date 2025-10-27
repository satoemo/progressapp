# シンプル化ロールバック計画
作成日: 2025年9月16日 14:30

## 目的
誤った方向（責務分散・クラス増加）から、正しい方向（統合・シンプル化）へ修正する

## 現状の問題
```
誤った実装：
UI → ApplicationFacade → DIContainer → UnifiedDataStore
                    ↓
            CutOperationsService（+295行）
            （さらに多くのサービスを追加予定だった）

正しい目標：
UI → ApplicationFacade → UnifiedDataStore
    （ServiceContainerの機能を吸収）
```

## ロールバック計画

### Step 1: 追加したファイルの削除
削除対象：
- `/src/application/DIContainer.ts` (247行)
- `/src/infrastructure/adapters/StoreRepositoryAdapter.ts` (107行)
- `/src/application/services/CutOperationsService.ts` (295行)

### Step 2: ServiceContainerの復元と統合

#### 2.1 ServiceContainerの機能をApplicationFacadeに直接実装
```typescript
// ApplicationFacade.tsに以下を追加
private services: Map<string, unknown> = new Map();
private factories: Map<string, () => unknown> = new Map();
private singletons: Map<string, unknown> = new Map();

// サービス管理メソッド（ServiceContainerから移植）
public registerService<T>(name: string, service: T): void
public getService<T>(name: string): T
public registerSingleton<T>(name: string, factory: () => T): void
```

#### 2.2 UnifiedDataStoreの直接管理
```typescript
// ApplicationFacade内で直接管理
private unifiedStore: UnifiedDataStore;

constructor(config?: ApplicationFacadeConfig) {
  // ストアを直接初期化
  const adapter = config?.useLocalStorage !== false 
    ? new LocalStorageAdapter('unified_store_')
    : new MemoryStorageAdapter();
  
  this.unifiedStore = new UnifiedDataStore(adapter, {
    cacheSize: 200,
    enableBackup: true,
    maxBackups: 3,
    enableIntegrityCheck: true
  });
}
```

### Step 3: CUT操作の統合

#### 3.1 ApplicationFacade内で直接実装
```typescript
// CUT操作をApplicationFacade内に統合（シンプルに）
public async createCut(data: Partial<CutData>): Promise<CutData> {
  const newCut: CutData = {
    id: `cut_${Date.now()}`,
    ...this.buildDefaultCutData(data)
  };
  await this.unifiedStore.save(newCut.id, newCut);
  this.unifiedStore.updateReadModel(newCut.id, newCut);
  return newCut;
}

public async updateCut(id: string, data: Partial<CutData>): Promise<void> {
  const existing = await this.unifiedStore.load(id);
  if (!existing) throw new Error(`Cut not found: ${id}`);
  
  const updated = { ...existing, ...data };
  await this.unifiedStore.save(id, updated);
  this.unifiedStore.updateReadModel(id, updated);
}

public async deleteCut(id: string): Promise<void> {
  const cut = await this.unifiedStore.load(id);
  if (!cut) throw new Error(`Cut not found: ${id}`);
  
  const deleted = { ...cut, isDeleted: true };
  await this.unifiedStore.save(id, deleted);
  this.unifiedStore.removeReadModel(id);
}
```

### Step 4: 参照の更新

更新対象（5ファイル）：
1. main-browser.ts
2. UnifiedEventCoordinator.ts
3. UnifiedStateManager.ts
4. ReadModelUpdateService.ts
5. test-api-mock.html

変更内容：
```typescript
// Before: 様々なパターンで散在
ServiceContainer.getInstance()
ApplicationFacade.getInstance()

// After: 統一
ApplicationFacade.getInstance()
```

## 実装手順

### 実装順序（重要）
1. **まずApplicationFacadeにServiceContainer機能を追加**
2. **動作確認**
3. **その後、DIContainer等を削除**

この順序により、常に動作可能な状態を維持します。

## 成功基準

### 定量的基準
- クラス数: 3個削減（DIContainer、StoreRepositoryAdapter、CutOperationsService）
- コード行数: 約650行削減
- ApplicationFacade: 約800行（統合により増加するが、全体では削減）

### 定性的基準
- 3層アーキテクチャの実現（UI → ApplicationFacade → DataStore）
- 依存関係のシンプル化
- 理解しやすいコード構造

## リスクと対策

### リスク1: 機能の欠落
**対策**: 各ステップでテストを実施

### リスク2: ApplicationFacadeの肥大化
**対策**: 800行程度は許容範囲。シンプル化のトレードオフとして受け入れる

## タイムライン
- Step 1-2: 1時間（ServiceContainer機能の統合）
- Step 3: 30分（CUT操作の統合）
- Step 4: 30分（参照更新）
- テスト: 30分
- **合計: 約2.5時間**

---

この計画で進めてよろしいですか？