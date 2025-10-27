# CommandBus/QueryBus削除計画
作成日: 2025-09-08

## 現状分析

### CommandBus/QueryBus使用箇所（27ファイル）
- ApplicationFacade.ts - hybrid/legacyモードで使用
- ServiceContainer.ts - 初期化とgetter
- CommandBus.ts, QueryBus.ts - 本体
- 各種Command/Queryクラス（14ファイル）
- ServiceLocator, MigrationAdapter等

### 現在の移行モード
- `hybrid`: CommandBusとCutServiceの両方を使用（現在）
- `new`: CutServiceのみ使用（目標）
- `legacy`: CommandBusのみ使用（廃止予定）

## 削除手順

### Phase 1: newモードへの移行（実施中）
1. test-migration-mode.jsでnewモードの動作確認
2. ApplicationFacadeのデフォルトモードを'new'に変更
3. 全機能の動作確認

### Phase 2: CommandBus関連の削除
削除対象ファイル:
```
src/application/commands/CommandBus.ts
src/application/commands/CreateCutCommand.ts
src/application/commands/UpdateBasicInfoCommand.ts
src/application/commands/UpdateCostCommand.ts
src/application/commands/UpdateKenyoCommand.ts
src/application/commands/UpdateProgressCommand.ts
src/application/commands/UpdateCellMemoCommand.ts
src/application/commands/DeleteCutCommand.ts
```

### Phase 3: QueryBus関連の削除
削除対象ファイル:
```
src/application/queries/QueryBus.ts
src/application/queries/GetAllCutsQuery.ts
src/application/queries/GetCutByIdQuery.ts
src/application/queries/GetCellMemoQuery.ts
```

### Phase 4: Migration関連の削除
削除対象ファイル:
```
src/services/migration/CommandMigrationAdapter.ts
src/services/migration/QueryMigrationAdapter.ts
```

### Phase 5: ServiceContainer簡素化
- CommandBus/QueryBus関連のプロパティとメソッドを削除
- 初期化処理の簡素化

### Phase 6: ApplicationFacade簡素化
- 移行モード関連のコードを削除
- useCutService/useCommandBusフラグを削除
- 条件分岐を削除しCutService直接使用に統一

## テスト項目
- カット作成/読取/更新/削除
- メモ作成/読取/更新
- UI表示（進捗テーブル、タブ切り替え）
- リロード時のデータ永続性
- パフォーマンス（レスポンス時間）

## 期待される効果
- コードベースの簡素化（約1000行削減）
- 処理経路の単純化
- パフォーマンス向上（中間層削減）
- メンテナンス性向上