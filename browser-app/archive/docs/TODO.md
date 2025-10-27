# 実装計画・タスク管理

## 論理削除データリロード表示問題修正 (2025-08-18)

### 問題概要
論理削除されたデータがリロード時に表示される問題

### 原因分析
- CutAggregateでの論理削除は正常動作
- ReadModelでの削除データフィルタリングが未実装
- CutDeletedEventの処理が不完全

### 修正範囲
- **影響ファイル数**: 3ファイル
- **予想工数**: 1-2時間
- **リスク**: 低（既存機能への影響なし）

### 実装フェイズ

#### フェイズ1: ReadModelでの削除フラグ対応
**対象ファイル**: `src/infrastructure/CutReadModel.ts`

**実装内容**:
- CutReadModelインターフェースにisDeletedプロパティ追加
- createCutReadModel関数でisDeletedを処理

**検証方法**:
- TypeScriptコンパイル確認
- ReadModel生成テスト

#### フェイズ2: ReadModelStoreでの削除イベント処理
**対象ファイル**: `src/infrastructure/ReadModelStore.ts`

**実装内容**:
- handleCutDeletedEventメソッド追加
- 削除イベント受信時のisDeletedフラグ設定

**検証方法**:
- 削除コマンド実行後のReadModelStore状態確認
- 削除フラグが正しく設定されることを確認

#### フェイズ3: クエリハンドラーでのフィルタリング
**対象ファイル**: `src/application/queries/handlers/GetAllCutsQueryHandler.ts`

**実装内容**:
- 削除されたカットをフィルタリングする処理追加
- デフォルトで削除データを除外

**検証方法**:
- 削除後のデータ取得でフィルタリング確認
- UI表示での削除データ非表示確認

### 承認後実装手順

1. **フェイズ1実装・確認**
   - CutReadModel修正
   - コンパイル確認

2. **フェイズ2実装・確認**
   - ReadModelStore修正
   - 削除イベント処理確認

3. **フェイズ3実装・確認**
   - GetAllCutsQueryHandler修正
   - 統合テスト実行

4. **最終確認**
   - 削除→リロード→非表示確認
   - 既存機能影響確認

### 備考
- 物理削除は実装しない（論理削除のみ）
- 管理者向け削除データ表示機能は将来対応
- パフォーマンス影響は軽微

---

## 実装完了 (2025-08-18)

### 実装結果
✅ **フェイズ1完了**: CutReadModelに削除フラグ追加
✅ **フェイズ2完了**: ReadModelStoreで削除イベント処理追加  
✅ **フェイズ3完了**: GetAllCutsQueryHandlerでフィルタリング追加
✅ **追加修正**: ReadModelUpdateServiceで論理削除処理に変更

### 修正ファイル
1. `src/infrastructure/CutReadModel.ts` - isDeletedフラグ追加
2. `src/infrastructure/ReadModelStore.ts` - handleCutDeletedメソッド追加
3. `src/application/queries/GetAllCutsQuery.ts` - includeDeletedオプション追加
4. `src/application/queries/handlers/GetAllCutsQueryHandler.ts` - 削除データフィルタリング追加
5. `src/application/services/ReadModelUpdateService.ts` - 論理削除処理に変更

### 動作確認必要項目
- [ ] カット削除実行
- [ ] リロード後に削除データが非表示になることを確認
- [ ] 既存機能が正常動作することを確認

---

## 緊急修正実装 (2025-08-18)

### 問題
リロード後に削除データが再表示される根本的な問題を発見
- UnifiedEventCoordinator.syncReadModels()で削除状態が無視されていた

### 緊急修正内容
1. `ReadModelStore.updateWithDeletedFlag()`メソッド追加
2. `UnifiedEventCoordinator.syncReadModels()`修正：cut.isDeleted()を考慮

### 修正ファイル
- `src/infrastructure/ReadModelStore.ts` - updateWithDeletedFlagメソッド追加
- `src/application/UnifiedEventCoordinator.ts` - syncReadModels修正
- `docs/bug-analysis-2025-08-18.md` - 根本原因分析記録

### 検証結果
- [ ] カット削除 → リロード → 非表示確認（要テスト）
- [ ] 既存機能への影響確認（要テスト）

---

## 最終修正完了 (2025-08-18)

### 真の根本原因発見・修正
**ApplicationFacade.setCutDataCallback()でisDeletedフィールド除外問題**

