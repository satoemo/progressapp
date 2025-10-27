# ノルマ表統一 実装計画（改訂版）

**作成日**: 2025-10-16
**改訂日**: 2025-10-16（ビューモード機能追加に伴う改訂）
**対象**: シミュレーション機能のノルマ表を進捗管理メニューのアーキテクチャに統一
**方針**: 既存問題修正を優先し、不整合が起きない順序で実施

---

## 目次

1. [現状分析](#現状分析)
2. [実装方針](#実装方針)
3. [Phase別実装計画](#phase別実装計画)
4. [テスト項目](#テスト項目)
5. [ロールバック計画](#ロールバック計画)

---

## 現状分析

### 削除対象機能
以下の機能をSimulationViewから削除：
- 作業予定入力セクション（createScheduleSection）
- 進捗予測グラフセクション（createProgressChart）
- 日別作業予定表セクション（createWorkScheduleTable）
- 関連するイベント（WorkScheduledEvent、WorkProgressUpdatedEvent）
- 関連するデータ構造（WorkSchedule、ProgressPrediction）

### 維持対象機能
- プロジェクト設定セクション（開始日・終了日入力）
- ノルマ表セクション（NormaTable）

### 新規追加機能
- **ビューモード切り替え機能**（進捗管理と同じパターン）
  - LO、原画、動画、動検、仕上げ の5つのモード
  - 初期表示：LO
  - 全表示モードは無し
  - コントロールバーで切り替え

### 現在の問題点
1. **実績値が常に0** - ダミーデータに工程アップ日付（loUp、genUp等）が設定されていない
2. **データの孤立** - SimulationViewが独自のsimulationDataを管理
3. **状態管理の欠如** - ViewStateManagerを使用していない
4. **エラーハンドリング不統一** - 一部のみErrorHandler使用
5. **ビューモード機能の欠如** - セクション別表示ができない

### ProgressTableとの差異

| 項目 | ProgressTable | NormaTable（現状） | NormaTable（改善後） |
|------|---------------|-------------------|---------------------|
| データ取得 | ApplicationFacade | ApplicationFacade | ✅ 統一済み |
| ビューモード | VIEW_MODES | なし | ✅ 追加予定 |
| 状態管理 | ViewStateManager | なし | ✅ 追加予定 |
| エラー処理 | ErrorHandler統一 | 一部のみ | ✅ 統一予定 |
| DOM操作 | DOMBuilder/DOMHelper | DOMBuilder/DOMHelper | ✅ 統一済み |
| イベント管理 | TableEventManager | TableEventManager | ✅ 統一済み |
| LocalStorage | なし | 直接操作 | ⚠️ 維持（NormaDataService経由） |
| フィルタ機能 | FilterManager | なし | ⚠️ 不要（ビューモードで代替） |
| AutoFill機能 | AutoFillManager | なし | ⚠️ 不要（目標値入力のみ） |

---

## 実装方針

### 基本方針
1. **既存問題修正を優先** - 実績値計算が動作するようにする
2. **不整合を防ぐ** - 段階的に実装し、各Phaseでビルド・テストを実施
3. **機能の単純化** - 不要な機能を削除し、ノルマ表のみに集中
4. **アーキテクチャ統一** - ProgressTableのパターンに可能な限り統一
5. **ビューモード機能の追加** - セクション別表示を実現

### ビューモード設計

#### ビューモード定義
```typescript
export type NormaViewMode = 'lo' | 'genga' | 'douga' | 'douken' | 'shiage';

export interface NormaViewModeConfig {
  type: NormaViewMode;
  label: string;
  section: string; // sections配列の要素名
}

export const NORMA_VIEW_MODES: Record<NormaViewMode, NormaViewModeConfig> = {
  lo: {
    type: 'lo',
    label: 'LO',
    section: 'LO'
  },
  genga: {
    type: 'genga',
    label: '原画',
    section: '原画'
  },
  douga: {
    type: 'douga',
    label: '動画',
    section: '動画'
  },
  douken: {
    type: 'douken',
    label: '動検',
    section: '動検'
  },
  shiage: {
    type: 'shiage',
    label: '仕上げ',
    section: '仕上げ'
  }
};
```

#### UI設計
```
┌─────────────────────────────────────────────────────────┐
│ [LO] [原画] [動画] [動検] [仕上げ]     [達成率表示]      │
│ ↑コントロールバー                                        │
├─────────────────────────────────────────────────────────┤
│ ノルマ表（実績値/目標値）- LOセクションのみ表示           │
│ ┌─────┬──────┬────┬────┬────┬────┐                  │
│ │セクション│担当者│個人計│日付1│日付2│週計│                  │
│ ├─────┼──────┼────┼────┼────┼────┤                  │
│ │  LO  │ 山田 │ 5/10│ 1/2 │ 2/3 │ 3/5 │                  │
│ │  LO  │ 佐藤 │ 3/8 │ 0/2 │ 1/2 │ 1/4 │                  │
│ │  LO  │ 小計 │ 8/18│ 1/4 │ 3/5 │ 4/9 │                  │
│ └─────┴──────┴────┴────┴────┴────┘                  │
└─────────────────────────────────────────────────────────┘
```

### データフロー設計

#### 現状（問題あり）
```
SimulationView
  ├─ simulationData（メモリ上のみ）
  ├─ NormaTable（全セクション表示のみ）
  │   └─ NormaDataService
  │       ├─ calculateActuals() → 実績値計算
  │       └─ LocalStorage（目標値のみ）
  └─ 削除対象機能（作業予定入力等）
```

#### 改善後
```
SimulationView（簡略化）
  ├─ プロジェクト設定のみ管理
  └─ NormaTable
      ├─ ビューモード管理（currentViewMode: NormaViewMode）
      ├─ ApplicationFacade経由でデータ取得
      ├─ ViewStateManager（状態永続化）
      └─ NormaDataService（実績値計算・目標値保存）
```

### LocalStorage使用方針
NormaTableは目標値を保存する必要があるため、LocalStorageの直接操作を維持：
- キー: `normaTable_{projectId}`
- データ: `{ [cellKey]: number }`
- 理由: ノルマ表特有のデータで、UnifiedDataStoreの対象外

### ViewStateManager保存データ
```typescript
interface NormaTableState {
  viewMode: NormaViewMode;           // 現在のビューモード
  showAchievementRate: boolean;      // 達成率表示モード
  scroll: ScrollState;                // スクロール位置
}
```

---

## Phase別実装計画

### Phase 1: 不要機能の削除とSimulationView簡略化

**目的**: 作業予定入力、グラフ、日別予定表を削除し、ノルマ表のみを表示

#### 1.1 SimulationView.tsの修正
**ファイル**: `src/ui/views/simulation/SimulationView.ts`

**削除対象**:
- インターフェース: `WorkSchedule`, `ProgressPrediction`
- プロパティ: `workSchedules`, `progressPredictions`（SimulationDataから削除）
- メソッド:
  - `createScheduleSection()` (L246-278)
  - `createScheduleInputRows()` (L390-413)
  - `setupScheduleInputListeners()` (L281-319)
  - `updateEndDate()` (L322-338)
  - `saveWorkSchedule()` (L341-387)
  - `createProgressChart()` (L416-430)
  - `renderTextChart()` (L433-486)
  - `createWorkScheduleTable()` (L489-503)
  - `renderWorkScheduleTable()` (L507-571)
  - `calculateSimulation()` (L664-669)
  - `calculateProgressPredictions()` (L672-700)
  - `isDelayed()` (L703-708)

**修正対象**:
```typescript
// SimulationData インターフェースを簡略化
interface SimulationData {
  projectStartDate: Date;
  projectEndDate: Date;
  // workSchedules: Map<string, WorkSchedule>; // 削除
  // progressPredictions: ProgressPrediction[]; // 削除
}

// render()メソッドを簡略化
private render(): void {
  this.container.innerHTML = '';
  this.container.className = 'simulation-view';

  // ヘッダー
  const header = this.createHeader();

  // パラメータ入力
  const parameterSection = this.createParameterSection();

  // ノルマ表のみ
  const normaSection = this.createNormaSection();

  DOMBuilder.append(this.container, header, parameterSection, normaSection);
}

// setupEventListeners()を簡略化
private setupEventListeners(): void {
  // SimulationParametersChangedEventのみ監視
  this.appFacade.getEventDispatcher().subscribeToAll((event) => {
    if (event.eventType === 'SimulationParametersChanged') {
      this.loadCuts().then(() => {
        this.render();
      });
    }
  });
}
```

#### 1.2 SimulationEvents.tsの修正
**ファイル**: `src/models/events/SimulationEvents.ts`

**削除対象**:
- `WorkScheduledEvent`クラス
- `WorkProgressUpdatedEvent`クラス

**維持対象**:
- `SimulationParametersChangedEvent`（プロジェクト設定変更用）

#### 1.3 確認事項
- [ ] ビルドが通るか確認
- [ ] ノルマ表が正常に表示されるか確認
- [ ] プロジェクト設定変更が動作するか確認

---

### Phase 2: 実績値計算の修正

**目的**: ダミーデータに工程アップ日付を追加し、実績値計算を動作させる

#### 2.1 ダミーデータ生成の修正
**ファイル**: `test/generateDummyData.ts`

**現状の問題**:
```typescript
// 進捗フィールドに日付または「不要」を設定しているが、
// アップ日付（loUp、genUp等）は設定されていない
```

**修正方針**:
進捗フィールドに日付が入っている場合、対応するアップフィールドにも日付を設定：
```typescript
// 例: loOut に日付が入っている → loUp にも日付を設定
// 工程の順序: LO → 原画 → 動画 → 動検 → 仕上げ
```

**実装**:
```typescript
// PROCESS_GROUPSに各工程のアップフィールドを追加
const PROCESS_GROUPS = [
  {
    name: 'LO工程',
    fields: ['loDate', 'loOut', 'loCheck', 'loOk'] as ProgressFieldKey[],
    upField: 'loUp' as ProgressFieldKey  // 追加
  },
  {
    name: '原画工程',
    fields: ['genDate', 'genOut', 'genCheck', 'genOk'] as ProgressFieldKey[],
    upField: 'genUp' as ProgressFieldKey  // 追加
  },
  {
    name: '動画工程',
    fields: ['dougaDate', 'dougaOut', 'dougaCheck', 'dougaOk'] as ProgressFieldKey[],
    upField: 'dougaUp' as ProgressFieldKey  // 追加
  },
  {
    name: '動検工程',
    fields: ['doukenDate', 'doukenOut', 'doukenCheck', 'doukenOk'] as ProgressFieldKey[],
    upField: 'doukenUp' as ProgressFieldKey  // 追加
  },
  {
    name: '仕上げ工程',
    fields: ['shiageDate', 'shiageOut', 'shiageCheck', 'shiageOk'] as ProgressFieldKey[],
    upField: 'shiageUp' as ProgressFieldKey  // 追加
  }
];

// fillCompletedGroup()を修正
private fillCompletedGroup(
  progress: Partial<Record<ProgressFieldKey, string>>,
  group: ProcessGroup,
  groupIndex: number
): void {
  let hasCompletedDate = false;
  let latestDate: string | null = null;

  group.fields.forEach((field, fieldIndex) => {
    if (Math.random() < FIELD_VALUE_PROBABILITY.COMPLETED_DATE) {
      const date = this.generateCompletedDate(groupIndex, fieldIndex);
      progress[field] = date;
      hasCompletedDate = true;
      latestDate = date;
    } else {
      progress[field] = '不要';
    }
  });

  // 完了した工程がある場合、アップ日付を設定
  if (hasCompletedDate && latestDate && group.upField) {
    progress[group.upField] = latestDate;
  }
}

// fillCurrentGroup()も同様に修正
private fillCurrentGroup(
  progress: Partial<Record<ProgressFieldKey, string>>,
  group: ProcessGroup
): void {
  const completionRate = CURRENT_PROCESS_COMPLETION.MIN +
    Math.random() * (CURRENT_PROCESS_COMPLETION.MAX - CURRENT_PROCESS_COMPLETION.MIN);
  const fieldsToComplete = Math.max(1, Math.floor(group.fields.length * completionRate));

  let hasCompletedDate = false;
  let latestDate: string | null = null;

  for (let i = 0; i < fieldsToComplete && i < group.fields.length; i++) {
    const field = group.fields[i];
    if (Math.random() < FIELD_VALUE_PROBABILITY.NOT_REQUIRED) {
      progress[field] = '不要';
    } else {
      const date = this.generateCurrentDate();
      progress[field] = date;
      hasCompletedDate = true;
      latestDate = date;
    }
  }

  // 進行中の工程がある場合、アップ日付を設定
  if (hasCompletedDate && latestDate && group.upField) {
    progress[group.upField] = latestDate;
  }
}
```

#### 2.2 ProcessGroup型定義の追加
**ファイル**: `test/generateDummyData.ts`

```typescript
// 型定義を追加
interface ProcessGroup {
  name: string;
  fields: ProgressFieldKey[];
  upField?: ProgressFieldKey;  // 追加
}
```

#### 2.3 NormaDataServiceのデバッグログ確認
**ファイル**: `src/services/NormaDataService.ts`

**確認**: 既存のデバッグログ（L92-95, L117-119）が適切に動作しているか

#### 2.4 確認事項
- [ ] ダミーデータ生成が正常に動作するか
- [ ] ノルマ表の実績値が正しく表示されるか（0でないこと）
- [ ] 各セクション・担当者・日付の実績値が正確か

---

### Phase 3: ビューモード機能とアーキテクチャ統一

**目的**: ビューモード切り替え機能を追加し、ViewStateManagerで状態を永続化

#### 3.1 ビューモード定義ファイルの作成
**新規ファイル**: `src/ui/views/simulation/NormaViewMode.ts`

```typescript
/**
 * ノルマ表のビューモード定義
 */

/**
 * ビューモードタイプ
 */
export type NormaViewMode = 'lo' | 'genga' | 'douga' | 'douken' | 'shiage';

/**
 * ビューモード設定
 */
export interface NormaViewModeConfig {
  type: NormaViewMode;
  label: string;
  section: string; // NormaTableのsections配列の要素名
}

/**
 * ビューモード定義
 */
export const NORMA_VIEW_MODES: Record<NormaViewMode, NormaViewModeConfig> = {
  lo: {
    type: 'lo',
    label: 'LO',
    section: 'LO'
  },
  genga: {
    type: 'genga',
    label: '原画',
    section: '原画'
  },
  douga: {
    type: 'douga',
    label: '動画',
    section: '動画'
  },
  douken: {
    type: 'douken',
    label: '動検',
    section: '動検'
  },
  shiage: {
    type: 'shiage',
    label: '仕上げ',
    section: '仕上げ'
  }
};

/**
 * デフォルトのビューモード
 */
export const DEFAULT_NORMA_VIEW_MODE: NormaViewMode = 'lo';
```

#### 3.2 ViewStateManagerへの状態追加
**ファイル**: `src/ui/shared/state/ViewStateManager.ts`

```typescript
// NormaTableState インターフェースを追加
export interface NormaTableState {
  viewMode: string;              // NormaViewMode（文字列で保存）
  showAchievementRate: boolean;  // 達成率表示モード
  scroll: ScrollState;            // スクロール位置
}

// ViewStateManagerに追加
export class ViewStateManager {
  private static readonly NORMA_TABLE_STATE_KEY = 'user_prefs_norma_table_state';

  // ノルマ表状態の保存
  public saveNormaTableState(state: NormaTableState): void {
    this.saveState(ViewStateManager.NORMA_TABLE_STATE_KEY, state);
  }

  // ノルマ表状態の取得
  public getNormaTableState(): NormaTableState | null {
    return this.loadState<NormaTableState>(ViewStateManager.NORMA_TABLE_STATE_KEY);
  }
}
```

#### 3.3 NormaTable.tsの大幅修正
**ファイル**: `src/ui/views/simulation/NormaTable.ts`

**追加import**:
```typescript
import { NormaViewMode, NORMA_VIEW_MODES, DEFAULT_NORMA_VIEW_MODE } from './NormaViewMode';
import { ViewStateManager, NormaTableState } from '../../shared/state/ViewStateManager';
```

**追加プロパティ**:
```typescript
export class NormaTable {
  private currentViewMode: NormaViewMode = DEFAULT_NORMA_VIEW_MODE;
  private viewStateManager: ViewStateManager;
  private isRestoringState = false;
  // ... 既存プロパティ
}
```

**constructor修正**:
```typescript
constructor(container: HTMLElement, projectId: string, projectStartDate: Date, projectEndDate: Date) {
  this.container = container;
  this.projectId = projectId;
  this.projectStartDate = projectStartDate;
  this.projectEndDate = projectEndDate;
  this.tableEventManager = new TableEventManager();
  this.normaDataService = new NormaDataService(projectId);
  this.debouncedSyncManager = new DebouncedSyncManager();
  this.viewStateManager = ViewStateManager.getInstance();  // 追加

  this.initialize();
}
```

**コントロールバー作成メソッド追加**:
```typescript
/**
 * コントロールバーを作成
 */
private createControlBar(): HTMLElement {
  const controlBar = DOMBuilder.create('div');
  controlBar.className = 'norma-control-bar';

  // ビューモードボタングループ
  const viewButtons = DOMBuilder.create('div');
  viewButtons.className = 'norma-view-mode-buttons';

  // 各ビューモードのボタンを作成
  Object.values(NORMA_VIEW_MODES).forEach(config => {
    const button = DOMBuilder.create('button', {
      className: `norma-view-mode-button ${config.type === this.currentViewMode ? 'active' : ''}`,
      textContent: config.label,
      events: {
        click: () => this.changeViewMode(config.type)
      }
    });
    DOMBuilder.append(viewButtons, button);
  });

  DOMBuilder.append(controlBar, viewButtons);

  // 右側のボタングループ
  const actionButtons = DOMBuilder.create('div');
  actionButtons.className = 'norma-action-buttons';

  // 達成率表示切り替えボタン
  const toggleButton = DOMBuilder.create('button', {
    className: 'norma-toggle-achievement',
    textContent: this.showAchievementRate ? '実績/目標表示' : '達成率表示',
    events: {
      click: () => this.toggleAchievementRate()
    }
  });

  DOMBuilder.append(actionButtons, toggleButton);
  DOMBuilder.append(controlBar, actionButtons);

  return controlBar;
}
```

**ビューモード変更メソッド追加**:
```typescript
/**
 * ビューモードを変更
 */
private changeViewMode(mode: NormaViewMode): void {
  if (this.currentViewMode === mode) return;

  this.currentViewMode = mode;

  // ボタンのアクティブ状態を更新
  const buttons = this.container.querySelectorAll('.norma-view-mode-button');
  buttons.forEach((button: Element) => {
    const htmlButton = button as HTMLElement;
    const buttonMode = Object.values(NORMA_VIEW_MODES).find(
      config => config.label === htmlButton.textContent
    )?.type;

    if (buttonMode === mode) {
      DOMHelper.addClass(htmlButton, 'active');
    } else {
      DOMHelper.removeClass(htmlButton, 'active');
    }
  });

  // 再レンダリング
  this.render();

  // 状態を保存
  if (!this.isRestoringState) {
    this.saveState();
  }
}
```

**sections配列のフィルタリング**:
```typescript
/**
 * 現在のビューモードに応じたセクションを取得
 */
private getVisibleSections(): SectionConfig[] {
  const modeConfig = NORMA_VIEW_MODES[this.currentViewMode];
  return this.sections.filter(section => section.name === modeConfig.section);
}
```

**createFlatRows()メソッド修正**:
```typescript
private async createFlatRows(tbody: HTMLTableSectionElement): Promise<void> {
  const cuts = this.appFacade!.getAllReadModels();
  const fragment = document.createDocumentFragment();

  // 表示するセクションのみ処理（ビューモードに応じてフィルタリング）
  const visibleSections = this.getVisibleSections();

  visibleSections.forEach(section => {
    const managers = this.getUniqueManagers(cuts, section.fieldName);

    managers.forEach(manager => {
      const rowData: NormaRowData = {
        sectionName: section.name,
        managerName: manager,
        fieldName: section.fieldName
      };
      const row = this.createDataRow(rowData);
      DOMBuilder.append(fragment, row);
    });

    if (managers.length > 0) {
      const sectionTotalRow = this.createSectionTotalRow(section.name);
      DOMBuilder.append(fragment, sectionTotalRow);
    }
  });

  DOMBuilder.append(tbody, fragment);
}
```

**render()メソッド修正**:
```typescript
private async render(): Promise<void> {
  // ... 既存の処理

  // コントロールバーを先頭に追加
  const controlBar = this.createControlBar();
  this.container.insertBefore(controlBar, this.container.firstChild);

  // エラー通知エリア
  // ...

  // ヘッダー（タイトルのみ、達成率ボタンは削除）
  const header = this.createHeader();
  // ...

  // テーブル本体
  // ...

  // スクロールイベントを設定
  this.setupScrollEvents();

  this.isRendering = false;
}
```

**createHeader()メソッド修正**:
```typescript
/**
 * ヘッダーを作成（タイトルのみ、達成率ボタンはコントロールバーに移動）
 */
private createHeader(): HTMLElement {
  const header = DOMBuilder.create('div');
  header.className = 'norma-table-header';

  const title = DOMBuilder.create('h3');
  title.className = 'norma-table-title';
  title.textContent = 'ノルマ表（実績値/目標値）';
  DOMBuilder.append(header, title);

  return header;
}
```

**状態保存メソッド追加**:
```typescript
/**
 * 現在の状態を保存
 */
private saveState(): void {
  if (this.isRestoringState) return;

  const state: NormaTableState = {
    viewMode: this.currentViewMode,
    showAchievementRate: this.showAchievementRate,
    scroll: this.getScrollState()
  };

  this.viewStateManager.saveNormaTableState(state);
}

/**
 * 保存された状態を復元
 */
private restoreState(): void {
  const savedState = this.viewStateManager.getNormaTableState();
  if (!savedState) return;

  this.isRestoringState = true;

  try {
    // ビューモードを復元
    if (savedState.viewMode && savedState.viewMode !== this.currentViewMode) {
      this.currentViewMode = savedState.viewMode as NormaViewMode;
    }

    // 達成率表示モードを復元
    if (savedState.showAchievementRate !== this.showAchievementRate) {
      this.showAchievementRate = savedState.showAchievementRate;
    }

    // スクロール位置を復元（レンダリング後）
    setTimeout(() => {
      this.setScrollState(savedState.scroll);
    }, 100);

  } finally {
    this.isRestoringState = false;
  }
}

/**
 * スクロール状態を取得
 */
private getScrollState(): ScrollState {
  const scrollContainer = this.container.querySelector('.table-wrapper') as HTMLElement;
  if (!scrollContainer) {
    return { scrollLeft: 0, scrollTop: 0 };
  }
  return {
    scrollLeft: scrollContainer.scrollLeft,
    scrollTop: scrollContainer.scrollTop
  };
}

/**
 * スクロール状態を設定
 */
private setScrollState(scrollState: ScrollState): void {
  const scrollContainer = this.container.querySelector('.table-wrapper') as HTMLElement;
  if (!scrollContainer) return;

  scrollContainer.scrollLeft = scrollState.scrollLeft;
  scrollContainer.scrollTop = scrollState.scrollTop;
}
```

**toggleAchievementRate()を修正**:
```typescript
private toggleAchievementRate(): void {
  this.showAchievementRate = !this.showAchievementRate;

  // ボタンのテキストを更新
  const button = this.container.querySelector('.norma-toggle-achievement') as HTMLButtonElement;
  if (button) {
    button.textContent = this.showAchievementRate ? '実績/目標表示' : '達成率表示';
  }

  // すべてのセルを更新
  this.updateAllCells();

  // 状態を保存
  this.saveState();
}
```

**スクロールイベントの追加**:
```typescript
/**
 * スクロールイベントを設定
 */
private setupScrollEvents(): void {
  const scrollContainer = this.container.querySelector('.table-wrapper') as HTMLElement;
  if (!scrollContainer) return;

  this.tableEventManager.on(
    scrollContainer,
    'scroll',
    () => {
      this.debounceScrollSave();
    },
    EventPriority.LOW
  );
}

/**
 * スクロール保存のデバウンス
 */
private scrollSaveTimeout: number | null = null;
private debounceScrollSave(): void {
  if (this.scrollSaveTimeout) {
    clearTimeout(this.scrollSaveTimeout);
  }

  this.scrollSaveTimeout = window.setTimeout(() => {
    this.saveState();
    this.scrollSaveTimeout = null;
  }, 500);
}
```

**initialize()メソッド修正**:
```typescript
private initialize(): void {
  // 日付範囲を生成
  this.generateDateRange();
  // 保存済みの目標値を読み込む
  this.targets = this.normaDataService.loadTargets();

  // 状態を復元（ApplicationFacade設定前）
  this.restoreState();
}
```

**destroy()メソッド修正**:
```typescript
destroy(): void {
  // スクロール保存のタイマーをクリア
  if (this.scrollSaveTimeout) {
    clearTimeout(this.scrollSaveTimeout);
    this.scrollSaveTimeout = null;
  }

  // 状態を保存してからクリーンアップ
  this.saveState();

  // 既存のクリーンアップ処理
  // ...
}
```

#### 3.4 CSSの追加
**ファイル**: `styles/components/norma-table.css`（既存ファイルに追加）

```css
/* コントロールバー */
.norma-control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-2);
  border-bottom: var(--border-width) solid var(--border-color-light);
}

.norma-view-mode-buttons {
  display: inline-flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.norma-view-mode-button {
  padding: var(--button-padding-y) var(--button-padding-x);
  border: var(--border-width) solid var(--border-color-dark);
  background-color: var(--color-white);
  color: var(--text-light);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: var(--transition-base);
  font-size: var(--font-size-base);
  font-weight: 500;
  white-space: nowrap;
}

.norma-view-mode-button:hover {
  background-color: var(--color-gray-300);
  border-color: var(--color-gray-500);
}

.norma-view-mode-button.active {
  background-color: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}

.norma-action-buttons {
  display: inline-flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

/* 達成率表示ボタン（既存スタイルを維持、位置のみ変更） */
.norma-toggle-achievement {
  padding: var(--button-padding-y) var(--button-padding-x);
  border: var(--border-width) solid var(--border-color-dark);
  background-color: var(--color-white);
  color: var(--text-light);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: var(--transition-base);
  font-size: var(--font-size-base);
  font-weight: 500;
  white-space: nowrap;
}

.norma-toggle-achievement:hover {
  background-color: var(--color-gray-300);
  border-color: var(--color-gray-500);
}
```

#### 3.5 確認事項
- [ ] ビューモード切り替えボタンが表示されるか
- [ ] 各ビューモード（LO、原画、動画、動検、仕上げ）に切り替えられるか
- [ ] 切り替え時に対応するセクションのみ表示されるか
- [ ] 達成率表示ボタンがコントロールバーに移動しているか
- [ ] 達成率表示モードの切り替えが動作するか
- [ ] ページリロード後もビューモードが復元されるか
- [ ] ページリロード後も達成率表示モードが復元されるか
- [ ] スクロール位置が復元されるか

---

### Phase 4: エラーハンドリング統一

**目的**: すべてのエラー処理をErrorHandlerに統一

#### 4.1 NormaTable.tsのエラー処理確認
**ファイル**: `src/ui/views/simulation/NormaTable.ts`

**現状**: 既にErrorHandlerを使用している箇所が多い

**確認対象**:
- `render()` - ErrorHandler使用済み（L172）
- `debouncedSaveTargets()` - ErrorHandler使用済み（L990）
- `destroy()` - ErrorHandler使用済み（L1218）

**追加修正不要**: 既に統一されている

#### 4.2 SimulationView.tsのエラー処理確認
**ファイル**: `src/ui/views/simulation/SimulationView.ts`

**確認対象**:
- try-catchブロックでconsole.errorを使用している箇所がないか確認

**修正方針**:
```typescript
// 例: applyParameters()でエラーが発生する可能性がある箇所
private applyParameters(): void {
  try {
    // ... 既存処理
  } catch (error) {
    ErrorHandler.handle(error, 'SimulationView.applyParameters', {
      showAlert: true,
      logLevel: 'error'
    });
  }
}
```

#### 4.3 NormaViewMode.tsのエラーハンドリング
**ファイル**: `src/ui/views/simulation/NormaViewMode.ts`

**確認**: 型安全なので特別なエラーハンドリングは不要

#### 4.4 確認事項
- [ ] すべてのエラーがErrorHandler経由で処理されているか
- [ ] エラーメッセージが適切に表示されるか

---

### Phase 5: 最終調整とコード整理

**目的**: 不要なコードを削除し、コメントを整理

#### 5.1 SimulationView.tsの最終整理
**削除対象**:
- 未使用のimport文
- 未使用のヘルパーメソッド
- コメントアウトされたコード

#### 5.2 NormaTable.tsのコメント整理
**確認対象**:
- JSDocコメントが適切か
- デバッグログが適切か（過剰なログは削除）

#### 5.3 型定義の整理
**ファイル**: `src/ui/views/simulation/SimulationView.ts`

**修正**:
```typescript
/**
 * シミュレーション表示用データ
 * ノルマ表のプロジェクト設定を管理
 */
interface SimulationData {
  projectStartDate: Date;
  projectEndDate: Date;
}
```

#### 5.4 NormaViewMode.tsのJSDoc追加
**ファイル**: `src/ui/views/simulation/NormaViewMode.ts`

```typescript
/**
 * ノルマ表のビューモード定義
 *
 * 進捗管理メニューのViewModeと同じパターンで実装。
 * セクション別（工程別）の表示切り替えを提供する。
 *
 * @remarks
 * - 全表示モードは無し（各セクションを個別に表示）
 * - 初期表示はLOセクション
 * - 状態はViewStateManagerで永続化
 *
 * @example
 * ```typescript
 * const mode = NORMA_VIEW_MODES.lo;
 * console.log(mode.label); // "LO"
 * console.log(mode.section); // "LO"
 * ```
 */
```

#### 5.5 確認事項
- [ ] 未使用のimportがないか
- [ ] JSDocコメントが適切か
- [ ] デバッグログが適切か

---

## テスト項目

### Phase 1完了後
- [ ] ビルドエラーがないこと
- [ ] シミュレーションタブをクリックしてノルマ表が表示されること
- [ ] プロジェクト設定（開始日・終了日）を変更できること
- [ ] プロジェクト設定変更後、ノルマ表が再生成されること
- [ ] 削除した機能（作業予定入力、グラフ、日別予定表）が表示されないこと

### Phase 2完了後
- [ ] ダミーデータ生成ボタンをクリックして、データが生成されること
- [ ] ノルマ表の実績値が0以外の値で表示されること
- [ ] 各セクション（LO、原画、動画、動検、仕上げ）の実績値が正しいこと
- [ ] 担当者ごとの実績値が正しいこと
- [ ] 日付ごとの実績値が正しいこと
- [ ] 週計・セクション小計・個人計・総合計が正しいこと

### Phase 3完了後（ビューモード機能）
- [ ] コントロールバーが表示されること
- [ ] ビューモードボタン（LO、原画、動画、動検、仕上げ）が表示されること
- [ ] 初期表示がLOセクションであること
- [ ] 各ビューモードボタンをクリックして切り替えられること
- [ ] 切り替え時に対応するセクションのみ表示されること
- [ ] アクティブなボタンが視覚的に区別されること
- [ ] 達成率表示ボタンがコントロールバーの右側に表示されること
- [ ] 達成率表示モードに切り替えられること
- [ ] ページリロード後もビューモードが維持されること
- [ ] ページリロード後も達成率表示モードが維持されること
- [ ] スクロール位置が保存されること
- [ ] ページリロード後もスクロール位置が復元されること

### Phase 4完了後
- [ ] エラーが発生した際、適切なエラーメッセージが表示されること
- [ ] コンソールにエラーログが出力されること

### Phase 5完了後
- [ ] ビルドエラーがないこと
- [ ] 全機能が正常に動作すること
- [ ] コードが整理されていること

### 統合テスト
- [ ] 進捗管理タブ → シミュレーションタブ の切り替えが正常に動作すること
- [ ] シミュレーションタブ → 進捗管理タブ の切り替えが正常に動作すること
- [ ] 各タブで状態が独立して保存されること
- [ ] ストレージクリアボタンで両方の状態がクリアされること
- [ ] 各タブのビューモードが独立して保存されること（進捗管理=原画、ノルマ=動検など）
- [ ] タブ切り替え後も各タブのビューモードが正しく復元されること

---

## ロールバック計画

### Phase 1でのロールバック
削除したコードを復元：
```bash
git checkout HEAD -- src/ui/views/simulation/SimulationView.ts
git checkout HEAD -- src/models/events/SimulationEvents.ts
```

### Phase 2でのロールバック
ダミーデータ生成を元に戻す：
```bash
git checkout HEAD -- test/generateDummyData.ts
```

### Phase 3でのロールバック
ビューモード関連の変更を戻す：
```bash
git checkout HEAD -- src/ui/views/simulation/NormaViewMode.ts
git checkout HEAD -- src/ui/shared/state/ViewStateManager.ts
git checkout HEAD -- src/ui/views/simulation/NormaTable.ts
git checkout HEAD -- styles/components/norma-table.css
```

### 完全ロールバック
すべての変更を破棄：
```bash
git checkout HEAD -- src/ui/views/simulation/
git checkout HEAD -- src/models/events/SimulationEvents.ts
git checkout HEAD -- test/generateDummyData.ts
git checkout HEAD -- src/ui/shared/state/ViewStateManager.ts
git checkout HEAD -- styles/components/norma-table.css
```

---

## 実装時の注意事項

### 1. 依存関係の確認
- SimulationEventsの削除時、他のファイルでimportしていないか確認
- WorkSchedule/ProgressPrediction型が他で使用されていないか確認

### 2. ビルドエラーの早期発見
- 各Phase完了後、必ずビルドを実行
- 型エラーを見逃さない

### 3. データの整合性
- LocalStorageキーの変更はしない（`normaTable_{projectId}`を維持）
- 既存の目標値データが失われないようにする

### 4. パフォーマンス
- 実績値計算のキャッシュ機構は維持
- DOM操作の最適化は維持
- ビューモード切り替え時の再レンダリングを最適化

### 5. ユーザー体験
- ローディング表示を適切に行う
- エラーメッセージはユーザーフレンドリーに
- ビューモード切り替えはスムーズに

### 6. CSS変数の活用
- ProgressTableと同じCSS変数を使用
- 一貫性のあるスタイリング

---

## 発見事項・驚き（実装中に記録）

### Phase 1
- **削除した機能の量**: 約370行のコードを削除（作業予定入力、グラフ、日別予定表関連）
- **DOMUtils.escapeHtml**: SimulationView.tsで使用していたが、削除した機能のみで使用していたため、importは残っているが未使用となった（Phase 5で整理）
- **WorkdayCalculator**: プロジェクト情報表示（稼働日計算）では引き続き使用
- **ビルドエラーなし**: WorkScheduledEventとWorkProgressUpdatedEventを削除しても、他のファイルで使用されていなかった
- **UI表示確認**: ノルマ表が正常に表示され、削除した3つの機能（作業予定入力、グラフ、日別予定表）が表示されないことを確認

### Phase 2
- **アップ日付機能は既に実装済み**: generateDummyData.tsには既にloUp、genUp等の設定コードが含まれていた（L345-347, L381-383）
- **問題は古いデータ**: LocalStorageに保存されていたダミーデータが、アップ日付機能実装前のものだった
- **キャッシュの影響**: ブラウザキャッシュにより、新しいビルド結果が反映されない問題が発生
- **データ構造の確認**: LocalStorageのデータ構造が`{data: {...}, timestamp: ...}`形式であることを確認
- **日付範囲のミスマッチ**: ノルマ表のプロジェクト設定（2025-10-16~2026-01-16）とダミーデータの日付範囲（2025-07-30~2025-09-30）が一致していなかったため、実績値が0になっていた
- **解決方法**: プロジェクト設定を2025-07-30~2025-09-30に変更することで、実績値が正しく表示された（LO小計49件、原画小計43件など）
- **Phase 2は実装不要**: コードは既に完成しており、新規実装は不要だった。問題はデータとキャッシュのみだった
- **Phase 2完了**: アップ日付が正しく生成・集計されることを確認（loUp:"2025-09-02", genUp:"2025-09-04", dougaUp:"2025-10-10"など）

### Phase 3
- （実装中に記録）

### Phase 4
- （実装中に記録）

### Phase 5
- （実装中に記録）

---

## 改訂履歴

### 2025-10-16（初版）
- 基本計画作成

### 2025-10-16（第2版）
- ビューモード機能の追加に伴う改訂
- Phase 3を大幅に拡張（ビューモード実装を含む）
- NormaViewMode.ts新規ファイルの追加
- CSSスタイルの追加
- テスト項目の追加

---

**計画作成日**: 2025-10-16
**最終更新**: 2025-10-16
**次のアクション**: ユーザー承認待ち
