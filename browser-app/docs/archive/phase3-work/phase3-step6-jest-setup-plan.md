# Phase 3 Step 6: Jest基盤構築計画

## 目的
- ユニットテストの基盤を構築
- 主要コンポーネントのテストカバレッジを確保
- CI/CDパイプラインでの自動テスト実行の準備

## 実装計画

### 1. Jest環境のセットアップ（20分）

#### インストール
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/jest-dom
npm install --save-dev jest-environment-jsdom
```

#### 設定ファイル作成
- jest.config.js
- tsconfig.test.json
- test/setup.ts

### 2. テスト対象の選定

#### 優先度高（Phase 3 Step 6で実装）
1. **UnifiedDataStore** - データ管理の中核
2. **FilterManager** - フィルタロジック
3. **CutNumber** - カット番号処理
4. **ViewStateManager** - 状態管理

#### 優先度中（将来実装）
- ServiceContainer（DI）
- ApplicationFacade（ファサード）
- 各種フォーマッター

### 3. テストファイル構成

```
test/
├── unit/
│   ├── infrastructure/
│   │   └── UnifiedDataStore.test.ts
│   ├── ui/
│   │   ├── components/
│   │   │   └── filter/
│   │   │       └── FilterManager.test.ts
│   │   └── shared/
│   │       └── state/
│   │           └── ViewStateManager.test.ts
│   └── domain/
│       └── value-objects/
│           └── CutNumber.test.ts
├── fixtures/
│   ├── cutData.ts
│   └── mockData.ts
└── setup.ts
```

### 4. テストケース設計

#### UnifiedDataStore
- データの追加・更新・削除
- フィルタリング機能
- キャッシュ機能
- 永続化機能

#### FilterManager
- フィルタの適用
- 複数フィルタの組み合わせ
- フィルタのクリア
- 状態の保存・復元

#### CutNumber
- 正常な番号のパース
- 不正な入力の処理
- 比較・ソート機能
- シリアライズ

#### ViewStateManager
- 状態の保存
- 状態の復元
- LocalStorageとの連携
- マイグレーション

### 5. 実装手順

#### Step 1: Jest設定（10分）
1. パッケージインストール
2. jest.config.js作成
3. npm scriptsに追加

#### Step 2: 基本テスト作成（30分）
1. CutNumber.test.ts - 値オブジェクトの単純なテスト
2. 実行確認とデバッグ

#### Step 3: 複雑なテスト作成（40分）
1. UnifiedDataStore.test.ts
2. FilterManager.test.ts
3. ViewStateManager.test.ts

#### Step 4: カバレッジ確認（10分）
1. カバレッジレポート生成
2. 不足部分の特定

### 6. 成功基準

- `npm test`でテストが実行される
- 対象4コンポーネントのカバレッジ70%以上
- CI（GitHub Actions）でテスト自動実行
- テストが5秒以内に完了

## リスクと対策

### リスク
1. DOM依存のコンポーネントのテストが困難
2. LocalStorage依存の機能のモック化
3. 非同期処理のテスト

### 対策
1. jsdom環境を使用
2. LocalStorageのモック実装
3. async/awaitとJestのタイマーモック活用

## スケジュール

1. **準備（10分）**
   - 現在の動作確認
   - バックアップ

2. **実装（90分）**
   - Step 1-4の実施

3. **検証（20分）**
   - テスト実行
   - カバレッジ確認
   - CIセットアップ

## この計画で進めてよろしいですか？

「はい」で実装を開始します。
別の方針をご希望の場合はお知らせください。