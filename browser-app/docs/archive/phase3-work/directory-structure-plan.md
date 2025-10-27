# ディレクトリ構造整理計画

## 現状の問題点
- メインディレクトリにテスト、ビルド設定、本番設定が混在
- 用途が分かりにくく、管理が煩雑

## 提案する新構造

```
v10.3.3/
├── src/                     # ソースコード（変更なし）
├── styles/                  # スタイルシート（変更なし）
├── docs/                    # ドキュメント（変更なし）
├── archive/                 # アーカイブ（変更なし）
├── public/                  # 公開リソース（変更なし）
│
├── config/                  # 🆕 設定ファイル集約
│   ├── webpack.config.browser.cjs
│   ├── webpack.config.test.cjs
│   ├── vite.config.browser.ts
│   ├── production.config.js
│   ├── tsconfig.json
│   ├── .babelrc
│   └── kintone.config.json
│
├── test/                    # 🆕 テスト関連集約
│   ├── test-api-mock.html
│   ├── test-simple.js
│   └── dist/               # dist-testから名前変更
│
├── dist/                    # 🆕 本番ビルド出力
│   └── browser/            # dist-browserから移動
│
├── node_modules/           # 変更なし
├── package.json            # 変更なし
├── package-lock.json       # 変更なし
├── README.md               # 変更なし
├── .gitignore              # 変更なし
├── .gitattributes          # 変更なし
└── .github/                # 変更なし
```

## 整理の利点
1. **明確な分離**: テスト、設定、ビルド出力が明確に分離
2. **保守性向上**: 各ファイルの用途が一目瞭然
3. **開発効率**: 必要なファイルを素早く見つけられる

## 実装手順

### Step 1: configディレクトリの作成と移動
```bash
mkdir config
mv webpack.config.*.cjs config/
mv vite.config.browser.ts config/
mv production.config.js config/
mv tsconfig.json config/
mv .babelrc config/
mv kintone.config.json config/
```

### Step 2: testディレクトリの作成と移動
```bash
mkdir test
mv test-api-mock.html test/
mv test-simple.js test/
mv dist-test test/dist
```

### Step 3: distディレクトリの再構成
```bash
mkdir -p dist
mv dist-browser dist/browser
```

### Step 4: ビルドスクリプトの更新
package.jsonとconfig内のパスを新しい構造に合わせて更新

## 影響と対応

### 更新が必要なファイル
1. package.json - ビルドスクリプトのパス
2. webpack.config.*.cjs - 出力パスの調整
3. test-api-mock.html - スクリプトパスの調整
4. .gitignore - 新しいパスの追加

この計画で進めてよろしいですか？