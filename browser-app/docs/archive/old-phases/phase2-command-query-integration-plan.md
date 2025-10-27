# Phase 2: Command/Queryパターン統合 - 詳細実装計画

## 概要
Command/Query分離を解消し、Event Sourcing を簡略化。複雑な6層のデータフローを3層に削減。各タスクを独立してテスト可能な最小単位（約30分-1時間）に分解。

## 現状のアーキテクチャ（問題）
```
UI → Command → CommandBus → CommandHandler → Aggregate 
→ Event → EventStore → ReadModel → Query → QueryBus → QueryHandler → UI
```

## 目標のアーキテクチャ（簡素化後）
```
UI → Service → Repository → UI
```

## タスク分解（独立してテスト可能な最小単位）

### ステップ 1: 統合サービスの基盤作成（Week 1 - Day 1）

#### 1.1 統合サービスインターフェース定義（30分）
**ファイル**: `src/services/core/ICutService.ts`
```typescript
interface ICutService {
  // Create
  create(data: CutCreateData): Promise<Cut>;
  // Read
  findById(id: string): Promise<Cut | null>;
  findAll(filter?: CutFilter): Promise<Cut[]>;
  // Update  
  update(id: string, data: Partial<Cut>): Promise<Cut>;
  // Delete
  delete(id: string): Promise<void>;
}
```
**テスト**: `test-service-interface.html`
- インターフェース定義の検証
- 型チェック
- モック実装での動作確認

#### 1.2 データモデル統合（30分）
**ファイル**: `src/models/UnifiedCutModel.ts`
```typescript
// ReadModelとWriteModelを統合
interface UnifiedCut {
  id: string;
  // 基本データ
  cutNumber: string;
  scene: string;
  // 計算フィールド（遅延評価）
  get completionRate(): number;
  get totalCost(): number;
}
```
**テスト**: `test-unified-model.html`
- モデルの生成
- 計算フィールドの動作
- 既存モデルとの互換性

#### 1.3 サービスベースクラス作成（30分）
**ファイル**: `src/services/core/BaseService.ts`
```typescript
abstract class BaseService<T> {
  protected repository: IRepository<T>;
  protected validator: IValidator<T>;
  protected notifier: INotifier;
  
  protected validate(data: T): ValidationResult;
  protected notify(event: string, data: any): void;
}
```
**テスト**: `test-base-service.html`
- 基底クラスの動作
- 継承可能性
- 共通処理の確認

### ステップ 2: CRUD操作の統合（Week 1 - Day 2）

#### 2.1 Create操作の統合（45分）
**ファイル**: `src/services/core/CutCreateService.ts`
```typescript
class CutCreateService {
  async create(data: CutCreateData): Promise<Cut> {
    // 1. バリデーション（Command相当）
    // 2. データ生成
    // 3. Repository保存
    // 4. 結果返却（Query相当）
  }
}
```
**テスト**: `test-create-service.html`
- 新規作成フロー
- バリデーション動作
- IDの自動生成

#### 2.2 Read操作の統合（30分）
**ファイル**: `src/services/core/CutReadService.ts`
```typescript
class CutReadService {
  async findById(id: string): Promise<Cut | null>;
  async findAll(filter?: CutFilter): Promise<Cut[]>;
  async count(filter?: CutFilter): Promise<number>;
}
```
**テスト**: `test-read-service.html`
- 単一取得
- 一覧取得
- フィルタリング動作

#### 2.3 Update操作の統合（45分）
**ファイル**: `src/services/core/CutUpdateService.ts`
```typescript
class CutUpdateService {
  async update(id: string, changes: Partial<Cut>): Promise<Cut> {
    // 1. 既存データ取得
    // 2. 変更検証
    // 3. マージ処理
    // 4. 保存と返却
  }
}
```
**テスト**: `test-update-service.html`
- 部分更新
- 全体更新
- 楽観的ロック

### ステップ 3: Event Sourcingの簡略化（Week 1 - Day 3）

#### 3.1 イベント記録の簡素化（30分）
**ファイル**: `src/services/events/SimpleEventLogger.ts`
```typescript
class SimpleEventLogger {
  log(action: string, entityId: string, data: any): void;
  getHistory(entityId: string): EventLog[];
  // Event Sourcingの複雑性を削除
}
```
**テスト**: `test-simple-logger.html`
- イベント記録
- 履歴取得
- パフォーマンス測定

