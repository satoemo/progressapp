# アーキテクチャ簡素化提案書 - 2025-08-27

## エグゼクティブサマリー

v10.3.3のアーキテクチャ分析を実施した結果、**プロジェクト規模に対して過度に複雑なアーキテクチャ**が採用されていることが判明しました。この複雑性が開発速度の低下、バグの頻発、保守コストの増大を引き起こしています。

### 主要な問題
1. **規模との不整合**: 約22,000行のコードに対して、エンタープライズ級の複雑なアーキテクチャを採用
2. **デバッグコスト**: 単純なバグ修正に数時間から数日を要する
3. **学習コスト**: 新規開発者の参入障壁が非常に高い

## 現状分析

### プロジェクト規模
- **総コード行数**: 約21,880行
- **TypeScriptファイル数**: 130ファイル
- **主要機能**: アニメーション進捗管理（CRUD操作中心）
- **外部依存**: 最小限（PDFライブラリのみ）

### 現在のアーキテクチャ

#### 採用パターン
1. **Event Sourcing + CQRS**
2. **Domain-Driven Design (DDD)**
3. **Repository Pattern**
4. **Command/Query分離**
5. **ReadModel/WriteModel分離**
6. **Aggregate Root**

#### データフローの複雑性
```
UI → Command → CommandBus → CommandHandler → Aggregate 
→ Event → EventDispatcher → UnifiedEventCoordinator 
→ ReadModelUpdateService → ReadModelStore → Query 
→ QueryBus → QueryHandler → UI
```

**問題点**: 単純な削除操作が10以上のコンポーネントを経由

### 具体的な問題事例

#### 1. 論理削除バグ（bug-analysis-2025-08.md）
- **症状**: 削除後リロードでデータ復活
- **原因究明時間**: 数時間
- **根本原因**: 
  - KintoneEventStoreでの削除状態の二重管理
  - ReadModelとEventの同期不整合
- **修正箇所**: 複数のコンポーネントに分散

#### 2. 責任の分散
```typescript
// 削除処理が関与するコンポーネント（現在）
1. DeleteCutCommand
2. DeleteCutCommandHandler  
3. CutAggregate
4. CutDeletedEvent
5. EventDispatcher
6. UnifiedEventCoordinator
7. ReadModelUpdateService
8. ReadModelStore
9. GetAllCutsQueryHandler
10. BaseProgressTable
```

## 規模に対する過剰性の評価

### 現在のアーキテクチャが適している規模
- **コード規模**: 10万行以上
- **チーム規模**: 10人以上の開発チーム
- **要件**: 
  - 複数の境界づけられたコンテキスト
  - 複雑なビジネスルール
  - イベント履歴の完全な監査要件
  - マイクロサービス間連携

### 本プロジェクトの実態
- **コード規模**: 2万行程度
- **チーム規模**: 1-2人
- **要件**: 
  - 単一のコンテキスト（進捗管理）
  - シンプルなCRUD操作中心
  - 基本的な履歴管理

### ギャップ分析
**結論**: 現在のアーキテクチャは**プロジェクト規模の5倍以上の複雑性**を持っている

## 改善提案

### Phase 1: 即座に実施可能な簡素化（1-2週間）

#### 1. Event Sourcing の簡略化
```typescript
// Before: Event Sourcing + CQRS
Command → Aggregate → Event → EventStore → ReadModel → Query

// After: シンプルなService層
UI → Service → Repository → UI
```

#### 2. 削除処理の一元化
```typescript
// 新しい削除サービス
class CutDeletionService {
  async delete(cutId: string): Promise<void> {
    // 1. バリデーション
    const cut = await this.repository.findById(cutId);
    if (!cut || cut.isDeleted) throw new Error('Cannot delete');
    
    // 2. 削除実行
    cut.isDeleted = true;
    await this.repository.save(cut);
    
    // 3. UI更新通知
    this.notificationService.notify('cutDeleted', cutId);
  }
}
```

### Phase 2: 中期的なリファクタリング（1-2ヶ月）

#### 1. レイヤー削減
```
現在: 6層
UI → Application → Domain → Infrastructure → External → UI

提案: 3層  
UI → Service → Data
```

#### 2. ファイル構造の簡素化
```
src/
  components/    # UIコンポーネント
  services/      # ビジネスロジック
  data/          # データアクセス
  utils/         # ユーティリティ
  types/         # 型定義
```

### Phase 3: 長期的な最適化（3-6ヶ月）

#### 1. 状態管理の簡素化
- 現在: Event Store + ReadModel + Aggregate
- 提案: シンプルなStateストア（Redux風）

#### 2. テスト可能性の向上
- 単体テストの容易化
- E2Eテストの充実

## 期待される効果

### 開発速度の向上
- **バグ修正時間**: 数時間 → 30分以内
- **新機能開発**: 50%高速化
- **デバッグ時間**: 70%削減

### 保守性の向上
- **学習コスト**: 1週間 → 1-2日
- **コード理解**: 直感的で追跡可能
- **ドキュメント需要**: 最小限

### 品質の向上
- **バグ発生率**: 60%削減
- **テストカバレッジ**: 容易に80%以上達成可能
- **リファクタリング**: 安全かつ迅速

## リスクと対策

### リスク
1. **既存機能への影響**: リファクタリング中の不具合
2. **移行期間の複雑性**: 新旧アーキテクチャの共存

### 対策
1. **段階的移行**: 機能単位で徐々に移行
2. **十分なテスト**: 各段階でのregression test
3. **ロールバック計画**: 各フェーズで戻せる設計

## 実装優先順位

### 最優先（今すぐ実施）
1. **削除処理の簡素化**: 最も問題が多い部分から着手
2. **ログ・監視の追加**: 現状把握のため

### 高優先（1ヶ月以内）
1. **Command/Query統合**: 不要な分離を解消
2. **Event Sourcing削減**: 必要最小限に

### 中優先（3ヶ月以内）
1. **ファイル構造再編**: より直感的な構造へ
2. **テスト基盤整備**: 自動テストの充実

## 成功指標

### 短期（1ヶ月）
- バグ修正時間50%削減
- 新規バグ発生率30%削減

### 中期（3ヶ月）
- 開発速度2倍
- コード行数30%削減

### 長期（6ヶ月）
- 保守コスト60%削減
- 開発者満足度向上

## 結論

現在のv10.3.3のアーキテクチャは、プロジェクトの実際の規模と要件に対して**明らかに過剰に複雑**です。この複雑性は、開発効率、品質、保守性すべてに悪影響を与えています。

**推奨事項**:
1. **即座に削除処理の簡素化から着手**
2. **段階的にEvent SourcingとCQRSを簡略化**
3. **最終的にプロジェクト規模に適したシンプルなアーキテクチャへ移行**

このアプローチにより、開発速度の向上、バグの削減、保守性の大幅な改善が期待できます。

## 付録：アーキテクチャ複雑度メトリクス

| メトリクス | 現在 | 理想 | ギャップ |
|---------|-----|-----|---------|
| データフロー経由コンポーネント数 | 10+ | 3-4 | 250%過剰 |
| アーキテクチャレイヤー数 | 6 | 3 | 200%過剰 |
| 削除処理関与ファイル数 | 10 | 2-3 | 400%過剰 |
| 新規開発者学習時間 | 1週間 | 1-2日 | 500%過剰 |
| 平均バグ修正時間 | 数時間 | 30分 | 400%過剰 |