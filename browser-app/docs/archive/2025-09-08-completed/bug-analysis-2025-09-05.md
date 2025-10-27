# バグ分析レポート - 2025-09-05

## 問題: ダミーデータがリロード後に消える

### 症状
- `app.generateDummyData()` でダミーデータを生成
- テーブルに正常に表示される
- ブラウザをリロードすると全データが消失する

### 調査内容

#### 1. コンポーネントの確認
- **ServiceLocator**: 正常に初期化されている（ApplicationFacade内で確認）
- **ApplicationFacade**: hybridモードで動作、CutServiceを使用
- **UnifiedCutService**: ServiceLocatorから提供されるRepositoryを使用
- **SimplifiedStore**: LocalStorageAdapterを使用するよう設定済み

#### 2. データフロー
```
generateDummyData
  ↓
ApplicationFacade.createCut (hybridモード)
  ↓
UnifiedCutService.create
  ↓
Repository.save
  ↓
SimplifiedStore.save
  ↓
LocalStorageAdapter.set
  ↓
localStorage.setItem
```

#### 3. 問題の可能性

1. **LocalStorageキーの不一致**
   - 保存時と読み込み時でキーが異なる可能性
   - プレフィックスの違い（`kintone_cuts_` vs 他のプレフィックス）

2. **初期化タイミングの問題**
   - ServiceLocatorが正しく初期化されていない可能性
   - ApplicationFacadeとServiceLocatorの初期化順序

3. **ReadModelとRepositoryの同期問題**
   - UnifiedCutServiceがReadModelとRepositoryの両方を使用
   - データ読み込み時にどちらから読むかが不明確

### デバッグ用機能追加

#### 1. debugStorageメソッド
```javascript
app.debugStorage()
```
以下を表示:
- LocalStorage内の全キー
- カテゴリ別分類（cuts, kintone, mock, simplified, other）
- ServiceLocatorの統計情報
- SimplifiedStoreの統計情報
- ApplicationFacadeのモードと呼び出し回数

#### 2. LocalStorageAdapterのログ
- 保存時: `[LocalStorageAdapter] Saved: キー名 (サイズ)`
- 読込時: `[LocalStorageAdapter] Loaded: キー名 (サイズ)` または `Not found: キー名`

### 次のデバッグステップ

1. **データ生成後の確認**
```javascript
app.generateDummyData(5)  // 少数でテスト
app.debugStorage()         // LocalStorageの状態確認
```

2. **リロード後の確認**
```javascript
// ブラウザリロード後
app.debugStorage()         // LocalStorageの状態確認
app.getAllCuts()           // データ取得の試行
```

3. **コンソールログの確認**
- `[LocalStorageAdapter] Saved:` のログがあるか
- `[LocalStorageAdapter] Loaded:` のログがあるか
- エラーメッセージの有無

### 推測される根本原因

最も可能性が高いのは、**データの読み込み時にServiceLocatorが正しく初期化されていない**こと。

ApplicationFacadeの初期化時にServiceLocatorを初期化しているが、リロード後にServiceLocatorから取得したRepositoryがLocalStorageではなくMemoryStorageを使用している可能性がある。

### 対応案

1. **ServiceLocator初期化の確実化**
   - ApplicationFacadeのコンストラクタでServiceLocatorの初期化を保証
   - 初期化状態のチェック機構を追加

2. **データ読み込みパスの統一**
   - getAllCutsがServiceLocatorのRepositoryから確実に読み込むよう修正

3. **LocalStorageキーの標準化**
   - すべてのコンポーネントで同じプレフィックスを使用
   - キー生成ロジックの一元化

## 実施した修正

### 1. デバッグ機能の追加
**ファイル**: `/src/main-browser.ts`
- `debugStorage()`メソッドを追加
  - LocalStorage内のキーをカテゴリ別に表示
  - ServiceLocatorとApplicationFacadeの状態表示
  - SimplifiedStoreの統計情報表示

### 2. LocalStorageAdapterへのログ追加
**ファイル**: `/src/infrastructure/SimplifiedStore.ts`
- `get()`メソッドにログ追加（読み込み時）
- `set()`メソッドにログ追加（保存時）