#### 3.2 Aggregateパターンの削除（45分）
**ファイル**: 既存AggregateをServiceに統合
```typescript
// Before: CutAggregate → CutEvents → EventStore
// After: CutService → SimpleEventLogger
class CutService {
  private logger: SimpleEventLogger;
  
  async update(id: string, data: any): Promise<Cut> {
    const result = await this.repository.update(id, data);
    this.logger.log('updated', id, data);
    return result;
  }
}
```
**テスト**: `test-no-aggregate.html`
- 直接的な更新
- イベント記録の簡素化
- 既存機能の維持

#### 3.3 EventStoreの軽量化（45分）
**ファイル**: `src/infrastructure/SimplifiedStore.ts`
```typescript
class SimplifiedStore {
  // 複雑なEvent Sourcingを削除
  async save(entity: any): Promise<void>;
  async load(id: string): Promise<any>;
  // スナップショットのみ保存
}
```
**テスト**: `test-simplified-store.html`
- データ保存
- データ読込
- 移行互換性

### ステップ 4: CommandBus/QueryBusの統合（Week 1 - Day 4）

#### 4.1 直接サービス呼び出しへの変更（30分）
**ファイル**: `src/services/ServiceLocator.ts`
```typescript
class ServiceLocator {
  private services: Map<string, any>;
  
  register(name: string, service: any): void;
  get<T>(name: string): T;
  // CommandBus/QueryBusを置き換え
}
```
**テスト**: `test-service-locator.html`
- サービス登録
- サービス取得
- 依存性注入

#### 4.2 既存Commandの移行（45分）
**ファイル**: 各Commandをサービスメソッドに変換
```typescript
// Before: 
// new UpdateCutCommand(id, data) → CommandBus → Handler
// After:
// cutService.update(id, data) // 直接呼び出し

class MigrationAdapter {
  // 既存Commandを新サービスへ転送
  handleLegacyCommand(command: any): Promise<any>;
}
```
**テスト**: `test-command-migration.html`
- 既存Command動作維持
- 新サービス呼び出し確認
- エラーハンドリング

#### 4.3 既存Queryの移行（45分）
**ファイル**: 各Queryをサービスメソッドに変換
```typescript
// Before:
// new GetCutByIdQuery(id) → QueryBus → Handler
// After:
// cutService.findById(id) // 直接呼び出し

class QueryMigrationAdapter {
  handleLegacyQuery(query: any): Promise<any>;
}
```
**テスト**: `test-query-migration.html`
- 既存Query動作維持
- 新サービス呼び出し確認
- パフォーマンス比較

### ステップ 5: ReadModel/WriteModel統合（Week 2 - Day 1）

#### 5.1 統合モデルへのマッピング（30分）
**ファイル**: `src/services/mappers/ModelMapper.ts`
```typescript
class ModelMapper {
  toUnified(readModel?: any, writeModel?: any): UnifiedCut;
  fromLegacyRead(readModel: CutReadModel): UnifiedCut;
  fromLegacyWrite(aggregate: CutAggregate): UnifiedCut;
}
```
**テスト**: `test-model-mapper.html`
- ReadModelからの変換
- WriteModelからの変換
- 双方向マッピング

#### 5.2 ReadModelStoreの廃止（45分）
**ファイル**: ReadModelStoreを新Repositoryに統合
```typescript
class UnifiedRepository {
  private cache: Map<string, UnifiedCut>;
  
  async findById(id: string): Promise<UnifiedCut | null>;
  async save(model: UnifiedCut): Promise<void>;
  // ReadModelStoreの機能を吸収
}
```
**テスト**: `test-unified-repository.html`
- キャッシュ機能
- 永続化
- 既存データ移行

#### 5.3 計算フィールドの最適化（30分）
**ファイル**: `src/models/ComputedFields.ts`
```typescript
class ComputedFields {
  // 遅延評価で効率化
  static calculateCompletionRate(cut: UnifiedCut): number;
  static calculateTotalCost(cut: UnifiedCut): number;
  // メモ化でパフォーマンス向上
}
```
**テスト**: `test-computed-fields.html`
- 計算精度
- パフォーマンス測定
- キャッシュ動作

### ステップ 6: 既存システムとの互換性確保（Week 2 - Day 2）

#### 6.1 ファサードパターンで既存APIを維持（45分）
**ファイル**: `src/services/LegacyCompatibilityFacade.ts`
```typescript
class LegacyCompatibilityFacade {
  // 既存のCommand/Query APIを維持
  executeCommand(command: any): Promise<any>;
  executeQuery(query: any): Promise<any>;
  // 内部では新サービスを使用
}
```
**テスト**: `test-legacy-facade.html`
- 既存API互換性
- 新旧システム連携
- 段階的移行サポート

