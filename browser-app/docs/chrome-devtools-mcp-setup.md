# chrome-devtools-mcp設定ガイド（WSL環境）

## 概要
chrome-devtools-mcpは、ClaudeがChromeブラウザを直接操作してテストを自動化できるツールです。
WSL環境で使用するには、Linux用のChromiumをインストールする必要があります。

## 初回セットアップ手順

### 1. Chromiumのインストール

```bash
sudo apt update
sudo apt install chromium-browser
```

### 2. chrome-devtools-mcp用のシンボリックリンク作成

chrome-devtools-mcpは特定のパスでChromeを探すため、シンボリックリンクを作成します：

```bash
sudo mkdir -p /opt/google/chrome
sudo ln -sf /usr/bin/chromium-browser /opt/google/chrome/chrome
```

### 3. 動作確認

インストールが完了したら、以下のコマンドで確認できます：

```bash
# Chromiumがインストールされているか確認
which chromium-browser

# シンボリックリンクが作成されているか確認
ls -la /opt/google/chrome/chrome
```

## 主な機能

### ページ操作
- `mcp__chrome-devtools__new_page` - 新しいページを開く
- `mcp__chrome-devtools__navigate_page` - ページ遷移
- `mcp__chrome-devtools__list_pages` - 開いているページ一覧

### 情報取得
- `mcp__chrome-devtools__take_snapshot` - ページ構造をテキストで取得
- `mcp__chrome-devtools__take_screenshot` - スクリーンショット撮影
- `mcp__chrome-devtools__list_console_messages` - コンソールログ・エラー確認
- `mcp__chrome-devtools__list_network_requests` - ネットワークリクエスト一覧

### UI操作
- `mcp__chrome-devtools__click` - 要素をクリック
- `mcp__chrome-devtools__fill` - フォーム入力
- `mcp__chrome-devtools__hover` - 要素にホバー
- `mcp__chrome-devtools__handle_dialog` - ダイアログ処理

### デバッグ
- `mcp__chrome-devtools__evaluate_script` - JavaScript実行
- `mcp__chrome-devtools__emulate_cpu` - CPU制限エミュレート
- `mcp__chrome-devtools__emulate_network` - ネットワーク制限

### パフォーマンス分析
- `mcp__chrome-devtools__performance_start_trace` - パフォーマンストレース開始
- `mcp__chrome-devtools__performance_stop_trace` - トレース停止

## 使用例

### 基本的なテストフロー

```
1. Claudeがページを開く
   mcp__chrome-devtools__new_page(url="file:///path/to/test.html")

2. コンソールエラーを確認
   mcp__chrome-devtools__list_console_messages()

3. ボタンをクリック
   mcp__chrome-devtools__click(uid="button_id")

4. スクリーンショットで確認
   mcp__chrome-devtools__take_screenshot()
```

### このプロジェクトでの活用例

1. **自動テスト**
   - ダミーデータ生成ボタンをクリック
   - フォーム入力のテスト
   - UI操作の自動化

2. **デバッグ支援**
   - コンソールエラーの自動検出・分析
   - ネットワークリクエストの確認
   - JavaScriptの実行状態確認

3. **ビジュアル確認**
   - スクリーンショットで視覚的な変更を確認
   - レイアウト崩れの検出

4. **パフォーマンス分析**
   - ページ読み込み速度の測定
   - レンダリング性能の評価

## 注意事項

### 制限事項
- chrome-devtools-mcpは**Claudeがページを開いている時のみ**使用可能
- ユーザーが手動でブラウザを開いてテストしている時は使用不可

### エラー報告の方法

**Claudeがテストを実行する場合：**
- chrome-devtools-mcpでコンソールエラーを自動取得
- エラーの貼り付けは不要

**ユーザーが手動でテストする場合：**
- 従来通りコンソールエラーを貼り付け
- スクリーンショットを提供

### 推奨される使い分け

両方の方法を併用するのが最も効率的です：

- **自動化テスト** → chrome-devtools-mcp
- **手動テスト** → 従来の方法（エラー貼り付け）
- **最終確認** → ユーザーによる手動テスト

## トラブルシューティング

### "Could not find Google Chrome executable" エラー

シンボリックリンクが作成されていない可能性があります：

```bash
# シンボリックリンクを再作成
sudo mkdir -p /opt/google/chrome
sudo ln -sf /usr/bin/chromium-browser /opt/google/chrome/chrome
```

### Chromiumが起動しない

Chromiumが正しくインストールされているか確認：

```bash
chromium-browser --version
```

## 参考情報

- chrome-devtools-mcpはWSL環境でLinux用Chromeを使用
- WindowsのChromeとは別に、WSL内にChromiumをインストールする必要がある
- 手動テスト時はWindowsのChromeを使用可能（従来通り）