### 最終修正ファイル（合計10ファイル）
1. `src/infrastructure/CutReadModel.ts` - isDeletedフラグ追加
2. `src/infrastructure/ReadModelStore.ts` - handleCutDeletedメソッド追加
3. `src/application/queries/GetAllCutsQuery.ts` - includeDeletedオプション追加
4. `src/application/queries/handlers/GetAllCutsQueryHandler.ts` - 削除データフィルタリング追加
5. `src/application/services/ReadModelUpdateService.ts` - 論理削除処理に変更
6. `src/application/UnifiedEventCoordinator.ts` - syncReadModels修正
7. `src/domain/types.ts` - CutDataにisDeletedフィールド追加
8. `src/domain/aggregates/CutAggregate.ts` - getData()とcreateEmptyData()修正
9. `src/application/ApplicationFacade.ts` - setCutDataCallback修正
10. `docs/bug-analysis-2025-08-18.md` - 根本原因分析記録

### 実装完了確認
- ✅ TypeScriptコンパイルエラー解決
- ✅ 型安全性確保（string/boolean統一）
- ✅ 全データフロー修正完了

### 最終テスト項目
- ✅ カット削除 → リロード → 非表示確認（完了）
- ✅ 削除エラー「already deleted」解消確認（完了）  
- ✅ 既存機能正常動作確認（完了）

---

# 大規模リファクタリング計画 v10.4.0 - 2025-08

## 現状調査結果（Phase 0 完了）

### プロジェクト規模
- **総ファイル数**: 130個のTypeScriptファイル
- **最大ファイル**: ProgressTable.ts（1707行） - 神クラス問題
- **その他巨大ファイル**: StaffView.ts（1318行）、NormaTable.ts（1202行）
- **アーキテクチャ層**: 8層（domain, application, infrastructure, ui等）

### 発見された重大問題

#### 1. 神クラス問題（God Class）
- `ProgressTable.ts`: 1707行（最重要機能だが巨大すぎる）
- `StaffView.ts`: 1318行
- `NormaTable.ts`: 1202行
- 単一責任の原則に重大な違反

#### 2. 型の不統一問題
```typescript
// 同じ概念（削除状態）が複数の型で管理されている
domain/types.ts:           isDeleted?: string;          // オプショナルstring
CutAggregate.ts:           private _isDeleted: boolean;  // private boolean
CutAggregate.isDeleted():  boolean                       // メソッド boolean
CutAggregate.getData():    isDeleted: 'true'|'false'    // string変換
ReadModelStore:            isDeleted === 'true'         // string比較
```

#### 3. アーキテクチャの過度な複雑さ
- **現在**: 6層以上のイベントフロー
  ```
  Command → Aggregate → Event → EventDispatcher → UnifiedEventCoordinator 
  → ReadModelUpdateService → ReadModelStore → Query → UI
  ```
- **Event Sourcing + CQRS + DDD**: 複数のパラダイムが混在
- **インターフェース・クラス**: 多数の継承・実装関係

#### 4. コード品質問題
- **デバッグログ**: 235箇所に散在（今回の修正含む）
- **重複コード**: 類似パターンの多重実装
- **依存関係**: 複雑な循環参照の可能性

## リファクタリング戦略

### 目標
1. **神クラスの解体**: 1000行超ファイルを200行以下に分割
2. **型統一**: 削除状態をboolean型で一本化
3. **アーキテクチャ簡素化**: 軽量イベントシステムへの移行
4. **コード品質向上**: DRY原則、単一責任の原則の徹底

### 移行方針：段階的リファクタリング

## Phase 1: 型統一とクリーンアップ（4週間）

### 目標
- 型の不統一問題の根本解決
- デバッグログの整理
- 最重要機能（進捗管理表）の安定性確保

### 1.1 削除状態の型統一（週1）
```typescript
// 目標：全体でboolean型に統一
interface CutData {
  id: string;
  isDeleted: boolean;  // string型から統一
  // その他のフィールド
}

class CutAggregate {
  private isDeleted: boolean = false;  // アンダースコア削除
  
  isDeleted(): boolean {
    return this.isDeleted;
  }
  
  // string変換の廃止
  getData(): CutData {
    return { ...this.data, isDeleted: this.isDeleted };
  }
}
```

**作業項目:**
- [ ] `domain/types.ts`の型定義修正
- [ ] `CutAggregate.ts`の内部型修正
- [ ] `ReadModelStore.ts`の比較ロジック修正
- [ ] `CreateCutReadModel`関数の修正
- [ ] 全関連ファイルの型統一