#### 6.2 イベントリスナーの移行（30分）
**ファイル**: `src/services/events/EventListenerMigration.ts`
```typescript
class EventListenerMigration {
  // 既存のイベントリスナーを新システムに接続
  migrateListener(oldListener: any): void;
  // イベント形式の変換
}
```
**テスト**: `test-listener-migration.html`
- リスナー移行
- イベント変換
- 通知の維持

#### 6.3 データ移行ツール（45分）
**ファイル**: `src/migration/DataMigrationTool.ts`
```typescript
class DataMigrationTool {
  async migrateFromEventStore(): Promise<MigrationResult>;
  async migrateReadModels(): Promise<MigrationResult>;
  async verify(): Promise<VerificationResult>;
}
```
**テスト**: `test-data-migration.html`
- 既存データ読込
- 新形式への変換
- 整合性チェック

### ステップ 7: パフォーマンス最適化（Week 2 - Day 3）

#### 7.1 バッチ処理の実装（30分）
**ファイル**: `src/services/BatchProcessor.ts`
```typescript
class BatchProcessor {
  async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<any>
  ): Promise<BatchResult>;
}
```
**テスト**: `test-batch-processor.html`
- 並列処理
- エラーハンドリング
- 進捗レポート

#### 7.2 キャッシング戦略（30分）
**ファイル**: `src/services/cache/CacheStrategy.ts`
```typescript
class CacheStrategy {
  private cache: LRUCache;
  
  get(key: string): any;
  set(key: string, value: any, ttl?: number): void;
  invalidate(pattern: string): void;
}
```
**テスト**: `test-cache-strategy.html`
- キャッシュヒット率
- 無効化処理
- メモリ使用量

#### 7.3 遅延読み込みの実装（30分）
**ファイル**: `src/services/LazyLoader.ts`
```typescript
class LazyLoader {
  async loadOnDemand<T>(
    id: string,
    loader: () => Promise<T>
  ): Promise<T>;
}
```
**テスト**: `test-lazy-loader.html`
- 遅延読み込み
- プリロード戦略
- メモリ効率

### ステップ 8: テストとドキュメント（Week 2 - Day 4）

#### 8.1 統合テストスイート（1時間）
**ファイル**: `test-phase2-integration.html`
```html
<!DOCTYPE html>
<html>
<head>
    <title>Phase 2 統合テスト</title>
    <script type="module">
        // 全サービスの統合テスト
        // Command/Query統合の確認
        // パフォーマンス測定
    </script>
</head>
</html>
```

#### 8.2 移行ガイド作成（30分）
**ファイル**: `docs/command-query-migration-guide.md`
- 新旧の対応表
- 段階的移行手順
- トラブルシューティング

#### 8.3 パフォーマンスレポート（30分）
**ファイル**: `docs/phase2-performance-report.md`
- Before/After比較
- ボトルネック分析
- 改善効果の数値化

## 成功基準

### 各ステップの完了条件
- [ ] テストHTMLが全て正常動作
- [ ] エラーなし、警告最小限
- [ ] 既存機能との互換性維持

### Phase 2全体の成功基準
- [ ] コード行数: 20%削減
- [ ] データフロー: 6層→3層
- [ ] API呼び出し時間: 40%短縮
- [ ] メモリ使用量: 30%削減
- [ ] 開発者の理解時間: 50%短縮

## リスク管理

### 段階的移行戦略
1. **並行稼働期間**: 新旧システムを並行運用
2. **フィーチャーフラグ**: 機能単位で切り替え
3. **ロールバック計画**: 各ステップで元に戻せる設計

## スケジュール

| ステップ | 作業時間 | 期間 | 依存関係 |
|---------|---------|------|---------|
| 1.1-1.3 | 1.5時間 | Day 1 | Phase 1完了 |
| 2.1-2.3 | 2時間 | Day 2 | ステップ1完了 |
| 3.1-3.3 | 2時間 | Day 3 | ステップ2完了 |
| 4.1-4.3 | 2時間 | Day 4 | ステップ3完了 |
| 5.1-5.3 | 1.5時間 | Week 2 Day 1 | ステップ4完了 |
| 6.1-6.3 | 2時間 | Day 2 | ステップ5完了 |
| 7.1-7.3 | 1.5時間 | Day 3 | ステップ6完了 |
| 8.1-8.3 | 2時間 | Day 4 | ステップ7完了 |

**合計**: 約14.5時間（2週間で分散実施）

## 次のアクション
1. Phase 1完了確認
2. ステップ1.1から順次開始
3. 日次で進捗確認とテスト実施

---

**注意**: 各タスクは独立してテスト可能で、30分-1時間で完了。既存機能を維持しながら段階的に新アーキテクチャへ移行。