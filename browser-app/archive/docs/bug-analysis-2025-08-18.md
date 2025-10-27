# バグ分析：論理削除データリロード表示問題 (2025-08-18)

## 問題概要
論理削除されたデータがリロード後に再表示される問題

## 症状
1. カット削除実行 → 正常に削除される
2. アプリケーションリロード → 削除されたデータが再表示される
3. 再度削除を試行 → 「Cut cut_X is already deleted」エラー

## 原因分析

### 真の根本原因（2025-08-18最終特定）
**KintoneEventStoreでの二重管理による不整合**

KintoneEventStoreでは削除状態が2つの形式で保存され、リロード時に不整合が発生：

1. **eventsJson**: 削除イベント（CutDeleted）が保存される
2. **cutDataJson**: カットデータ（削除状態含む）が保存される

### 問題の流れ
1. **削除実行時**: 
   - CutDeletedイベントが eventsJson に保存される
   - ApplicationFacade.setCutDataCallback で削除されたカットも含めて cutDataJson に保存される
2. **リロード時**: 
   - eventsJson からイベントを読み込み、Aggregateを復元（削除状態正常）
   - **しかし** cutDataJson から削除されたカットデータも復元される
   - 削除されたカットが不正に表示される

### 技術的詳細

**ApplicationFacade.ts:102-125行目（問題箇所）**
```typescript
eventStore.setCutDataCallback(async () => {
  const query = new GetAllCutsQuery(undefined, undefined, undefined, true); // includeDeleted=true
  const cuts = await this.serviceContainer.getQueryBus().execute(query) as CutReadModel[];
  // ❌ 削除されたカットも含めてkintoneに保存している
  return cuts.map(cut => {
    const { completionRate, totalCost, progressSummary, isDeleted, ...cutData } = cut;
    return { ...cutData, isDeleted }; // isDeleted='true' も含む
  });
});
```

**ReadModelStore.ts:94-101行目（不整合の原因）**
```typescript
updateWithDeletedFlag(cutId: string, data: CutData, isDeleted: boolean): void {
  // ❌ data.isDeletedフィールドを優先（cutDataJsonからの復元時に問題）
  const actualIsDeleted = data.isDeleted !== undefined 
    ? data.isDeleted === 'true' 
    : isDeleted;
  const readModel = createCutReadModel(data, actualIsDeleted);
  this.models.set(cutId, readModel);
}
```

**KintoneEventStore（二重管理の実装）**
- `save()`: イベントを eventsJson に保存
- `setCutDataCallback()`: カットデータを cutDataJson に保存（削除されたカット含む）
- `loadFromKintone()`: 両方のデータを読み込み（不整合発生）

## 影響範囲
- リロード時の削除データ表示
- データ整合性の混乱
- ユーザビリティの低下

## 修正方針

### 推奨解決策: cutDataCallbackから削除されたカットを除外

**根本問題**: 削除されたカットがkintoneの cutDataJson に保存されている

**修正内容**: ApplicationFacade.ts の setCutDataCallback を修正
```typescript
eventStore.setCutDataCallback(async () => {
  // ✅ includeDeleted=false に変更
  const query = new GetAllCutsQuery(undefined, undefined, undefined, false);
  const cuts = await this.serviceContainer.getQueryBus().execute(query) as CutReadModel[];
  
  // ✅ 削除されていないカットのみを返し、isDeletedフィールドは除外
  return cuts.map(cut => {
    const { completionRate, totalCost, progressSummary, isDeleted, ...cutData } = cut;
    return cutData; // isDeletedフィールドを除外
  });
});
```

### 修正の利点
1. **データ整合性**: 削除されたカットはkintoneに保存されない
2. **単一責任**: 削除状態はイベントソーシングのみで管理
3. **影響範囲限定**: 1箇所の修正で問題解決
4. **LocalStorageEventStoreとの一貫性**: 両EventStoreで同じ動作

### 代替案1: KintoneEventStore.loadFromKintone()でフィルタリング
**問題**: cutDataJsonからの復元ロジックが複雑化

### 代替案2: ReadModelStore.updateWithDeletedFlag()の修正
**問題**: 根本原因（二重管理）が解決されない

## 修正実装（2025-08-18最終解決）

### 根本原因に基づく修正
**KintoneEventStoreでの二重管理問題を解決**

**修正内容**: `ApplicationFacade.ts:102-116`
```typescript
eventStore.setCutDataCallback(async () => {
  // ✅ 削除されたカットはkintoneに保存しない（イベントソーシングのみで管理）
  const query = new GetAllCutsQuery(undefined, undefined, undefined, false); // includeDeleted=false
  const cuts = await this.serviceContainer.getQueryBus().execute(query) as CutReadModel[];
  
  // ✅ CutReadModelの計算フィールドとisDeletedフィールドを除外
  const result = cuts.map(cut => {
    const { completionRate, totalCost, progressSummary, isDeleted, ...cutData } = cut;
    return cutData; // isDeletedフィールドを除外（削除状態はイベントのみで管理）
  });
  
  return result;
});
```

### 修正の効果
1. **二重管理の解消**: 削除状態はイベントソーシングのみで管理
2. **データ整合性の確保**: 削除されたカットはkintoneの cutDataJson に保存されない
3. **リロード時の正常動作**: イベントリプレイによる削除状態のみが適用される
4. **LocalStorageEventStoreとの一貫性**: 両EventStoreで同じ動作

### 修正前の問題フロー
1. 削除実行 → eventsJson（削除イベント）+ cutDataJson（削除カット含む）に保存
2. リロード時 → cutDataJson から削除されたカットも復元される
3. 結果 → 削除されたカットが表示される

### 修正後の正常フロー
1. 削除実行 → eventsJson（削除イベント）+ cutDataJson（削除カット除外）に保存
2. リロード時 → eventsJson のみで削除状態が管理される
3. 結果 → 削除されたカットは表示されない

### 過去の修正試行（参考）
以下の修正も実施されたが、根本原因に対処していなかった：
- `CutData`インターフェースに`isDeleted?: string`追加
- `CutAggregate.getData()`で削除状態をstring型で返却
- `CutReadModel`のisDeletedをstring型に統一
- `UnifiedEventCoordinator.syncReadModels()`での削除状態考慮

## テスト方法
1. カット削除実行
2. アプリケーションリロード
3. 削除データが非表示であることを確認
4. 既存機能の正常動作確認

## 予防策
- ReadModel同期処理でのAggregateステート検証
- 統合テストでのリロード後検証追加
- ログ出力でのデバッグ情報追加
- 型安全性の向上（string/boolean統一）