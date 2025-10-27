# Phase 5: 不要ファイルのarchive移動計画

作成日: 2025年9月14日
目的: レガシーコードと未使用ファイルの整理

## 移動対象ファイル

### 1. レガシーサービスファイル（services/core）
これらは旧CQRSパターンの残骸で、現在は使用されていません：

```
src/services/core/BaseService.ts         → archive/phase3-legacy/services/core/
src/services/core/ICutService.ts         → archive/phase3-legacy/services/core/
src/services/core/CutCreateService.ts    → archive/phase3-legacy/services/core/
src/services/core/CutReadService.ts      → archive/phase3-legacy/services/core/
src/services/core/CutUpdateService.ts    → archive/phase3-legacy/services/core/
src/services/core/UnifiedCutService.ts   → archive/phase3-legacy/services/core/
```

### 2. レガシーモデルファイル（services/model）
SimplifiedReadModelはServiceLocatorを参照：

```
src/services/model/SimplifiedReadModel.ts → archive/phase3-legacy/services/model/
```

### 3. レガシー削除サービス（services/simplified）
旧削除処理の簡略化版：

```
src/services/simplified/SimpleCutDeletionService.ts → archive/phase3-legacy/services/simplified/
```

### 4. レガシーイベントロガー（services/events）
CommandBusパターンの残骸：

```
src/services/events/SimpleEventLogger.ts → archive/phase3-legacy/services/events/
```

## 依存関係の確認結果

これらのファイルを参照している箇所：
- ApplicationFacade.ts
- ServiceContainer.ts
- types/services.ts
- types/service-registry.ts
- types/application.ts
- types/index.ts

## 移動手順

1. archiveディレクトリの作成
   - src/archive/phase3-legacy/services/core/
   - src/archive/phase3-legacy/services/model/
   - src/archive/phase3-legacy/services/simplified/
   - src/archive/phase3-legacy/services/events/

2. ファイルの移動

3. import文の修正または削除
   - ApplicationFacade.ts
   - ServiceContainer.ts
   - types/*.ts

4. ビルド確認

## 期待される効果

- コードベースの簡素化
- 混乱の原因となるレガシーコードの排除
- ビルドサイズの削減（約2000行）
- 依存関係の明確化

## リスク

- ApplicationFacadeやServiceContainerが依存している可能性
- 型定義ファイルでの参照が残る可能性

これらは移動後に対処します。