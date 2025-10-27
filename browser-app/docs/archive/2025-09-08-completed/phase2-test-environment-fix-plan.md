# Phase 2: テスト環境修正計画

## 概要
Phase 2のUIコンポーネント移行の前提条件として、test-api-mock.htmlの動作不具合を解消し、完全に動作するテスト環境を構築する。

## 現状の問題点

### 1. スタイルシート問題（優先度：高）
- **問題**: test-api-mock.htmlでstyle.cssがコメントアウトされている
- **影響**: デザインが一切適用されず、テーブルやUIコンポーネントが正しく表示されない
```html
<!-- スタイルシートは後でビルド後に有効化
<link rel="stylesheet" href="./dist-browser/style.css"> -->
```

### 2. generateDummyData未実装（優先度：高）
- **問題**: KintoneProgressAppV10_3クラスにgenerateDummyDataメソッドがない
- **影響**: ダミーデータ生成ボタンが機能しない
- **詳細**: 
  - generateDummyData関数はsrc/ui/generateDummyData.tsに存在
  - main-browser.tsでインポートしているが、使用されていない
  - windowオブジェクトに公開されていない

### 3. clearData未実装（優先度：中）
- **問題**: KintoneProgressAppV10_3クラスにclearDataメソッドがない
- **影響**: データクリアボタンが機能しない

### 4. UIコンポーネント生成問題（優先度：高）
- **問題**: ProgressTableが正しく生成・表示されていない
- **影響**: データを生成してもテーブルが表示されない
- **原因推定**: タブ機能やAppInitializerの初期化フローの問題

## 修正実装計画

### Step 2.T1: スタイルシート修正（15分）
1. test-api-mock.htmlのstyle.css読み込みを有効化
2. main.cssなど必要なCSSファイルの追加読み込み検討

### Step 2.T2: generateDummyData実装（30分）
1. KintoneProgressAppV10_3クラスにgenerateDummyDataメソッド追加
2. ApplicationFacadeを利用したデータ生成
3. windowオブジェクトへの適切な公開

### Step 2.T3: clearData実装（20分）
1. KintoneProgressAppV10_3クラスにclearDataメソッド追加
2. ReadModelStoreとLocalStorageのクリア処理
3. UIのリフレッシュ処理

### Step 2.T4: UIコンポーネント表示修正（45分）
1. AppInitializerの初期化フロー確認
2. ProgressTableのrender処理確認
3. タブ機能の簡素化または無効化（test環境用）
4. 必要に応じてtest-api-mock.html専用の簡易初期化フローを実装

### Step 2.T5: 統合テスト（30分）
1. ダミーデータ生成→表示確認
2. 編集機能の動作確認
3. 削除機能の動作確認
4. フィルター機能の動作確認
5. ストレージ保存・読み込み確認

## 実装アプローチ

### Option A: 最小限の修正（推奨）
- test-api-mock.html専用の簡易メソッドを追加
- 既存のアーキテクチャは変更しない
- 工数：約2時間

### Option B: 根本的な改善
- test環境用の専用初期化フローを構築
- AppInitializerをバイパスする簡易モード追加
- 工数：約4時間

## 成功基準

1. ✅ test-api-mock.htmlを開いた時、適切なデザインで表示される
2. ✅ ダミーデータ生成ボタンが正常に動作する
3. ✅ 生成されたデータがテーブルに表示される
4. ✅ データの編集・削除が可能
5. ✅ フィルター機能が動作する
6. ✅ データクリアボタンが正常に動作する
7. ✅ ストレージクリアボタンが正常に動作する

## 推奨実装順序

1. **Step 2.T1**（スタイルシート）→ 見た目を正常化
2. **Step 2.T4**（UIコンポーネント）→ 基本表示を確認
3. **Step 2.T2**（generateDummyData）→ データ生成を可能に
4. **Step 2.T3**（clearData）→ クリア機能追加
5. **Step 2.T5**（統合テスト）→ 全体動作確認

## リスクと対策

### リスク1: タブ機能との競合
- **対策**: test環境ではタブ機能を無効化し、進捗テーブルのみ表示

### リスク2: 複雑な初期化フロー
- **対策**: test環境専用の簡易初期化メソッドを追加

### リスク3: CSS競合
- **対策**: test-api-mock.html専用のCSSスコープ設定

## 次のステップ

この計画はTODO.mdのPhase 2「テスト環境修正（最優先）」として記載済みです。

承認いただければ、Step 2.T1（スタイルシート修正）から順次実装を開始します。

実装完了後は、Phase 2の残りタスク（UIコンポーネント移行）に進みます。