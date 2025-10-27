# Phase 1: ServiceContainer統合 詳細実装計画（修正版）

## 実施日時: 2025-09-16

## 目的
ServiceContainerの機能を委譲パターンを用いてApplicationFacadeに統合し、単一責任原則を維持しながら依存性注入（DI）を簡素化する

## 現状分析

### ServiceContainerの主要機能
1. **サービス管理機能**
   - サービスの登録（register）
   - ファクトリ関数の登録（registerFactory）
   - シングルトンサービスの登録（registerSingleton）
   - サービスの取得（get）
   - サービス存在確認（has）

2. **型安全なメソッド**
   - registerTyped, registerFactoryTyped, registerSingletonTyped
   - getTyped（ServiceRegistryに基づく型安全な取得）

3. **便利メソッド**
   - getStore(): UnifiedDataStore取得
   - getRepository(): IRepository<CutData>取得
   - getUnifiedStore(), getEventDispatcher(): 後方互換用

4. **その他機能**
   - 統計情報取得（getStatistics）
   - クリーンアップ（cleanup）
   - StoreRepositoryAdapter（UnifiedDataStoreのアダプタ）

### ServiceContainer使用箇所（5ファイル）
1. `main-browser.ts` - getInstance()で2箇所
2. `ApplicationFacade.ts` - コンストラクタで初期化、各所で利用
3. `UnifiedEventCoordinator.ts` - getInstance()で1箇所
4. `UnifiedStateManager.ts` - getInstance().getUnifiedStore()で1箇所
5. `ReadModelUpdateService.ts` - 動的インポートで1箇所

## 実装計画

### Step 0: 依存関係の再確認（実装単位0）

#### 0.1 実際の使用箇所を再調査
```bash
grep -r "ServiceContainer" src/ --include="*.ts" | grep -v "ServiceContainer.ts"
```

#### 0.2 循環参照のチェック
```bash
npx madge --circular src/
```

#### 0.3 影響範囲の最終確認
- 各ファイルでServiceContainerのどのメソッドを使用しているか記録
- 移行後の互換性確認ポイントを特定

### Step 1: DIContainerクラスの作成と委譲パターンの実装（実装単位1）

#### 1.1 DIContainerクラスの作成
新規ファイル: `src/application/DIContainer.ts`
```typescript
// ServiceContainerの全機能を移植したDIContainer
export class DIContainer {
  private services: Map<string, unknown> = new Map();
  private factories: Map<string, () => unknown> = new Map();
  private singletons: Map<string, unknown> = new Map();
  
  // ServiceContainerの全メソッドを移植
  register<T>(name: string, service: T): void { ... }
  registerFactory<T>(name: string, factory: () => T): void { ... }
  registerSingleton<T>(name: string, factory: () => T): void { ... }
  get<T>(name: string): T { ... }
  // 型安全メソッドも含む
}
```

#### 1.2 ApplicationFacadeへの委譲パターン実装
```typescript
// ApplicationFacade.tsに追加
private diContainer: DIContainer;

constructor(config: ApplicationFacadeConfig = {}) {
  this.diContainer = new DIContainer();
  this.initializeServices();
}

// 委譲メソッド
public getService<T>(name: string): T {
  return this.diContainer.get<T>(name);
}

public registerService<T>(name: string, service: T): void {
  this.diContainer.register(name, service);
}
```

#### 1.3 シングルトン管理とServiceContainer互換性レイヤー
- ApplicationFacadeをシングルトンに変更
- getInstance()メソッドの追加
- resetInstance()メソッドの追加（テスト用）
- 後方互換性のための一時的メソッド追加：
```typescript
// 段階的移行のための互換性レイヤー
public getServiceContainer(): ServiceContainerLike {
  return {
    get: this.getService.bind(this),
    getUnifiedStore: this.getUnifiedStore.bind(this),
    getEventDispatcher: this.getEventDispatcher.bind(this),
    getRepository: this.getRepository.bind(this)
  };
}
```

### Step 2: 依存関係の更新（実装単位2）

#### 2.1 ApplicationFacade内部の参照更新
現在:
```typescript
this.serviceContainer = ServiceContainer.getInstance(config);
this.serviceContainer.getUnifiedStore();
```

変更後:
```typescript
// 直接内部メソッドを呼び出し
this.getUnifiedStore();
```

#### 2.2 外部ファイルの参照更新（5ファイル）

**main-browser.ts**
```typescript
// Before
const container = ServiceContainer.getInstance();
container.getStatistics();

// After
const appFacade = ApplicationFacade.getInstance();
appFacade.getStatistics();
```

**UnifiedEventCoordinator.ts**
```typescript
// Before
const container = ServiceContainer.getInstance();
const store = container.getUnifiedStore();

// After
const appFacade = ApplicationFacade.getInstance();
const store = appFacade.getUnifiedStore();
```

**UnifiedStateManager.ts**
```typescript
// Before
const store = ServiceContainer.getInstance().getUnifiedStore();

// After
const store = ApplicationFacade.getInstance().getUnifiedStore();
```

