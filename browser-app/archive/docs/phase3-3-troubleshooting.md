# Phase 3.3 トラブルシューティング

## 発生した問題と解決方法

### 1. setSyncStatusListener is not a function

**エラーメッセージ**:
```
Failed to initialize app: Error: アプリケーション初期化に失敗しました: A.setSyncStatusListener is not a function
```

**原因**:
- AppServiceのgetRealtimeSyncService()が不完全なモックオブジェクトを返していた
- AppInitializerがRealtimeSyncServiceのsetSyncStatusListenerメソッドを呼び出そうとして失敗

**解決方法**:
```typescript
// AppService.ts
getRealtimeSyncService(): any {
  // 同期機能は不要なのでnullを返す（AppInitializerがnullをチェックしている）
  return null;
}
```

### 2. subscribeToUIUpdates is not a function

**エラーメッセージ**:
```
Failed to initialize app: Error: アプリケーション初期化に失敗しました: A.subscribeToUIUpdates is not a function
```

**原因**:
- AppServiceのgetUnifiedEventCoordinator()にsubscribeToUIUpdatesメソッドが実装されていなかった
- BaseProgressTableがこのメソッドを使用してUIイベントを購読している

**解決方法**:
```typescript
// AppService.ts - getUnifiedEventCoordinatorに追加
subscribeToUIUpdates: (callback: (notification: any) => void) => {
  // UIアップデートの購読
  // データ変更時にdata-changed通知を送る
  return this.subscribeToChanges(() => {
    callback({ type: 'data-changed' });
  });
}
```

### 3. Minification問題

**問題**:
- constructor.nameを使用したコマンド/クエリの判定が本番ビルドで動作しない

**解決方法**:
- プロパティベースの判定に変更
```typescript
// constructor.nameの代わりにプロパティで判定
if ('cutNumber' in command && !('cutId' in command)) {
  return this.createCut(command.cutNumber);
}
```

### 4. ダミーデータ生成エラー

**エラーメッセージ**:
```
カット 1 の作成に失敗しました: Error: カット cut_1 が見つかりません
```

**原因**:
- generateDummyData.tsが旧Event SourcingのIdGeneratorを使用してcutIdを生成
- 新アーキテクチャではCutStoreが異なる形式のIDを生成（`cut_${Date.now()}_${random}`）
- UpdateProgressCommandに渡すIDが一致しない

**解決方法**:
```typescript
// CreateCutCommandの戻り値から実際のIDを取得
const newCut = await this.appService.getCommandBus().execute(createCommand);
if (newCut && newCut.id) {
  await this.addProgressWithId(newCut.id, cutNumber);
}
```

### 5. 型の互換性問題

**問題**:
- ApplicationServiceとAppServiceの型が一致しない

**解決方法**:
- 互換性メソッドを追加
- オプショナルパラメータとgetAppService()シングルトンパターンを使用

## 今後の改善点

1. **同期インジケーター**: 現在無効化されているが、将来的に完全削除予定
2. **Event Sourcing/CQRS**: 段階的に削除予定
3. **ApplicationService**: 完全にAppServiceに移行後、削除予定

## テスト方法

1. 開発サーバー起動:
```bash
npm run dev
```

2. テストページアクセス:
- http://localhost:5173/test-new-architecture.html - アーキテクチャ確認
- http://localhost:5173/test-api-mock.html - アプリケーション動作確認

3. ビルド確認:
```bash
npm run build
```