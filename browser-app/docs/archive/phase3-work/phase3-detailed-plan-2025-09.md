# Phase 3 詳細実装計画（2025年9月版）

## 現在のコードベース分析結果

### 発見された問題点
1. **データストアの重複**
   - SimplifiedStore（524行）とReadModelStore（105行）が別々に存在
   - LocalStorageAdapterが2箇所で異なる実装

2. **型定義の分散と不整合**
   - `/src/types/`ディレクトリが存在するが空
   - `/domain/types.ts`に全て集約（168行）
   - any型が主要20箇所で使用されている

3. **サービス層の重複**
   - ServiceLocator（266行）とServiceContainer（68行）が重複した役割
   - DIコンテナが2重実装

4. **パフォーマンスボトルネック**
   - 総ループ処理数: 606箇所（70ファイル中）
   - StaffView.ts（67箇所）、ProgressTable.ts（48箇所）が特に多い
   - LRUキャッシュは実装済みだが使用が限定的

5. **UIコンポーネントの課題**
   - 全てvanilla TypeScript実装（React化未着手）
   - 42ファイルが`ui/`ディレクトリに混在

## Phase 3 実装計画

### Step 1: データストア統合（2日）

#### Day 1: UnifiedDataStore実装
```typescript
// 新規作成: /src/infrastructure/UnifiedDataStore.ts
export class UnifiedDataStore {
  // SimplifiedStoreとReadModelStoreの機能を統合
  // LRUキャッシュを活用
  // 統一されたインターフェース提供
}
```

**作業項目**:
1. UnifiedDataStore.tsの作成
2. SimplifiedStoreの機能移植
3. ReadModelStoreの機能移植
4. 統一LocalStorageAdapterの実装
5. テスト作成

#### Day 2: 既存参照の更新
**変更対象ファイル**（20ファイル）:
- ServiceLocator.ts: UnifiedDataStoreへの切り替え
- ServiceContainer.ts: 同上
- UnifiedStateManager.ts: 同上
- ApplicationService.ts: 同上
- ApplicationFacade.ts: 同上
- BaseProgressTable.ts: 同上
- ProgressTable.ts: 同上
- 他13ファイル

### Step 2: 型定義の整理（1日）

#### Day 3: 型定義の統一
**作業項目**:
1. `/src/types/index.ts`作成（全型定義のエクスポート）
2. `/src/types/cut.ts`作成（CutData関連）
3. `/src/types/services.ts`作成（サービス層インターフェース）
4. `/src/types/ui.ts`作成（UIコンポーネントProps）
5. any型の段階的削除（第1弾: 10箇所）

**any型削除対象**（優先度高）:
- main-browser.ts: windowオブジェクトの型定義
- config/kintone.config.ts: kintoneオブジェクトの型定義
- UnifiedCutModel.ts: フィールド設定の型定義
- DomainEvent.ts: イベントデータの型定義
- FieldFormatter.ts: フィールド値の型定義

### Step 3: サービス層の簡素化（1日）

#### Day 4: ServiceLocatorとServiceContainerの統合
**作業項目**:
1. ServiceContainerの機能をServiceLocatorに統合
2. 重複コードの削除（約100行削減見込み）
3. DIパターンの統一
4. デコレータの整理
5. 依存関係の更新

### Step 4: パフォーマンス最適化（2日）

#### Day 5: 重要コンポーネントの最適化
**最適化対象（優先度順）**:
1. **StaffView.ts**（67ループ → 20以下目標）
   - 仮想スクロール導入
   - メモ化の実装
   
2. **ProgressTable.ts**（48ループ → 15以下目標）
   - レンダリング最適化
   - 差分更新の実装

3. **CutReadService.ts**（46ループ → 10以下目標）
   - バッチ処理の導入
   - クエリ最適化

#### Day 6: キャッシュ戦略の改善
**作業項目**:
1. LRUキャッシュの活用範囲拡大
2. WeakMapキャッシュの導入
3. メモリリークの調査と修正
4. PerformanceMonitorによる測定
5. ベンチマーク実施

