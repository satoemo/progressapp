# ESLint導入ガイド - TypeScriptプロジェクト向け

**作成日**: 2025-10-03
**対象プロジェクト**: kintone進捗管理アプリ v10.3.3

---

## ESLintとは？

**ESLint**は、JavaScriptおよびTypeScriptコードの静的解析ツールです。

### 主な機能

1. **コード品質の向上**
   - 潜在的なバグを検出
   - ベストプラクティスの強制
   - コーディング規約の統一

2. **型安全性の強化**
   - TypeScriptの型チェックを補完
   - `any` の使用を制限
   - 安全でない操作を警告

3. **自動修正**
   - 多くのルール違反を自動修正可能
   - コードフォーマットの統一

---

## なぜESLintが必要なのか？

### TypeScriptだけでは不十分な理由

今回発見した問題：
```typescript
// TypeScriptは検出できなかった
DataProcessor.generateId('cut')  // メソッドが存在しない
```

**TypeScriptの限界**:
- 動的なプロパティアクセスは検出できない
- ランタイムエラーは検出できない
- コーディングスタイルは強制できない

**ESLintで検出可能**:
- 未使用の変数・関数
- 危険なパターン（`any` の多用など）
- 潜在的なバグ
- コーディング規約違反

---

## インストール方法

### ステップ1: パッケージのインストール

```bash
cd /home/yamada/claudeproject/kintone/v10.3.3

# ESLint本体とTypeScript用プラグインをインストール
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# 追加の推奨プラグイン
npm install --save-dev eslint-plugin-import eslint-plugin-unused-imports
```

**インストールされるパッケージ**:
- `eslint` - ESLint本体
- `@typescript-eslint/parser` - TypeScript用パーサー
- `@typescript-eslint/eslint-plugin` - TypeScript用ルール集
- `eslint-plugin-import` - import文のチェック
- `eslint-plugin-unused-imports` - 未使用importの検出

---

### ステップ2: 設定ファイルの作成

プロジェクトルートに `.eslintrc.json` を作成：

```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": ["./config/tsconfig.json"]
  },
  "plugins": [
    "@typescript-eslint",
    "import",
    "unused-imports"
  ],
  "rules": {
    // 型安全性
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",

    // 未使用コードの検出
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        "vars": "all",
        "varsIgnorePattern": "^_",
        "args": "after-used",
        "argsIgnorePattern": "^_"
      }
    ],

    // コード品質
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error",

    // import文の整理
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],

    // ベストプラクティス
    "no-console": "off",
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error"
  },
  "ignorePatterns": [
    "dist",
    "node_modules",
    "*.js",
    "*.d.ts",
    "test/dist"
  ]
}
```

---

### ステップ3: package.jsonにスクリプト追加

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "lint:quiet": "eslint src --ext .ts,.tsx --quiet"
  }
}
```

---

## 使用方法

### 基本的な使い方

#### 1. すべてのファイルをチェック
```bash
npm run lint
```

#### 2. 自動修正
```bash
npm run lint:fix
```

#### 3. エラーのみ表示（警告を非表示）
```bash
npm run lint:quiet
```

---

## 主要なESLintルールの説明

### 1. 型安全性ルール

#### `@typescript-eslint/no-explicit-any`
```typescript
// ❌ エラー
function process(data: any) {
  return data;
}

// ✅ 正しい
function process(data: unknown) {
  if (typeof data === 'string') {
    return data;
  }
}
```

#### `@typescript-eslint/no-unsafe-call`
```typescript
// ❌ エラー
function callSomething(obj: any) {
  obj.method(); // any型のメソッド呼び出し
}

// ✅ 正しい
function callSomething(obj: { method: () => void }) {
  obj.method();
}
```

#### `@typescript-eslint/no-unsafe-member-access`
```typescript
// ❌ エラー
function getValue(obj: any) {
  return obj.property; // any型のプロパティアクセス
}

// ✅ 正しい
function getValue(obj: { property: string }) {
  return obj.property;
}
```

---

### 2. 未使用コードの検出

#### `unused-imports/no-unused-imports`
```typescript
// ❌ エラー
import { unused } from './module'; // 未使用のimport
import { used } from './module';

export function example() {
  return used();
}

// ✅ 正しい（自動修正可能）
import { used } from './module';

export function example() {
  return used();
}
```

#### `@typescript-eslint/no-unused-vars`
```typescript
// ❌ エラー
function example(param1: string, param2: string) {
  return param1; // param2が未使用
}

// ✅ 正しい（_プレフィックスで意図的に無視）
function example(param1: string, _param2: string) {
  return param1;
}
```

---

### 3. Promise/非同期処理のルール

#### `@typescript-eslint/no-floating-promises`
```typescript
// ❌ エラー
async function fetchData() {
  // ...
}

fetchData(); // Promiseが放置されている

// ✅ 正しい
async function example() {
  await fetchData();
}

