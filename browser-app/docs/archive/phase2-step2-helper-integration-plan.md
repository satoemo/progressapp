# Phase 2 Step 2: ヘルパークラス統合実装計画書

## 1. 現状分析

### 既存ヘルパークラスの状況
| ヘルパー | 実装状態 | 使用箇所 | 置き換え対象数 |
|---------|---------|---------|--------------|
| DataProcessor | 実装・導入済み | 49箇所 | - |
| DateHelper | 実装済み・未導入 | 0箇所 | 126箇所 |
| StorageHelper | 実装済み・未導入 | 0箇所 | 71箇所 |
| ValidationHelper | 実装済み・未導入 | 0箇所 | 93箇所 |

### 置き換え対象の詳細

#### 1. DateHelper統合対象（126箇所）
- `new Date()` 処理
- 日付フォーマット処理
- 日付比較・計算処理
- DataProcessorとの重複機能の整理

#### 2. StorageHelper置き換え対象（71箇所）
- `localStorage.setItem()` → `StorageHelper.save()`
- `localStorage.getItem()` → `StorageHelper.load()`
- `localStorage.removeItem()` → `StorageHelper.remove()`
- `localStorage.clear()` → `StorageHelper.clear()`

#### 3. ValidationHelper置き換え対象（93箇所）
- null/undefinedチェック: 56箇所
- 空文字チェック: 17箇所
- 日付検証: 20箇所

## 2. 実装方針

### Step 2.1: DateHelperとDataProcessorの統合

#### 方針
DataProcessorの日付機能を拡張し、DateHelperの高度な機能を統合する。

#### 統合方法
1. **DataProcessorに移管する機能**
   - 基本的な日付フォーマット（既存）
   - 日付差分計算（既存）
   
2. **DateHelperで管理する機能**
   - 営業日計算
   - 祝日判定
   - 複雑な日付範囲処理
   - 月初・月末・四半期計算

3. **連携方法**
   - DataProcessorから必要に応じてDateHelperを呼び出す
   - 簡単な処理はDataProcessor、複雑な処理はDateHelper

### Step 2.2: StorageHelper導入（20箇所ずつ段階的に）

#### 第1段階（20箇所）
- UnifiedDataStore
- CutReadModel
- MemoReadModel
- MockKintoneApiClient

#### 第2段階（20箇所）
- ViewStateManager
- TabManager
- FilterManager
- TableFilterSortManager

#### 第3段階（20箇所）
- ProgressTable
- BaseProgressTable
- StaffView
- SimulationView

#### 第4段階（11箇所）
- その他の小規模な使用箇所

### Step 2.3: ValidationHelper導入（30箇所ずつ段階的に）

#### 第1段階（30箇所）
- null/undefinedチェックの置き換え
- CutData検証
- フィールド値検証

#### 第2段階（30箇所）
- 空文字・空配列チェック
- 数値検証
- 文字列検証

#### 第3段階（33箇所）
- 日付検証
- カット番号検証
- 複合的な検証処理

## 3. 実装スケジュール

### 今回のリクエスト（Step 2.1）
1. DateHelperとDataProcessorの役割分担を明確化
2. 相互連携の実装
3. 10箇所程度の試験的置き換え

### 次回のリクエスト（Step 2.2前半）
1. StorageHelper導入（第1段階20箇所）
2. テストとバグ修正

### 3回目のリクエスト（Step 2.2後半）
1. StorageHelper導入（第2-3段階40箇所）
2. 残り11箇所の置き換え

### 4回目のリクエスト（Step 2.3前半）
1. ValidationHelper導入（第1段階30箇所）

### 5回目のリクエスト（Step 2.3後半）
1. ValidationHelper導入（第2-3段階63箇所）
2. 完了レポート作成

## 4. 期待される効果

### コード品質の向上
- **重複削除**: 約290箇所の重複処理を統一
- **保守性向上**: ヘルパークラスへの処理集約
- **型安全性**: TypeScriptの型システムを最大活用

### 具体的な改善例

#### StorageHelper導入前後
```typescript
// Before
try {
  const data = JSON.stringify(cutData);
  localStorage.setItem('kintone_cuts', data);
} catch (e) {
  console.error('Failed to save', e);
}

// After
StorageHelper.save('cuts', cutData);
```

#### ValidationHelper導入前後
```typescript
// Before
if (value === null || value === undefined || value === '') {
  return false;
}

// After
if (ValidationHelper.isNullOrEmpty(value)) {
  return false;
}
```

## 5. リスクと対策

### リスク
1. 大量の変更による不具合の可能性
2. パフォーマンスへの影響
3. 既存機能の破壊

### 対策
1. 段階的な導入（20-30箇所ずつ）
2. 各段階でのテスト実施
3. UI・機能の動作を完全維持
4. ビルドエラーチェックの徹底

## 6. テスト項目

### Step 2.1テスト項目
- 日付表示の正確性
- 日付計算の精度
- 営業日・祝日判定

### Step 2.2テスト項目
- データの保存・読み込み
- TTL（有効期限）機能
- エラーハンドリング

### Step 2.3テスト項目
- 各種検証処理の動作
- エッジケースの処理
- パフォーマンス

## 7. 成功基準

1. **機能維持**: UI・機能の動作が完全に維持される
2. **ビルド成功**: エラー・警告なし
3. **コード削減**: 重複コード200行以上削減
4. **保守性向上**: ヘルパークラスへの処理集約