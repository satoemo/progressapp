# Phase 3: アーキテクチャ再編成計画 - 2025年8月31日

## 概要
CQRSパターンの完全実装とファイル構造の最適化により、保守性とスケーラビリティを向上させる。

## 現状の問題点

### 1. CQRSパターンの不完全な実装
- コマンドとクエリの分離が不明確
- ReadModelとWriteModelの境界が曖昧
- イベントハンドリングの一貫性不足

### 2. ファイル構造の問題
- ドメイン層とアプリケーション層の混在
- UIコンポーネントの責任過多
- インフラストラクチャ層の肥大化

### 3. 依存関係の問題
- 循環参照のリスク
- レイヤー間の不適切な依存
- テスタビリティの低下

## 現在のディレクトリ構造

```
/src/
├── application/       # 混在した責任
├── domain/           # 不完全なドメインモデル
├── infrastructure/   # 肥大化
├── ui/              # 責任過多
├── services/        # 曖昧な位置づけ
└── types/           # 散在する型定義
```

## 提案する新ディレクトリ構造

```
/src/
├── core/                    # ドメイン層
│   ├── domain/
│   │   ├── aggregates/     # 集約ルート
│   │   ├── entities/       # エンティティ
│   │   ├── value-objects/  # 値オブジェクト
│   │   ├── events/         # ドメインイベント
│   │   └── services/       # ドメインサービス
│   └── ports/              # ポート（インターフェース）
│       ├── repositories/   # リポジトリインターフェース
│       └── services/       # サービスインターフェース
│
├── application/            # アプリケーション層
│   ├── commands/          # コマンド（Write側）
│   │   ├── handlers/      # コマンドハンドラー
│   │   └── validators/    # コマンドバリデーター
│   ├── queries/           # クエリ（Read側）
│   │   ├── handlers/      # クエリハンドラー
│   │   └── models/        # ReadModel
│   ├── events/            # アプリケーションイベント
│   │   └── handlers/      # イベントハンドラー
│   └── services/          # アプリケーションサービス
│
├── infrastructure/        # インフラストラクチャ層
│   ├── persistence/       # 永続化
│   │   ├── repositories/  # リポジトリ実装
│   │   ├── event-store/   # イベントストア
│   │   └── migrations/    # マイグレーション
│   ├── api/              # 外部API
│   │   ├── kintone/      # Kintone API
│   │   └── mock/         # モックAPI
│   └── services/         # インフラサービス実装
│
├── presentation/         # プレゼンテーション層
│   ├── views/           # ビューコンポーネント
│   │   ├── progress/    # 進捗管理ビュー
│   │   ├── staff/       # スタッフビュー
│   │   └── simulation/  # シミュレーションビュー
│   ├── components/      # 再利用可能コンポーネント
│   │   ├── tables/      # テーブルコンポーネント
│   │   ├── dialogs/     # ダイアログコンポーネント
│   │   └── forms/       # フォームコンポーネント
│   ├── controllers/     # UIコントローラー
│   └── formatters/      # フォーマッター
│
└── shared/             # 共有リソース
    ├── types/          # 型定義
    ├── constants/      # 定数
    ├── utils/          # ユーティリティ
    └── errors/         # エラー定義
```

## 実装計画

### Phase 3-1: コマンド/クエリ分離（3時間）

#### 実装単位1: コマンドバスの実装（1時間）
```typescript
// /src/application/commands/CommandBus.ts
interface CommandBus {
  execute<T>(command: Command): Promise<T>;
  register(handler: CommandHandler): void;
}

// コマンドの例
class CreateCutCommand {
  constructor(
    public readonly cutNumber: number,
    public readonly data: Partial<CutData>
  ) {}
}
```

#### 実装単位2: クエリバスの実装（1時間）
```typescript
// /src/application/queries/QueryBus.ts
interface QueryBus {
  execute<T>(query: Query): Promise<T>;
  register(handler: QueryHandler): void;
}

// クエリの例
class GetCutByIdQuery {
  constructor(public readonly cutId: string) {}
}
```

