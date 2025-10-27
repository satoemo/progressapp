# テスト環境戦略（簡素化版） - 2025-09-02

## 現状の問題

### 複雑なテスト環境
- webpack設定が複雑
- 複数のテストファイル（test-all-phase1.js, test-all-phase2.js等）
- ビルドプロセスが必要
- デバッグが困難

### 提案：シンプルなテスト環境

## 基本方針

1. **ブラウザで直接実行可能**
   - HTTPサーバー不要
   - ビルドプロセス最小限
   - console.logでの即座の確認

2. **単一のテストHTML**
   - test-api-mock.html を統一環境として使用
   - モックデータ込み

3. **段階的なテスト追加**
   - 各実装Stepごとにテストを追加
   - 独立して実行可能

## 推奨テスト構造

### 1. メインテストHTML
```html
<!-- test-api-mock.html -->
<!DOCTYPE html>
<html>
<head>
    <title>統合テスト環境</title>
    <style>
        /* 視覚的な確認用のスタイル */
        .test-container { padding: 20px; }
        .test-result { margin: 10px 0; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <div class="test-container">
        <h1>Kintone v10.3.3 テスト環境</h1>
        
        <!-- テスト結果表示エリア -->
        <div id="test-results"></div>
        
        <!-- データ表示用テーブル -->
        <div id="test-table"></div>
    </div>
    
    <!-- 本体コード（ビルド済み） -->
    <script src="dist/main-browser.js"></script>
    
    <!-- テストコード（直接記述） -->
    <script>
        // グローバルにテスト関数を定義
        window.runTests = async function() {
            console.log('=== テスト開始 ===');
            
            try {
                // Phase 1 テスト
                await testPhase1();
                
                // Phase 2 テスト（実装後）
                // await testPhase2();
                
                console.log('✅ すべてのテスト完了');
            } catch (error) {
                console.error('❌ テスト失敗:', error);
            }
        };
        
        // Phase 1: 削除処理の簡素化テスト
        async function testPhase1() {
            console.log('--- Phase 1: 削除処理テスト ---');
            
            // 1. サービス初期化
            const service = new SimpleCutService();
            
            // 2. テストデータ作成
            const cut = await service.create({
                cutNumber: 1,
                scene: 'テストシーン',
                cut: 'カット1'
            });
            console.log('✅ データ作成成功:', cut.id);
            
            // 3. 削除実行
            await service.delete(cut.id);
            console.log('✅ 削除実行成功');
            
            // 4. 削除確認
            const deletedCut = await service.findById(cut.id);
            if (deletedCut && deletedCut.isDeleted) {
                console.log('✅ 削除フラグ確認');
            } else {
                throw new Error('削除フラグが設定されていません');
            }
            
            // 5. 一覧から除外確認
            const allCuts = await service.findAll();
            const found = allCuts.find(c => c.id === cut.id);
            if (!found) {
                console.log('✅ 一覧から除外確認');
            } else {
                throw new Error('削除済みデータが一覧に表示されています');
            }
        }
        
        // 自動実行
        window.addEventListener('load', () => {
            console.log('テストを実行するには、コンソールで runTests() を実行してください');
        });
    </script>
</body>
</html>
```

### 2. 個別機能テスト
```javascript
// コンソールから実行可能な個別テスト

// 削除機能のみテスト
async function testDeletionOnly() {
    const service = new SimpleCutService();
    const cut = await service.create({ cutNumber: 999 });
    await service.delete(cut.id);
    console.log('削除テスト完了');
}

// パフォーマンステスト
async function testPerformance() {
    const service = new SimpleCutService();
    
    console.time('100件作成');
    for (let i = 0; i < 100; i++) {
        await service.create({ cutNumber: i });
    }
    console.timeEnd('100件作成');
    
    const all = await service.findAll();
    console.log(`作成数: ${all.length}`);
}
```

## テスト実行方法

### 1. 基本的な実行
```bash
# 1. ビルド（必要な場合のみ）
npm run build

# 2. HTMLファイルを開く
# Windowsの場合
explorer.exe test-api-mock.html

# macOS/Linuxの場合
open test-api-mock.html  # または xdg-open

# 3. ブラウザのコンソールで実行
runTests()
```

### 2. 個別テスト実行
```javascript
// コンソールで直接実行
testDeletionOnly()
testPerformance()
```

### 3. デバッグ方法
```javascript
// ブレークポイントを設定
debugger;

// 詳細ログ
console.trace('詳細なスタックトレース');

// オブジェクトの詳細表示
console.table(cuts);
```

## ビルド設定の簡素化

### webpack.config.js（最小限）
```javascript
module.exports = {
  mode: 'development',  // デバッグしやすいように
  entry: './src/main.ts',
  output: {
    filename: 'main-browser.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'KintoneApp',  // グローバルアクセス用
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  devtool: 'source-map'  // デバッグ用
};
```

## 段階的な移行

### Phase 1: 現在のテスト環境の活用
- test-api-mock.html をそのまま使用
- 新しいテストを追加

### Phase 2: テストの統合
- 分散したテストファイルを統合
- 共通のテストユーティリティ作成

### Phase 3: 自動化（オプション）
- CI/CD統合（必要な場合）
- ヘッドレステスト（Puppeteer等）

## ベストプラクティス

### 1. シンプルさを保つ
- 複雑なテストフレームワークは避ける
- console.log を活用
- 視覚的な確認を重視

### 2. 独立性を保つ
- 各テストは独立して実行可能
- テスト間の依存を避ける
- データは各テストで作成

### 3. 実用性を重視
- 実際の使用シナリオをテスト
- エッジケースより基本機能
- パフォーマンスも測定

## まとめ

### 現在の複雑なテスト環境
- webpack設定が複雑
- 複数のビルドプロセス
- デバッグが困難

### 提案する簡素化
- 単一のtest-api-mock.html
- ブラウザで直接実行
- console.logでの即座の確認

### 期待される効果
- テスト作成時間 50%短縮
- デバッグ時間 70%短縮
- 新規開発者の理解時間 80%短縮

## 次のステップ

1. **test-api-mock.html の更新**
   - Phase 1のテストを追加
   - 実行して動作確認

2. **既存テストの移行**
   - test-all-phase1.js の内容を統合
   - 不要なファイルを削除

3. **ドキュメント更新**
   - テスト実行方法を明記
   - トラブルシューティング追加