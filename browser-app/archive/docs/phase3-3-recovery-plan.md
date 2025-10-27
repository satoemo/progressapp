# Phase 3.3 復旧計画

## 実施日時
2025-08-22

## エグゼクティブサマリー

Phase 3.3の実装により多数のバグが発生しています。根本原因は、Event Sourcing/CQRSパターンを削除する際に、重要なビジネスロジックも一緒に削除してしまったことです。

**推奨**: 段階的な修正アプローチで、重要な機能から順次復旧する

## 根本原因

### 1. ビジネスロジックの喪失
- CommandHandlerが持っていた詳細な処理が失われた
- CutAggregateのinitialData処理が正しく実装されていない
- バリデーションや整合性チェックが不足

### 2. 不完全な互換性実装
- AppServiceのCommandBus実装が簡易的すぎる
- プロパティベースの判定は脆弱で誤動作しやすい
- 元の処理フローを正確に再現できていない

### 3. UI機能の欠落
- ProgressTableの合計計算機能が動作していない
- データ変更時の自動更新が不完全

## 復旧計画

### Phase A: 緊急修正（今すぐ実施）

#### 1. CreateCutCommandの修正
```typescript
// AppService.tsの修正
async createCut(cutNumber: string, initialData?: any): Promise<CutModel> {
  // バリデーション
  if (!cutNumber || cutNumber.trim() === '') {
    throw new Error('カット番号は必須です');
  }
  
  // 重複チェック
  const existing = await this.cutService.getCutByNumber(cutNumber);
  if (existing) {
    throw new Error(`カット番号 ${cutNumber} は既に存在します`);
  }
  
  // カットを作成（initialDataを正しく設定）
  const cut = await this.cutService.createCut(cutNumber, initialData);
  
  // initialDataがある場合は基本情報を更新
  if (initialData && Object.keys(initialData).length > 0) {
    await this.cutService.updateBasicInfo(cut.id, initialData);
  }
  
  return cut;
}
```

#### 2. CutStoreの修正
```typescript
// CutStore.ts
createCut(cutNumber: CutNumber, initialData?: any): CutModel {
  const cut: CutModel = {
    id: generateId(),
    cutNumber,
    isDeleted: false,
    // initialDataを展開
    ...initialData
  };
  
  this.cuts.set(cut.id, cut);
  this.notifyChange();
  return cut;
}
```

#### 3. パフォーマンス改善
```typescript
// generateDummyData.ts
// getAllCuts()の呼び出しを削減
private cutCache: Map<string, CutModel> = new Map();

private async createCut(cutNumber: string): Promise<boolean> {
  // ...
  const newCut = await this.appService.createCut(cutNumber, initialData);
  
  // キャッシュに追加
  this.cutCache.set(cutNumber, newCut);
  
  if (Math.random() < PROGRESS_CREATION_RATE && newCut && newCut.id) {
    // キャッシュから直接IDを使用
    await this.addProgressWithId(newCut.id, cutNumber);
  }
  // ...
}
```

### Phase B: 重要機能の復旧（1-2日以内）

#### 1. CommandHandlerロジックの復元
- CreateCutCommandHandlerの処理をAppServiceに統合
- UpdateProgressCommandHandlerのバリデーションを追加
- UpdateBasicInfoCommandHandlerの処理を復元

#### 2. ヘッダー合計計算の実装
- ProgressTableにsummary計算機能を追加
- または元の実装がある場合は復元

### Phase C: 安定化（1週間以内）

#### 1. テストの追加
- 各コマンドの処理テスト
- パフォーマンステスト
- UIの動作確認テスト

#### 2. リファクタリング
- 重複コードの削除
- パフォーマンスの最適化
- エラーハンドリングの改善

## 実装優先順位

1. **最優先**: CreateCutCommandの修正（データが正しく作成されない問題）
2. **高**: パフォーマンス改善（ダミーデータ生成が遅い問題）
3. **中**: ヘッダー合計計算（UI機能の復旧）
4. **低**: その他の細かいバグ修正

## リスクと対策

### リスク
- 修正により新たなバグが発生する可能性
- パフォーマンスがさらに悪化する可能性

### 対策
- 各修正後に動作確認を実施
- パフォーマンス測定を実施
- 問題が発生した場合はすぐにロールバック

## 代替案

### 完全ロールバック案
- Phase 3.2（アーカイブ）に戻す
- Phase 3.3を小さく分割して再実装

**メリット**: 確実に安定版に戻れる
**デメリット**: これまでの作業が無駄になる

### ハイブリッド案
- ApplicationServiceを復活させる
- AppServiceと共存させて段階的に移行

**メリット**: 安定性を保ちながら移行できる
**デメリット**: コードが複雑になる

## 推奨アクション

1. **即座に実施**: Phase A（緊急修正）を実行
2. **動作確認**: ダミーデータ生成が正常に動作することを確認
3. **判断**: 
   - 改善が見られる場合 → Phase Bへ進む
   - 改善が見られない場合 → 完全ロールバックを検討

## 成功基準

- [ ] ダミーデータ生成が10秒以内に完了
- [ ] 生成されたデータに全フィールドが含まれる
- [ ] ヘッダーの合計が表示される
- [ ] エラーなしでアプリケーションが動作する

## 結論

Phase 3.3の実装は「やりすぎ」でした。Event Sourcing/CQRSを削除する際に、必要なビジネスロジックまで削除してしまいました。

段階的な修正により、機能を復旧させることは可能ですが、時間とリスクを考慮して、完全ロールバックも選択肢として検討すべきです。