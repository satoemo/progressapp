# テスト環境セットアップガイド（簡易版）

## 概要
test-api-mock.htmlを使用してテストを実行する環境設定です。
動的インポートエラーを回避するため、webpackでビルドしてから実行します。

## セットアップ手順

### 1. 依存関係のインストール
```bash
npm install
```

### 2. テストのビルド
```bash
npm run build:test
```

### 3. test-api-mock.htmlでテスト実行

#### 方法1: ビルド済みファイルを使用（推奨）
1. test-api-mock.htmlの193-195行目のコメントを解除
```html
<script src="dist-test/test-phase2.bundle.js"></script>
<script src="dist-test/test-phase3.bundle.js"></script>
```

2. ブラウザでtest-api-mock.htmlを開く（file://でOK）

3. コンソールで実行
```javascript
// Phase 2テスト
runPhase2Step6Tests();

// Phase 3テスト
runPhase3Step1Tests();
```

#### 方法2: 通常のスクリプト読み込み（ビルド不要）
```javascript
// コンソールで実行
const script = document.createElement('script');
script.src = './test-all-phase2.js';
document.head.appendChild(script);

// ロード後に実行
runPhase2Step6Tests();
```

## ファイル構成

### 設定ファイル
```
v10.3.3/
├── webpack.config.test.js    # Webpack設定
├── package.json              # npm設定（更新済み）
├── .babelrc                  # Babel設定
└── test-api-mock.html        # テスト実行HTML（既存）
```

### テストファイル
```
v10.3.3/
├── test-all-phase2.js        # Phase 2テスト
├── test-phase3-step1.js      # Phase 3テスト
└── dist-test/                # ビルド出力
    ├── test-phase2.bundle.js
    └── test-phase3.bundle.js
```

## 設定の詳細

### Webpack設定（webpack.config.test.js）
- **モード**: development（ソースマップ付き）
- **エントリー**: test-all-phase2.js, test-phase3-step1.js
- **出力**: dist-test/ディレクトリ
- **解決**: TypeScript/JavaScript拡張子の自動解決
- **エイリアス**: @でsrc/ディレクトリを参照

### package.jsonスクリプト
| コマンド | 説明 |
|---------|------|
| `npm run build:test` | テストファイルをビルド |
| `npm run test:dev` | 開発サーバー起動（http://localhost:9000） |

## トラブルシューティング

### よくある問題と解決方法

#### 1. モジュール解決エラー
```
Failed to resolve module specifier './src/...'
```
**解決**: ビルドしてから実行する
```bash
npm run build:test
```

#### 2. CORS エラー
```
CORS-cross-origin script error
```
**解決**: 開発サーバーを使用する
```bash
npm run test:dev
```

#### 3. TypeScriptエラー
```
Cannot find module or type declarations
```
**解決**: TypeScript設定を確認
```bash
npm run typecheck
```

## メリット

### この設定の利点
1. ✅ **モジュール解決の自動化** - import/exportが正しく動作
2. ✅ **CORS問題の回避** - 開発サーバー経由でアクセス
3. ✅ **ホットリロード** - コード変更時に自動更新
4. ✅ **ソースマップ** - デバッグが容易
5. ✅ **統合テストUI** - ブラウザで簡単にテスト実行

### 従来の方法との比較
| 項目 | 従来の方法 | 新しい方法 |
|------|-----------|-----------|
| モジュール解決 | ❌ エラー発生 | ✅ 自動解決 |
| CORS | ❌ 制限あり | ✅ 問題なし |
| TypeScript | ❌ 直接実行不可 | ✅ トランスパイル済み |
| デバッグ | 😐 限定的 | ✅ ソースマップ付き |
| 実行速度 | 😐 普通 | ✅ 高速（ビルド済み） |

## 推奨ワークフロー

### 開発時
1. 開発サーバーを起動
```bash
npm run test:dev
```

2. コードを編集（自動リロード）

3. ブラウザでテスト実行

### CI/CD
1. ビルド
```bash
npm run build:test
```

2. テスト実行（ヘッドレスブラウザ）
```bash
# Puppeteer/Playwright等で自動化
```

## まとめ

test-api-mock.htmlをそのまま使い、webpackでビルド済みファイルを読み込む方法により：
- ✅ 既存のテスト環境を活用
- ✅ モジュール解決エラーを回避
- ✅ サーバー不要でエクスプローラーから直接開ける
- ✅ 最小限の設定で動作