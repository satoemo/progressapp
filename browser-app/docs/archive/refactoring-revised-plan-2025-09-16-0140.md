# リファクタリング改訂計画 2025年9月

## 1. リファクタリングの本来の意図

### 目指すべきゴール
**複雑な6層アーキテクチャから、シンプルな3層アーキテクチャへ**

#### 現在の問題（なぜリファクタリングが必要か）
1. **過度な抽象化**: Event Sourcing, CQRS, Command/Queryパターンによる複雑性
2. **責任の分散**: 1つの操作が10個以上のクラスを経由
3. **保守困難**: どこに何があるか分かりにくい
4. **技術的負債**: 削除済みクラスへの参照、レガシーコメント
5. **パフォーマンス**: 不要な層による処理の遅延

#### 目標とする状態
```
現在: UI → Command → Bus → Handler → Aggregate → Event → Store → ReadModel → Query → UI
目標: UI → Service → DataStore → UI
```

## 2. 現状分析

### 完了したもの（Phase 4）
✅ アーカイブ削除機能の簡素化（Phase 4.1）
✅ ビルドツールの統一（Phase 4.2）
✅ ApplicationService削除（Phase 4.3）
✅ DOM操作の統一（Phase 4.4）

### 未完了または不完全なもの
❌ ServiceContainerの削除（9ファイルで使用中）
❌ 削除機能の専用サービス化（Phase 1）
❌ Command/Query統合（Phase 2）
❌ ファイル構造の再編成（Phase 3）
❌ 削除済みクラスへの参照（17箇所以上）

### 現在の実際のアーキテクチャ
```
UI → ApplicationFacade → ServiceContainer → UnifiedDataStore → Storage
                     ↓
             EventDispatcher → UI更新
```

## 3. 改訂実装計画

### 基本方針
1. **動作を維持**: 現在動作している機能を壊さない
2. **段階的移行**: 小さな変更を積み重ねる
3. **依存関係優先**: 最も多くの箇所に影響する問題から解決
4. **テスト駆動**: 各変更後に必ずテスト

### Phase 0: 技術的負債の解消（必須・最優先）
**期間**: 1-2日
**目的**: 今後のリファクタリングの障害を除去

#### Step 0.1: 削除済みクラスへの参照削除（1時間）
- CutAggregate, MemoAggregate, EventSourcedAggregateRoot等への参照削除
- アーカイブディレクトリへの参照削除
- レガシーコメントの削除

#### Step 0.2: 型定義の整理（1時間）
- CutAggregateData → CutData
- MemoAggregateData → MemoData
- IRepositoryを独立ファイルに移動

#### Step 0.3: 不要なインポートの削除（30分）
- 全ファイルの不要インポートを削除
- 循環参照のチェック

### Phase 1: ServiceContainer統合（優先度：最高）
**期間**: 2-3日
**目的**: アーキテクチャの中核となる依存性注入を簡素化

#### Step 1.1: ApplicationFacadeへの機能統合（2時間）
```typescript
// ApplicationFacadeに以下を統合
- ServiceContainerの全メソッド
- 依存性管理の簡素化
- シングルトン管理
```

#### Step 1.2: 参照の更新（2時間）
- 9ファイルのServiceContainer参照をApplicationFacadeに変更
- service-registry.tsの更新

#### Step 1.3: ServiceContainer削除（30分）
- ServiceContainer.tsの削除
- テストの実行と確認

### Phase 2: サービス層の確立（優先度：高）
**期間**: 3-4日
**目的**: ビジネスロジックを明確なサービス層に集約

#### Step 2.1: CutServiceの作成（2時間）
```typescript
// src/services/CutService.ts
class CutService {
  // CRUD操作の統合
  async create(data: Partial<CutData>): Promise<CutData>
  async findById(id: string): Promise<CutData | null>
  async findAll(filter?: CutFilter): Promise<CutData[]>
  async update(id: string, data: Partial<CutData>): Promise<CutData>
  async delete(id: string): Promise<void>
}
```

