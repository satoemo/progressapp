# Phase 3.1: 依存関係分析と移行マッピング

## 実施日時
2025-08-20

## 新しいディレクトリ構造

```
src/
├── ui/           # プレゼンテーション層（既存のまま）
├── services/     # ビジネスロジック層（新規作成）
│   ├── AppService.ts
│   ├── CutService.ts
│   ├── MemoService.ts
│   └── PDFExportService.ts
└── data/         # データアクセス層（新規作成）
    ├── models/
    │   ├── CutModel.ts
    │   └── MemoModel.ts
    ├── stores/
    │   ├── CutStore.ts
    │   └── MemoStore.ts
    └── api/
        └── KintoneApi.ts
```

## ファイル移行マッピング

### データ層への移行（data/）

#### models/ に移行
- infrastructure/CutReadModel.ts → data/models/CutModel.ts ✅
- infrastructure/MemoReadModel.ts → data/models/MemoModel.ts
- domain/value-objects/CutNumber.ts → data/models/CutModel.ts に統合 ✅
- domain/value-objects/Money.ts → data/models/types.ts
- domain/value-objects/ProgressStatus.ts → data/models/CutModel.ts に統合 ✅
- domain/value-objects/CellMemo.ts → data/models/MemoModel.ts

#### stores/ に移行
- infrastructure/ReadModelStore.ts → data/stores/CutStore.ts ✅
- infrastructure/EventSourcedCutRepository.ts → data/stores/CutStore.ts に統合 ✅
- infrastructure/EventSourcedMemoRepository.ts → data/stores/MemoStore.ts

#### api/ に移行
- infrastructure/api/KintoneApiClient.ts → data/api/KintoneApi.ts
- infrastructure/api/MockKintoneApiClient.ts → data/api/KintoneApi.ts に統合
- infrastructure/api/KintoneJsonMapper.ts → data/api/KintoneApi.ts に統合

### ビジネスロジック層への移行（services/）

#### 直接移行
- application/services/PDFExportService.ts → services/PDFExportService.ts
- application/services/StateManagerService.ts → services/StateManagerService.ts
- domain/services/CutStatusCalculator.ts → services/CutService.ts に統合 ✅
- domain/services/ProgressFieldService.ts → services/CutService.ts に統合

#### 統合して移行
- application/ApplicationService.ts → services/AppService.ts ✅
- application/ApplicationFacade.ts → services/AppService.ts に統合 ✅
- application/commands/* → services/CutService.ts のメソッドに変換 ✅
- application/queries/* → services/CutService.ts のメソッドに変換 ✅

### UI層（そのまま維持）
- ui/* → 変更なし（ただし、importパスの更新が必要）

## 削除対象ファイル

### Event Sourcing関連（完全削除）
- domain/aggregates/EventSourcedAggregateRoot.ts
- domain/events/DomainEvent.ts
- domain/events/CutEvents.ts
- infrastructure/HybridEventStore.ts
- infrastructure/IEventStore.ts
- infrastructure/InMemoryEventStore.ts
- infrastructure/KintoneEventStore.ts
- infrastructure/LocalStorageEventStore.ts

### CQRS構造（完全削除）
- application/commands/Command.ts
- application/commands/CommandBus.ts
- application/commands/CommandHandler.ts
- application/queries/Query.ts
- application/queries/QueryBus.ts
- application/queries/QueryHandler.ts
- application/HandlerRegistry.ts

### 過度な抽象化（完全削除）
- infrastructure/IRepository.ts
- infrastructure/IMemoRepository.ts
- infrastructure/api/IKintoneApiClient.ts

## インポートパスの変更例

### Before
```typescript
import { ApplicationService } from '../application/ApplicationService';
import { CutReadModel } from '../infrastructure/CutReadModel';
import { CreateCutCommand } from '../application/commands/CreateCutCommand';
import { GetAllCutsQuery } from '../application/queries/GetAllCutsQuery';
```

### After
```typescript
import { AppService } from '../services/AppService';
import { CutModel } from '../data/models/CutModel';
// コマンドとクエリは直接メソッド呼び出しに変更
```

## 実装済み

### Phase 3.1で作成済み
1. ✅ data/models/CutModel.ts
2. ✅ data/stores/CutStore.ts
3. ✅ services/CutService.ts
4. ✅ services/AppService.ts

## 次のステップ

### Phase 3.2: データ層の完全統合
1. MemoModel.tsの作成
2. MemoStore.tsの作成
3. KintoneApi.tsの作成
4. 既存ファイルの削除

### Phase 3.3: ビジネスロジック層の完全統合
1. PDFExportServiceの移行
2. StateManagerServiceの移行
3. MemoServiceの作成
4. 既存ファイルの削除

### Phase 3.4: UIレイヤーのインポート更新
1. ProgressTable.tsのインポート更新
2. 各Viewファイルのインポート更新
3. 動作確認

## リスク評価

### 高リスク項目
- ApplicationServiceの変更（多くのUIコンポーネントが依存）
- CutReadModelの型変更（全体に影響）

### 中リスク項目
- Event関連の削除（一部のコンポーネントが依存している可能性）
- Command/Queryパターンの削除

### 低リスク項目
- Value Objectsの統合
- インターフェースの削除

## 対策
1. 既存のApplicationServiceとの互換性レイヤーを実装済み
2. CutReadModelをCutModelのエイリアスとして定義済み
3. 段階的な移行で影響を最小化

---
作成: 2025-08-20
Phase: 3.1 完了