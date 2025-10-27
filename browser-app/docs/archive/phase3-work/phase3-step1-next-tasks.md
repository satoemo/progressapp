# Phase 3 Step 1 次のタスク（Day 2）

## 現在の状況
- ✅ UnifiedDataStore実装完了
- ✅ LocalStorageAdapter統一完了
- ✅ データ永続化バグ修正完了（SimplifiedReadModel同期追加）

## 次のタスク詳細

### タスク1: 依存関係の調査と整理（推奨）

#### 1.1 ReadModelStore使用箇所の確認
現在58ファイルで参照されているが、実際の使用箇所を特定：
- ServiceContainer.ts
- ApplicationFacade.ts
- 各UIコンポーネント（StaffView.ts、SimulationView.ts等）

#### 1.2 SimplifiedReadModel使用箇所の確認
- UnifiedCutService（主要な使用箇所）
- UnifiedEventCoordinator（同期処理で使用）

### タスク2: 段階的な統合（推奨アプローチ）

#### Phase A: ReadModelStore → UnifiedDataStore移行
1. ReadModelStoreのインターフェースをUnifiedDataStoreに実装
2. ServiceContainerでReadModelStoreの代わりにUnifiedDataStoreを使用
3. 動作確認

#### Phase B: SimplifiedReadModel → UnifiedDataStore統合
1. SimplifiedReadModelのメソッドをUnifiedDataStoreに追加
2. UnifiedCutServiceをUnifiedDataStore直接使用に変更
3. UnifiedEventCoordinatorの同期処理を簡素化

#### Phase C: 古いファイルの削除
1. ReadModelStore.ts削除
2. SimplifiedStore.ts削除（既に使用されていない場合）
3. 不要な依存関係の削除

### タスク3: テスト実施
1. 単体テスト: データの読み書きが正常に動作
2. 統合テスト: リロード後のデータ永続性
3. パフォーマンステスト: 大量データでの動作確認

## 実装順序（推奨）

1. **依存関係の詳細調査**（30分）
   - grep/globで実際の使用箇所を特定
   - 影響範囲の評価

2. **移行計画の詳細化**（30分）
   - 具体的な変更箇所のリストアップ
   - リスク評価

3. **段階的実装**（3-4時間）
   - Phase A: ReadModelStore移行
   - Phase B: SimplifiedReadModel統合
   - Phase C: クリーンアップ

4. **テストと検証**（1時間）
   - 機能テスト
   - パフォーマンス確認

## 注意事項

### リスク管理
- **データ損失リスク**: 移行前にバックアップを作成
- **互換性リスク**: 段階的移行で既存機能を維持
- **パフォーマンスリスク**: 各段階でパフォーマンステスト実施

### 成功指標
- [ ] すべての既存テストがパス
- [ ] リロード後のデータ永続性が維持
- [ ] パフォーマンスが劣化しない
- [ ] コード行数が削減される

## 代替案

もし統合が複雑すぎる場合：
1. **現状維持案**: UnifiedDataStoreとSimplifiedReadModelの共存を続ける
2. **ファサード案**: 統一インターフェースを提供するファサードを作成
3. **段階的廃止案**: 新機能はUnifiedDataStoreのみ使用し、既存機能は徐々に移行