#### 実装単位3: ReadModel分離（1時間）
```typescript
// /src/application/queries/models/CutReadModel.ts
class CutReadModel {
  constructor(
    public readonly id: string,
    public readonly cutNumber: number,
    public readonly progress: ProgressData,
    public readonly updatedAt: Date
  ) {}
}
```

### Phase 3-2: ドメイン層の純粋化（2時間）

#### 実装単位4: 集約ルートの整理（45分）
- CutAggregateからUI関連ロジックを除去
- ビジネスルールの集約内への集約
- 不変条件の強化

#### 実装単位5: ドメインサービスの抽出（45分）
- 複数集約にまたがるロジックの抽出
- ProgressCalculationService
- KenyoValidationService

#### 実装単位6: 値オブジェクトの強化（30分）
- ProgressStatus値オブジェクト
- CutNumber値オブジェクト
- StaffName値オブジェクト

### Phase 3-3: インフラストラクチャ層の整理（2時間）

#### 実装単位7: リポジトリパターンの完全実装（1時間）
```typescript
// ポート定義
interface CutRepository {
  save(cut: CutAggregate): Promise<void>;
  findById(id: string): Promise<CutAggregate | null>;
  findAll(): Promise<CutAggregate[]>;
  delete(id: string): Promise<void>;
}

// 実装
class EventSourcedCutRepository implements CutRepository {
  // EventStoreを使用した実装
}
```

#### 実装単位8: イベントストアの最適化（1時間）
- イベントストアインターフェースの定義
- スナップショット機能の実装
- イベント投影の最適化

### Phase 3-4: プレゼンテーション層の簡素化（2時間）

#### 実装単位9: ビューとロジックの分離（1時間）
- ProgressTableをView + Controllerに分割
- ビジネスロジックをアプリケーション層へ移動
- プレゼンテーションロジックのみを残す

#### 実装単位10: コンポーネントの再利用性向上（1時間）
- 共通テーブルコンポーネントの抽出
- ダイアログコンポーネントの統一
- フォームコンポーネントの標準化

## 移行戦略

### Step 1: 新構造の並行実装
1. 新しいディレクトリ構造を作成
2. 既存コードを段階的に移行
3. 新旧の並行動作を確保

### Step 2: 段階的切り替え
1. フィーチャーフラグによる切り替え
2. モジュール単位での移行
3. テストの充実

### Step 3: 旧構造の削除
1. 未使用コードの削除
2. import文の整理
3. ドキュメントの更新

## テスト戦略

### 単体テスト
- 各層の独立したテスト
- モックを使用した分離テスト
- カバレッジ目標: 80%

### 統合テスト
- 層間の連携テスト
- イベントフローのテスト
- エンドツーエンドシナリオ

### アーキテクチャテスト
- 依存関係の検証
- レイヤー境界の確認
- 循環参照の検出

## 期待される効果

### 1. 保守性の向上
- 責任の明確化: 各層の役割が明確
- 変更の局所化: 影響範囲の最小化
- テスタビリティ: 95%のコードカバレッジ可能

### 2. スケーラビリティ
- 水平スケーリング: Read/Write分離
- マイクロサービス化: 将来的な分割が容易
- パフォーマンス: クエリ最適化

### 3. 開発効率
- 並行開発: チーム間の依存削減
- 再利用性: コンポーネントの共有
- オンボーディング: 新メンバーの理解促進

## リスクと対策

### リスク1: 大規模リファクタリング
- **対策**: 段階的移行とフィーチャーフラグ

### リスク2: パフォーマンス劣化
- **対策**: ベンチマークテストの実施

### リスク3: 開発期間の長期化
- **対策**: MVPアプローチと優先順位付け

## 成功指標

- コード行数: 20%削減
- ビルド時間: 30%短縮
- テストカバレッジ: 80%以上
- バグ発生率: 50%削減
- 開発速度: 20%向上

## タイムライン

- Phase 3-1: 3時間（CQRS実装）
- Phase 3-2: 2時間（ドメイン層整理）
- Phase 3-3: 2時間（インフラ層整理）
- Phase 3-4: 2時間（プレゼンテーション層）
- テスト・移行: 3時間
- **合計: 12時間**

## 次のステップ

1. アーキテクチャレビューの実施
2. 詳細設計書の作成
3. プロトタイプの実装
4. 段階的移行の開始