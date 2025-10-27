# 不要コード分析レポート
作成日: 2025-09-01

## 現状のコードベース統計

### 全体統計
- **総TypeScriptファイル数**: 140ファイル（アーカイブ除く）
- **総コード行数**: 25,844行
- **アーカイブ済み**: 3ファイル（Phase1削除関連）

## Phase2-4で削除/簡素化候補のファイル

### Phase2: CQRSパターン撤廃（推定30ファイル、約3,000行）

#### CommandBus関連（12ファイル）
```
src/application/commands/
├── Command.ts                        # 基底クラス（削除可能）
├── CommandBus.ts                      # コマンドバス（削除可能）
├── CommandHandler.ts                  # 基底ハンドラー（削除可能）
├── CreateCutCommand.ts               # 簡素化可能
├── UpdateBasicInfoCommand.ts         # 簡素化可能
├── UpdateCellMemoCommand.ts          # 簡素化可能
├── UpdateCellMemoCommandHandler.ts   # 簡素化可能
├── UpdateCostCommand.ts              # 簡素化可能
├── UpdateKenyoCommand.ts             # 簡素化可能
├── UpdateProgressCommand.ts          # 簡素化可能
└── handlers/
    ├── CreateCutCommandHandler.ts    # 簡素化可能
    ├── UpdateBasicInfoCommandHandler.ts  # 簡素化可能
    ├── UpdateCostCommandHandler.ts       # 簡素化可能
    ├── UpdateKenyoCommandHandler.ts      # 簡素化可能
    └── UpdateProgressCommandHandler.ts   # 簡素化可能
```

#### QueryBus関連（9ファイル）
```
src/application/queries/
├── Query.ts                      # 基底クラス（削除可能）
├── QueryBus.ts                   # クエリバス（削除可能）
├── QueryHandler.ts               # 基底ハンドラー（削除可能）
├── GetAllCutsQuery.ts           # 簡素化可能
├── GetCellMemoQuery.ts          # 簡素化可能
├── GetCellMemoQueryHandler.ts   # 簡素化可能
├── GetCutByIdQuery.ts           # 簡素化可能
└── handlers/
    ├── GetAllCutsQueryHandler.ts   # 簡素化可能
    └── GetCutByIdQueryHandler.ts   # 簡素化可能
```

#### イベント駆動関連（7ファイル）
```
src/application/
├── EventDispatcher.ts              # 削除可能
├── UnifiedEventCoordinator.ts     # 削除可能
├── HandlerRegistry.ts             # 簡素化可能
└── services/
    ├── ReadModelUpdateService.ts  # 削除可能
    └── RealtimeSyncService.ts     # 簡素化可能
```

### Phase3: ファイル構造再編成（推定15ファイル移動）

#### 過度に分離されたレイヤー
```
現在の構造（複雑）:
src/
├── application/     # 39ファイル
├── domain/          # 20+ファイル
├── infrastructure/  # 18ファイル
├── ui/             # 50+ファイル
├── core/           # 10+ファイル
├── services/       # 削除機能など
└── utils/          # ユーティリティ

目標構造（シンプル）:
src/
├── components/     # UI（30ファイル）
├── services/       # ビジネスロジック（20ファイル）
├── data/          # データアクセス（10ファイル）
├── utils/         # 共通処理（15ファイル）
└── types/         # 型定義（15ファイル）
```

### Phase4: 状態管理簡素化（推定10ファイル、約2,000行）

#### 複雑な状態管理（削除候補）
```
src/application/state/
├── UnifiedStateManager.ts      # 削除可能（複雑すぎる）
├── DebouncedSyncManager.ts    # 削除可能（過度な最適化）
└── StateManagerService.ts      # 削除可能

src/infrastructure/
├── EventSourcedCutRepository.ts  # 簡素化可能
├── EventSourcedMemoRepository.ts # 簡素化可能
├── HybridEventStore.ts          # 削除可能
├── InMemoryEventStore.ts        # 削除可能
├── LocalStorageEventStore.ts    # 簡素化可能
└── ReadModelStore.ts            # 簡素化可能
```

## 削除可能なコードの推定

### カテゴリー別削減可能性

| カテゴリー | 現在のファイル数 | 削減可能 | 削減率 |
|-----------|-----------------|----------|--------|
| CQRS関連 | 約30ファイル | 20ファイル | 67% |
| イベント駆動 | 約15ファイル | 10ファイル | 67% |
| 状態管理 | 約10ファイル | 7ファイル | 70% |
| その他の複雑な抽象化 | 約20ファイル | 10ファイル | 50% |
| **合計** | **約75ファイル** | **約47ファイル** | **63%** |

### コード行数の削減見込み

| Phase | 削減対象 | 推定削減行数 | 削減率 |
|-------|---------|-------------|--------|
| Phase1（完了） | 削除機能 | 約300行 | 1.2% |
| Phase2 | CQRSパターン | 約4,000行 | 15.5% |
| Phase3 | ファイル構造 | 約2,000行 | 7.7% |
| Phase4 | 状態管理 | 約3,000行 | 11.6% |
| **合計** | - | **約9,300行** | **36%** |

## 特に問題のあるコード

### 1. 過度な抽象化
- **CommandBus/QueryBus**: 単純なメソッド呼び出しで十分な箇所
- **EventDispatcher**: 直接的な通知で代替可能
- **UnifiedEventCoordinator**: 責任が不明確で複雑

### 2. 冗長な状態管理
- **3つの真実の源泉**: EventStore、ReadModelStore、UnifiedStateManager
- **同期の複雑性**: DebouncedSyncManagerによる過度な最適化
- **メモリの無駄**: 同じデータを複数箇所で保持

### 3. 不要なインターフェース
- 実装が1つしかないインターフェースが多数
- 将来の拡張を考えすぎた設計

## 即座に削除可能なファイル（低リスク）

1. `.archived`ファイル（既にアーカイブ済み）
   - DeleteCutCommand.ts.archived
   - DeleteCutCommandHandler.ts.archived

2. 未使用のイベントクラス
   - CutDeletedEvent（コメントアウト済み）

3. デバッグ用ファイル（あれば）

## 推奨される削減順序

### 優先度：高
1. **Phase2実施**: CQRSパターンの撤廃（最大の効果）
2. **未使用コードの削除**: .archivedファイル等

### 優先度：中
3. **Phase4実施**: 状態管理の簡素化
4. **Phase3実施**: ファイル構造の再編成

### 優先度：低
5. インターフェースの統合
6. ユーティリティの整理

## リスク評価

### 低リスク（即座に実施可能）
- .archivedファイルの削除
- コメントアウトされたコードの削除
- 未使用のimport文の削除

### 中リスク（段階的に実施）
- CQRSパターンの撤廃
- 状態管理の簡素化

### 高リスク（慎重に実施）
- ファイル構造の大規模再編成
- 基底クラスの削除

## 結論

現在のコードベースには**約36%（9,300行）の削減余地**があります。特にCQRSパターンとイベント駆動アーキテクチャの過度な実装が複雑性の主な原因となっています。

Phase2-4を実施することで：
- **ファイル数**: 140 → 約90ファイル（36%削減）
- **コード行数**: 25,844行 → 約16,500行（36%削減）
- **複雑度**: 大幅に低下
- **保守性**: 大幅に向上

が期待できます。