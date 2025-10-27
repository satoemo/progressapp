# Phase 2: Command/Query統合 - 詳細実装計画

## 概要
Command/Queryパターンを削除し、直接的なサービス呼び出しへ移行

## 現在の状況
- ✅ ServiceLocator実装済み
- ✅ CommandMigrationAdapter実装済み  
- ✅ QueryMigrationAdapter実装済み
- ❌ UIコンポーネント6ファイルが旧パターン使用中

## Step 2.1: ApplicationFacade拡張（30分）

### 2.1.1: ServiceLocatorアクセスメソッド追加
```typescript
// ApplicationFacade.tsに追加
getCutService(): UnifiedCutService {
  return getServiceLocator().getCutService();
}

getSimpleDeletionService(): SimpleCutDeletionService {
  return getServiceLocator().get('DeletionService');
}
```

### 2.1.2: 移行フラグの実装
```typescript
// 段階的移行のためのフィーチャーフラグ
private migrationFlags = {
  useCutService: true,
  useCommandBus: false  // 旧システムを無効化
};
```

### 2.1.3: テストコード作成
- ApplicationFacade経由でのサービスアクセステスト
- 新旧両方のパスが動作することを確認

## Step 2.2: generateDummyData.ts移行（1時間）

### 2.2.1: 現在のコード分析
```typescript
// 現在: CreateCutCommand使用
const command = new CreateCutCommand(cutNumber, initialData);
await commandBus.execute(command);
```

### 2.2.2: 新コードへの変更
```typescript
// 新: UnifiedCutService直接呼び出し
const cutService = appFacade.getCutService();
await cutService.create({ cutNumber, ...initialData });
```

### 2.2.3: テスト実施
- 50件のダミーデータ生成
- パフォーマンス測定（旧システムとの比較）

## Step 2.3: CellEditor.ts移行（2時間）

### 2.3.1: UpdateBasicInfoCommand置き換え
```typescript
// 現在
const command = new UpdateBasicInfoCommand(cutId, {
  scene: newValue,
  cut: cutNumber
});
await this.commandBus.execute(command);

// 新
const cutService = this.appFacade.getCutService();
await cutService.updateBasicInfo(cutId, {
  scene: newValue,
  cut: cutNumber
});
```

### 2.3.2: エラーハンドリング統一
- try-catchブロックの整理
- エラーメッセージの統一

### 2.3.3: イベントリスナー更新
- CustomEventからサービスイベントへ移行

## Step 2.4: KenyoMultiSelectPopup.ts移行（2時間）

### 2.4.1: UpdateKenyoCommand置き換え
```typescript
// 現在
const command = new UpdateKenyoCommand(cutId, selectedValues);
await this.commandBus.execute(command);

// 新
const cutService = this.appFacade.getCutService();
await cutService.updateKenyo(cutId, selectedValues);
```

### 2.4.2: ポップアップロジックの簡素化
- 状態管理の整理
- 不要な抽象化の削除

## Step 2.5: SpecialMultiSelectPopup.ts移行（2時間）

### 2.5.1: Command置き換え
- 特殊フィールド更新処理の移行
- バリデーションロジックの統合

### 2.5.2: 共通コンポーネント化の検討
- KenyoMultiSelectPopupとの重複コード抽出
- 基底クラスの作成

## Step 2.6: BaseProgressTable.ts移行（4時間）

### 2.6.1: Command/Query使用箇所の洗い出し
```typescript
// 影響範囲調査
- CreateCutCommand: 3箇所
- UpdateProgressCommand: 5箇所
- DeleteCutCommand: 2箇所
- GetAllCutsQuery: 4箇所
- GetCutByIdQuery: 2箇所
```

### 2.6.2: データ取得処理の移行
```typescript
// 現在
const query = new GetAllCutsQuery(filter);
const cuts = await this.queryBus.execute(query);

// 新
const cutService = this.appFacade.getCutService();
const cuts = await cutService.findAll(filter);
```

### 2.6.3: 更新処理の移行
```typescript
// バッチ更新の最適化
async updateMultipleCuts(updates: CutUpdate[]) {
  const cutService = this.appFacade.getCutService();
  // Promise.allで並列処理
  await Promise.all(
    updates.map(update => 
      cutService.update(update.id, update.data)
    )
  );
}
```

### 2.6.4: イベントハンドリングの統一
- DOM EventからServiceイベントへ
- デバウンス処理の最適化

## Step 2.7: ProgressTable.ts移行（4時間）

### 2.7.1: BaseProgressTableとの依存関係整理
- 継承関係の見直し
- 共通処理の基底クラスへの移動