**ReadModelUpdateService.ts**
```typescript
// Before
const { ServiceContainer } = await import('@/application/ServiceContainer');
const store = ServiceContainer.getInstance().getUnifiedStore();

// After
const { ApplicationFacade } = await import('@/application/ApplicationFacade');
const store = ApplicationFacade.getInstance().getUnifiedStore();
```

### Step 3: StoreRepositoryAdapterの独立ファイル化（実装単位3）【必須】

#### 3.1 StoreRepositoryAdapterを独立ファイルとして作成
新規ファイル: `src/infrastructure/adapters/StoreRepositoryAdapter.ts`
```typescript
import { IRepository } from '@/types/repository';
import { UnifiedDataStore } from '@/infrastructure/UnifiedDataStore';

export class StoreRepositoryAdapter<T extends { id: string }> implements IRepository<T> {
  constructor(private store: UnifiedDataStore) {}
  // 実装...
}
```

#### 3.2 型定義の更新
- ServiceContainerConfigをApplicationFacadeConfigに統合
- types/application.tsの更新

### Step 4: クリーンアップと削除（実装単位4）

#### 4.1 ServiceContainer.tsの削除
- ファイルを削除
- import文の削除

#### 4.2 types/service-registry.tsの確認
- ServiceRegistryインターフェースは維持（型安全性のため）
- 必要に応じてApplicationFacadeから参照

#### 4.3 テストとビルド確認
- npm run build実行
- エラーがないことを確認

## 実装順序と時間配分

1. **Step 0: 依存関係の再確認**（15分）
   - 実際の使用箇所調査
   - 循環参照チェック
   - 影響範囲の最終確認

2. **Step 1: DIContainerクラスの作成と委譲パターン実装**（45分）
   - DIContainer.ts作成
   - ApplicationFacadeへの委譲実装
   - シングルトン化と互換性レイヤー

3. **Step 2: 依存関係の更新**（30分）
   - ApplicationFacade内部の更新
   - 5ファイルの外部参照更新

4. **Step 3: StoreRepositoryAdapterの独立ファイル化**（20分）
   - 独立ファイル作成（必須）
   - import文の更新

5. **Step 4: クリーンアップと削除**（20分）
   - ServiceContainer.ts削除
   - ビルド確認とテスト

**合計予想時間**: 約2時間10分

## テスト項目

### 機能テスト
1. ✓ アプリケーションの起動が正常に行われること
2. ✓ タブ切り替えが正常に動作すること
3. ✓ データの読み込み・保存が正常に動作すること
4. ✓ イベント処理が正常に動作すること

### 技術テスト
1. ✓ ビルドエラーがないこと
2. ✓ TypeScriptコンパイルエラーがないこと（既存エラー以外）
3. ✓ 循環参照が発生していないこと
4. ✓ シングルトンパターンが正しく機能すること

## リスクと対策

### リスク1: 単一責任原則の違反
- **対策**: 委譲パターンを使用し、DIContainer機能を分離

### リスク2: ApplicationFacadeの肥大化
- **対策**: DIContainerを別クラス、StoreRepositoryAdapterを独立ファイル化

### リスク3: 型安全性の喪失
- **対策**: ServiceRegistryインターフェースを維持し、DIContainer内で型安全なメソッドを提供

### リスク4: 後方互換性の問題
- **対策**: getServiceContainer()互換性レイヤーを提供し、段階的な移行を可能にする

## 成功基準

1. **コード整理**: ServiceContainer.ts（286行）→ DIContainer.ts（約200行）+ StoreRepositoryAdapter.ts（約30行）
2. **依存関係簡素化**: 5ファイルの依存が明確化
3. **単一責任原則維持**: ApplicationFacadeとDIContainerの責務分離
4. **機能維持**: 全機能が正常に動作すること
5. **ビルド成功**: エラーなくビルドが完了すること

## 実装後の構造

```
Before:
UI → ApplicationFacade → ServiceContainer → UnifiedDataStore
                    ↓           ↓
                EventDispatcher  Services

After:
UI → ApplicationFacade → DIContainer → UnifiedDataStore
            ↓               ↓
    互換性レイヤー    EventDispatcher, Services
    
StoreRepositoryAdapter（独立ファイル）
```

## 注意事項

1. **単一責任原則の維持**: ApplicationFacadeとDIContainerの責務を明確に分離
2. **段階的実装**: 各Stepは独立してテスト可能
3. **ロールバック可能**: 各Step後にgit commitを行う
4. **動作確認優先**: 機能が壊れた場合は即座に修正
5. **型安全性維持**: TypeScriptの型チェックを活用
6. **互換性維持**: getServiceContainer()で段階的移行を支援

## 次のアクション

1. この計画の承認を得る
2. Step 1から順次実装
3. 各Step完了後にテスト実施
4. 全Step完了後に完了報告書作成

---

修正点：
- ServiceContainer使用ファイル数を8から5に修正
- 委譲パターンによるDIContainerクラスの分離
- StoreRepositoryAdapterの独立ファイル化を必須として明記
- Step 0として依存関係の再確認を追加
- ServiceContainer互換性レイヤーの実装を明記

この修正版の計画で進めてよろしいですか？