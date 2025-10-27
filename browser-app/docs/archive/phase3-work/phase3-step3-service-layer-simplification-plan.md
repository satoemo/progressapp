# Phase 3 Step 3: サービス層簡素化計画

## 現状分析

### ServiceLocatorとServiceContainerの状況
- **統合状況**: 基本的な統合は完了済み
- **ServiceLocator.ts**: 後方互換性のためのエイリアスファイル（31行）
- **ServiceContainer.ts**: DIコンテナの主要実装（すべての機能を持つ）

### 残存する依存関係
1. **UnifiedEventCoordinator.ts**: ServiceLocatorからStoreを取得（6箇所）
2. **ReadModelUpdateService.ts**: ServiceLocatorからCutServiceを取得（4箇所）
3. **main-browser.ts**: window.ServiceLocatorとして公開（後方互換性）

### DIパターンの現状
- **ServiceContainer**: register/get/hasメソッドによるサービス管理
- **ファクトリパターン**: registerFactory()による遅延初期化
- **シングルトンパターン**: registerSingleton()による単一インスタンス管理

## 実装計画

### Phase A: ServiceLocator参照の削除（15分）

#### 1. UnifiedEventCoordinator.tsの更新
```typescript
// 変更前
const { getServiceLocator } = await import('@/services/ServiceLocator');
const locator = getServiceLocator();

// 変更後
const container = ServiceContainer.getInstance();
```

#### 2. ReadModelUpdateService.tsの更新
```typescript
// 変更前
const { getServiceLocator } = await import('@/services/ServiceLocator');
const cutService = getServiceLocator().getCutService();

// 変更後
const container = ServiceContainer.getInstance();
const cutService = container.getCutService();
```

### Phase B: ServiceLocatorファイルの削除（5分）
1. `/src/services/ServiceLocator.ts`を削除
2. main-browser.tsから後方互換性コードを削除

### Phase C: DIパターンの改善（20分）

#### 1. サービス登録の型安全性向上
```typescript
// 現在
register<T>(name: string, service: T): void

// 改善後
register<K extends keyof ServiceRegistry>(
  name: K, 
  service: ServiceRegistry[K]
): void
```

#### 2. サービス取得の型推論改善
```typescript
// サービスレジストリインターフェース
interface ServiceRegistry {
  Store: UnifiedDataStore;
  CutService: UnifiedCutService;
  EventLogger: SimpleEventLogger;
  EventDispatcher: EventDispatcher;
}

// 型安全なget()メソッド
get<K extends keyof ServiceRegistry>(name: K): ServiceRegistry[K]
```

#### 3. 依存性注入の明示化
```typescript
// 現在：サービス内でServiceContainerを直接参照
// 改善後：コンストラクタインジェクション
class SomeService {
  constructor(
    private store: UnifiedDataStore,
    private cutService: UnifiedCutService
  ) {}
}
```

### Phase D: 循環依存の解消（10分）

#### 現在の循環依存
- UnifiedDataStore ← ServiceContainer ← UnifiedEventCoordinator ← UnifiedDataStore

#### 解決策
1. 遅延初期化パターンの適用
2. インターフェースによる依存性の逆転

## 実装順序

### 今回のリクエストで実施（50分）
1. **Phase A**: ServiceLocator参照の削除（15分）
   - UnifiedEventCoordinator.ts修正
   - ReadModelUpdateService.ts修正
2. **Phase B**: ServiceLocatorファイル削除（5分）
3. **Phase C**: DIパターン改善（20分）
   - ServiceRegistry型定義追加
   - 型安全なメソッド実装
4. **Phase D**: 循環依存解消（10分）

## リスク管理

### リスク
1. **動作互換性**: ServiceLocator削除による既存コードへの影響
2. **型エラー**: DIパターン変更による型の不整合
3. **初期化順序**: 循環依存解消時の初期化順序の変更

### 対策
1. 段階的な移行（各フェーズごとにテスト）
2. TypeScriptコンパイラによる型チェック
3. 遅延初期化による初期化順序の制御

## 期待される効果

### コード削減
- **削除ファイル**: ServiceLocator.ts（31行）
- **削除コード**: 約50行（重複コード含む）

### 保守性向上
- **型安全性**: サービス取得時の型推論改善
- **依存関係**: 明示的な依存性注入
- **単一責任**: ServiceContainerへの責務集約

### パフォーマンス
- **遅延初期化**: 必要なタイミングでのサービス生成
- **キャッシュ**: シングルトンパターンによるインスタンス再利用

## チェックリスト

### 実装前
- [ ] 現在のビルドが成功することを確認
- [ ] test-api-mock.htmlが正常動作することを確認

### Phase A完了時
- [ ] UnifiedEventCoordinator.tsが更新されている
- [ ] ReadModelUpdateService.tsが更新されている
- [ ] ServiceLocatorへの参照が0件

### Phase B完了時
- [ ] ServiceLocator.tsが削除されている
- [ ] main-browser.tsから後方互換性コードが削除されている

### Phase C完了時
- [ ] ServiceRegistryインターフェースが定義されている
- [ ] 型安全なget/registerメソッドが実装されている

### Phase D完了時
- [ ] 循環依存が解消されている
- [ ] 初期化順序が正しい

### 実装後
- [ ] test-api-mock.htmlで全機能が正常動作
- [ ] TypeScriptビルドエラーなし
- [ ] コンソールエラーなし

## 成功指標

### 短期目標（今回）
- [ ] ServiceLocator完全削除
- [ ] DIパターンの型安全性向上
- [ ] 循環依存の解消

### 長期目標
- [ ] すべてのサービスがDIコンテナ経由で管理
- [ ] 依存関係の可視化
- [ ] テスタビリティの向上（モック注入が容易）