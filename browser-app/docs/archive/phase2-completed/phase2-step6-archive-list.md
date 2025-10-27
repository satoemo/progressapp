# Phase 2 Step 6: アーカイブファイルリスト

実施日: 2025-09-01

## アーカイブ対象ファイル（33ファイル）

### 1. Command関連（15ファイル）
```
src/application/commands/Command.ts
src/application/commands/CommandHandler.ts
src/application/commands/CreateCutCommand.ts
src/application/commands/UpdateBasicInfoCommand.ts
src/application/commands/UpdateCellMemoCommand.ts
src/application/commands/UpdateCellMemoCommandHandler.ts
src/application/commands/UpdateCostCommand.ts
src/application/commands/UpdateKenyoCommand.ts
src/application/commands/UpdateProgressCommand.ts
src/application/commands/handlers/CreateCutCommandHandler.ts
src/application/commands/handlers/UpdateBasicInfoCommandHandler.ts
src/application/commands/handlers/UpdateCostCommandHandler.ts
src/application/commands/handlers/UpdateProgressCommandHandler.ts
src/application/commands/handlers/UpdateKenyoCommandHandler.ts
src/application/commands/handlers/DeleteCutCommandHandler.ts
```

### 2. Query関連（9ファイル）
```
src/application/queries/Query.ts
src/application/queries/QueryHandler.ts
src/application/queries/GetAllCutsQuery.ts
src/application/queries/GetCutByIdQuery.ts
src/application/queries/GetCellMemoQuery.ts
src/application/queries/GetCellMemoQueryHandler.ts
src/application/queries/handlers/GetAllCutsQueryHandler.ts
src/application/queries/handlers/GetCutByIdQueryHandler.ts
```

### 3. Aggregate関連（3ファイル）
```
src/domain/aggregates/EventSourcedAggregateRoot.ts
src/domain/aggregates/CutAggregate.ts
src/domain/aggregates/MemoAggregate.ts
```

### 4. EventStore関連（5ファイル）
```
src/infrastructure/IEventStore.ts
src/infrastructure/HybridEventStore.ts
src/infrastructure/InMemoryEventStore.ts
src/infrastructure/KintoneEventStore.ts
src/infrastructure/LocalStorageEventStore.ts
```

### 5. 既にアーカイブ済み（3ファイル）
```
src/archive/phase1-deletion-legacy/commands/DeleteCutCommand.ts
src/archive/phase1-deletion-legacy/commands/handlers/DeleteCutCommandHandler.ts
src/archive/phase1-deletion-legacy/events/CutDeletedEvent.ts
```

## アーカイブ理由
- 新システム（UnifiedCutService、SimplifiedReadModel）への移行完了
- CommandBus/QueryBusは透過的プロキシとして新システムを使用
- 既存UIコンポーネントとの互換性が確保された

## アーカイブ後の動作
- CommandBus → CommandMigrationAdapter → UnifiedCutService
- QueryBus → QueryMigrationAdapter → CutReadService/SimplifiedReadModel
- ReadModelStore → ReadModelMigrationService → SimplifiedReadModel

## 注意事項
- CommandBus.tsとQueryBus.tsは残す（プロキシとして動作）
- ReadModelStore.tsも残す（互換性レイヤーとして必要）
- ServiceContainerとApplicationFacadeは更新済みで残す