# アーキテクチャ レビュー：論理削除バグ修正を通して - 2025-08

## 概要

論理削除機能のバグ修正を通して明らかになった、現在のアーキテクチャの問題点と改善案を記録する。このバグは表面的にはシンプルに見えたが、実際にはEvent Sourcing + CQRS + ReadModelという複雑なアーキテクチャ全体にわたる深刻な問題だった。

## バグの複雑さと修正過程

### 症状
- 削除ボタンを押してもUIで即座に消えない
- リロード後に削除されたレコードが復活
- 再削除時に「already deleted」エラー

### 発見された根本原因（2つ）

#### 1. KintoneEventStoreでの二重管理問題
```typescript
// 問題：削除状態が2箇所で管理されていた
- eventsJson: 削除イベント（CutDeleted）
- cutDataJson: 削除されたカットデータも含む
```

#### 2. createCutReadModel関数での優先順位問題
```typescript
// 問題：既存のisDeletedフィールドが引数より優先されていた
const actualIsDeleted = data.isDeleted !== undefined 
  ? data.isDeleted  // ← 既存の'false'が優先
  : (isDeleted ? 'true' : 'false');
```

## 発見された問題点

### 1. アーキテクチャの複雑さ

**問題**:
- Event Sourcing + CQRS + ReadModel + EventDispatcher + UnifiedEventCoordinator
- 6層以上のデータフロー
- 責任の境界が不明確

**影響**:
- デバッグに数時間を要する
- 新機能開発の学習コストが高い
- バグの影響範囲が予測困難

### 2. データフローの追跡困難

**問題**:
- イベント → Aggregate → ReadModel → UI の流れが複雑
- 各層での変換・フィルタリング処理が分散
- データの整合性チェックポイントが不明確

**実例**:
```
DeleteCommand → CutAggregate → CutDeletedEvent → EventDispatcher 
→ UnifiedEventCoordinator → ReadModelUpdateService → ReadModelStore 
→ GetAllCutsQuery → UI
```

### 3. ログ・監査機能の不足

**問題**:
- 本格的なログが各層に存在しない
- データフローの可視化ツールがない
- デバッグ時に手動でログを追加する必要

**今回追加したデバッグログ**:
- EventDispatcher: イベント配信の監視
- UnifiedEventCoordinator: イベント処理の監視
- ReadModelStore: モデル更新の監視
- GetAllCutsQueryHandler: フィルタリングの監視

### 4. 型安全性の問題

**問題**:
- `isDeleted`フィールドがstring型とboolean型で混在
- ReadModelとDomainModelの型変換が複雑
- 実行時エラーのリスク

**実例**:
```typescript
// string型
cut.isDeleted === 'true'
// boolean型  
cut.isDeleted()
```

### 5. テスト不足

**問題**:
- 削除機能の統合テストがない
- イベントフローのテストがない
- ReadModel更新のテストがない

### 6. 責任の分散

**問題**:
- 削除処理が複数のサービスに分散
- どこで何をしているかが不明確
- 単一責任の原則違反

## 改善案

### 1. アーキテクチャの簡略化

#### 現在のアーキテクチャ
```
Command → Aggregate → Event → EventDispatcher → UnifiedEventCoordinator 
→ ReadModelUpdateService → ReadModelStore → Query → UI
```

#### 提案：シンプル化
```
Command → Service → Repository → Query → UI
```

**利点**:
- データフローが追跡しやすい
- デバッグが容易
- 学習コストの削減

### 2. 責任の明確化

#### 削除機能の責任分担（提案）
- **DeletionService**: 削除ロジックの一元管理
- **Repository**: データ永続化のみ
- **Query**: 読み取り専用でフィルタリング

```typescript
class DeletionService {
  async deleteCut(cutId: string): Promise<void> {
    // 1. バリデーション
    // 2. 削除実行
    // 3. ReadModel更新
    // 4. UI通知
  }
}
```

### 3. 監査・ログシステムの導入

#### 提案：構造化ログ
```typescript
interface OperationLog {
  operationId: string;
  operation: string;
  entityId: string;
  timestamp: Date;
  before: any;
  after: any;
  result: 'success' | 'error';
}
```

#### データフロー可視化
- 各操作のトレースID導入
- 操作履歴の可視化ダッシュボード
- パフォーマンス監視

### 4. 型安全性の向上

#### 提案：統一された削除状態管理
```typescript
// Deleted状態を明確な型で管理
type DeletionStatus = 'active' | 'deleted';

interface CutData {
  id: string;
  status: DeletionStatus;
  // その他のフィールド
}
```

### 5. テスト戦略の改善

#### 削除機能テストスイート
```typescript
describe('Cut Deletion', () => {
  it('should immediately remove from UI');
  it('should persist deletion after reload');
  it('should prevent duplicate deletion');
  it('should maintain data consistency');
});
```

#### 統合テスト
- E2Eテストでの削除フロー検証
- データ整合性テスト
- パフォーマンステスト

### 6. 開発者体験の改善

#### デバッグツール
- イベントフローの可視化
- ReadModelの状態インスペクタ
- 操作履歴の検索・フィルタ

#### ドキュメント
- アーキテクチャ図の更新
- データフロー図の作成
- トラブルシューティングガイド

## 短期的対応（実装済み）

### 1. 根本原因の修正
- ✅ KintoneEventStoreでの二重管理問題の解決
- ✅ createCutReadModel関数の優先順位問題の解決

### 2. デバッグログの追加
- ✅ EventDispatcher, UnifiedEventCoordinator
- ✅ ReadModelStore, GetAllCutsQueryHandler
- ✅ BaseProgressTable

## 長期的提案

### 1. アーキテクチャの段階的リファクタリング
- Phase 1: 削除機能のサービス層統合
- Phase 2: イベントソーシングの簡略化検討
- Phase 3: CQRS パターンの見直し

### 2. 監視・ログシステムの構築
- 構造化ログの導入
- 分散トレーシングの実装
- メトリクス収集

### 3. テスト基盤の強化
- 統合テストの充実
- E2Eテストの自動化
- パフォーマンステストの導入

## 教訓

### 1. 複雑さのコスト
複雑なアーキテクチャは機能性を提供するが、デバッグコストと開発速度に大きな影響を与える。

### 2. 可視性の重要性
ログと監視がない複雑システムは、問題発生時のトラブルシューティングが極めて困難。

### 3. 責任の明確化
各コンポーネントの責任が不明確だと、バグの原因特定と修正に時間がかかる。

### 4. 型安全性の価値
実行時の型の不整合は、予期しない動作の原因となる。

## 結論

論理削除バグの修正は成功したが、根本的な問題は複雑なアーキテクチャにある。短期的には現在の構造を維持しつつ、監視とログを強化し、長期的にはよりシンプルで保守しやすいアーキテクチャへの移行を検討すべきである。

特に新機能開発時は、複雑さを追加する前に、既存の問題を解決し、十分なテストとログを整備することが重要である。