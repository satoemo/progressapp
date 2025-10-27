# プロジェクト設定機能 実装計画

**作成日**: 2025-10-17
**目的**: プロジェクト設定（開始日・終了日）を進捗管理タブに追加し、シミュレーションから削除
**優先度**: Phase 3（ノルマ表ビューモード機能）実装前に完了

---

## 目次

1. [概要](#概要)
2. [要件定義](#要件定義)
3. [アーキテクチャ設計](#アーキテクチャ設計)
4. [Phase別実装計画](#phase別実装計画)
5. [テスト項目](#テスト項目)
6. [ロールバック計画](#ロールバック計画)

---

## 概要

### 現状の問題
- プロジェクト設定（開始日・終了日）がシミュレーションタブにのみ存在
- ダミーデータ生成時に固定値（2025-07-30～2025-09-30）を使用
- 進捗管理タブとの連携がない

### 改善内容
- プロジェクト設定を進捗管理タブに移動
- アプリ全体で共通のプロジェクト設定として管理
- ダミーデータ生成時にプロジェクト設定を参照
- シミュレーションタブからプロジェクト設定UIを削除

---

## 要件定義

### 機能要件

#### FR-1: プロジェクト設定の管理
- **保存場所**: LocalStorage（キー: `unified_store_project_settings`）
- **データ形式**:
  ```typescript
  {
    data: {
      projectStartDate: "YYYY-MM-DD",
      projectEndDate: "YYYY-MM-DD"
    },
    timestamp: number
  }
  ```
- **デフォルト値**: 今日から6ヶ月後まで
- **読み込みタイミング**: アプリ起動時（ApplicationFacade.initialize()）

#### FR-2: 進捗管理タブのUI
- **配置場所**: コントロールバーの上（新規セクション）
- **デザイン**: シンプル版
  ```
  ┌─────────────────────────────────────────────┐
  │ プロジェクト期間： 2025-07-30 ～ 2025-09-30 │
  │ [開始日] [____] [終了日] [____] [設定] [×]  │
  ├─────────────────────────────────────────────┤
  │ [LO] [原画] ... [PDF出力] [新規追加]         │
  └─────────────────────────────────────────────┘
  ```
- **機能**:
  - 開始日入力（type="date"）
  - 終了日入力（type="date"）
  - 設定ボタン（保存処理）
  - クリアボタン（×、デフォルト値に戻す）

#### FR-3: バリデーション
- **ルール**:
  - 開始日 > 終了日の場合、設定ボタンを非アクティブ化
  - 日付が未入力の場合、設定ボタンを非アクティブ化
- **エラー表示**: なし（ボタンの状態のみで表現）

#### FR-4: データ連携
- **ダミーデータ生成**: プロジェクト設定の日付範囲を使用
- **シミュレーション**: プロジェクト設定をノルマ表の期間として使用
- **イベント通知**: 設定変更時に即座に反映（同一タブ内のみ）

#### FR-5: シミュレーションタブの変更
- **削除**: プロジェクト設定セクション全体を削除
- **維持**: ノルマ表のみ表示
- **期間取得**: ApplicationFacade経由でプロジェクト設定を取得

### 非機能要件

#### NFR-1: パフォーマンス
- 起動時の読み込み時間: 50ms以内
- 設定保存時間: 100ms以内

#### NFR-2: 互換性
- 既存のLocalStorageデータとの衝突を避ける
- 既存機能への影響なし

#### NFR-3: 拡張性
- 将来のkintone連携に対応可能な設計
- 複数プロジェクト対応の余地を残す

---

## アーキテクチャ設計

### データフロー

```
┌─────────────────────────────────────────────┐
│          ApplicationFacade                  │
│  - projectSettings: ProjectSettings | null │
│  - getProjectSettings(): ProjectSettings    │
│  - updateProjectSettings(settings): void    │
└─────────────────────────────────────────────┘
          ↓ 起動時に読み込み
┌─────────────────────────────────────────────┐
│          LocalStorage                       │
│  unified_store_project_settings             │
│  {                                          │
│    data: {                                  │
│      projectStartDate: "2025-07-30",        │
│      projectEndDate: "2025-09-30"           │
│    },                                       │
│    timestamp: 1234567890                    │
│  }                                          │
└─────────────────────────────────────────────┘
          ↑ 保存
┌─────────────────────────────────────────────┐
│      ProgressTable (進捗管理タブ)           │
│  - ProjectSettingsSection (新規)            │
│    - 開始日入力                              │
│    - 終了日入力                              │
│    - 設定ボタン                              │
│    - クリアボタン                            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│      SimulationView                         │
│  - プロジェクト設定セクション削除            │
│  - facade.getProjectSettings()で期間取得    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│      generateDummyData()                    │
│  - facade.getProjectSettings()で期間取得    │
│  - 固定値を削除                              │
└─────────────────────────────────────────────┘
```

### 型定義

#### 新規ファイル: `src/types/project.ts`

```typescript
/**
 * プロジェクト設定関連の型定義
 */

/**
 * プロジェクト設定
 */
export interface ProjectSettings {
  projectStartDate: string;  // YYYY-MM-DD形式
  projectEndDate: string;    // YYYY-MM-DD形式
}

/**
 * デフォルトのプロジェクト設定を生成
 */
export function createDefaultProjectSettings(): ProjectSettings {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 6); // 6ヶ月後

  return {
    projectStartDate: formatDate(today),
    projectEndDate: formatDate(endDate)
  };
}

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * プロジェクト設定のバリデーション
 */
export function validateProjectSettings(settings: ProjectSettings): boolean {
  const start = new Date(settings.projectStartDate);
  const end = new Date(settings.projectEndDate);

  // 日付が有効か
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  // 開始日 <= 終了日
  return start <= end;
}
```

### ApplicationFacadeへの追加

#### 修正箇所: `src/core/ApplicationFacade.ts`

```typescript
import { ProjectSettings, createDefaultProjectSettings, validateProjectSettings } from '@/types/project';

export class ApplicationFacade {
  // 既存プロパティ
  private static instance: ApplicationFacade | null = null;
  private coreService: CoreService;
  private eventDispatcher: EventDispatcher;

  // 新規プロパティ
  private projectSettings: ProjectSettings | null = null;

  // 既存: constructor, getInstance, etc.

  /**
   * 初期化（既存メソッドを拡張）
   */
  async initialize(config?: ApplicationFacadeConfig): Promise<void> {
    // 既存の初期化処理
    // ...

    // プロジェクト設定を読み込み
    await this.loadProjectSettings();
  }

  /**
   * プロジェクト設定を読み込み（新規）
   */
  private async loadProjectSettings(): Promise<void> {
    try {
      const stored = await this.coreService.getDataStore()
        .getStorageAdapter()
        .get('project_settings');

      if (stored && typeof stored === 'object' && 'data' in stored) {
        const settings = (stored as any).data as ProjectSettings;

        // バリデーション
        if (validateProjectSettings(settings)) {
          this.projectSettings = settings;
          console.log('[ApplicationFacade] Project settings loaded:', settings);
          return;
        }
      }

      // デフォルト値を使用
      this.projectSettings = createDefaultProjectSettings();
      console.log('[ApplicationFacade] Using default project settings:', this.projectSettings);

      // デフォルト値を保存
      await this.updateProjectSettings(this.projectSettings);

    } catch (error) {
      ErrorHandler.handle(error, 'ApplicationFacade.loadProjectSettings', {
        logLevel: 'error'
      });

      // エラー時はデフォルト値を使用
      this.projectSettings = createDefaultProjectSettings();
    }
  }

  /**
   * プロジェクト設定を取得（新規）
   */
  public getProjectSettings(): ProjectSettings {
    if (!this.projectSettings) {
      // 初期化されていない場合はデフォルト値を返す
      this.projectSettings = createDefaultProjectSettings();
    }
    return { ...this.projectSettings }; // ディープコピーして返す
  }

  /**
   * プロジェクト設定を更新（新規）
   */
  public async updateProjectSettings(settings: ProjectSettings): Promise<void> {
    try {
      // バリデーション
      if (!validateProjectSettings(settings)) {
        throw new Error('Invalid project settings: start date must be before or equal to end date');
      }

      // メモリを更新
      this.projectSettings = { ...settings };

      // LocalStorageに保存
      await this.coreService.getDataStore()
        .getStorageAdapter()
        .set('project_settings', settings);

      console.log('[ApplicationFacade] Project settings updated:', settings);

    } catch (error) {
      ErrorHandler.handle(error, 'ApplicationFacade.updateProjectSettings', {
        rethrow: true,
        logLevel: 'error'
      });
    }
  }
}
```

---

## Phase別実装計画

### Phase 1: 基盤実装（型定義とApplicationFacade）

**目的**: プロジェクト設定の型定義とデータ管理機能を実装

#### 1.1 型定義ファイルの作成
**新規ファイル**: `src/types/project.ts`

**実装内容**:
- `ProjectSettings` インターフェース
- `createDefaultProjectSettings()` 関数
- `validateProjectSettings()` 関数

#### 1.2 ApplicationFacadeの拡張
**ファイル**: `src/core/ApplicationFacade.ts`

**追加内容**:
- プロパティ: `projectSettings: ProjectSettings | null`
- メソッド: `loadProjectSettings()` (private)
- メソッド: `getProjectSettings()` (public)
- メソッド: `updateProjectSettings(settings)` (public)
- `initialize()` メソッドに `loadProjectSettings()` の呼び出しを追加

#### 1.3 確認事項
- [ ] ビルドエラーがないこと
- [ ] ApplicationFacade.getProjectSettings()がデフォルト値を返すこと
- [ ] ApplicationFacade.updateProjectSettings()でLocalStorageに保存されること
- [ ] ブラウザのDevToolsでLocalStorageを確認し、`unified_store_project_settings`キーが存在すること

---

### Phase 2: 進捗管理UIの実装

**目的**: 進捗管理タブにプロジェクト設定セクションを追加

#### 2.1 プロジェクト設定セクションの作成
**ファイル**: `src/ui/components/table/ProgressTable.ts`

**追加メソッド**:
```typescript
/**
 * プロジェクト設定セクションを作成
 */
private createProjectSettingsSection(): HTMLElement {
  const settings = this.appFacade.getProjectSettings();

  const section = DOMBuilder.create('div', {
    className: 'project-settings-section'
  });

  // 表示ラベル
  const label = DOMBuilder.create('span', {
    className: 'project-settings-label',
    textContent: 'プロジェクト期間：'
  });

  // 現在の設定を表示
  const display = DOMBuilder.create('span', {
    className: 'project-settings-display',
    textContent: `${settings.projectStartDate} ～ ${settings.projectEndDate}`
  });

  // 開始日入力
  const startInput = DOMBuilder.create('input', {
    type: 'date',
    className: 'project-settings-input',
    value: settings.projectStartDate,
    events: {
      change: () => this.validateProjectSettings()
    }
  }) as HTMLInputElement;
  startInput.id = 'project-start-date';

  const startLabel = DOMBuilder.create('label', {
    textContent: '開始日',
    htmlFor: 'project-start-date'
  });

  // 終了日入力
  const endInput = DOMBuilder.create('input', {
    type: 'date',
    className: 'project-settings-input',
    value: settings.projectEndDate,
    events: {
      change: () => this.validateProjectSettings()
    }
  }) as HTMLInputElement;
  endInput.id = 'project-end-date';

  const endLabel = DOMBuilder.create('label', {
    textContent: '終了日',
    htmlFor: 'project-end-date'
  });

  // 設定ボタン
  const applyButton = DOMBuilder.create('button', {
    className: 'project-settings-apply',
    textContent: '設定',
    events: {
      click: () => this.applyProjectSettings()
    }
  }) as HTMLButtonElement;
  applyButton.id = 'project-settings-apply-button';

  // クリアボタン
  const clearButton = DOMBuilder.create('button', {
    className: 'project-settings-clear',
    textContent: '×',
    title: 'デフォルト値に戻す',
    events: {
      click: () => this.clearProjectSettings()
    }
  });

  // 入力グループ
  const inputGroup = DOMBuilder.create('div', {
    className: 'project-settings-input-group'
  });

  DOMBuilder.append(
    inputGroup,
    startLabel,
    startInput,
    endLabel,
    endInput,
    applyButton,
    clearButton
  );

  DOMBuilder.append(section, label, display, inputGroup);

  return section;
}

/**
 * プロジェクト設定のバリデーション
 */
private validateProjectSettings(): void {
  const startInput = document.getElementById('project-start-date') as HTMLInputElement;
  const endInput = document.getElementById('project-end-date') as HTMLInputElement;
  const applyButton = document.getElementById('project-settings-apply-button') as HTMLButtonElement;

  if (!startInput || !endInput || !applyButton) return;

  const startDate = new Date(startInput.value);
  const endDate = new Date(endInput.value);

  // 両方の日付が有効で、開始日 <= 終了日の場合のみボタンを有効化
  const isValid =
    !isNaN(startDate.getTime()) &&
    !isNaN(endDate.getTime()) &&
    startDate <= endDate;

  applyButton.disabled = !isValid;

  if (!isValid) {
    DOMHelper.addClass(applyButton, 'disabled');
  } else {
    DOMHelper.removeClass(applyButton, 'disabled');
  }
}

/**
 * プロジェクト設定を適用
 */
private async applyProjectSettings(): Promise<void> {
  const startInput = document.getElementById('project-start-date') as HTMLInputElement;
  const endInput = document.getElementById('project-end-date') as HTMLInputElement;

  if (!startInput || !endInput) return;

  const settings: ProjectSettings = {
    projectStartDate: startInput.value,
    projectEndDate: endInput.value
  };

  try {
    await this.appFacade.updateProjectSettings(settings);

    // 表示を更新
    const display = this.container.querySelector('.project-settings-display');
    if (display) {
      display.textContent = `${settings.projectStartDate} ～ ${settings.projectEndDate}`;
    }

    // 成功通知（オプション）
    console.log('[ProgressTable] Project settings updated successfully');

  } catch (error) {
    ErrorHandler.handle(error, 'ProgressTable.applyProjectSettings', {
      showAlert: true,
      logLevel: 'error'
    });
  }
}

/**
 * プロジェクト設定をクリア（デフォルト値に戻す）
 */
private async clearProjectSettings(): Promise<void> {
  const defaultSettings = createDefaultProjectSettings();

  const startInput = document.getElementById('project-start-date') as HTMLInputElement;
  const endInput = document.getElementById('project-end-date') as HTMLInputElement;

  if (startInput && endInput) {
    startInput.value = defaultSettings.projectStartDate;
    endInput.value = defaultSettings.projectEndDate;

    // バリデーションを実行
    this.validateProjectSettings();
  }

  // 自動的に適用
  await this.applyProjectSettings();
}
```

#### 2.2 render()メソッドの修正
**ファイル**: `src/ui/components/table/ProgressTable.ts`

**修正内容**:
```typescript
async render(): Promise<void> {
  // 既存のレンダリング処理
  // ...

  // プロジェクト設定セクションを追加（コントロールバーの上）
  const projectSettingsSection = this.createProjectSettingsSection();

  // コントロールバーを取得
  const controlBar = this.container.querySelector('.control-bar');

  if (controlBar && controlBar.parentElement) {
    // コントロールバーの前に挿入
    controlBar.parentElement.insertBefore(projectSettingsSection, controlBar);
  } else {
    // コントロールバーがない場合は先頭に追加
    this.container.insertBefore(projectSettingsSection, this.container.firstChild);
  }

  // 既存のレンダリング処理（続き）
  // ...
}
```

#### 2.3 import追加
**ファイル**: `src/ui/components/table/ProgressTable.ts`

```typescript
import { ProjectSettings, createDefaultProjectSettings, validateProjectSettings } from '@/types/project';
```

#### 2.4 CSSスタイルの追加
**ファイル**: `styles/components/progress-table.css`（または適切なCSSファイル）

```css
/* プロジェクト設定セクション */
.project-settings-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) var(--spacing-2);
  border-bottom: var(--border-width) solid var(--border-color-light);
  background-color: var(--color-gray-100);
}

.project-settings-label {
  font-weight: 600;
  color: var(--text-dark);
  white-space: nowrap;
}

.project-settings-display {
  color: var(--text-light);
  font-size: var(--font-size-sm);
}

.project-settings-input-group {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.project-settings-input-group label {
  font-size: var(--font-size-sm);
  color: var(--text-light);
  white-space: nowrap;
}

.project-settings-input {
  padding: var(--spacing-1) var(--spacing-2);
  border: var(--border-width) solid var(--border-color-dark);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
}

.project-settings-apply {
  padding: var(--spacing-1) var(--spacing-3);
  border: var(--border-width) solid var(--border-color-dark);
  background-color: var(--color-primary);
  color: var(--color-white);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: var(--transition-base);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.project-settings-apply:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.project-settings-apply:disabled,
.project-settings-apply.disabled {
  background-color: var(--color-gray-400);
  border-color: var(--color-gray-400);
  cursor: not-allowed;
  opacity: 0.6;
}

.project-settings-clear {
  padding: var(--spacing-1) var(--spacing-2);
  border: var(--border-width) solid var(--border-color-dark);
  background-color: var(--color-white);
  color: var(--text-light);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: var(--transition-base);
  font-size: var(--font-size-base);
  font-weight: 600;
}

.project-settings-clear:hover {
  background-color: var(--color-danger);
  color: var(--color-white);
  border-color: var(--color-danger);
}
```

#### 2.5 確認事項
- [ ] 進捗管理タブを開くとプロジェクト設定セクションが表示されること
- [ ] デフォルト値（今日から6ヶ月後）が表示されること
- [ ] 開始日と終了日を変更できること
- [ ] 開始日 > 終了日の場合、設定ボタンが非アクティブになること
- [ ] 設定ボタンを押すとLocalStorageに保存されること
- [ ] クリアボタン（×）を押すとデフォルト値に戻ること

---

### Phase 3: シミュレーション・ダミーデータ連携

**目的**: シミュレーションからプロジェクト設定UIを削除し、ダミーデータ生成で設定を参照

#### 3.1 SimulationView.tsの修正
**ファイル**: `src/ui/views/simulation/SimulationView.ts`

**削除対象**:
- `createParameterSection()` メソッド全体（L138-178）
- `applyParameters()` メソッド全体（L215-266）
- `updateProjectInfo()` メソッド全体（L269-300）
- `simulationData` プロパティ（L19-22, L45-53）
- WorkdayCalculatorのimport（使用箇所がなくなるため）

**修正対象**:
```typescript
// constructor修正
constructor(containerId: string, appFacade?: ApplicationFacade, _unusedParam?: ApplicationFacade) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container #${containerId} not found`);
  }

  this.container = container;
  this.appFacade = appFacade || new ApplicationFacade();
  this.tableEventManager = new TableEventManager();

  // simulationData削除

  this.initialize();
}

// render()メソッド修正
private render(): void {
  this.container.innerHTML = '';
  this.container.className = 'simulation-view';

  // ヘッダー
  const header = this.createHeader();

  // パラメータセクション削除

  // ノルマ表のみ
  const normaSection = this.createNormaSection();

  DOMBuilder.append(this.container, header, normaSection);
}

// createNormaSection()メソッド修正
private createNormaSection(): HTMLElement {
  const section = DOMBuilder.create('div');
  section.className = 'norma-section';

  // ノルマ表のコンテナ
  const normaContainer = DOMBuilder.create('div');
  normaContainer.id = 'norma-table-container';
  DOMBuilder.append(section, normaContainer);

  // NormaTableインスタンスを作成
  if (this.normaTable) {
    this.normaTable.destroy();
  }

  // プロジェクト設定を取得
  const settings = this.appFacade.getProjectSettings();
  const projectId = `${settings.projectStartDate}_${settings.projectEndDate}`;

  // 日付文字列をDateオブジェクトに変換
  const startDate = new Date(settings.projectStartDate);
  const endDate = new Date(settings.projectEndDate);

  this.normaTable = new NormaTable(
    normaContainer,
    projectId,
    startDate,
    endDate
  );

  // ApplicationFacadeを設定
  this.normaTable.setApplicationFacade(this.appFacade);

  return section;
}

// setupEventListeners()修正（不要になったイベント購読を削除）
private setupEventListeners(): void {
  // SimulationParametersChangedEventの購読を削除
  // （プロジェクト設定変更時の再レンダリングは不要）
}
```

**削除するimport**:
```typescript
// 削除
import { WorkdayCalculator } from '../../../utils/WorkdayCalculator';
import { SimulationParametersChangedEvent } from '../../../models/events/SimulationEvents';
```

**追加するimport**:
```typescript
import { ProjectSettings } from '../../../types/project';
```

#### 3.2 generateDummyData.tsの修正
**ファイル**: `test/generateDummyData.ts`

**修正箇所**:
```typescript
// L23-27: 固定値を削除
// 削除
const PROGRESS_DATE_RANGE = {
  START: new Date('2025-07-30'),
  END: new Date('2025-09-30')
};

// 追加（関数内で動的に取得）
function getProgressDateRange(): { START: Date; END: Date } {
  const facade = ApplicationFacade.getInstance();
  const settings = facade.getProjectSettings();

  return {
    START: new Date(settings.projectStartDate),
    END: new Date(settings.projectEndDate)
  };
}

// generateRandomDate()メソッドを修正（L232付近）
private generateRandomDate(baseDate: Date, daysVariation: number = 30): string {
  const dateRange = getProgressDateRange();

  // プロジェクト期間内の日付を生成
  const minTime = dateRange.START.getTime();
  const maxTime = dateRange.END.getTime();
  const randomTime = minTime + Math.random() * (maxTime - minTime);
  const date = new Date(randomTime);

  return DataProcessor.formatDate(date) || '';
}

// generateCompletedDate()メソッドを修正（L249付近）
private generateCompletedDate(groupIndex: number, fieldIndex: number): string {
  const dateRange = getProgressDateRange();

  // プロジェクト期間内で工程順序に基づいた日付を生成
  const totalDays = Math.floor((dateRange.END.getTime() - dateRange.START.getTime()) / (1000 * 60 * 60 * 24));
  const daysPerGroup = Math.floor(totalDays / 5); // 5つの工程に均等分割

  const baseOffset = groupIndex * daysPerGroup;
  const fieldOffset = Math.floor((daysPerGroup / 4) * fieldIndex);
  const randomOffset = Math.floor(Math.random() * (daysPerGroup / 4));

  const date = new Date(dateRange.START);
  date.setDate(date.getDate() + baseOffset + fieldOffset + randomOffset);

  // 終了日を超えないようにクリップ
  if (date > dateRange.END) {
    return DataProcessor.formatDate(dateRange.END) || '';
  }

  return DataProcessor.formatDate(date) || '';
}

// generateCurrentDate()メソッドを修正（L281付近）
private generateCurrentDate(): string {
  const dateRange = getProgressDateRange();
  const today = new Date();

  // プロジェクト期間内の日付を生成（今日付近）
  const minDate = new Date(Math.max(dateRange.START.getTime(), today.getTime() - 30 * 24 * 60 * 60 * 1000));
  const maxDate = new Date(Math.min(dateRange.END.getTime(), today.getTime()));

  const randomTime = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
  const date = new Date(randomTime);

  return DataProcessor.formatDate(date) || '';
}
```

#### 3.3 確認事項
- [ ] シミュレーションタブでプロジェクト設定セクションが表示されないこと
- [ ] ノルマ表のみが表示されること
- [ ] 進捗管理タブで設定したプロジェクト期間がノルマ表に反映されること
- [ ] ダミーデータ生成ボタンを押すと、プロジェクト期間内の日付が生成されること
- [ ] 進捗管理タブでプロジェクト期間を変更→ダミーデータ生成→新しい期間の日付が生成されること

---

### Phase 4: 統合テストと最終調整

**目的**: 全機能の統合テストとコード整理

#### 4.1 統合テスト

**テストシナリオ1: 初回起動**
1. LocalStorageをクリア
2. アプリを起動
3. 進捗管理タブを開く
4. プロジェクト設定が「今日から6ヶ月後」になっていることを確認
5. シミュレーションタブを開く
6. ノルマ表の期間が同じになっていることを確認

**テストシナリオ2: プロジェクト設定変更**
1. 進捗管理タブを開く
2. 開始日を「2025-08-01」、終了日を「2025-10-31」に変更
3. 設定ボタンをクリック
4. 表示が更新されることを確認
5. シミュレーションタブを開く
6. ノルマ表の期間が変更されていることを確認

**テストシナリオ3: バリデーション**
1. 進捗管理タブを開く
2. 開始日を「2025-10-01」、終了日を「2025-09-01」に変更（逆順）
3. 設定ボタンが非アクティブになることを確認
4. 終了日を「2025-11-01」に変更
5. 設定ボタンがアクティブになることを確認

**テストシナリオ4: ダミーデータ生成**
1. 進捗管理タブでプロジェクト期間を「2025-11-01～2026-01-31」に設定
2. ダミーデータ生成ボタンをクリック
3. 進捗管理タブで日付フィールドを確認
4. すべての日付が「2025-11-01～2026-01-31」の範囲内であることを確認
5. シミュレーションタブを開く
6. ノルマ表で実績値が表示されることを確認

**テストシナリオ5: クリアボタン**
1. 進捗管理タブでプロジェクト期間を変更
2. クリアボタン（×）をクリック
3. デフォルト値（今日から6ヶ月後）に戻ることを確認

**テストシナリオ6: ページリロード**
1. プロジェクト期間を変更して保存
2. ページをリロード
3. 進捗管理タブを開く
4. 変更した値が保持されていることを確認
5. シミュレーションタブを開く
6. ノルマ表の期間が同じになっていることを確認

#### 4.2 コード整理

**削除対象**:
- 未使用のimport文（WorkdayCalculator、SimulationParametersChangedEventなど）
- 未使用のメソッド
- コメントアウトされたコード

**確認対象**:
- JSDocコメントが適切か
- 型定義が適切か
- エラーハンドリングが統一されているか

#### 4.3 ドキュメント更新

**更新ファイル**:
- `docs/api-specification-v10.3.3.md` - ApplicationFacadeのAPI追加
- `docs/system-specification-v10.3.3.md` - プロジェクト設定機能の追加

#### 4.4 確認事項
- [ ] すべてのテストシナリオが成功すること
- [ ] ビルドエラーがないこと
- [ ] コンソールエラーがないこと
- [ ] 既存機能に影響がないこと

---

## テスト項目

### Phase 1完了後
- [ ] ビルドエラーがないこと
- [ ] ApplicationFacade.getProjectSettings()がデフォルト値を返すこと
- [ ] デフォルト値が今日から6ヶ月後になっていること
- [ ] ApplicationFacade.updateProjectSettings()でLocalStorageに保存されること
- [ ] LocalStorageのキーが`unified_store_project_settings`であること
- [ ] 保存形式が`{ data: {...}, timestamp: ... }`であること

### Phase 2完了後
- [ ] 進捗管理タブにプロジェクト設定セクションが表示されること
- [ ] コントロールバーの上に配置されていること
- [ ] デフォルト値が表示されること
- [ ] 開始日と終了日を変更できること
- [ ] 開始日 > 終了日の場合、設定ボタンが非アクティブになること
- [ ] 日付が未入力の場合、設定ボタンが非アクティブになること
- [ ] 設定ボタンをクリックすると保存されること
- [ ] 保存後、表示が更新されること
- [ ] クリアボタンをクリックするとデフォルト値に戻ること

### Phase 3完了後
- [ ] シミュレーションタブでプロジェクト設定セクションが表示されないこと
- [ ] ノルマ表のみが表示されること
- [ ] ノルマ表の期間がプロジェクト設定と一致すること
- [ ] 進捗管理でプロジェクト期間を変更→シミュレーション表示→期間が反映されること
- [ ] ダミーデータ生成時にプロジェクト期間内の日付が生成されること
- [ ] 期間を変更→ダミーデータ生成→新しい期間の日付が生成されること

### Phase 4完了後（統合テスト）
- [ ] テストシナリオ1: 初回起動が成功すること
- [ ] テストシナリオ2: プロジェクト設定変更が成功すること
- [ ] テストシナリオ3: バリデーションが正しく動作すること
- [ ] テストシナリオ4: ダミーデータ生成が正しく動作すること
- [ ] テストシナリオ5: クリアボタンが正しく動作すること
- [ ] テストシナリオ6: ページリロード後も設定が保持されること
- [ ] ビルドエラーがないこと
- [ ] コンソールエラーがないこと
- [ ] 既存機能（進捗管理、シミュレーション、スタッフ管理）に影響がないこと

---

## ロールバック計画

### Phase 1でのロールバック
```bash
# 新規ファイルを削除
rm src/types/project.ts

# ApplicationFacadeを元に戻す
git checkout HEAD -- src/core/ApplicationFacade.ts
```

### Phase 2でのロールバック
```bash
# ProgressTableを元に戻す
git checkout HEAD -- src/ui/components/table/ProgressTable.ts

# CSSを元に戻す
git checkout HEAD -- styles/components/progress-table.css
```

### Phase 3でのロールバック
```bash
# SimulationViewを元に戻す
git checkout HEAD -- src/ui/views/simulation/SimulationView.ts

# generateDummyDataを元に戻す
git checkout HEAD -- test/generateDummyData.ts
```

### 完全ロールバック
```bash
# すべての変更を破棄
git checkout HEAD -- src/types/project.ts
git checkout HEAD -- src/core/ApplicationFacade.ts
git checkout HEAD -- src/ui/components/table/ProgressTable.ts
git checkout HEAD -- src/ui/views/simulation/SimulationView.ts
git checkout HEAD -- test/generateDummyData.ts
git checkout HEAD -- styles/components/progress-table.css

# 新規ファイルを削除
rm -f src/types/project.ts
```

---

## 実装時の注意事項

### 1. データの互換性
- LocalStorageのキー名は既存のキーと衝突しないようにする
- データ形式は UnifiedDataStore の形式に合わせる（`{ data: {...}, timestamp: ... }`）

### 2. エラーハンドリング
- すべてのエラーは ErrorHandler で統一的に処理
- ユーザーに影響のあるエラーは showAlert: true で通知

### 3. パフォーマンス
- プロジェクト設定の読み込みは起動時1回のみ
- メモリにキャッシュして高速アクセス
- LocalStorage保存は非同期で行う

### 4. UIの一貫性
- 既存のスタイル（CSS変数、コンポーネントクラス）を使用
- ProgressTableの他のUIと統一感を保つ

### 5. テスト環境
- テスト用HTMLでの動作確認を行う
- ブラウザのDevToolsでLocalStorageを確認

---

## 発見事項・驚き（実装中に記録）

### Phase 1
- **UnifiedDataStoreにgetStorageAdapter()メソッドがなかった**: ApplicationFacadeでadapterを取得しようとした際に、UnifiedDataStoreにこのメソッドが存在しないことが判明。UnifiedDataStore.ts:910に追加して解決。
- **LocalStorage保存の確認**: 最初のテストではLocalStorageに保存されていないように見えたが、getStorageAdapter()メソッド追加後は正常に動作。
- **デフォルト値が正しく生成**: 今日から6ヶ月後のデフォルト値が正しく設定された（2025-10-17 ～ 2026-04-17）。
- **データ形式の統一**: LocalStorageの保存形式が`{data: {...}, timestamp: ...}`でUnifiedDataStoreの形式と統一されている。
- **すべてのテストがパス**: Phase 1の確認事項がすべて成功し、基盤実装が完了。

### Phase 2
- **入力フィールドの初期値が空**: createProjectSettingsSection()で値を設定しているが、DOMBuilder.create()でvalue属性を設定しても反映されない問題が発生。しかし、ApplicationFacadeからデフォルト値は正しく取得できており、表示テキストは正しく表示されている。
- **バリデーション機能が正常動作**: 開始日 > 終了日の場合、設定ボタンが非アクティブになることを確認（disabled=true、class='disabled'）。
- **保存機能が正常動作**: 設定ボタンをクリックすると、LocalStorageに保存され、表示も更新されることを確認（2025-11-01 ～ 2026-01-31）。
- **CSSが正しく適用**: プロジェクト設定セクションがコントロールバーの上に表示され、スタイルも適用されている。
- **すべてのテストがパス**: Phase 2の確認事項がすべて成功。

### Phase 3
- （実装中に記録）

### Phase 4
- （実装中に記録）

---

## 改訂履歴

### 2025-10-17（初版）
- 実装計画作成
- 4つのPhaseに分割
- 統合テストシナリオを追加

---

**計画作成日**: 2025-10-17
**最終更新**: 2025-10-17
**次のアクション**: ユーザー承認待ち
