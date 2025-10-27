# バグレポート - 2025年8月31日

## 修正完了した問題

### 1. TableEventManagerのメモリリーク問題

#### 症状
- イベントハンドラーが7400個以上蓄積
- パフォーマンスの著しい低下
- ページが重くなり操作が困難に

#### 原因
- `render()`メソッドが呼ばれるたびに新しいイベントハンドラーが追加
- 古いハンドラーがクリーンアップされない
- 各セル編集ごとにハンドラーが蓄積

#### 修正内容
**ファイル**: `/src/ui/ProgressTable.ts`
```typescript
protected render(): void {
  // 既存のイベントハンドラーをクリーンアップ（メモリリーク防止）
  if (this.table) {
    this.tableEventManager.removeAllEventListenersFromTree(this.table);
    // AutoFillManagerの既存ハンドラーもクリア
    this.autoFillManager.removeAllFillHandles();
  }
  // ... 続き ...
}
```

#### 結果
- イベントハンドラー数が10個以下に維持
- パフォーマンスが正常化
- メモリ使用量の大幅削減

### 2. データ永続化問題（タブ切り替え時のデータ消失）

#### 症状
- ダミーデータ生成後、タブ切り替えでデータが消える
- `getCutData()`が0件を返却
- リロードは正常だがタブ切り替えで問題発生

#### 原因
- `KintoneEventStore.saveToKintone()`でcachedCutDataが更新されない
- コールバックから取得したデータをキャッシュに保存していない

#### 修正内容
**ファイル**: `/src/infrastructure/KintoneEventStore.ts`
```typescript
// カットデータも保存
if (this.getCutDataCallback) {
  try {
    const cutData = await this.getCutDataCallback();
    if (cutData.length > 0) {
      // キャッシュも更新（これが重要！）
      this.cachedCutData = cutData;
      console.log(`[KintoneEventStore] Updated cachedCutData with ${cutData.length} cuts`);
    }
    updateRecord.cutDataJson = { value: JSON.stringify(cutData) };
  } catch (error) {
    console.error('[KintoneEventStore] Failed to get cut data for saving:', error);
  }
}
```

#### 結果
- タブ切り替え時もデータが保持される
- リロード後も正常動作
- データの永続化が安定

## 修正確認方法

1. **メモリリーク確認**
   - ダミーデータ生成
   - セル編集を複数回実施
   - コンソールでハンドラー数確認
   - `[TableEventManager] Current handlers: X` が100以下

2. **データ永続化確認**
   - ダミーデータ生成
   - メニュータブ切り替え（個人計画/チーム計画/アーカイブ）
   - データが保持されることを確認
   - ページリロード後もデータ復元確認

## パフォーマンス改善

### Before（修正前）
- イベントハンドラー: 7400個以上
- タブ切り替え: データ消失
- パフォーマンス: 著しく低下
- メモリ使用: 過大

### After（修正後）
- イベントハンドラー: 10個以下
- タブ切り替え: データ保持
- パフォーマンス: 正常
- メモリ使用: 最小限

## 学習事項

1. **イベントハンドラーの適切な管理**
   - 再レンダリング前に必ずクリーンアップ
   - 不要なハンドラーの蓄積を防ぐ

2. **キャッシュの一貫性**
   - データ保存時にキャッシュも更新
   - 読み取りと書き込みの同期

3. **デバッグログの重要性**
   - ハンドラー数の監視
   - データフローの可視化

## 今後の推奨事項

1. **自動監視の実装**
   - イベントハンドラー数の閾値監視
   - メモリ使用量のトラッキング

2. **イベント管理の最適化**
   - イベントデリゲーションの活用
   - 必要最小限のハンドラー登録

3. **キャッシュ戦略の改善**
   - 明確なキャッシュ無効化ポリシー
   - データ整合性の保証