### 1.2 デバッグログの整理（週1）
```typescript
// 目標：構造化ログシステム
interface LogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  operation: string;
  data?: any;
  timestamp: Date;
}

class Logger {
  static debug(component: string, operation: string, data?: any): void {
    // 開発環境でのみ出力
  }
}
```

**作業項目:**
- [ ] 235箇所のconsole.logを調査・分類
- [ ] 構造化ログシステム実装
- [ ] 必要なログのみ残して整理
- [ ] 開発/本番での出力制御

### 1.3 テスト基盤構築（週1）
```typescript
// 削除機能の包括的テスト
describe('Cut Deletion Feature', () => {
  it('should delete cut with boolean flag');
  it('should filter deleted cuts from queries');
  it('should prevent duplicate deletion');
  it('should update UI immediately');
});
```

**作業項目:**
- [ ] 削除機能のテストスイート作成
- [ ] 型統一後の回帰テスト
- [ ] CIでの自動テスト実行

### 1.4 Phase 1 統合・検証（週1）
- [ ] 型統一後の動作確認
- [ ] パフォーマンステスト
- [ ] ユーザー受け入れテスト

## Phase 2: 神クラス解体（6週間）

### 目標
最重要機能である進捗管理表（ProgressTable.ts: 1707行）の責任分離

### 2.1 ProgressTable分析・設計（週1）
**現在の責任:**
- テーブル描画
- ソート機能
- フィルタ機能
- セル編集
- イベント処理
- 状態管理
- UI更新
- データ取得

**分割後の設計:**
```typescript
// メインクラス（200行以下）
class ProgressTable {
  constructor(
    private dataService: ProgressDataService,
    private renderService: TableRenderService,
    private eventService: TableEventService
  ) {}
}

// データ管理（150行程度）
class ProgressDataService {
  async loadData(): Promise<CutReadModel[]>
  filterData(criteria: FilterCriteria): CutReadModel[]
  sortData(config: SortConfig): CutReadModel[]
}

// 描画専用（200行程度）
class TableRenderService {
  renderTable(data: CutReadModel[]): void
  renderRow(cut: CutReadModel): HTMLTableRowElement
  renderCell(value: any, field: string): HTMLTableCellElement
}

// イベント処理（150行程度）
class TableEventService {
  setupEventListeners(): void
  handleCellEdit(event: Event): void
  handleSort(event: Event): void
}
```

### 2.2 データサービス実装（週1）
- [ ] ProgressDataService実装
- [ ] フィルタ・ソートロジックの移動
- [ ] データキャッシュ機能

### 2.3 描画サービス実装（週1）
- [ ] TableRenderService実装
- [ ] DOM操作の集約
- [ ] スタイル管理の分離

### 2.4 イベントサービス実装（週1）
- [ ] TableEventService実装
- [ ] イベント委譲の実装
- [ ] ユーザー操作の抽象化

### 2.5 ProgressTable統合（週1）
- [ ] 分割したサービスの統合
- [ ] 既存APIとの互換性確保
- [ ] UI変更なしの確認

### 2.6 Phase 2 検証（週1）
- [ ] 進捗管理表の完全動作確認
- [ ] パフォーマンス比較
- [ ] メモリ使用量測定

## Phase 3: 軽量イベントシステム移行（4週間）

### 目標
Event Sourcing + CQRSから軽量イベントシステムへの移行

### 3.1 軽量EventBus実装（週1）
```typescript
interface DomainEvent {
  type: string;
  aggregateId: string;
  data: any;
  timestamp: Date;
}

class SimpleEventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => void>>();
  
  subscribe(eventType: string, handler: (event: DomainEvent) => void): void
  publish(event: DomainEvent): void
}
```

### 3.2 Service層統合（週1）
```typescript
class CutService {
  async deleteCut(cutId: string): Promise<void> {
    // 1. 削除実行（同期）
    const cut = await this.repository.findById(cutId);
    cut.markAsDeleted();
    await this.repository.save(cut);
    
    // 2. イベント発行（非同期副作用）
    this.eventBus.publish({
      type: 'CutDeleted',
      aggregateId: cutId,
      timestamp: new Date()
    });
  }
}
```

### 3.3 既存システムとの並行運用（週1）
- [ ] CutServiceとCommandHandlerの並行運用
- [ ] SimpleEventBusとEventDispatcherの並行運用
- [ ] データ整合性の確認

