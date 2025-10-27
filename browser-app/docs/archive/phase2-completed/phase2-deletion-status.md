# Phase 2 削除予定ファイルの現状
実施日: 2025-09-01

## 現在の状況

Phase 2では新しい統合サービスを作成しましたが、旧システムのファイルは**まだ削除されていません**。これは段階的移行のための意図的な判断です。

## 削除予定ファイルの残存状況

### 1. Command/Queryパターン（22ファイル）
**状態**: 🟡 **全て残存中**

#### Command関連（15ファイル）
- `src/application/commands/Command.ts`
- `src/application/commands/CommandBus.ts`
- `src/application/commands/CommandHandler.ts`
- `src/application/commands/CreateCutCommand.ts`
- `src/application/commands/UpdateBasicInfoCommand.ts`
- `src/application/commands/UpdateCellMemoCommand.ts`
- `src/application/commands/UpdateCellMemoCommandHandler.ts`
- `src/application/commands/UpdateCostCommand.ts`
- `src/application/commands/UpdateKenyoCommand.ts`
- `src/application/commands/UpdateProgressCommand.ts`
- `src/application/commands/handlers/CreateCutCommandHandler.ts`
- `src/application/commands/handlers/UpdateBasicInfoCommandHandler.ts`
- `src/application/commands/handlers/UpdateCostCommandHandler.ts`
- `src/application/commands/handlers/UpdateProgressCommandHandler.ts`
- `src/application/commands/handlers/UpdateKenyoCommandHandler.ts`

#### Query関連（9ファイル）
- `src/application/queries/Query.ts`
- `src/application/queries/QueryBus.ts`
- `src/application/queries/QueryHandler.ts`
- `src/application/queries/GetAllCutsQuery.ts`
- `src/application/queries/GetCutByIdQuery.ts`
- `src/application/queries/GetCellMemoQuery.ts`
- `src/application/queries/GetCellMemoQueryHandler.ts`
- `src/application/queries/handlers/GetAllCutsQueryHandler.ts`
- `src/application/queries/handlers/GetCutByIdQueryHandler.ts`

**代替実装**: ✅ 完了
- `src/services/core/CutCreateService.ts`
- `src/services/core/CutReadService.ts`
- `src/services/core/CutUpdateService.ts`

### 2. Aggregateパターン（3ファイル）
**状態**: 🟡 **全て残存中**

- `src/domain/aggregates/EventSourcedAggregateRoot.ts`
- `src/domain/aggregates/CutAggregate.ts`
- `src/domain/aggregates/MemoAggregate.ts`

**代替実装**: ✅ 完了
- `src/services/core/UnifiedCutService.ts`

### 3. EventStore関連（5ファイル）
**状態**: 🟡 **全て残存中**

- `src/infrastructure/IEventStore.ts`
- `src/infrastructure/HybridEventStore.ts`
- `src/infrastructure/InMemoryEventStore.ts`
- `src/infrastructure/KintoneEventStore.ts`
- `src/infrastructure/LocalStorageEventStore.ts`

**代替実装**: ✅ 完了
- `src/infrastructure/SimplifiedStore.ts`
- `src/services/events/SimpleEventLogger.ts`

### 4. 既にアーカイブ済み（3ファイル）
**状態**: ✅ **Phase 1でアーカイブ済み**

- `src/archive/phase1-deletion-legacy/commands/DeleteCutCommand.ts`
- `src/archive/phase1-deletion-legacy/commands/handlers/DeleteCutCommandHandler.ts`
- `src/archive/phase1-deletion-legacy/events/CutDeletedEvent.ts`

## なぜまだ削除していないのか

### 1. 段階的移行戦略
- 新旧システムを並行稼働させる期間が必要
- 既存コードが新システムを使用しているか確認が必要
- ロールバック可能性を確保

### 2. 依存関係の確認
以下のコンポーネントがまだ旧システムを使用している可能性：
- `ApplicationFacade.ts`
- `HandlerRegistry.ts`
- `ServiceContainer.ts`
- UIコンポーネント（ProgressTable等）

### 3. 互換性レイヤーの必要性
Phase 2 Step 4-6で実装予定：
- Step 4: CommandBus/QueryBusの統合（互換性レイヤー）
- Step 5: ReadModel/WriteModel統合
- Step 6: 既存システムとの互換性確保

## 削除のタイミング

### Phase 2完了後（推奨）
1. Step 4-6を完了
2. 互換性レイヤーを実装
3. 全UIコンポーネントの移行を確認
4. テストを実施
5. 旧システムをアーカイブまたは削除

### 即座に削除する場合のリスク
- ❌ UIが動作しなくなる可能性
- ❌ 既存の初期化処理が失敗する可能性
- ❌ ロールバックが困難

## 推奨アクション

1. **Phase 2 Step 4を実施**
   - CommandBus/QueryBusを新サービスへのプロキシに変更
   - 既存コードの動作を維持

2. **依存関係を調査**
   - ApplicationFacadeの使用状況確認
   - UIコンポーネントの依存確認

3. **段階的削除**
   - まず使用されていないファイルをアーカイブ
   - 動作確認後に完全削除

## サマリー

| カテゴリ | ファイル数 | 状態 | 代替実装 |
|---------|-----------|------|----------|
| Command/Query | 22 | 🟡 残存中 | ✅ 完了 |
| Aggregate | 3 | 🟡 残存中 | ✅ 完了 |
| EventStore | 5 | 🟡 残存中 | ✅ 完了 |
| 削除関連（アーカイブ済） | 3 | ✅ アーカイブ済 | ✅ 完了 |
| **合計** | **33ファイル** | - | - |

新システムは完成していますが、安全な移行のため旧システムは保持されています。