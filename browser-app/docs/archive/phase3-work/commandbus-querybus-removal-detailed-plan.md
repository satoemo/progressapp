# CommandBus/QueryBus削除 詳細実装計画
作成日: 2025-09-08

## 1. 現状分析

### 1.1 影響範囲
**29ファイル**がCommandBus/QueryBusを使用中

#### コアファイル（優先度高）
- `ApplicationFacade.ts` - メインのファサード
- `ServiceContainer.ts` - サービス管理
- `RealtimeSyncService.ts` - リアルタイム同期
- `UnifiedStateManager.ts` - 状態管理

#### Commandファイル（8個）
```
src/application/commands/
├── CommandBus.ts
├── CreateCutCommand.ts
├── UpdateProgressCommand.ts
├── UpdateCostCommand.ts
├── UpdateBasicInfoCommand.ts
├── UpdateKenyoCommand.ts
├── UpdateCellMemoCommand.ts
└── DeleteCutCommand.ts
```

#### Queryファイル（4個）
```
src/application/queries/
├── QueryBus.ts
├── GetAllCutsQuery.ts
├── GetCutByIdQuery.ts
└── GetCellMemoQuery.ts
```

### 1.2 現在の動作モード
ApplicationFacadeは**hybridモード**で動作中：
- `useCommandBus: true` - 従来のCommandBus使用
- `useCutService: true` - 新サービス層も使用
- 各メソッドで分岐処理が実装済み

### 1.3 新サービス層（実装済み）
```
src/services/core/
├── CutCreateService.ts
├── CutReadService.ts
├── CutUpdateService.ts
└── UnifiedCutService.ts
```

## 2. 削除戦略

### 基本方針
1. **外部インターフェース維持** - ApplicationFacadeの公開APIは変更しない
2. **段階的移行** - 一度に全削除せず、段階的に実施
3. **テスト駆動** - 各段階でテスト実行
4. **ロールバック可能** - 問題発生時に戻せる構造

## 3. 実装ステップ（詳細）

### Phase A: ApplicationFacade切り替え（30分）

#### A-1: migrationMode設定変更
```typescript
// ApplicationFacade.ts
private migrationMode: 'legacy' | 'new' | 'hybrid' = 'new'; // hybridから変更
private useCommandBus: boolean = false; // trueから変更
private useCutService: boolean = true;
```

#### A-2: 各メソッドの簡素化
```typescript
// 例: createCut()メソッド
async createCut(data: Partial<CutData>): Promise<CutData> {
  // 削除: if (this.useCutService) { ... } else { ... }
  // 新サービスのみ使用
  this.incrementServiceCall('createCut');
  const service = ServiceLocator.getInstance().getCutCreateService();
  return await service.create(data as any);
}
```

#### A-3: 対象メソッド一覧
- [ ] createCut()
- [ ] updateCut()
- [ ] updateProgress()
- [ ] updateCost()
- [ ] updateKenyo()
- [ ] updateBasicInfo()
- [ ] updateCellMemo()
- [ ] deleteCut()
- [ ] getAllCuts()
- [ ] getCutById()
- [ ] getCellMemo()

### Phase B: ServiceContainer簡素化（20分）

#### B-1: CommandBus/QueryBus初期化削除
```typescript
// ServiceContainer.ts
// 削除
// private commandBus: CommandBus;
// private queryBus: QueryBus;
// this.commandBus = new CommandBus();
// this.queryBus = new QueryBus();
```

#### B-2: getterメソッド削除
```typescript
// 削除
// getCommandBus(): CommandBus { ... }
// getQueryBus(): QueryBus { ... }
```

### Phase C: 依存関係の解除（30分）

#### C-1: RealtimeSyncService修正
```typescript
// RealtimeSyncService.ts
// コンストラクタから CommandBus, QueryBus パラメータを削除
// 直接ServiceLocatorから必要なサービスを取得
```

#### C-2: UnifiedStateManager修正
```typescript
// UnifiedStateManager.ts
// setupCommandInterceptor()メソッドを削除または空実装に
```

### Phase D: ファイル削除（20分）

#### D-1: Commandファイル削除
```bash
rm -rf src/application/commands/
```