### 3.4 旧システム削除（週1）
- [ ] CommandHandler削除
- [ ] EventDispatcher削除
- [ ] UnifiedEventCoordinator削除
- [ ] ReadModel簡素化

## Phase 4: 残りファイルの最適化（4週間）

### 4.1 StaffView.ts リファクタリング（週1-2）
- 1318行を300行以下に分割
- StaffDataService、StaffRenderService等に分離

### 4.2 NormaTable.ts リファクタリング（週1-2）
- 1202行を300行以下に分割
- シミュレーション機能の責任分離

### 4.3 その他ファイルの最適化（週1）
- 500行超ファイルの見直し
- 重複コードの統合
- 命名規則の統一

### 4.4 Phase 4 統合テスト（週1）
- [ ] 全機能の動作確認
- [ ] パフォーマンステスト
- [ ] セキュリティテスト

## 最終 Phase: v10.4.0 完成・リリース（2週間）

### 5.1 総合テスト（週1）
- [ ] E2Eテスト完全実行
- [ ] ロードテスト
- [ ] ユーザビリティテスト

### 5.2 ドキュメント・リリース（週1）
- [ ] アーキテクチャドキュメント更新
- [ ] 開発ガイド作成
- [ ] v10.4.0リリース

## 成功指標

### 定量的指標
- **ファイルサイズ**: 最大ファイル200行以下
- **型統一**: 削除状態の型不一致0件
- **階層数**: データフロー3層以下
- **テスト覆盖率**: 削除機能90%以上

### 定性的指標
- **開発速度**: 新機能追加時間50%短縮
- **デバッグ時間**: バグ修正時間70%短縮
- **理解しやすさ**: 新しい開発者の学習時間短縮

## リスク管理

### 高リスク
- **進捗管理表の機能停止**: Phase 2で最重要機能への影響
- **データ損失**: 移行時のデータ整合性問題

### 軽減策
- **段階的移行**: 各Phase完了時の動作確認
- **ロールバック計画**: 各Phaseでの復旧手順
- **並行運用**: 新旧システムの併用期間

## 承認・実行

本計画の承認をいただけましたら、Phase 1から順次実行開始いたします。
各Phase完了時にはユーザー動作確認を実施し、問題なければ次Phaseに進行します。

**想定期間**: 3ヶ月（20週間）
**優先度**: 最優先
**対象バージョン**: v10.4.0

---

# ApplicationService → AppService 移行計画 (2025-08-21)

## 概要
UIファイルのApplicationServiceからAppServiceへの移行作業

## 目標
- 古いApplicationServiceから新しいAppServiceへの統一
- 型エラーの解消
- シンプルなアーキテクチャへの移行

## 影響範囲
**対象ファイル数**: 7ファイル

### 対象ファイル
1. `/src/ui/staff/StaffView.ts`
2. `/src/ui/simulation/NormaTable.ts` 
3. `/src/ui/schedule/ScheduleView.ts`
4. `/src/ui/simulation/SimulationView.ts`
5. `/src/ui/KenyoMultiSelectPopup.ts`
6. `/src/ui/autofill/AutoFillManager.ts`
7. `/src/index.ts` (存在しない場合はスキップ)

## 実施内容
各ファイルで以下の変更を行う：
- import文: `ApplicationService` → `AppService`
- パス修正: `../../application/ApplicationService` → `../../services/AppService`
- 型定義: `ApplicationService` → `AppService`
- 必要に応じて`getAppService`シングルトンの使用

## 実装フェイズ

### フェイズ1: UI関連ファイル移行（StaffView, ScheduleView, SimulationView）
**対象ファイル**: 
- StaffView.ts
- ScheduleView.ts  
- SimulationView.ts

### フェイズ2: その他UIファイル移行（KenyoMultiSelectPopup, AutoFillManager）
**対象ファイル**:
- KenyoMultiSelectPopup.ts
- AutoFillManager.ts

### フェイズ3: データテーブル移行（NormaTable）
**対象ファイル**:
- NormaTable.ts

### フェイズ4: エントリーポイント確認
**対象ファイル**:
- index.ts（存在する場合）

## 検証方法
- TypeScriptコンパイル確認
- 各機能の動作確認
- 型エラーが発生していないことの確認

## リスク評価
- **リスク**: 低（型とパスの変更のみ）
- **影響**: UIの全体的な機能に影響があるが、段階的に実施
- **対策**: フェイズごとに動作確認を実施