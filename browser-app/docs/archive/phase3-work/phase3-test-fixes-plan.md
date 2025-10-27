# Phase 3 テスト修正計画

## 概要
Phase 3テストスイート実行結果から判明した問題点の修正計画書。
テスト結果: 成功8件、失敗10件（合計18件）

## 問題点と優先度

### 優先度: 高

#### 1. カット番号バリデーションエラー
**問題**
```
[CutCreateService] createCut: Validation failed: cutNumber: カット番号は英数字とハイフンで10文字以内である必要があります
```

**影響範囲**
- ApplicationFacadeテスト（カット作成）
- 削除サービステスト
- パフォーマンステスト
- エッジケーステスト

**原因**
- テストコードで生成されるカット番号が10文字制限を超過
  - `TEST-${Date.now()}` → 15文字以上
  - `DUPLICATE-${Date.now()}` → 20文字以上
  - `EMPTY-${Date.now()}` → 16文字以上

**修正方法**
- phase3-test-suite.jsのカット番号生成ロジックを修正
- Date.now()の末尾6桁のみ使用
- プレフィックスを短縮化

#### 2. SimpleCutDeletionServiceとUnifiedDataStoreの連携不足
**問題**
```
カットが見つかりません: cut-PERF0
```

**影響範囲**
- パフォーマンステスト（削除処理）
- 削除サービステスト

**原因**
- SimpleCutDeletionServiceがlocalStorageから直接データを読み取る
- UnifiedDataStoreへのデータ保存時にlocalStorageへの同期が欠落
- 削除時のキーパターン不一致

**修正方法**
1. UnifiedDataStoreのsaveメソッドでlocalStorageへも保存
2. SimpleCutDeletionServiceのキー生成ロジックを統一
3. 両サービス間でのデータフォーマット標準化

### 優先度: 中

#### 3. UnifiedDataStore APIの不足
**問題**
```
store.deleteReadModel is not a function
```

**影響範囲**
- UnifiedDataStoreテスト（ReadModel連携）

**原因**
- UnifiedDataStoreクラスにdeleteReadModelメソッドが未実装

**修正方法**
- UnifiedDataStore.tsにdeleteReadModelメソッドを追加
- 既存のdeleteメソッドのReadModel版を実装

#### 4. null値のエラーハンドリング不足
**問題**
```
Cannot read properties of null (reading 'startsWith')
```

**影響範囲**
- カット削除処理全般

**原因**
- SimpleCutDeletionServiceのgetStorageKeyメソッドでnullチェックが不足

**修正方法**
- SimpleCutDeletionService.tsにnullチェックを追加
- エラーメッセージの改善

## 実装計画

### Step 1: テストコードの修正（15分）
**対象ファイル**
- `/test/phase3-test-suite.js`

**修正内容**
1. カット番号生成ヘルパー関数の追加
```javascript
function generateShortId(prefix) {
  const timestamp = String(Date.now()).slice(-4);
  return `${prefix}${timestamp}`;
}
```

2. 全テストケースのカット番号を短縮
   - `TEST-${Date.now()}` → `T${shortId}`
   - `DUPLICATE-${Date.now()}` → `DUP${shortId}`
   - `EMPTY-${Date.now()}` → `EMP${shortId}`

### Step 2: UnifiedDataStore API拡張（30分）
**対象ファイル**
- `/src/infrastructure/UnifiedDataStore.ts`

**修正内容**
1. deleteReadModelメソッドの追加
2. saveメソッドでlocalStorage同期を追加
3. 削除時のlocalStorageクリーンアップ

### Step 3: SimpleCutDeletionService改善（30分）
**対象ファイル**
- `/src/services/simplified/SimpleCutDeletionService.ts`

**修正内容**
1. getStorageKeyメソッドにnullチェック追加
2. UnifiedDataStoreとのキーパターン統一
3. エラーハンドリングの改善

### Step 4: 統合テスト（15分）
**テスト手順**
1. 修正後のビルド実行
2. Phase 3テストスイート再実行
3. 全18テストケースの成功確認

## 期待される結果

### 修正後のテスト結果
- ✅ 成功: 18件
- ❌ 失敗: 0件
- 📊 合計: 18件

### パフォーマンス目標
- 10件連続作成: < 10ms
- 100件データ取得: < 1ms
- 削除処理: 正常動作

## リスクと対策

### リスク1: 既存機能への影響
**対策**
- 各修正を個別にテスト
- 段階的な修正適用

### リスク2: localStorage容量制限
**対策**
- 不要なデータの定期クリーンアップ
- データ圧縮の検討（将来的）

## 成功基準
1. Phase 3テストスイート全項目成功
2. パフォーマンステストで目標値達成
3. エッジケースでの適切なエラーハンドリング
4. 既存機能の完全動作維持

## タイムライン
- Step 1: 15分 - テストコード修正
- Step 2: 30分 - UnifiedDataStore拡張
- Step 3: 30分 - SimpleCutDeletionService改善
- Step 4: 15分 - 統合テスト

**総所要時間**: 約1.5時間

## 承認確認
この計画で進めてよろしいですか？