// または
fetchData().catch(error => {
  console.error(error);
});
```

#### `@typescript-eslint/await-thenable`
```typescript
// ❌ エラー
async function example() {
  const value = 42;
  await value; // Promiseではない値にawaitを使用
}

// ✅ 正しい
async function example() {
  const promise = fetchData();
  await promise;
}
```

---

### 4. import文の整理

#### `import/order`
```typescript
// ❌ エラー（順序がバラバラ）
import { Component } from './Component';
import * as React from 'react';
import { helper } from '../utils/helper';

// ✅ 正しい（グループ分けとアルファベット順）
import * as React from 'react';

import { helper } from '../utils/helper';

import { Component } from './Component';
```

---

## 段階的な導入戦略

### フェーズ1: 基本設定（即座に実施可能）

```json
{
  "rules": {
    "no-console": "off",
    "no-debugger": "warn",
    "prefer-const": "warn",
    "no-var": "error"
  }
}
```

### フェーズ2: TypeScript基本ルール（1週間後）

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "unused-imports/no-unused-imports": "warn"
  }
}
```

### フェーズ3: 厳格なルール（1ヶ月後）

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error"
  }
}
```

---

## プリコミットフックの設定

### Huskyとlint-stagedのインストール

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

### lint-stagedの設定

`package.json` に追加：

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "git add"
    ]
  }
}
```

**効果**:
- コミット前に自動的にESLintが実行される
- 修正可能なエラーは自動修正される
- エラーがある場合はコミットが中断される

---

## CI/CDでの統合

### GitHub Actionsの例

`.github/workflows/lint.yml` を作成：

```yaml
name: ESLint Check

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npm run typecheck
```

---

## よくある問題と解決方法

### 問題1: 大量のエラーが表示される

**解決策**: 段階的に導入

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn" // errorの代わりにwarn
  }
}
```

### 問題2: 既存コードの修正が大変

**解決策**: 自動修正を活用

```bash
# 修正可能なものをすべて自動修正
npm run lint:fix

# 特定のディレクトリのみ修正
npx eslint src/services --fix
```

### 問題3: 特定のファイルを除外したい

**解決策**: `.eslintignore` ファイルを作成

```
# .eslintignore
dist/
node_modules/
*.test.ts
*.spec.ts
```

または、ファイル内でルールを無効化：

```typescript
// ファイル全体で無効化
/* eslint-disable @typescript-eslint/no-explicit-any */

// 特定の行だけ無効化
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = {};
```

---

## 推奨設定（このプロジェクト用）

### 最小限の設定（今すぐ導入可能）

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "off",
    "prefer-const": "error",
    "no-var": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### 推奨設定（1週間後）

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "warn",
    "unused-imports/no-unused-imports": "error"
  }
}
```

### 厳格な設定（1ヶ月後）

上記の完全な `.eslintrc.json` を使用

---

## ESLintの効果測定

### 導入前後の比較

#### 導入前
```typescript
// 型チェックを通過するが危険なコード
function process(data: any) {
  return data.method(); // 実行時エラーの可能性
}
```

#### 導入後
```typescript
// ESLintがエラーを検出
function process(data: any) { // ❌ no-explicit-any
  return data.method(); // ❌ no-unsafe-call
}

// 修正後
function process(data: { method: () => void }) {
  return data.method(); // ✅ 型安全
}
```

---

## 次のステップ

### 即座に実施
1. ✅ `skipLibCheck: false` に変更（完了）
2. ⏳ ESLintのインストール
3. ⏳ 基本設定ファイルの作成
4. ⏳ `npm run lint` の実行

### 1週間以内
1. エラーの修正（自動修正 + 手動修正）
2. プリコミットフックの設定
3. チーム内での運用ルール決定

### 1ヶ月以内
1. より厳格なルールの追加
2. CI/CDでの自動チェック導入
3. コードレビュー基準への組み込み

---

## 参考リンク

- **ESLint公式**: https://eslint.org/
- **TypeScript ESLint**: https://typescript-eslint.io/
- **ルール一覧**: https://typescript-eslint.io/rules/
- **プレイグラウンド**: https://typescript-eslint.io/play/

---

## まとめ

### ESLintを導入すべき理由

1. ✅ **型チェックの補完** - TypeScriptだけでは検出できないエラーを発見
2. ✅ **コード品質の向上** - ベストプラクティスの強制
3. ✅ **バグの早期発見** - 実行前に潜在的な問題を検出
4. ✅ **チーム開発の効率化** - コーディング規約の統一
5. ✅ **保守性の向上** - 読みやすく一貫性のあるコード

### 導入のハードル

- **初回設定**: 約30分
- **既存コードの修正**: 1-2日（自動修正を活用）
- **学習コスト**: 低（警告メッセージが分かりやすい）

### 投資対効果

今回のような「存在しないメソッド呼び出し」は、適切なESLint設定があれば**コミット前に自動検出**できます。

---

**作成日**: 2025-10-03
**最終更新**: 2025-10-03
