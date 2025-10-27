# v10.3.3 リファクタリングロードマップ（Phase 4-7）

## 概要
Phase 1-3で基盤整備が完了した後の、アーキテクチャ簡素化を実現するロードマップ

## 現在の状態（Phase 1-3完了後）
- ✅ 削除クラスへの参照: 0箇所
- ✅ any型使用: 229箇所→58箇所（75%削減）
- ✅ UIコンポーネント: 完全整理済み
- ⚠️ ヘルパークラス未活用: 約640箇所
- 📊 総コード量: 約15,000行

---

## Phase 4: 即時実施可能な簡素化

### 目的
リスクなく即座に実施可能な改善を行い、後続フェーズの準備を整える

### Step 4.1: アーカイブディレクトリ削除
**作業内容**:
```bash
rm -rf src/archive/phase1-deletion-legacy/
rm -rf src/archive/phase2-legacy/
rm -rf src/archive/phase3-legacy/
```
**期待効果**:
- 約2,000行削減
- ファイル数30+削減

**チェックリスト**:
- [ ] アーカイブディレクトリの削除
- [ ] importエラーの確認
- [ ] ビルド成功確認

### Step 4.2: ビルドツール統一（Webpack→Vite）
**作業内容**:
- webpack関連ファイルの削除
- package.jsonスクリプトの更新
- テスト環境のVite移行

**期待効果**:
- ビルド時間30-40%短縮
- 設定ファイルの簡素化

**チェックリスト**:
- [ ] webpack.config.*.js削除
- [ ] package.jsonのwebpack関連削除
- [ ] vite.config.test.ts作成
- [ ] npm scriptsの更新
- [ ] ビルド・テスト動作確認

### Step 4.3: ApplicationService削除
**作業内容**:
- ApplicationServiceの使用箇所をApplicationFacadeに置換
- ApplicationService.ts削除

**期待効果**:
- 不要な抽象化レイヤー削除
- コード約200行削減

**チェックリスト**:
- [ ] main-browser.tsの更新
- [ ] ApplicationService参照の置換
- [ ] ApplicationService.ts削除
- [ ] テスト更新・実行

### Step 4.4: Phase 1-3残作業（ヘルパークラス活用）
**作業内容**:
| 対象 | 箇所数 | 移行先 |
|-----|--------|--------|
| try-catch直接記述 | 190 | ErrorHandler |
| DOM操作直接記述 | 240 | DOMBuilder/DOMHelper |
| 日付処理直接記述 | 85 | DateHelper |
| localStorage直接操作 | 45 | StorageHelper |
| null/undefinedチェック | 80 | ValidationHelper |

**期待効果**:
- 重複コード640箇所削減
- 保守性向上

**チェックリスト**:
- [ ] ErrorHandler活用（190箇所）
- [ ] DOM操作統一（240箇所）
- [ ] DateHelper活用（85箇所）
- [ ] StorageHelper活用（45箇所）
- [ ] ValidationHelper活用（80箇所）

### Phase 4完了条件
- [ ] アーカイブ削除（-2,000行）
- [ ] ビルドツール統一
- [ ] ApplicationService削除（-200行）
- [ ] ヘルパークラス活用率90%以上
- [ ] 全テスト成功

---

## Phase 5: ユーティリティ統合

### 目的
分散したユーティリティ機能を統合し、重複を排除する

### Step 5.1: 重複機能の分析
**作業内容**:
- 重複メソッドのマッピング作成
- 統合計画の詳細化
- 影響範囲の特定

**成果物**:
- 機能マッピングドキュメント
- 統合計画書

### Step 5.2: ユーティリティ統合実装
**作業内容**:
```typescript
// 統合前（6ファイル、83メソッド）
src/utils/
├── DataProcessor.ts
├── ErrorHandler.ts
├── ValidationHelper.ts
├── StorageHelper.ts
├── DateHelper.ts
└── DOMUtils.ts

// 統合後（5ファイル、約50メソッド）
src/utils/
├── data.ts      // clone, merge, transform
├── date.ts      // format, parse, calculate
├── storage.ts   // localStorage操作
├── dom.ts       // DOM操作
└── error.ts     // エラーハンドリング
```

**チェックリスト**:
- [ ] data.ts作成・実装
- [ ] date.ts作成・実装
- [ ] storage.ts作成・実装
- [ ] dom.ts作成・実装
- [ ] error.ts作成・実装

### Step 5.3: 既存コードの移行
**作業内容**:
- import文の一括更新
- 旧ファイルの削除
- テストの更新

**チェックリスト**:
- [ ] import文の更新
- [ ] 旧ユーティリティファイル削除
- [ ] テスト更新
- [ ] 動作確認

### Phase 5完了条件
- [ ] ユーティリティファイル6→5
- [ ] メソッド数83→50以下
- [ ] 重複コード完全排除
- [ ] 全テスト成功

---

## Phase 6: データアクセス層統合

### 目的
3つの並存するデータ管理システムを1つに統合する

### Step 6.1: UnifiedDataService設計
**作業内容**:
- インターフェース設計
- 既存3システムの機能マッピング
- 移行計画策定

**成果物**:
```typescript
interface IDataService {
  // CRUD操作
  create(data: CutData): Promise<Cut>
  read(id: string): Promise<Cut>
  update(id: string, data: Partial<CutData>): Promise<Cut>
  delete(id: string): Promise<void>
  list(options?: ListOptions): Promise<Cut[]>

  // メモ管理
  getMemo(cutId: string, field: string): Promise<CellMemo>
  updateMemo(cutId: string, field: string, memo: string): Promise<void>
}
```

