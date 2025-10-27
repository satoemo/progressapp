# Phase 4.1-4.3 不整合・不完全部分の報告書

## 調査実施日: 2025-09-15

## 1. 発見された不整合

### 1.1 ServiceContainer.ts の存在（重大な不整合）

**問題**: Phase 3でServiceContainerの削除が計画されていたにも関わらず、まだ存在し広範囲で使用されている

**影響範囲**: 9ファイル
- `/src/application/ServiceContainer.ts` - 本体ファイル
- `/src/types/application.ts`
- `/src/types/service-registry.ts`
- `/src/main-browser.ts`
- `/src/application/state/UnifiedStateManager.ts`
- `/src/application/ApplicationFacade.ts`
- `/src/application/UnifiedEventCoordinator.ts`
- `/src/application/services/ReadModelUpdateService.ts`
- `/src/infrastructure/UnifiedDataStore.ts`

**必要な対応**:
- ServiceContainerの役割をApplicationFacadeに統合
- 依存関係の解決方法を見直し

### 1.2 SimulationView.ts のappService参照（修正済み）

**問題**: ApplicationServiceが削除されたにも関わらず、3箇所でappService参照が残っていた

**対応**: appFacadeへの参照に修正完了

### 1.3 CutEvents.ts のアーカイブディレクトリへのコメント参照

**問題**: 削除されたアーカイブディレクトリへの参照がコメントに残っている

```typescript
// Phase1-Step2.4: CutDeletedEventはアーカイブに移動
// src/archive/phase1-deletion-legacy/events/CutDeletedEvent.ts を参照
```

**対応**: コメントの更新または削除が必要

## 2. 確認済み項目（問題なし）

### 2.1 削除されたクラスへの参照
以下のクラスへの参照は完全に削除されていることを確認:
- CommandBus
- QueryBus
- CommandHandler
- QueryHandler
- HandlerRegistry
- ApplicationService (SimulationView.ts以外)

### 2.2 アーカイブディレクトリからのインポート
srcディレクトリ内でアーカイブディレクトリからのインポートは存在しないことを確認

### 2.3 DOM操作の統一（Phase 4.4）
- 222箇所のDOM操作をDOMBuilderに統一完了
- DocumentFragment用のappendToFragmentメソッドを追加
- 100%の一貫性を達成

## 3. 推奨される対応

### 優先度: 高
1. **ServiceContainerの完全削除**
   - ApplicationFacadeへの統合
   - 依存性注入パターンの簡素化
   - 全9ファイルの修正が必要

### 優先度: 中
2. **コメントのクリーンアップ**
   - CutEvents.tsの古いアーカイブ参照を削除
   - その他の古いコメントの確認と更新

### 優先度: 低
3. **型定義の整理**
   - service-registry.tsの見直し
   - application.tsの型定義の簡素化

## 4. 結論

Phase 4.1-4.3の実装において、主要な機能は正しく動作していますが、ServiceContainerの削除が不完全であることが最大の不整合です。これは計画段階での見落としか、実装時の判断による変更と考えられます。

Phase 5に進む前に、少なくともServiceContainerの問題を解決することを推奨します。