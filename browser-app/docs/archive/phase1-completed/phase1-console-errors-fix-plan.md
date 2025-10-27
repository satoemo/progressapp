# Phase 1: コンソールエラー修正計画 - 2025年8月31日

## 概要
現在のコンソールに表示される2つのエラーを修正し、クリーンな実行環境を実現する。

## 対象エラー

### 1. CutCreatedイベントエラー
```
Event handler error for CutCreated: TypeError: Cannot read properties of undefined (reading 'includes')
```

### 2. Container not foundエラー
```
Failed to initialize app: Error: Container not found
```

## 原因分析

### エラー1: CutCreatedイベントエラー

**発生箇所**: `/src/ui/staff/StaffView.ts:115`

```typescript
if (event.eventType.includes('Updated') || event.eventType === 'CutCreated') {
```

**原因**: 
- `event.eventType`がundefinedの場合にエラーが発生
- イベントハンドラーの初期化時に不完全なイベントオブジェクトが渡される可能性

**影響度**: 低（機能には影響なし）

### エラー2: Container not foundエラー

**発生箇所**: `/test-api-mock.html:177`

```javascript
await app.initialize();  // containerIdが渡されていない
```

**原因**:
- `initialize()`メソッドは`containerId`パラメータを必要とするが、引数なしで呼び出されている
- 重複初期化の試行

**影響度**: 低（機能には影響なし、1回目の初期化は成功）

## 修正計画

### ステップ1: CutCreatedイベントエラーの修正

**ファイル**: `/src/ui/staff/StaffView.ts`

**修正内容**:
```typescript
// Before:
if (event.eventType.includes('Updated') || event.eventType === 'CutCreated') {

// After:
if (event.eventType && (event.eventType.includes('Updated') || event.eventType === 'CutCreated')) {
```

または、より安全に：
```typescript
if (event?.eventType && (event.eventType.includes('Updated') || event.eventType === 'CutCreated')) {
```

### ステップ2: Container not foundエラーの修正

**オプション1**: 重複初期化を防ぐ

**ファイル**: `/test-api-mock.html`

```javascript
// 177行目の初期化呼び出しを削除
// await app.initialize();  // この行を削除
```

**オプション2**: 適切なcontainerIdを渡す

```javascript
// Before:
await app.initialize();

// After:
await app.initialize('app');  // 適切なcontainerIdを渡す
```

**オプション3**: main-browser.tsで防御的コーディング

```typescript
async initialize(containerId?: string): Promise<void> {
  // デフォルト値を設定
  const id = containerId || 'app';
  // ...
}
```

## 実装手順

### 実装単位1: StaffViewのイベントハンドラー修正（15分）
1. StaffView.tsの115行目を修正
2. eventTypeの存在チェックを追加
3. テストで動作確認

### 実装単位2: test-api-mockの初期化修正（15分）
1. test-api-mock.htmlの重複初期化を修正
2. 適切なcontainerIdを渡すか、重複呼び出しを削除
3. テストで動作確認

## テスト方法

### テスト1: CutCreatedイベントエラーの確認
1. test-api-mock.htmlを開く
2. ダミーデータを生成
3. コンソールにCutCreatedエラーが表示されないことを確認

### テスト2: Container not foundエラーの確認
1. test-api-mock.htmlを開く
2. コンソールにContainer not foundエラーが表示されないことを確認
3. アプリケーションが正常に初期化されることを確認

## 期待される効果

1. **クリーンなコンソール**: エラーメッセージのない実行環境
2. **開発体験の向上**: 実際の問題と無関係なエラーに惑わされない
3. **信頼性の向上**: ユーザーがコンソールを開いてもエラーを見ない

## リスク評価

- **リスクレベル**: 低
- **機能への影響**: なし（既に機能は正常動作）
- **副作用**: なし（防御的コーディングの追加のみ）

## 完了条件

- [ ] StaffView.tsのイベントハンドラーエラーが解消
- [ ] test-api-mock.htmlの初期化エラーが解消
- [ ] すべての既存機能が正常動作
- [ ] ビルドエラーなし