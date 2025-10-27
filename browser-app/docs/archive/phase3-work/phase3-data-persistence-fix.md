# Phase 3 データ永続化問題の修正

## 問題の詳細
ダミーデータ生成後、ページをリロードするとデータが進捗管理表や担当者別に表示されない問題が発生

## 根本原因（最終診断）

### 1. 初期の誤診断：プレフィックスの不整合
当初は以下が原因と考えていた：
- **UnifiedDataStore**: `unified_store_`プレフィックスを使用してLocalStorageに保存
- **SimpleCutDeletionService互換コード**: `kintone_cuts_Cut:`プレフィックスで保存
- **結果**: データが二重管理され、リロード時に`unified_store_`プレフィックスのデータが見つからない

### 2. 真の根本原因：二重のReadModel管理
詳細な調査により判明した真の原因：
- **UnifiedDataStore内部のreadModels Map**: データが正しく読み込まれていた（50件）
- **グローバルなSimplifiedReadModelシングルトン**: 空のまま（0件）
- **UnifiedCutService**: SimplifiedReadModelを使用するため、データが見つからない

## 修正内容

### 1. UnifiedDataStore.ts（初期修正）
```typescript
// loadAllCuts()メソッドを追加
async loadAllCuts(): Promise<unknown[]> {
  // 1. unified_store_プレフィックスのデータを読み込み
  // 2. kintone_cuts_Cut:プレフィックスの既存データも読み込み（互換性）
  // 3. 重複を除外して統合
  // 4. ReadModelを更新
}
```

### 2. UnifiedEventCoordinator.ts（最終修正）
```typescript
// syncReadModels()メソッドを修正
async syncReadModels(): Promise<void> {
  // ... 既存のデータ読み込み処理 ...
  
  // SimplifiedReadModelも同期（重要：UnifiedCutServiceが使用）
  const { getSimplifiedReadModel } = await import('@/services/model/SimplifiedReadModel');
  const simplifiedReadModel = getSimplifiedReadModel();
  simplifiedReadModel.clear();
  
  for (const cut of allCuts) {
    const cutData = this.repository ? cut.getData() : cut;
    await this.unifiedStore.save(cutData.id, cutData);
    this.unifiedStore.updateReadModel(cutData.id, cutData);
    
    // SimplifiedReadModelにも同期（これが欠けていた）
    simplifiedReadModel.upsert(cutData);
  }
}
```

## 動作確認手順

1. **test-api-mock.htmlを開く**
2. **「ダミーデータ生成（50件）」ボタンをクリック**
3. **進捗管理表にデータが表示されることを確認**
4. **ページをリロード（F5）**
5. **リロード後も進捗管理表にデータが表示されることを確認**

## テスト結果の確認ポイント

コンソールで以下を確認：
- `[UnifiedDataStore] loadAllCuts: Loaded X cuts from storage` - データ読み込み成功
- `[UnifiedCutService.findAll] Found X cuts from ReadModel` - ReadModelからデータ取得成功
- 「Found 0 cuts」が表示されない

## 技術的詳細

### データ保存フロー
1. `appFacade.createCut()` → データ作成
2. `UnifiedDataStore.save()` → `unified_store_`プレフィックスで保存
3. 互換性コード → `kintone_cuts_Cut:`プレフィックスでも保存

### データ読み込みフロー（リロード時）
1. `UnifiedEventCoordinator.syncReadModels()` 実行
2. `UnifiedDataStore.loadAllCuts()` 呼び出し
3. 両方のプレフィックスからデータを読み込み
4. ReadModelを更新
5. UIに反映

## 今後の改善案

1. **データ移行**: 古いプレフィックスのデータを新しいプレフィックスに統一
2. **プレフィックス統一**: SimpleCutDeletionServiceも`unified_store_`を使用するよう修正
3. **パフォーマンス最適化**: 重複データの削除とインデックスの最適化