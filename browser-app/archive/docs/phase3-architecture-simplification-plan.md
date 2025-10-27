# Phase 3: アーキテクチャ簡素化計画

## 実施日時
2025-08-20

## 目的
現在の過度に複雑な6層構造（Event Sourcing + CQRS + DDD）を、実用的でシンプルな3層構造に簡素化する

## 現状分析

### 現在の6層構造
```
src/
├── ui/                 # UI層（プレゼンテーション）
├── application/        # アプリケーション層（ユースケース）
├── domain/            # ドメイン層（ビジネスロジック）
├── infrastructure/    # インフラ層（データアクセス）
├── core/              # コア層（共通機能）
└── services/          # サービス層（ユーティリティ）
```

### 問題点
1. **過度な抽象化**: Event Sourcing, CQRS, DDDパターンの過剰使用
2. **複雑な依存関係**: 6層間の相互依存が複雑
3. **コードの重複**: 似たような責務が複数層に分散
4. **保守性の低下**: 単純な変更でも複数層の修正が必要

## 提案する3層構造

### 新しい3層アーキテクチャ
```
src/
├── ui/           # プレゼンテーション層
├── services/     # ビジネスロジック層
└── data/         # データアクセス層
```

### 各層の責務

#### 1. プレゼンテーション層 (ui/)
- ユーザーインターフェース
- イベントハンドリング
- 表示ロジック
- 既存: ui/ の内容を維持

#### 2. ビジネスロジック層 (services/)
- ビジネスロジック
- データ変換
- バリデーション
- 統合:
  - application/services/
  - domain/services/
  - application/commands/ → services/actions/
  - application/queries/ → services/queries/

#### 3. データアクセス層 (data/)
- データの永続化
- 外部APIとの通信
- キャッシュ管理
- 統合:
  - infrastructure/
  - domain/value-objects/ → data/models/
  - domain/entities/ → data/models/

## 移行計画

### Phase 3.1: 準備（Week 1）
1. 新しいディレクトリ構造の作成
2. 依存関係の分析
3. 移行スクリプトの作成

### Phase 3.2: データ層の統合（Week 2）
```
infrastructure/ + domain/entities/ + domain/value-objects/
→ data/
  ├── models/
  │   ├── CutModel.ts
  │   ├── MemoModel.ts
  │   └── types.ts
  ├── stores/
  │   ├── CutStore.ts
  │   └── MemoStore.ts
  └── api/
      └── KintoneApi.ts
```

### Phase 3.3: ビジネスロジック層の統合（Week 3）
```
application/ + domain/services/ + domain/aggregates/
→ services/
  ├── CutService.ts
  ├── MemoService.ts
  ├── PDFExportService.ts
  └── StateManagerService.ts
```

### Phase 3.4: 不要なコードの削除（Week 4）
- Event Sourcingパターンの削除
- CQRS構造の簡素化
- 過度な抽象化レイヤーの削除

### Phase 3.5: 最適化とテスト（Week 5）
- パフォーマンス最適化
- 統合テスト
- ドキュメント更新

## 削減予定のコード

### 削除対象
1. **Event Sourcing関連**（約1000行）
   - EventSourcedAggregateRoot.ts
   - EventSourcedCutRepository.ts
   - HybridEventStore.ts
   - DomainEvent.ts

2. **CQRS構造**（約800行）
   - CommandBus.ts, QueryBus.ts
   - CommandHandler.ts, QueryHandler.ts
   - 各種Handlerクラス

3. **過度な抽象化**（約500行）
   - IRepository.ts
   - IEventStore.ts
   - その他のインターフェース

### 統合対象
1. **Commands → Actions**
   - CreateCutCommand → createCut()
   - UpdateProgressCommand → updateProgress()
   - DeleteCutCommand → deleteCut()

2. **Queries → 直接メソッド呼び出し**
   - GetAllCutsQuery → getCuts()
   - GetCutByIdQuery → getCutById()

## 期待される効果

### 定量的効果
- **コード量**: 約30%削減（約2300行）
- **ファイル数**: 約40%削減
- **ビルド時間**: 約20%短縮

### 定性的効果
- **可読性向上**: シンプルな構造で理解しやすい
- **保守性向上**: 変更箇所が限定的
- **開発効率向上**: 新機能追加が容易

## リスクと対策

### リスク
1. **破壊的変更**: 既存機能への影響
2. **テスト不足**: 統合後の品質問題
3. **ロールバック困難**: 大規模変更のため

### 対策
1. **段階的移行**: 各Phaseで動作確認
2. **十分なテスト**: 各Phase完了時に統合テスト
3. **バックアップ**: 各Phase開始時にバックアップ作成

## 成功基準
1. すべての既存機能が動作する
2. パフォーマンスが劣化しない
3. コード量が20%以上削減される
4. 新規開発者が1日で構造を理解できる

## タイムライン
- Week 1: Phase 3.1 準備
- Week 2: Phase 3.2 データ層統合
- Week 3: Phase 3.3 ビジネスロジック層統合
- Week 4: Phase 3.4 不要コード削除
- Week 5: Phase 3.5 最適化とテスト

---
作成: 2025-08-20
Phase: 3 計画立案