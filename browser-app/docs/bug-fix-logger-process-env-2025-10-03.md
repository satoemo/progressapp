# バグ修正レポート: Logger.ts のブラウザ環境対応

**日付**: 2025-10-03
**修正者**: Claude Code
**重要度**: 高（削除機能が動作不能）

## 問題の概要

削除機能のテスト中に、ブラウザ環境で`process is not defined`エラーが発生し、削除処理が失敗していた。

## 発見の経緯

1. chrome-devtools-mcpを使用して削除機能をテスト
2. 削除ボタンクリック時にエラーダイアログが表示
3. コンソールログを確認したところ、Loggerクラスで`ReferenceError: process is not defined`を検出

## 根本原因

`src/utils/Logger.ts`内で、Node.js環境の`process.env.NODE_ENV`を参照していたが、ブラウザ環境では`process`オブジェクトが存在しないため、エラーが発生していた。

### エラー発生箇所

**Logger.ts:139, 157, 192**
```typescript
// 本番環境ではERROR以外をスキップ
if (process.env.NODE_ENV === 'production' && level > LogLevel.ERROR) return;

// 本番環境ではメモリ保存をスキップ
if (process.env.NODE_ENV !== 'production') {
  // メモリに保存
}

// 本番環境ではエラーのみ出力
if (process.env.NODE_ENV === 'production') {
  if (entry.level === LogLevel.ERROR) {
    console.error(entry.message, DataProcessor.safeString(entry.error));
  }
  return;
}
```

## 修正内容

Viteプロジェクトで推奨される`import.meta.env.PROD`を使用するように変更。

### 修正ファイル

**src/utils/Logger.ts**

#### 修正1: log()メソッド (139行目)
```typescript
// 修正前
if (process.env.NODE_ENV === 'production' && level > LogLevel.ERROR) return;

// 修正後
if (import.meta.env.PROD && level > LogLevel.ERROR) return;
```

#### 修正2: log()メソッド (157行目)
```typescript
// 修正前
if (process.env.NODE_ENV !== 'production') {

// 修正後
if (!import.meta.env.PROD) {
```

#### 修正3: outputToConsole()メソッド (192行目)
```typescript
// 修正前
if (process.env.NODE_ENV === 'production') {

// 修正後
if (import.meta.env.PROD) {
```

## 技術的詳細

### Viteの環境変数

| Node.js | Vite | 説明 |
|---------|------|------|
| `process.env.NODE_ENV === 'production'` | `import.meta.env.PROD` | 本番環境判定 |
| `process.env.NODE_ENV === 'development'` | `import.meta.env.DEV` | 開発環境判定 |

ViteではESM標準の`import.meta.env`を使用し、ビルド時にコード置換される。ブラウザ環境でも正常に動作する。

## 影響範囲

### 修正前の影響
- **削除機能**: 完全に動作不能
- **その他のデータ操作**: Loggerを使用する全ての処理で潜在的にエラーの可能性

### 修正後の動作確認
- ✅ 削除機能が正常動作（5件→4件→3件と連続削除成功）
- ✅ `process is not defined`エラーが完全に解消
- ✅ デバッグログが正常に出力

## テスト結果

### 削除機能テスト
```
初回削除: 5件 → 4件 ✅
2回目削除: 4件 → 3件 ✅
```

### コンソールログ（正常な動作）
```
[ProgressTable] 削除ボタンがクリックされました
[ProgressTable] カットID: cut_1759472543391
[ProgressTable] カット情報: 010
[ProgressTable] 削除処理を開始します
[ProgressTable] deleteCut完了
[UnifiedDataStore] findAll returning 4 results
[ProgressTable] refreshData完了
```

## 再発防止策

1. **環境変数の使用ルール**
   - Node.js専用コードでは`process.env.*`
   - ブラウザで実行されるコードでは`import.meta.env.*`を使用

2. **コードレビューチェックリスト**
   - [ ] ブラウザで実行されるコードに`process`参照がないか確認
   - [ ] Viteプロジェクトでは`import.meta.env`を使用しているか確認

3. **テスト環境の整備**
   - chrome-devtools-mcpを活用したブラウザ環境での動作確認を継続

## 関連ファイル

- `src/utils/Logger.ts` - 修正対象ファイル
- `src/ui/components/table/ProgressTable.ts` - 削除機能（このバグの影響を受けていた）
- `test/test-api-mock.html` - テスト環境

## 備考

このバグは前回の開発セッションで削除機能の実装時には発生しておらず、今回のテスト環境（chrome-devtools-mcp）で初めて検出された。ローカルテスト環境の重要性を再認識する事例となった。
