# Phase B データ表示問題の修正

## 問題の詳細
Phase B実装後、ダミーデータ生成後に表に値が表示されない問題が発生

## 根本原因

### 1. UnifiedDataStoreにdeleteメソッドが未実装
- UnifiedCutServiceのsyncWithReadModel()がrepository.delete()をオーバーライドする際、`this.readModel.delete(id)`を呼ぶ
- UnifiedDataStoreにdeleteメソッドがなかったため、潜在的なエラーの原因となっていた

### 2. データ同期の問題（調査中）
ログ分析結果：
```
[UnifiedCutService.findAll] ReadModel is empty, syncing with ServiceLocator...
[UnifiedCutService.findAll] Found 0 cuts from ReadModel
[UnifiedCutService.findAll] Store has undefined cuts
```

- UnifiedDataStore.findAll()が空の配列を返している
- readModels Mapにデータが保存されていない可能性がある

## 修正内容

### 1. UnifiedDataStore.tsの修正
```typescript
// deleteメソッドを追加
delete(id: string): void {
  console.log(`[UnifiedDataStore] delete called for id: ${id}`);
  
  // LocalStorageから削除
  this.adapter.delete(id).catch(error => {
    console.error('[UnifiedDataStore] Failed to delete from storage:', error);
  });
  
  // ReadModelから削除
  this.removeReadModel(id);
  
  // キャッシュから削除
  this.cache.delete(id);
  
  console.log(`[UnifiedDataStore] After delete, readModels size: ${this.readModels.size}`);
}
```

### 2. デバッグログの追加
以下の箇所にデバッグログを追加：
- UnifiedDataStore.upsert()
- UnifiedDataStore.findAll()
- UnifiedCutService.syncWithReadModel()

## デバッグ手順

### 1. コンソールログの確認
test-api-mock.htmlでダミーデータ生成時に以下を確認：

1. **UnifiedCutServiceの初期化**
   - `[UnifiedCutService] Setting up ReadModel sync...`
   - `[UnifiedCutService] ReadModel type: UnifiedDataStore`

2. **データ保存時**
   - `[UnifiedCutService] Repository save completed for cut-XXX, now updating ReadModel...`
   - `[UnifiedDataStore] upsert called for cut: cut-XXX, cutNumber: XXX`
   - `[UnifiedDataStore] After upsert, readModels size: N`

3. **データ取得時**
   - `[UnifiedDataStore] findAll called, readModels size: N`
   - `[UnifiedDataStore] findAll returning N results`

## 予想される問題と対処法

### 問題1: readModelsが空のまま
**症状**: `readModels size: 0`と表示される
**原因**: updateReadModel()が正しく動作していない
**対処**: createCutReadModel()のインポートと実装を確認

### 問題2: upsertが呼ばれない
**症状**: `[UnifiedDataStore] upsert called`のログが出ない
**原因**: UnifiedCutServiceがUnifiedDataStoreを使用していない
**対処**: ServiceContainerでの初期化を確認

### 問題3: データ型の不一致
**症状**: データは保存されるが取得できない
**原因**: SimplifiedCutDataとCutDataの型不一致
**対処**: 型変換処理を追加

## テスト項目

1. **初期化確認**
   - test-api-mock.htmlを開く
   - コンソールでUnifiedCutServiceの初期化ログを確認

2. **データ生成テスト**
   - 「ダミーデータ生成（50件）」をクリック
   - コンソールでupsertログを確認
   - readModels sizeが増加することを確認

3. **データ表示確認**
   - 進捗管理表にデータが表示されることを確認
   - findAllログでデータ数を確認

4. **リロードテスト**
   - ページをリロード（F5）
   - データが保持されていることを確認

## 次のステップ

デバッグログの結果に基づいて：

1. **readModelsが空の場合**
   - updateReadModel()の実装を修正
   - createCutReadModel()の動作を確認

2. **upsertが呼ばれない場合**
   - UnifiedCutServiceのインスタンス化を確認
   - ServiceContainerの設定を修正

3. **すべて正常に動作する場合**
   - デバッグログを削除
   - Phase B Step 4（SimplifiedReadModel削除）に進む