#### Step 2.2: 削除サービスの専門化（2時間）
```typescript
// src/services/DeletionService.ts
class DeletionService {
  async softDelete(id: string): Promise<void>
  async hardDelete(id: string): Promise<void>
  async restore(id: string): Promise<void>
  async isDeleted(id: string): Promise<boolean>
}
```

#### Step 2.3: ApplicationFacadeのスリム化（2時間）
- CutServiceとDeletionServiceに責任を委譲
- ApplicationFacadeは調整役に限定

### Phase 3: データ層の簡素化（優先度：中）
**期間**: 2-3日
**目的**: データアクセスを単純化

#### Step 3.1: Repositoryパターンの簡素化（2時間）
```typescript
// src/data/CutRepository.ts
class CutRepository {
  constructor(private store: UnifiedDataStore) {}
  // シンプルなCRUD操作
}
```

#### Step 3.2: ReadModel/WriteModelの統合（2時間）
- UnifiedCutModelに完全統合
- 二重管理の解消

### Phase 4: ファイル構造の段階的再編成（優先度：低）
**期間**: 3-4日
**目的**: 論理的で理解しやすい構造へ

#### Step 4.1: サービス層の移動（1時間）
```
src/application/services/* → src/services/
src/domain/services/* → src/services/
```

#### Step 4.2: データ層の統合（1時間）
```
src/infrastructure/* → src/data/
src/domain/entities/* → src/models/
src/domain/value-objects/* → src/models/
```

#### Step 4.3: UI層の完成（1時間）
```
残りのUI関連ファイルを適切な場所へ移動
```

### Phase 5: 最終クリーンアップ（優先度：低）
**期間**: 1-2日
**目的**: 残った問題の解決

#### Step 5.1: Event系の簡素化（2時間）
- EventDispatcherの役割を明確化
- 不要なイベントの削除

#### Step 5.2: 不要ディレクトリの削除（30分）
- application/, domain/, infrastructure/の削除
- 空ディレクトリの削除

## 4. 実装順序と優先度

### 必須（ブロッカー解消）
1. **Phase 0**: 技術的負債の解消
2. **Phase 1**: ServiceContainer統合

### 重要（アーキテクチャ改善）
3. **Phase 2**: サービス層の確立
4. **Phase 3**: データ層の簡素化

### 望ましい（整理整頓）
5. **Phase 4**: ファイル構造の再編成
6. **Phase 5**: 最終クリーンアップ

## 5. 成功指標

### 定量的指標
- ファイル数: 130 → 90以下
- 依存関係の層: 6層 → 3層
- 1操作の経由クラス数: 10個 → 3個以下

### 定性的指標
- 新規開発者が1時間以内にアーキテクチャを理解できる
- 機能追加が既存コードの1-2箇所の変更で済む
- テストが書きやすい

## 6. リスクと対策

### リスク
1. **既存機能の破壊**: 段階的実装とテストで対策
2. **パフォーマンス劣化**: 各Phase後に計測
3. **開発の停滞**: 小さな単位で並行作業可能に

### 中止条件
- 3回以上同じバグが発生した場合は計画を見直し
- パフォーマンスが20%以上劣化した場合は原因調査

## 7. 次のアクション

### 今すぐ実施（Phase 0）
1. 削除済みクラスへの参照を全て削除
2. 型定義を整理
3. 不要インポートを削除

### その後（Phase 1）
1. ApplicationFacadeにServiceContainerの機能を統合
2. 全参照を更新
3. ServiceContainerを削除

## 8. 備考

### なぜ前回の計画が失敗したか
1. **野心的すぎた**: 一度に多くを変更しようとした
2. **依存関係の見落とし**: ServiceContainerの影響を過小評価
3. **段階的実装の不徹底**: 「動作する」で満足してしまった

### 今回の計画の特徴
1. **現実的**: 小さな変更の積み重ね
2. **優先順位明確**: 最も影響の大きい問題から解決
3. **測定可能**: 各Phaseで成果を確認可能

---

この計画は、現在の状態を受け入れた上で、段階的に理想の状態に近づけることを目指しています。
各Phaseは独立してテスト可能で、必要に応じて順序の変更や中止も可能です。