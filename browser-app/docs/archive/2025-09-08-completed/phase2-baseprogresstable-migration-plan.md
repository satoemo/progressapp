# Phase 2: BaseProgressTable移行計画

## 概要
BaseProgressTable.tsをCommandBus/QueryBusから新しいApplicationFacade統一インターフェースに移行する

## 現状分析
### 対象ファイル
- `/src/ui/base/BaseProgressTable.ts`

### 使用状況
- **QueryBus使用箇所**: 1箇所（refreshDataメソッド）
- **使用Query**: GetAllCutsQuery

## 実装計画

### Step 1: インポート文の整理（5分）
- GetAllCutsQueryのインポートを削除
- 不要になったQueryBus関連のインポートを削除

### Step 2: refreshDataメソッドの修正（10分）
```typescript
// 現在の実装
public async refreshData(): Promise<void> {
  await this.stateManager.loadData(async () => {
    const query = new GetAllCutsQuery();
    return await this.appFacade.getQueryBus().execute(query);
  });
}

// 移行後の実装
public async refreshData(): Promise<void> {
  await this.stateManager.loadData(async () => {
    return await this.appFacade.getAllCuts();
  });
}
```

### Step 3: 動作確認（10分）
- test-api-mock.htmlでの動作確認
- データ取得の正常動作を確認

## 影響範囲
- BaseProgressTableを継承している全クラス（ProgressTable等）
- 既存の動作に影響なし（ApplicationFacadeが内部で適切に処理）

## リスク評価
- **リスクレベル**: 低
- **理由**: ApplicationFacadeが両方のモードをサポートしているため、段階的移行が可能

## 成功基準
1. ビルドエラーなし
2. テスト環境でのデータ取得が正常動作
3. 既存機能の完全維持

## 推定作業時間
**合計: 約25分**

---

この計画で進めてよろしいですか？