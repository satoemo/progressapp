# プロジェクト整合性確認計画

## 目的
大規模リファクタリング後のコードベースの整合性を確認し、以下の問題を特定・解決する：
- コードの重複
- 場当たり的な実装
- 不整合な命名規則
- 未使用コード
- 循環依存

## 確認項目と手法

### 1. コード重複チェック

#### 1.1 重複コードの検出
**対象**
- src/services/
- src/ui/
- src/infrastructure/
- src/application/

**確認方法**
```bash
# 類似した関数名の検出
grep -r "function\|const.*=" src/ | grep -E "(get|set|update|create|delete|fetch|load|save)" | sort

# 同一パターンの検出
find src -name "*.ts" -exec grep -l "similar_pattern" {} \;
```

**重点確認ポイント**
- データ取得メソッド（get*, fetch*, load*）
- データ更新メソッド（update*, save*, set*）
- 削除処理（delete*, remove*）
- 初期化処理（init*, setup*, initialize*）

### 2. 場当たり的実装の検出

#### 2.1 TODO/FIXMEコメント
```bash
grep -r "TODO\|FIXME\|HACK\|XXX" src/
```

#### 2.2 型安全性チェック
```bash
# any型の使用箇所
grep -r ": any\|as any" src/ | grep -v "test\|spec"

# @ts-ignore の使用
grep -r "@ts-ignore\|@ts-expect-error" src/
```

#### 2.3 エラーハンドリング
```bash
# catch節での適切なエラー処理
grep -r "catch.*{" src/ -A 3
```

### 3. 命名規則の整合性

#### 3.1 インターフェース名
- `I`プレフィックスの統一性確認
- 実装クラスとの対応確認

#### 3.2 ファイル名とエクスポート名
- ファイル名とdefault exportの一致確認
- PascalCaseとcamelCaseの使い分け

#### 3.3 メソッド名の一貫性
| 操作 | 推奨プレフィックス | 避けるべき名前 |
|------|-------------------|---------------|
| 取得 | get, fetch | load, retrieve |
| 設定 | set, update | save, modify |
| 削除 | delete, remove | destroy, clear |
| 作成 | create, add | make, new |

### 4. 未使用コードの検出

#### 4.1 未使用インポート
```bash
# TypeScriptコンパイラで検出
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
```

#### 4.2 未使用ファイル
```bash
# exportされているが使用されていない関数
find src -name "*.ts" -exec grep -l "export" {} \; | xargs -I {} basename {} | sort | uniq
```

#### 4.3 デッドコード
- 到達不可能なコード
- 常にfalseの条件分岐
- 未使用のクラスメンバー

### 5. 依存関係の検証

#### 5.1 循環依存の検出
```bash
# madgeツールを使用（インストール必要）
npx madge --circular src/
```

#### 5.2 層間の依存方向
正しい依存方向：
```
UI → Application → Domain → Infrastructure
```

禁止される依存：
- Infrastructure → UI
- Domain → Application
- Application → UI（Facadeを除く）

### 6. データフローの整合性

#### 6.1 データアクセスパス
**正しいパス**
```
UI → ApplicationFacade → UnifiedDataStore
```

**確認項目**
- 直接UnifiedDataStoreにアクセスしているUIコンポーネントがないか
- ApplicationFacadeをバイパスしているコードがないか

#### 6.2 状態管理
- LocalStorageアクセスの統一性
- キャッシュ管理の一貫性
- 状態更新の同期性

### 7. パフォーマンス問題の検出

#### 7.1 不要なループ
```bash
# ネストしたループの検出
grep -r "for.*{" src/ -A 5 | grep -B 5 "for.*{"
```

#### 7.2 重複した計算
- 同じ値を複数回計算していないか
- メモ化が必要な箇所の特定

### 8. セキュリティ問題

#### 8.1 危険な操作
```bash
# evalの使用
grep -r "eval\|Function(" src/

# innerHTMLの使用
grep -r "innerHTML\|dangerouslySetInnerHTML" src/
```

#### 8.2 入力検証
- ユーザー入力の検証漏れ
- XSS脆弱性の可能性

## 実施手順

### Phase 1: 自動検出（30分）
1. スクリプトによる自動検出
2. TypeScriptコンパイラチェック
3. 結果の集計

### Phase 2: 手動レビュー（1時間）
1. 重要ファイルの詳細レビュー
   - UnifiedDataStore.ts
   - ApplicationFacade.ts
   - ProgressTable.ts
   - ServiceContainer.ts

2. データフローの確認
3. 命名規則の確認

### Phase 3: 修正計画作成（30分）
1. 問題の優先順位付け
2. 修正タスクの作成
3. 影響範囲の評価

### Phase 4: 修正実施（必要に応じて）
1. 高優先度の問題から修正
2. テスト実施
3. 動作確認

## チェックリスト

### 必須確認項目
- [ ] any型の使用が50箇所以下
- [ ] TODO/FIXMEコメントが10箇所以下
- [ ] 循環依存が0件
- [ ] 未使用ファイルが0件
- [ ] セキュリティ問題が0件

### 推奨確認項目
- [ ] 命名規則の統一性90%以上
- [ ] 適切なエラーハンドリング
- [ ] パフォーマンス問題の解決
- [ ] コード重複率10%以下

## 期待される成果

1. **コードの品質向上**
   - 重複コードの削除
   - 一貫性のある実装

2. **保守性の向上**
   - 明確な命名規則
   - 適切な依存関係

3. **パフォーマンス改善**
   - 不要な処理の削除
   - 効率的なデータアクセス

4. **セキュリティ強化**
   - 脆弱性の除去
   - 適切な入力検証

## 実施タイミング

このチェックは以下のタイミングで実施することを推奨：
- 大規模リファクタリング後（今回）
- 新機能追加前
- リリース前
- 定期的（月1回程度）