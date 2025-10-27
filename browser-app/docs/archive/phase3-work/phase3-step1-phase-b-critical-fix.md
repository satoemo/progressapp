# Phase B 重大バグ修正：getCutData()メソッド問題

## 問題の詳細
ダミーデータ生成後も、リロード後も、表にデータが表示されない重大な問題

## 根本原因

### エラーの発生箇所
`UnifiedDataStore.findAll()`メソッド内で**JavaScriptエラー**が発生していた

### 原因
```typescript
// 誤ったコード
for (const readModel of this.readModels.values()) {
  const cutData = readModel.getCutData();  // ❌ getCutData()メソッドが存在しない！
  // ...
}
```

**CutReadModelインターフェースには`getCutData()`メソッドが定義されていない**

### 技術的詳細
1. **CutReadModel**はインターフェースで、CutDataを継承している
2. **readModel自体がCutData**であり、別途getCutData()を呼ぶ必要がない
3. 存在しないメソッドを呼んだため、JavaScriptエラーが発生
4. エラーによりfindAll()が空配列を返し、表にデータが表示されない

### ログから判明した証拠
```
[UnifiedDataStore] findAll called, readModels size: 50  ← 50件のデータがある
[UnifiedDataStore] findAll returning X results  ← このログが出力されない（エラーで処理が中断）
```

## 修正内容

### UnifiedDataStore.tsの4箇所を修正

#### 1. findByCutNumber()
```typescript
// 修正前
const cutData = readModel.getCutData();
if (cutData.cutNumber === cutNumber) {

// 修正後
// CutReadModelは既にCutDataを継承しているので、readModel自体がデータ
if (readModel.cutNumber === cutNumber) {
```

#### 2. findByFilter()
```typescript
// 修正前
const cutData = readModel.getCutData();
if (filter(cutData)) {

// 修正後
if (filter(readModel)) {
```

#### 3. findById()
```typescript
// 修正前
return readModel ? readModel.getCutData() : null;

// 修正後
return readModel || null;
```

#### 4. findAll()（最重要）
```typescript
// 修正前
const cutData = readModel.getCutData();
// ... cutDataを使用

// 修正後
// readModel自体を直接使用
```

## 影響範囲

### 修正により解決される問題
1. **ダミーデータ生成後の表示問題** - 解決
2. **リロード後のデータ消失問題** - 解決
3. **findAll()が0件を返す問題** - 解決

### パフォーマンスへの影響
- 不要なメソッド呼び出しがなくなり、わずかに高速化

## テスト項目

### 1. 基本動作確認
1. test-api-mock.htmlを開く
2. コンソールで以下を確認
   - `[UnifiedDataStore] findAll returning 0 results` → `returning 50 results`に変わる
3. 「ダミーデータ生成（50件）」をクリック
4. **進捗管理表にデータが表示されることを確認** ← 重要

### 2. リロードテスト
1. F5でページをリロード
2. **データが保持され、表に表示されることを確認** ← 重要

### 3. ログ確認
正常なログ出力：
```
[UnifiedDataStore] findAll called, readModels size: 50
[UnifiedDataStore] findAll returning 50 results  ← これが出力されるようになる
```

## 教訓

### 1. インターフェース設計の重要性
- CutReadModelはCutDataを継承しているため、データそのもの
- 追加のアクセサメソッドは不要

### 2. エラーハンドリング
- JavaScriptの未定義メソッド呼び出しはエラーで処理が中断
- try-catchで保護するか、存在チェックが必要

### 3. ログの重要性
- 「returning X results」のログが出力されないことで問題箇所を特定できた
- 処理の開始と終了の両方でログを出力することが重要

## 今後の改善提案

1. **エラーハンドリングの追加**
   ```typescript
   try {
     // findAll処理
   } catch (error) {
     console.error('[UnifiedDataStore] findAll error:', error);
     return [];
   }
   ```

2. **TypeScript型チェックの強化**
   - strictモードの有効化
   - noImplicitAnyの設定

3. **単体テストの追加**
   - UnifiedDataStore.findAll()のテスト
   - エッジケースのカバー