### Step 6.2: UnifiedDataService実装
**作業内容**:
- ApplicationFacadeの良い部分を抽出
- ServiceContainerの機能統合
- UnifiedDataStoreの最適化部分を活用

**統合対象**:
| 現在のシステム | 行数 | 統合後の役割 |
|---------------|------|--------------|
| ApplicationFacade | 669行 | UIコーディネーターに特化 |
| ServiceContainer | 500行 | DIコンテナに特化 |
| UnifiedDataStore | 946行 | UnifiedDataServiceに統合 |

**チェックリスト**:
- [ ] UnifiedDataService.ts作成
- [ ] CRUD操作実装
- [ ] メモ管理実装
- [ ] キャッシュ機能実装
- [ ] 単体テスト作成

### Step 6.3: 既存システムの移行
**作業内容**:
- ApplicationFacadeの責務分割
- ServiceContainerの簡素化
- UnifiedDataStoreの段階的置換

**チェックリスト**:
- [ ] ApplicationFacadeからデータ操作を分離
- [ ] ServiceContainerをDIに特化
- [ ] UnifiedDataStore参照を置換
- [ ] 統合テスト実施

### Phase 6完了条件
- [ ] データアクセス層を1つに統合
- [ ] ApplicationFacade 669行→300行
- [ ] UnifiedDataStore削除（-946行）
- [ ] 全テスト成功

---

## Phase 7: 状態管理簡素化

### 目的
4つの状態管理システムを1つのシンプルなシステムに統合する

### Step 7.1: SimpleStateManager設計
**作業内容**:
- 既存4システムの機能分析
- 必要最小限の機能定義
- 移行戦略策定

**統合対象**:
- UnifiedStateManager
- DebouncedSyncManager
- RealtimeSyncService
- UnifiedEventCoordinator

### Step 7.2: SimpleStateManager実装
**作業内容**:
```typescript
class SimpleStateManager<T = AppState> {
  private state: T
  private listeners: Set<(state: T) => void>

  // コアAPI
  getState(): T
  setState(updater: (state: T) => T): void
  subscribe(listener: (state: T) => void): () => void

  // 拡張機能
  enableSync(adapter: SyncAdapter): void
  enableDebounce(ms: number): void
  enablePersistence(storage: Storage): void
}
```

**チェックリスト**:
- [ ] SimpleStateManager.ts作成
- [ ] コアAPI実装
- [ ] 同期機能実装
- [ ] デバウンス機能実装
- [ ] 永続化機能実装

### Step 7.3: 既存システムの移行
**作業内容**:
- UnifiedStateManager置換
- DebouncedSyncManager統合
- RealtimeSyncService簡素化
- UnifiedEventCoordinator削除

**チェックリスト**:
- [ ] 各コンポーネントの状態管理を移行
- [ ] イベントシステムの簡素化
- [ ] 旧状態管理システム削除
- [ ] 統合テスト実施

### Phase 7完了条件
- [ ] 状態管理システム4→1
- [ ] コード約1,000行削減
- [ ] パフォーマンス維持または向上
- [ ] 全テスト成功

---

## 全体の成功指標

### コード量削減
| Phase | 削減行数 | 累計削減 | 残存行数 |
|-------|---------|----------|----------|
| 開始時 | - | - | 15,000 |
| Phase 4 | 2,840 | 2,840 | 12,160 |
| Phase 5 | 500 | 3,340 | 11,660 |
| Phase 6 | 1,315 | 4,655 | 10,345 |
| Phase 7 | 1,000 | 5,655 | 9,345 |

### 品質指標
| 指標 | 開始時 | Phase 4後 | Phase 5後 | Phase 6後 | Phase 7後 |
|------|--------|-----------|-----------|-----------|-----------|
| ファイル数 | 150+ | 120 | 100 | 85 | 75 |
| 最大ファイルサイズ | 946行 | 946行 | 500行 | 400行 | 300行 |
| 重複コード | 15-20% | 5% | 3% | 2% | 1% |
| テストカバレッジ | 30% | 35% | 40% | 45% | 50% |

---

## 実施順序の柔軟性

### 並行実施可能
- Phase 4の各Step（相互依存なし）
- Phase 5.1（分析）は他作業と並行可能

### 順序依存あり
- Phase 4.4 → Phase 5（ヘルパー活用後に統合）
- Phase 6 → Phase 7（データ層整理後に状態管理）

### 部分実施可能
各Phaseは独立しており、必要に応じて特定のPhaseのみ実施可能

---

## リスク管理

### 各Phaseのブランチ戦略
```
main
├── feature/phase4-immediate-cleanup
├── feature/phase5-utility-consolidation
├── feature/phase6-data-layer-unification
└── feature/phase7-state-simplification
```

### ロールバック計画
- 各Phase完了時にタグ付け
- 問題発生時は前のPhaseにロールバック
- 部分的な変更も可能（Step単位）

---

## 次のアクション

1. **Phase 4.1開始**: アーカイブディレクトリ削除（即座に実施可能）
2. **並行作業**: Phase 4.2（ビルド統一）も同時進行可能
3. **レビュー**: 各Step完了時にコードレビュー実施

このPhase/Step形式により、柔軟なスケジュール管理と確実な進捗追跡が可能になります。