### 2.7.2: 進捗計算ロジックの移行
```typescript
// 現在: 複数のQueryを組み合わせて計算
// 新: UnifiedCutServiceに統合メソッド追加
async calculateProgress(projectId: string): Promise<ProgressData> {
  const cutService = this.appFacade.getCutService();
  return cutService.calculateProjectProgress(projectId);
}
```

### 2.7.3: リアルタイム更新の最適化
- WebSocket接続の管理
- 差分更新の実装

## Step 2.8: 旧システムファイル削除準備（2時間）

### 2.8.1: 依存関係の確認
```bash
# 削除対象ファイルを参照しているファイルを検索
grep -r "CommandBus\|QueryBus\|CommandHandler\|QueryHandler" src/
```

### 2.8.2: インポート文の整理
- 不要なインポートの削除
- パスの更新

### 2.8.3: 削除対象ファイルリスト作成
```
削除対象（計40ファイル）:
- application/commands/*.ts (24ファイル)
- application/queries/*.ts (8ファイル)
- application/CommandBus.ts
- application/QueryBus.ts
- application/commands/handlers/*.ts
- application/queries/handlers/*.ts
- domain/aggregates/*.ts
- infrastructure/EventSourced*.ts
```

## Step 2.9: 統合テスト実施（3時間）

### 2.9.1: E2Eテストシナリオ
1. カット作成→編集→削除の一連フロー
2. 進捗計算の精度確認
3. 同時編集時の整合性確認
4. 大量データ（1000件）での動作確認

### 2.9.2: パフォーマンステスト
```javascript
// test-phase2-performance.js
async function performanceTest() {
  console.time('新システム: 100件作成');
  // ... 実装
  console.timeEnd('新システム: 100件作成');
  
  // 目標: 旧システムより30%高速化
}
```

### 2.9.3: 回帰テスト
- 既存機能が全て動作することを確認
- UIの見た目が変わっていないことを確認

## Step 2.10: 本番デプロイ準備（2時間）

### 2.10.1: ロールバック計画
```typescript
// 緊急時の切り戻し設定
if (process.env.USE_LEGACY_SYSTEM === 'true') {
  // 旧システムを使用
  return new CommandBus();
} else {
  // 新システムを使用
  return getServiceLocator().getCutService();
}
```

### 2.10.2: 段階的リリース設定
- フィーチャーフラグの実装
- A/Bテストの準備

### 2.10.3: モニタリング設定
- エラーログ収集
- パフォーマンスメトリクス

## タイムライン

| Step | 作業内容 | 工数 | 依存関係 |
|------|---------|------|----------|
| 2.1 | ApplicationFacade拡張 | 30分 | なし |
| 2.2 | generateDummyData.ts | 1時間 | 2.1 |
| 2.3 | CellEditor.ts | 2時間 | 2.1 |
| 2.4 | KenyoMultiSelectPopup.ts | 2時間 | 2.1 |
| 2.5 | SpecialMultiSelectPopup.ts | 2時間 | 2.1 |
| 2.6 | BaseProgressTable.ts | 4時間 | 2.1 |
| 2.7 | ProgressTable.ts | 4時間 | 2.6 |
| 2.8 | 旧ファイル削除準備 | 2時間 | 2.2-2.7 |
| 2.9 | 統合テスト | 3時間 | 2.8 |
| 2.10 | デプロイ準備 | 2時間 | 2.9 |

**合計: 22.5時間（約3営業日）**

## リスクと対策

### リスク1: UIコンポーネント移行時のバグ
**対策**: 
- 1ファイルずつ段階的に移行
- 各ステップでのテスト実施
- git commitを細かく実施

### リスク2: パフォーマンス劣化
**対策**:
- 各ステップでベンチマーク測定
- 10%以上の劣化で原因調査

### リスク3: 既存機能への影響
**対策**:
- MigrationAdapterで互換性維持
- フィーチャーフラグで切り替え可能に

## 成功指標

1. **機能面**
   - [ ] 全UIコンポーネントが新サービス使用
   - [ ] Command/Queryクラス完全削除
   - [ ] テストカバレッジ80%以上

2. **性能面**
   - [ ] レスポンスタイム30%改善
   - [ ] メモリ使用量20%削減
   - [ ] コード行数30%削減

3. **保守性**
   - [ ] 循環依存の解消
   - [ ] ファイル数40%削減
   - [ ] 新機能追加時間50%短縮

## 次のアクション

1. **Step 2.1から開始**
   - ApplicationFacade.tsの編集
   - ServiceLocatorアクセスメソッド追加

2. **テスト環境準備**
   - test-phase2.htmlの作成
   - パフォーマンス測定スクリプト準備

3. **進捗トラッキング**
   - 各Step完了時にTODO.md更新
   - 問題発生時はbug-analysis-*.mdに記録