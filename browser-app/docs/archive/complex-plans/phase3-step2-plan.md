# Phase 3 Step 2: コードの最適化と簡素化 - 実装計画（修正版）

実施日: 2025-09-02
最終更新: 2025-09-02

## 現在の状況

### 完了済み
- ✅ Phase 2: 新システム（UnifiedCutService、SimplifiedReadModel）構築完了
- ✅ Phase 3 Step 1: 旧システムファイル（31個）のアーカイブ完了
- ✅ テスト環境: webpack設定とグローバル関数公開の整備完了

### 残存する課題
1. CommandBus/QueryBusがMigrationAdapter経由の間接的な呼び出し
2. ApplicationFacadeに不要な初期化処理が残存（HybridEventStoreとの複雑な連携あり）
3. ServiceContainerに旧システムへの参照が残存
4. 複雑な依存関係チェーン

## Phase 3 Step 2 実装計画

### Step 2.1: プロキシファイルの最適化（30分）

#### CommandBusの簡素化
現在：
```
UIコンポーネント → CommandBus → MigrationAdapter → UnifiedCutService
```

目標：
```
UIコンポーネント → CommandBus → UnifiedCutService（直接）
```

実装内容：
1. CommandBus.tsをシンプルなプロキシに変更
2. MigrationAdapter呼び出しを削除
3. ServiceLocatorから直接UnifiedCutServiceを取得
4. コマンドタイプに応じてサービスメソッドを直接呼び出し

具体的な実装：
```typescript
// CommandBus.ts
import { getServiceLocator } from '../../services/ServiceLocator';

async execute(command: Command): Promise<void> {
  const cutService = getServiceLocator().getCutService();
  
  switch(command.commandType) {
    case 'CreateCut':
      return cutService.create(command.data);
    case 'UpdateProgress':
      return cutService.updateProgress(command.id, command.field, command.value);
    // ...他のコマンド
  }
}
```

#### QueryBusの簡素化
同様にQueryBusも直接SimplifiedReadModelを呼び出すように変更

### Step 2.2: ApplicationFacadeの簡素化（30分）⚠️ **慎重に対応**

**注意事項：**
- HybridEventStoreとの複雑な連携がある（行102-129）
- UnifiedStateManager、RealtimeSyncServiceなど多くのサービスに依存
- 段階的な簡素化が必要

削除する要素（段階的に）：
- HandlerRegistryの初期化と参照（既にコメントアウト済み）
- EventCoordinatorの不要な処理（後方互換性を確認後）
- 不要なgetter/setter

保持する要素（当面）：
- HybridEventStore関連の処理（Phase 4で対応）
- 基本的な初期化
- CommandBus/QueryBusの取得
- RealtimeSyncService関連

### Step 2.3: ServiceContainerの最適化（20分）

削除する要素：
- EventSourcedCutRepository
- EventSourcedMemoRepository
- 旧EventStore関連の参照

追加/変更する要素：
- UnifiedCutServiceの直接生成
- SimplifiedReadModelの直接生成
- ServiceLocatorとの統合を検討

具体的な実装：
```typescript
// ServiceContainer.ts
import { getServiceLocator } from '../services/ServiceLocator';

constructor(config: ServiceContainerConfig = {}) {
  // ServiceLocatorを初期化
  const locator = getServiceLocator();
  locator.initializeDefaultServices();
  
  // 既存のコードとの互換性を維持しつつ、ServiceLocatorを活用
  this.commandBus = new CommandBus();
  this.queryBus = new QueryBus();
}
```

### Step 2.4: 不要な依存関係の削除（15分）

削除対象：
- HandlerRegistry.ts
- UnifiedEventCoordinator.ts（使用状況による）
- 旧システムへの参照

### Step 2.5: パフォーマンス最適化（30分）

1. インポートの最適化
   - 動的インポートの削除
   - 循環参照の解消

2. 初期化処理の最適化
   - 遅延初期化の実装
   - 不要な初期化の削除

3. メモリ使用量の削減
   - 不要なキャッシュの削除
   - イベントリスナーの整理

### Step 2.6: パフォーマンステスト（30分）

測定項目：
1. 初期化時間
2. CRUD操作のレスポンス時間
3. メモリ使用量
4. バンドルサイズ

## 実装順序と優先度（修正版）

| ステップ | 内容 | 見積時間 | 優先度 | リスク | 実装順 |
|---------|------|----------|---------|--------|---------|
| 2.1 | プロキシファイルの最適化 | 30分 | 高 | 中 | **1** |
| 2.3 | ServiceContainerの最適化 | 20分 | 高 | 低 | **2** |
| 2.4 | 不要な依存関係の削除 | 15分 | 中 | 低 | **3** |
| 2.2 | ApplicationFacadeの簡素化 | 30分 | 中 | 高 | **4** |
| 2.5 | パフォーマンス最適化 | 30分 | 低 | 低 | 5 |
| 2.6 | パフォーマンステスト | 30分 | 高 | 低 | 6 |

**実装順序の理由：**
1. Step 2.1と2.3を先に実装して基盤を整備
2. Step 2.4で不要な依存関係を削除
3. Step 2.2（ApplicationFacade）は最も複雑なため最後に慎重に対応

## 期待される成果

### コード削減
- 約1,000行のコード削減見込み
- 5-10個のファイル削除

### パフォーマンス向上
- 初期化時間: 30%短縮
- メモリ使用量: 20%削減
- バンドルサイズ: 15%削減

### 保守性向上
- 依存関係の簡素化
- コードの可読性向上
- デバッグの容易化

## リスクと対策（更新版）

### リスク
1. UIコンポーネントが直接CommandBus/QueryBusのAPIに依存
2. ApplicationFacadeのHybridEventStore連携が複雑
3. 既存のテストコードへの影響
4. 本番環境（kintone）での動作への影響

### 対策
1. APIの互換性を維持（CommandBus/QueryBusのインターフェースは変更しない）
2. ApplicationFacadeは段階的に簡素化（Phase 4で完全対応）
3. 各ステップ後に必ずテストを実行
4. ロールバック可能な実装（git commitを細かく作成）
5. ServiceLocatorの初期化を確実に行う

## 成功基準

1. ✅ 全テストが成功すること
2. ✅ UIが正常に動作すること
3. ✅ パフォーマンスが改善または維持されること
4. ✅ コードベースが簡素化されること

## 実装チェックリスト

### Step 2.1実装前
- [ ] ServiceLocatorの初期化を確認
- [ ] UnifiedCutServiceのメソッドシグネチャを確認
- [ ] test-all-phase1.jsのテストが通ることを確認

### Step 2.1実装後
- [ ] CommandBusからMigrationAdapter参照を削除
- [ ] QueryBusからMigrationAdapter参照を削除
- [ ] テスト実行して動作確認

### Step 2.3実装後
- [ ] ServiceContainerからEventSourcedRepository参照を削除
- [ ] ServiceLocatorとの統合を検討
- [ ] テスト実行して動作確認

### Step 2.4実装後
- [ ] HandlerRegistry.tsをアーカイブ
- [ ] 不要なimport文を削除
- [ ] テスト実行して動作確認

### Step 2.2実装後
- [ ] ApplicationFacadeの初期化処理を確認
- [ ] HybridEventStore連携は維持されているか確認
- [ ] 全体テストを実行

## 次のステップ（Phase 4）

Phase 3完了後：
1. HybridEventStoreの簡素化
2. ApplicationFacadeの完全な最適化
3. 状態管理の更なる簡素化
4. TypeScript型定義の最適化
5. ドキュメントの最終整備
6. 本番環境へのデプロイ準備