### Step 5: UIコンポーネントの整理（2日）

#### Day 7: ディレクトリ構造の整理
**移行計画**:
```
ui/ → components/
├── table/
│   ├── ProgressTable.ts
│   ├── BaseProgressTable.ts
│   └── NormaTable.ts
├── views/
│   ├── StaffView.ts
│   ├── SimulationView.ts
│   └── ScheduleView.ts
├── editors/
│   ├── CellEditor.ts
│   └── CellEditorFactory.ts
├── popups/
│   ├── DropdownPopup.ts
│   └── KenyoMultiSelectPopup.ts
└── common/
    ├── FilterManager.ts
    └── ViewStateManager.ts
```

#### Day 8: 小規模コンポーネントのクリーンアップ
**対象コンポーネント**:
1. SyncIndicator（存在確認必要）
2. DeletionConfirmDialog.ts（新規作成済み）
3. ErrorBoundary（新規追加）

### Step 6: テストとドキュメント（2日）

#### Day 9: テスト基盤の構築
**作業項目**:
1. Jest設定（既存のpackage.jsonに追加）
2. UnifiedDataStoreのテスト
3. 最適化後のパフォーマンステスト
4. 統合テストの更新

#### Day 10: ドキュメント更新
**作業項目**:
1. アーキテクチャ図の更新
2. API仕様書の生成（TypeDoc）
3. 移行ガイドの作成
4. Phase 4の計画策定

## 成功指標

### 定量的指標
| 指標 | 現在値 | 目標値 | 測定方法 |
|------|--------|--------|----------|
| ファイル数 | 91 | 75以下 | `find . -name "*.ts" \| wc -l` |
| any型使用箇所 | 20+ | 10以下 | `grep -r "any" --include="*.ts"` |
| ループ処理数 | 606 | 400以下 | 自動計測スクリプト |
| 初期表示時間（1000件） | 未測定 | 1秒以内 | PerformanceMonitor |
| メモリ使用量 | 未測定 | 100MB以下 | Chrome DevTools |

### 定性的指標
- コードの可読性向上
- 型安全性の向上
- 保守性の改善
- 開発者体験の向上

## リスクと対策

### リスク1: データストア統合による既存機能への影響
**対策**: 
- 段階的移行（まず読み取り専用から）
- 十分なテストカバレッジ
- ロールバック計画の準備

### リスク2: パフォーマンス最適化による副作用
**対策**:
- 各変更前後でベンチマーク測定
- PerformanceMonitorによる継続的監視
- 問題発生時は即座に部分的ロールバック

### リスク3: 型定義変更によるビルドエラー
**対策**:
- 段階的なany型削除
- 型定義の後方互換性維持
- CI/CDでの自動チェック

## 実装順序の根拠

1. **データストア統合を最初に実施**
   - 他の全ての変更の基盤となるため
   - パフォーマンス改善の前提条件

2. **型定義を2番目に実施**
   - 後続の作業で型安全性を確保するため
   - リファクタリング時のエラー検出に必要

3. **サービス層を3番目に実施**
   - データストアと型定義が安定してから
   - UIコンポーネントへの影響を最小限に

4. **パフォーマンス最適化を中盤に実施**
   - 基盤が整ってから測定・改善
   - 効果測定が正確にできる

5. **UIコンポーネント整理を後半に実施**
   - ビジネスロジック層が安定してから
   - ユーザーへの影響を最小限に

6. **テストとドキュメントを最後に実施**
   - 全ての変更が完了してから
   - 最終的な動作確認と記録

## 次のアクション

1. この計画のレビューと承認
2. UnifiedDataStore.tsの実装開始
3. 日次進捗レポートの開始

## 推定工数

- **総工数**: 10日（2週間）
- **1日あたり**: 4-6時間
- **総時間**: 40-60時間

この計画で進めてよろしいですか？