### 3. SimplifiedReadModelとServiceLocatorの同期
**ファイル**: `/src/services/model/SimplifiedReadModel.ts`
- `syncWithServiceLocator()`メソッド追加
  - ServiceLocatorのStoreからデータをロード
  - 初回起動時にLocalStorageのデータを読み込み
- `upsert()`メソッドの修正
  - データ更新時にServiceLocatorのStoreにも保存
- `delete()`と`purge()`メソッドの修正
  - 削除時にServiceLocatorのStoreからも削除
- `saveToServiceLocator()`と`deleteFromServiceLocator()`プライベートメソッド追加

### 4. ApplicationFacadeでの同期起動
**ファイル**: `/src/application/ApplicationFacade.ts`
- `initializeServiceLocator()`メソッドの修正
  - SimplifiedReadModelの同期を非同期で起動
  - ログ出力で同期完了を通知

## 修正結果

### 修正前のデータフロー
```
作成時: ServiceLocator → LocalStorage ✅
読込時: QueryBus → SimplifiedReadModel（メモリのみ） ❌
```

### 修正後のデータフロー
```
作成時: ServiceLocator → LocalStorage ✅
        SimplifiedReadModel → ServiceLocator → LocalStorage ✅
読込時: ServiceLocator → LocalStorage → SimplifiedReadModel ✅
        QueryBus → SimplifiedReadModel（同期済み） ✅
```

## テスト手順

1. **初期状態の確認**
```javascript
app.debugStorage()  // LocalStorageが空であることを確認
```

2. **ダミーデータ生成**
```javascript
app.generateDummyData(5)  // 少数でテスト
```

3. **保存確認**
```javascript
app.debugStorage()  // LocalStorageにデータが保存されていることを確認
// [LocalStorageAdapter] Saved: kintone_cuts_Cut:cut-XXX のログを確認
```

4. **ブラウザリロード**
- F5キーまたはブラウザの更新ボタンでリロード

5. **データ永続化の確認**
```javascript
app.debugStorage()  // LocalStorageにデータが残っていることを確認
// [LocalStorageAdapter] Loaded: kintone_cuts_Cut:cut-XXX のログを確認
// [SimplifiedReadModel] Syncing X items from ServiceLocator Store のログを確認
```

6. **表示確認**
- テーブルにデータが表示されていることを確認

## 今後の改善案

1. **同期処理の最適化**
   - 現在は非同期処理のため、初期化完了前にデータアクセスすると問題が起こる可能性
   - 初期化完了を待つPromiseベースの設計への変更

2. **パフォーマンス最適化**
   - SimplifiedReadModelとServiceLocatorで二重にデータを保持
   - 将来的にはどちらか一方に統一

3. **エラーハンドリング強化**
   - LocalStorageのクォータ超過対策
   - 破損データの検出と復旧

---

## セル編集機能が動作しない問題（2025-09-05追記）

### 症状
- セルのダブルクリックで編集画面が表示されない
- 右クリックでメモ機能が使用できない
- オートフィル機能は正常に動作している

### 原因
- `ProgressTable.ts`の`render()`メソッドで、916行目に`tableEventManager.removeAllEventListenersFromTree()`でイベントハンドラーを削除しているが、その後再設定していなかった
- テーブルを再描画するたびにイベントハンドラーが削除され、そのまま放置されていた

### 解決方法
1. `render()`メソッドの最後（944行目）に`this.setupEventDelegation()`を追加
2. これにより、テーブル再描画後もイベントハンドラーが正しく機能するようになった

### 影響範囲
- **ファイル**: `/src/ui/ProgressTable.ts`
  - `render()`メソッド（944行目）
- **影響機能**:
  - セル編集機能全般（ダブルクリック編集）
  - メモ機能（右クリックメニュー）
  - ヘッダーのソート機能（クリック）
  - フィルター機能（ダブルクリック）

### 教訓
- イベントハンドラーを削除した後は必ず再設定する必要がある
- render()メソッドのような頻繁に呼ばれる処理では特に注意が必要
- オートフィル機能のように独立したイベントマネージャーを持つ機能は影響を受けていなかったことから、機能ごとのイベント管理の分離の重要性が確認された