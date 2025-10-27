# バグ分析レポート 2025-09-09

## バグ概要
**問題**: ダミーデータ生成後、ページリロード時にデータが進捗管理表・担当者別表示から消失する  
**影響範囲**: Phase 3アーキテクチャ全体のデータ永続化機能  
**重要度**: Critical（データ表示の根幹に関わる）  
**解決リクエスト数**: 5回

## 調査経緯

### 1. 初期診断（誤診）
**仮説**: LocalStorageのプレフィックス不整合が原因
- UnifiedDataStore: `unified_store_`プレフィックス使用
- SimpleCutDeletionService: `kintone_cuts_Cut:`プレフィックス使用

**対処**: UnifiedDataStoreに`loadAllCuts()`メソッドを追加し、両プレフィックスからデータを読み込む機能を実装

**結果**: 問題は解決せず

### 2. 詳細ログ分析
**調査内容**: a.log（データ生成後）とb.log（リロード後）の比較分析

**発見事項**:
```
b.log Line 159: Retrieved 50 cuts from Store
b.log Line 170: After sync, UnifiedDataStore has 50 cuts
b.log Line 227: Found 0 cuts from ReadModel
```

### 3. 真の根本原因の特定
**問題**: 二重のReadModel管理構造
1. **UnifiedDataStore内部のreadModels Map**: データ正常（50件）
2. **グローバルSimplifiedReadModelシングルトン**: 空（0件）
3. **UnifiedCutService**: SimplifiedReadModelを参照するため、データが見つからない

## 修正内容

### UnifiedEventCoordinator.ts - syncReadModels()メソッド
```typescript
// SimplifiedReadModelも同期（重要：UnifiedCutServiceが使用）
try {
  const { getSimplifiedReadModel } = await import('@/services/model/SimplifiedReadModel');
  const simplifiedReadModel = getSimplifiedReadModel();
  simplifiedReadModel.clear();
  
  for (const cut of allCuts) {
    const cutData = this.repository ? cut.getData() : cut;
    await this.unifiedStore.save(cutData.id, cutData);
    this.unifiedStore.updateReadModel(cutData.id, cutData);
    
    // SimplifiedReadModelにも同期
    simplifiedReadModel.upsert(cutData);
  }
} catch (error) {
  // フォールバック処理
}
```

## 教訓

### 1. アーキテクチャの複雑性
Phase 3では複数のデータ管理層が存在：
- UnifiedDataStore（新規実装）
- SimplifiedReadModel（既存実装との互換層）
- ServiceLocator経由のStore

これらの同期が不完全だと、データの不整合が発生する。

### 2. デバッグの重要性
- 初期の仮説にとらわれず、実際のログを詳細に分析することが重要
- 複数のデータストアが存在する場合、それぞれの状態を個別に確認する必要がある

### 3. 後方互換性の課題
既存コード（UnifiedCutService）が特定の実装（SimplifiedReadModel）に依存している場合、
新しいアーキテクチャ（UnifiedDataStore）を導入する際は、両方を同期させる必要がある。

## 今後の改善提案

1. **統一的なデータアクセス層の確立**
   - SimplifiedReadModelとUnifiedDataStoreの統合を検討
   - 単一のデータソースを保証する仕組みの導入

2. **自動テストの強化**
   - リロード後のデータ永続性を検証するE2Eテスト
   - 複数のReadModel間の同期を確認するユニットテスト

3. **ログの改善**
   - どのReadModelからデータを読み込んでいるかを明示的にログ出力
   - データの同期状態を可視化するデバッグツールの追加