#### D-2: Queryファイル削除
```bash
rm -rf src/application/queries/
```

#### D-3: MigrationAdapter削除
```bash
rm -rf src/services/migration/
```

### Phase E: クリーンアップ（20分）

#### E-1: 不要なインポート削除
- 全ファイルからCommandBus/QueryBus関連のインポートを削除

#### E-2: 不要なコード削除
- migrationMode関連のコード
- useCommandBus/useCutServiceフラグ
- 条件分岐コード

## 4. テスト計画

### 各Phaseでのテスト
```javascript
// test-simple.js で実行
async function testPhaseA() {
  // CRUD操作の確認
  await testBasicFunctions();
  // パフォーマンステスト
  await testPerformance();
}
```

### 統合テスト項目
1. **Create**: カット作成が正常に動作
2. **Read**: データ取得が正常
3. **Update**: 各種更新（進捗、コスト、基本情報）
4. **Delete**: 削除機能
5. **UI更新**: 自動更新機能
6. **パフォーマンス**: 処理速度の維持

## 5. リスク管理

### 潜在的リスク
1. **循環参照**: ServiceLocatorとの依存関係
2. **イベント処理**: CustomEventの発火タイミング
3. **キャッシュ**: ReadModelの同期

### 対策
1. **バックアップ**: 各Phase前にgitコミット
2. **段階的実行**: 一度に全部変更しない
3. **ログ監視**: console.logで動作確認

## 6. タイムライン

```
Phase A: ApplicationFacade切り替え (30分)
  ├── 設定変更 (5分)
  ├── メソッド簡素化 (20分)
  └── テスト (5分)

Phase B: ServiceContainer簡素化 (20分)
  ├── 初期化削除 (10分)
  ├── getter削除 (5分)
  └── テスト (5分)

Phase C: 依存関係解除 (30分)
  ├── RealtimeSyncService (15分)
  ├── UnifiedStateManager (10分)
  └── テスト (5分)

Phase D: ファイル削除 (20分)
  ├── Command削除 (5分)
  ├── Query削除 (5分)
  ├── Migration削除 (5分)
  └── テスト (5分)

Phase E: クリーンアップ (20分)
  ├── インポート削除 (10分)
  ├── 不要コード削除 (5分)
  └── 最終テスト (5分)

合計: 2時間
```

## 7. 成功基準

### 定量的指標
- [ ] ビルドエラー: 0件
- [ ] テスト成功率: 100%
- [ ] 削除ファイル数: 15ファイル以上
- [ ] コード削減: 500行以上

### 定性的指標
- [ ] データフローの簡素化
- [ ] 保守性の向上
- [ ] パフォーマンス維持または向上

## 8. 完了後の構造

```
ApplicationFacade
  ├── 直接呼び出し → ServiceLocator
  │                      ├── CutCreateService
  │                      ├── CutReadService
  │                      ├── CutUpdateService
  │                      └── SimpleCutDeletionService
  └── UI更新 → CustomEvent発火
```

## 9. 実装チェックリスト

### 準備
- [ ] test-simple.jsでCRUD動作確認
- [ ] gitで現在の状態をコミット

### Phase A
- [ ] migrationMode変更
- [ ] useCommandBus変更
- [ ] 各メソッド簡素化
- [ ] テスト実行

### Phase B
- [ ] CommandBus削除
- [ ] QueryBus削除
- [ ] getter削除
- [ ] テスト実行

### Phase C
- [ ] RealtimeSyncService修正
- [ ] UnifiedStateManager修正
- [ ] テスト実行

### Phase D
- [ ] commandsフォルダ削除
- [ ] queriesフォルダ削除
- [ ] migrationフォルダ削除
- [ ] テスト実行

### Phase E
- [ ] インポート削除
- [ ] 不要コード削除
- [ ] 最終テスト
- [ ] ドキュメント更新

## 10. 備考

- 各Phaseは独立して実行可能
- 問題発生時は前のPhaseに戻れる
- テスト環境: `/test/test-api-mock.html?eventStore=mock`
- 動作確認: `testBasicFunctions()`

この計画に従って実装を進めることで、CommandBus/QueryBusを安全に削除できます。