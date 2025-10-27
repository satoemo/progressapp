/**
 * 進捗管理テーブルコンポーネント（v10.3版）
 * BaseProgressTable_v2を継承した改善版
 */

import { BaseProgressTable } from './base/BaseProgressTable';
import { VIEW_MODES } from '../../config/ViewMode';
import { FieldDefinition } from '../../shared/types/FieldDefinition';
import { FieldKey, ProgressFieldKey } from '@/models/types';
import { CutReadModel } from '@/data/models/CutReadModel';
import { PROGRESS_FIELDS } from '@/models/types';
import { FieldGroup, FIELD_GROUPS } from '../../shared/types/groups';
import { CellEditorFactory } from '../editor/CellEditorFactory';
import { ApplicationFacade } from '@/core/ApplicationFacade';
import { FilterManager } from '../filter/FilterManager';
import { EventPriority } from '@/core/events/EventPriority';
import { DynamicStyleManager } from '@/utils/DynamicStyleManager';
import { ValidationHelper } from '../../shared/utils/ValidationHelper';
import { DropdownPopup } from '../popups/DropdownPopup';
// Command imports removed - using ApplicationFacade directly
import { KenyoMultiSelectPopup } from '../popups/KenyoMultiSelectPopup';
import { SpecialMultiSelectPopup } from '../popups/SpecialMultiSelectPopup';
import { DataProcessor } from '../../shared/utils/DataProcessor';
import { CSSClassBuilder } from '../../shared/builders/CSSClassBuilder';
import { DOMBuilder } from '../../shared/utils/DOMBuilder';
// GetCellMemoQuery removed - using ApplicationFacade directly
// UpdateCellMemoCommand removed - using ApplicationFacade directly
import { UI_TIMING, COLUMN_WIDTHS } from '../../shared/constants/TableConstants';
import { FieldMetadataRegistry } from '@/models/metadata/FieldMetadataRegistry';
import { TableSizeCalculator } from '../../shared/utils/TableSizeCalculator';
// CreateCutCommand removed - using ApplicationFacade directly
// GetAllCutsQuery removed - using ApplicationFacade directly
import { CutNumber } from '@/models/values/CutNumber';
import { ViewStateManager, ProgressTableState, FilterState, ScrollState } from '../../shared/state/ViewStateManager';
import { generateDummyData } from '../../../../test/generateDummyData';
// jsPDF代替実装に切り替え
import { PDFExportService } from '../../../services/export/PDFExportService';
import { AutoFillManager } from '../../features/autofill/AutoFillManager';
import { DOMHelper } from '../../shared/utils/DOMHelper';
import { ErrorHandler } from '../../shared/utils/ErrorHandler';
import { ProjectSettings, createDefaultProjectSettings } from '@/types/project';

/**
 * ソート設定
 */
interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * 進捗管理テーブルクラス
 * UnifiedEventCoordinatorとTableStateManagerを使用した改善版
 */
export class ProgressTable extends BaseProgressTable {
  private tableWrapper?: HTMLDivElement;
  private currentSort: SortConfig | null = null;
  protected table?: HTMLTableElement;
  private cellEditorFactory: CellEditorFactory;
  private filterManager: FilterManager;
  private allCuts: CutReadModel[] = [];
  private viewStateManager: ViewStateManager;
  private isRestoringState = false;
  private autoFillManager: AutoFillManager;

  constructor(container: HTMLElement, appFacade?: ApplicationFacade, _unusedParam?: ApplicationFacade) {
    // ApplicationFacadeを保持
    const facade = appFacade || new ApplicationFacade();
    super(container, facade);
    this.appFacade = facade;
    
    this.cellEditorFactory = new CellEditorFactory(
      this.appFacade,
      (value, field) => this.formatFieldValue(value, field),
      this.tableEventManager,
      (cell, value, cut, fieldKey) => this.updateCellContent(cell, value, cut.cutNumber, fieldKey)
    );
    this.filterManager = new FilterManager();
    
    // ステータス計算関数を設定
    this.filterManager.setStatusCalculator((cut) => this.calculateCutStatus(cut));
    
    // フィルタ変更時に再レンダリングと状態保存
    this.filterManager.setOnFilterChange(() => {
      this.render();
      // フィルタ状態を保存
      if (!this.isRestoringState) {
        this.saveState();
      }
    });

    // ViewStateManagerを初期化
    this.viewStateManager = ViewStateManager.getInstance();
    
    // 保存された状態があれば復元、なければ初期状態を設定
    const savedState = this.viewStateManager.getProgressTableState();
    if (!savedState) {
      this.setInitialSort();
    }

    // AutoFillManagerを初期化（インスタンス化のみテスト）
    this.autoFillManager = new AutoFillManager(
      this.tableEventManager,
      this.appFacade,
      (updates) => this.executeBatchUpdate(updates)
    );

    // 削除機能を初期化（Phase 1-5.1）
    this.initializeDeletionFeature();
  }

  /**
   * 削除機能を初期化
   */
  private async initializeDeletionFeature(): Promise<void> {
    try {
      // ApplicationFacadeのdeleteCutメソッドを直接使用
      console.log('Deletion feature initialized');
    } catch (error) {
      ErrorHandler.handle(error, 'ProgressTable.initializeDeletion', {
        logLevel: 'error'
      });
    }
  }

  /**
   * 初期ソート設定
   */
  private setInitialSort(): void {
    this.currentSort = {
      field: 'cutNumber',
      order: 'asc'
    };
  }

  /**
   * 初期化（オーバーライド）
   */
  async initialize(): Promise<void> {
    console.log('[ProgressTable] ========== INITIALIZE START ==========');
    
    // 親クラスの初期化処理を実行
    console.log('[ProgressTable] Calling super.initialize()...');
    await super.initialize();
    
    // AutoFillManagerを初期化（initialize()メソッドのみテスト）
    this.autoFillManager.initialize();
    
    // DeleteButtonHandlerを初期化（将来実装予定）
    // if (this.deleteButtonHandler && this.container) {
    //   this.deleteButtonHandler.initialize(this.container);
    // }
    
    // 状態を復元
    console.log('[ProgressTable] Calling restoreState()...');
    await this.restoreState();
    
    // restoreState後に最終的なレンダリング（changeViewModeでrender済みの場合も再度確実に実行）
    console.log('[ProgressTable] Final initialization render');
    this.render();
    
    console.log('[ProgressTable] ========== INITIALIZE END ==========');
  }

  /**
   * テーブル構造を作成
   */
  protected createTableStructure(): void {
    // 既存の内容をクリア
    this.container.innerHTML = '';

    // TableSizeCalculatorでCSS変数を設定
    TableSizeCalculator.applyCSSVariables();

    // プロジェクト設定セクションを作成
    const projectSettingsSection = this.createProjectSettingsSection();
    DOMBuilder.append(this.container, projectSettingsSection);

    // コントロールバーを作成
    const controlBar = this.createControlBar();
    DOMBuilder.append(this.container, controlBar);

    // テーブルラッパーを作成
    this.tableWrapper = DOMBuilder.create('div', { className: 'table-wrapper' });

    // テーブルを作成
    this.table = DOMBuilder.create('table', { className: 'progress-table' });

    // DOM構造を組み立て
    DOMBuilder.append(this.tableWrapper, this.table);
    DOMBuilder.append(this.container, this.tableWrapper);

    // 表示フィールドを更新
    this.updateVisibleFields();

    // イベント委譲を設定（一度だけ）
    this.setupEventDelegation();
  }

  /**
   * イベント委譲を設定
   */
  private setupEventDelegation(): void {
    if (!this.table) return;
    
    this.setupTableClickEvents();
    this.setupTableDoubleClickEvents();
    this.setupContextMenuEvents();
    this.setupTooltipEvents();
    this.setupScrollEvents();
  }

  /**
   * テーブルクリックイベントを設定
   */
  private setupTableClickEvents(): void {
    if (!this.table) return;

    console.log('[ProgressTable] setupTableClickEvents: イベントハンドラーを登録します');
    const handlerId = this.tableEventManager.on(
      this.table,
      'click',
      async (e) => {
        const target = e.target as HTMLElement;
        console.log('[ProgressTable] Click event fired on:', target.className, target.tagName);

        // 削除ボタンのクリック処理
        if (target.classList.contains('delete-link') || target.closest('.delete-link')) {
          console.log('[ProgressTable] 削除ボタンがクリックされました');
          e.stopPropagation();
          const deleteButton = target.classList.contains('delete-link') ? target : target.closest('.delete-link') as HTMLElement;
          const tr = deleteButton.closest('tr') as HTMLTableRowElement;
          const cutId = tr?.dataset.cutId || tr?.querySelector('[data-cut-id]')?.getAttribute('data-cut-id');

          console.log('[ProgressTable] カットID:', cutId);
          console.log('[ProgressTable] this.appFacade exists:', !!this.appFacade);

          if (cutId && this.appFacade) {
            const cut = this.cuts.find(c => c.id === cutId);
            console.log('[ProgressTable] カット情報:', cut?.cutNumber);
            if (cut) {
              console.log('[ProgressTable] 削除処理を開始します');
              try {
                await this.appFacade.deleteCut(cutId);
                console.log('[ProgressTable] deleteCut完了');
                await this.refreshData();
                console.log('[ProgressTable] refreshData完了');
              } catch (error) {
                console.error('[ProgressTable] 削除エラー:', error);
                ErrorHandler.handle(error, 'ProgressTable.deleteCut', {
                  showAlert: true,
                  logLevel: 'error'
                });
              }
            }
          }
          return;
        }

        // ヘッダーのソート処理
        if (target.classList.contains('sortable-header') || target.closest('.sortable-header')) {
          const header = target.classList.contains('sortable-header') ? target : target.closest('.sortable-header') as HTMLElement;
          const field = header.dataset.field;
          if (field) {
            this.sort(field);
          }
        }
      },
      EventPriority.HIGH
    );
    console.log('[ProgressTable] setupTableClickEvents: ハンドラーID =', handlerId);
  }

  /**
   * テーブルダブルクリックイベントを設定
   */
  private setupTableDoubleClickEvents(): void {
    if (!this.table) return;
    
    this.tableEventManager.on(
      this.table,
      'dblclick',
      (e) => {
        const target = e.target as HTMLElement;
        
        // ヘッダー（th）の処理
        const th = target.closest('th') as HTMLTableCellElement;
        if (th && th.classList.contains('filterable-header')) {
          this.handleHeaderDoubleClick(e, th);
          return;
        }
        
        // データセル（td）の処理
        const td = target.closest('td') as HTMLTableCellElement;
        if (td) {
          this.handleDataCellDoubleClick(td);
        }
      },
      EventPriority.HIGH
    );
  }

  /**
   * ヘッダーダブルクリック処理（削除 - 右クリックでフィルタ表示に変更）
   */
  private handleHeaderDoubleClick(e: Event, th: HTMLTableCellElement): void {
    e.stopPropagation();
    // フィルタ表示は右クリックに移行したため、ダブルクリックでは何もしない
  }

  /**
   * データセルダブルクリック処理
   */
  private handleDataCellDoubleClick(td: HTMLTableCellElement): void {
    const tr = td.closest('tr') as HTMLTableRowElement;
    const cutId = tr.dataset.cutId;
    if (!cutId) return;

    const cut = this.cuts.find(c => c.id === cutId);
    if (!cut) return;

    const fieldKey = td.dataset.field as FieldKey;
    const field = this.visibleFields.find(f => f.field === fieldKey);
    if (!field) return;

    // 進捗フィールドの編集（カレンダーポップアップを表示）
    if (td.classList.contains('progress-cell') && td.dataset.editable === 'true') {
      // 親クラスのカレンダーポップアップ表示メソッドを呼び出す
      this.handleProgressCellDoubleClick(td, cut, fieldKey);
    }
    // 非進捗フィールドの編集
    else if (td.classList.contains('editable-cell')) {
      this.handleNonProgressCellDoubleClick(td, cut, fieldKey, field);
    }
  }

  /**
   * コンテキストメニューイベントを設定
   */
  private setupContextMenuEvents(): void {
    if (!this.table) return;
    
    this.tableEventManager.on(
      this.table,
      'contextmenu',
      (e) => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const th = target.closest('th') as HTMLTableCellElement;
        const td = target.closest('td') as HTMLTableCellElement;
        
        // ヘッダーの右クリック - フィルタを表示
        if (th && th.dataset.field) {
          const field = th.dataset.field;
          const fieldKey = field as FieldKey;
          const fieldDef = this.visibleFields.find(f => f.field === field);
          if (fieldDef) {
            this.filterManager.showFilterDropdown(
              fieldKey,
              fieldDef.title,
              th,
              this.allCuts
            );
          }
        }
        // セルの右クリック - 編集メニューを表示
        else if (td && td.dataset.field) {
          const tr = td.closest('tr') as HTMLTableRowElement;
          const cutId = tr?.dataset.cutId;
          
          if (cutId) {
            const cut = this.cuts.find(c => c.id === cutId);
            if (cut) {
              const field = td.dataset.field as FieldKey;
              this.handleCellRightClick(td, cut, field, e as MouseEvent);
            }
          }
        }
      },
      EventPriority.HIGH
    );
  }

  /**
   * ツールチップイベントを設定
   */
  private setupTooltipEvents(): void {
    if (!this.table) return;
    
    let tooltipTimeout: number | null = null;
    let currentTooltip: HTMLDivElement | null = null;
    
    // マウスオーバーイベント
    this.tableEventManager.on(
      this.table,
      'mouseover',
      (e) => {
        const target = e.target as HTMLElement;
        const td = target.closest('td') as HTMLTableCellElement;
        
        // 既存のツールチップタイマーをクリア
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
          tooltipTimeout = null;
        }
        
        if (td && td.dataset.field && td.querySelector('.memo-indicator')) {
          const tr = td.closest('tr') as HTMLTableRowElement;
          const cutId = tr?.dataset.cutId;
          
          if (cutId) {
            const cut = this.cuts.find(c => c.id === cutId);
            if (cut) {
              const field = td.dataset.field as FieldKey;
              // ApplicationFacadeのgetCellMemoメソッドを使用
              this.appFacade.getCellMemo(cut.cutNumber, field).then((memo: string | undefined) => {
                if (memo) {
                  // ツールチップ表示遅延
                  tooltipTimeout = window.setTimeout(() => {
                    currentTooltip = this.showMemoTooltip(td, memo);
                  }, UI_TIMING.TOOLTIP_DELAY);
                }
              });
            }
          }
        }
      },
      EventPriority.LOW
    );
    
    // マウスアウトイベント
    this.tableEventManager.on(
      this.table,
      'mouseout',
      (e) => {
        // タイマーをクリア
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
          tooltipTimeout = null;
        }
        
        // 既存のツールチップを削除
        if (currentTooltip && currentTooltip.parentNode) {
          currentTooltip.parentNode.removeChild(currentTooltip);
          currentTooltip = null;
        }
      },
      EventPriority.LOW
    );
  }

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

    // 入力グループ
    const inputGroup = DOMBuilder.create('div', {
      className: 'project-settings-input-group'
    });

    // 開始日入力
    const startLabel = DOMBuilder.create('label', {
      textContent: '開始日',
      htmlFor: 'project-start-date'
    });

    const startInput = DOMBuilder.create('input', {
      type: 'date',
      className: 'project-settings-input',
      value: settings.projectStartDate,
      events: {
        change: () => this.validateProjectSettings()
      }
    }) as HTMLInputElement;
    startInput.id = 'project-start-date';

    // 終了日入力
    const endLabel = DOMBuilder.create('label', {
      textContent: '終了日',
      htmlFor: 'project-end-date'
    });

    const endInput = DOMBuilder.create('input', {
      type: 'date',
      className: 'project-settings-input',
      value: settings.projectEndDate,
      events: {
        change: () => this.validateProjectSettings()
      }
    }) as HTMLInputElement;
    endInput.id = 'project-end-date';

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

      // 成功通知
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

  /**
   * コントロールバーを作成
   */
  private createControlBar(): HTMLDivElement {
    const controlBar = DOMBuilder.create('div', { className: 'view-mode-controls' });
    
    // ビューモード切り替えボタン
    const viewButtons = DOMBuilder.create('div', { className: 'view-mode-buttons' });
    
    // 最適化版: Object.entriesをfor-ofに変更
    for (const [mode, config] of Object.entries(VIEW_MODES)) {
      const button = DOMBuilder.create('button', {
        className: `view-mode-button ${mode === this.currentViewMode ? 'active' : ''}`,
        textContent: config.label,
        events: { click: async () => await this.changeViewMode(mode) }
      });
      DOMBuilder.append(viewButtons, button);
    }

    DOMBuilder.append(controlBar, viewButtons);
    
    // 右側のボタングループ
    const actionButtons = DOMBuilder.create('div', { className: 'action-buttons' });
    
    // jsPDF版PDFエクスポートボタン
    const exportButton = DOMBuilder.create('button', {
      className: 'export-pdf-button',
      textContent: 'PDF出力',
      events: { click: () => this.exportToPDF() }
    });
    
    // 新規カット追加ボタン
    const addButton = DOMBuilder.create('button', {
      className: 'add-cut-button',
      textContent: '新規カット追加',
      events: { click: () => this.addNewCut() }
    });
    
    // ダミーデータ生成ボタン
    const dummyButton = DOMBuilder.create('button', {
      className: 'dummy-data-button',
      textContent: 'ダミーデータ生成',
      events: { click: () => this.generateDummyData() }
    });

    // ストレージ削除ボタン
    const clearStorageButton = DOMBuilder.create('button', {
      className: 'clear-storage-button',
      textContent: 'ストレージクリア',
      events: { click: () => this.clearMockStorage() }
    });

    DOMBuilder.append(actionButtons, exportButton, addButton, dummyButton, clearStorageButton);
    DOMBuilder.append(controlBar, actionButtons);

    return controlBar;
  }


  /**
   * colgroup要素を作成して列幅を明示的に定義
   */
  private createColGroup(): HTMLTableColElement {
    const colgroup = DOMBuilder.create('colgroup') as HTMLTableColElement;
    
    // 最適化版: forEachをfor-ofに変更
    for (const field of this.visibleFields) {
      const col = DOMBuilder.create('col', {
        styles: { width: `${field.width}px` }
      }) as HTMLTableColElement;
      
      // 固定列の場合は追加のスタイルを設定
      if (field.fixed) {
        col.className = 'fixed-column-col';
      }
      
      DOMBuilder.append(colgroup, col);
    }

    // 削除列のcol要素を追加
    const deleteCol = DOMBuilder.create('col', {
      styles: { width: `${COLUMN_WIDTHS.DELETE}px` },
      className: 'delete-column-col'
    }) as HTMLTableColElement;
    DOMBuilder.append(colgroup, deleteCol);
    
    return colgroup;
  }

  /**
   * テーブルヘッダーを作成
   */
  private createTableHeader(): HTMLTableSectionElement {
    const thead = DOMBuilder.create('thead') as HTMLTableSectionElement;
    
    // グループヘッダー行を作成
    const groupHeaderRow = this.createGroupHeaderRow();
    DOMBuilder.append(thead, groupHeaderRow);

    // フィールドヘッダー行を作成
    const fieldHeaderRow = this.createFieldHeaderRow();
    DOMBuilder.append(thead, fieldHeaderRow);
    
    return thead;
  }

  /**
   * グループヘッダー行を作成
   */
  private createGroupHeaderRow(): HTMLTableRowElement {
    const tr = DOMBuilder.create('tr', { className: 'group-header-row' }) as HTMLTableRowElement;
    
    // フィールドをグループごとにまとめる
    const groupedFields = this.groupFieldsByLayout();
    
    
    // 最適化版: forEachをfor-ofに変更
    for (const group of groupedFields) {
      const th = DOMBuilder.create('th', {
        className: `group-header ${group.className}`,
        textContent: group.title,
        attributes: { colspan: String(group.colspan) }
      }) as HTMLTableCellElement;
      DOMBuilder.append(tr, th);
    }

    // 操作グループのヘッダーを追加
    const operationTh = DOMBuilder.create('th', {
      className: 'group-header operation-group',
      textContent: '操作',
      attributes: { colspan: '1' }
    }) as HTMLTableCellElement;
    DOMBuilder.append(tr, operationTh);
    
    return tr;
  }

  /**
   * フィールドをレイアウトグループごとにまとめる
   */
  private groupFieldsByLayout(): Array<{
    title: string, 
    colspan: number, 
    className: string, 
    isFixed: boolean,
    totalWidth: number
  }> {
    const groups: Array<{
      title: string, 
      colspan: number, 
      className: string,
      isFixed: boolean,
      totalWidth: number
    }> = [];
    
    let currentCategory: string | null = null;
    let currentGroup: FieldGroup | null = null;
    let currentColspan = 0;
    let currentTotalWidth = 0;
    let currentIsFixed = false;
    
    // 各フィールドをcategoryでグループ化
    for (let i = 0; i < this.visibleFields.length; i++) {
      const field = this.visibleFields[i];
      
      // categoryが変わった場合
      if (field.category !== currentCategory) {
        // 前のグループを追加
        if (currentCategory !== null && currentColspan > 0) {
          groups.push({
            title: currentGroup?.title || currentCategory,
            colspan: currentColspan,
            className: currentGroup?.className || `${currentCategory}-group`,
            isFixed: currentIsFixed,
            totalWidth: currentTotalWidth
          });
        }
        
        // 新しいグループを開始
        currentCategory = field.category || 'other';
        currentGroup = FIELD_GROUPS.find(g => g.id === currentCategory) || null;
        currentColspan = 1;
        currentTotalWidth = field.width;
        currentIsFixed = field.fixed || false;
      } else {
        // 同じカテゴリーの場合は列数を増やす
        currentColspan++;
        currentTotalWidth += field.width;
      }
    }
    
    // 最後のグループを追加
    if (currentColspan > 0) {
      groups.push({
        title: currentGroup?.title || currentCategory || '',
        colspan: currentColspan,
        className: currentGroup?.className || `${currentCategory}-group`,
        isFixed: currentIsFixed,
        totalWidth: currentTotalWidth
      });
    }
    
    return groups;
  }

  /**
   * フィールドヘッダー行を作成
   */
  private createFieldHeaderRow(): HTMLTableRowElement {
    const tr = DOMBuilder.create('tr', { className: 'field-header-row' }) as HTMLTableRowElement;
    
    // 最適化版: forEachをfor-ofに変更
    for (const field of this.visibleFields) {
      const th = this.createFieldHeaderCell(field);
      DOMBuilder.append(tr, th);
    }

    // 削除列のヘッダーを追加
    const deleteHeader = DOMBuilder.create('th', {
      className: 'delete-column',
      textContent: '削除'
    }) as HTMLTableCellElement;
    DOMBuilder.append(tr, deleteHeader);
    
    return tr;
  }

  /**
   * フィールドヘッダーセルを作成
   */
  private createFieldHeaderCell(field: FieldDefinition): HTMLTableCellElement {
    const th = DOMBuilder.create('th', {
      styles: {
        width: `${field.width}px`,
        minWidth: `${field.width}px`,
        maxWidth: `${field.width}px`
      }
    }) as HTMLTableCellElement;
    DOMHelper.addClass(th, 'kdp-vertical-top');
    th.className = `field-header ${field.category ? `field-${field.category}` : ''}`;
    
    const content = DOMBuilder.create('div', { className: 'field-header-content' });
    
    // フィールドタイトル
    const title = this.createFieldTitle(field);
    
    // ソートとフィルタ機能
    if (field.field !== 'id') {
      this.addSortFeatures(title, th, field);
      this.addFilterIndicator(title, field);
    }
    
    DOMBuilder.append(content, title);

    // サマリーを追加
    this.addFieldSummary(content, field);

    DOMBuilder.append(th, content);
    return th;
  }

  /**
   * フィールドタイトルを作成
   */
  private createFieldTitle(field: FieldDefinition): HTMLDivElement {
    const title = DOMBuilder.create('div', {
      className: 'field-title',
      textContent: field.title
    }) as HTMLDivElement;
    return title;
  }

  /**
   * ソート機能を追加
   */
  private addSortFeatures(title: HTMLDivElement, th: HTMLTableCellElement, field: FieldDefinition): void {
    DynamicStyleManager.addStyleClasses(title, 'clickable');
    DOMHelper.addClass(title, 'sortable-header');
    title.dataset.field = field.field;
    
    DOMHelper.addClass(th, 'filterable-header');
    th.dataset.field = field.field;
    
    // ソートアイコン（全フィールドに表示）
    const icon = DOMBuilder.create('span', { className: 'kdp-margin-left-2' });
    
    if (this.currentSort?.field === field.field) {
      // ソート中のフィールド：▲（昇順）または▼（降順）
      icon.textContent = this.currentSort.order === 'asc' ? '▲' : '▼';
      DynamicStyleManager.addStyleClasses(icon, 'iconActive');
    } else {
      // その他のフィールド：▼（クリック可能を示す）
      icon.textContent = '▼';
      DynamicStyleManager.addStyleClasses(icon, 'iconInactive');
    }
    
    DOMBuilder.append(title, icon);
  }

  /**
   * フィルタインジケーターを追加
   */
  private addFilterIndicator(title: HTMLDivElement, field: FieldDefinition): void {
    if (this.filterManager.hasFilter(field.field as FieldKey)) {
      const filterIcon = DOMBuilder.create('span', { textContent: '*' });
      DynamicStyleManager.addStyleClasses(filterIcon, 'filterActive');
      DOMBuilder.append(title, filterIcon);
    }
  }

  /**
   * フィールドサマリーを追加
   */
  private addFieldSummary(content: HTMLDivElement, field: FieldDefinition): void {
    const summary = this.calculateFieldSummary(field);
    if (summary) {
      const summaryDiv = DOMBuilder.create('div', {
        className: `field-summary ${this.getSummaryClassName(summary.type)}`,
        textContent: summary.displayText
      });
      DOMBuilder.append(content, summaryDiv);
    }
  }

  /**
   * テーブルボディを作成
   */
  private createTableBody(): HTMLTableSectionElement {
    const tbody = DOMBuilder.create('tbody') as HTMLTableSectionElement;
    
    if (this.cuts.length === 0) {
      const tr = DOMBuilder.create('tr') as HTMLTableRowElement;
      const td = DOMBuilder.create('td', {
        className: 'empty-state',
        textContent: 'データがありません'
      }) as HTMLTableCellElement;
      td.colSpan = this.visibleFields.length + 1; // 削除列分を追加
      DOMBuilder.append(tr, td);
      DOMBuilder.append(tbody, tr);
      return tbody;
    }
    
    // ソート処理
    const sortedCuts = this.sortCuts([...this.cuts]);
    
    // 最適化版: DocumentFragmentを使用してバッチDOM操作
    const fragment = document.createDocumentFragment();
    for (const cut of sortedCuts) {
      const tr = this.createDataRow(cut);
      DOMBuilder.appendToFragment(fragment, tr);
    }
    DOMBuilder.append(tbody, fragment as unknown as HTMLElement);
    
    return tbody;
  }

  /**
   * データ行を作成
   */
  private createDataRow(cut: CutReadModel): HTMLTableRowElement {
    const tr = DOMBuilder.create('tr', {
      className: 'data-row',
      dataset: { cutId: cut.id }
    }) as HTMLTableRowElement;
    
    // ステータス情報を取得（後で使用）
    const statusInfo = this.calculateCutStatus(cut);
    
    // 最適化版: forEachをfor-ofに変更
    for (let index = 0; index < this.visibleFields.length; index++) {
      const field = this.visibleFields[index];
      const td = DOMBuilder.create('td', {
        styles: {
          width: `${field.width}px`,
          minWidth: `${field.width}px`,
          maxWidth: `${field.width}px`
        }
      }) as HTMLTableCellElement;
      td.className = this.getFieldClassName(field);
      
      // セルにデータ属性を設定（AutoFill用）
      const rowIndex = this.cuts.indexOf(cut);
      DOMHelper.setAttributes(td, {
        'data-row': rowIndex.toString(),
        'data-column': field.field
      });
      
      {
        const value = cut[field.field as FieldKey];
        
        // ステータスフィールドの特別処理
        if (field.field === 'status') {
          DOMHelper.addClass(td, 'status-cell');
          DOMHelper.updateTextKeepingElements(td, statusInfo.status);
          
          // ステータスに応じてクラスを追加
          if (statusInfo.status === '完了') {
            DOMHelper.addClass(td, 'completed');
          } else if (statusInfo.isRetake) {
            DOMHelper.addClass(td, 'retake');
          }
        }
        // 兼用フィールドの特別処理
        else if (field.field === 'kenyo') {
          DOMHelper.updateTextKeepingElements(td, this.formatKenyoValue(DataProcessor.safeString(value), cut.cutNumber));
        }
        // 特殊フィールドの特別処理
        else if (field.field === 'special') {
          DOMHelper.updateTextKeepingElements(td, this.formatSpecialValue(DataProcessor.safeString(value)));
        } else {
          DOMHelper.updateTextKeepingElements(td, this.formatFieldValue(value, field));
        }
        td.dataset.field = field.field;
        
        // 進捗フィールドのダブルクリック処理
        if (field.type === 'progress' && field.editable) {
          DOMHelper.addClass(td, 'progress-cell');
          td.dataset.editable = 'true';
          
          // 値に基づいたクラスを追加
          const progressClass = CSSClassBuilder.buildProgressClassName(value);
          if (progressClass) {
            DOMHelper.addClass(td, progressClass);
          }
        }
        // 非進捗フィールドのダブルクリック処理（statusを除く）
        else if (field.field !== 'status' && field.editable !== false) {
          DOMHelper.addClass(td, 'editable-cell');
          DOMHelper.addClass(td, 'kdp-text-cursor');
          td.dataset.editable = 'true';
        }
        
        // メモがあるセルにアスタリスクを表示（非同期で後から追加）
        // ApplicationFacadeのgetCellMemoメソッドを使用
        this.appFacade.getCellMemo(cut.cutNumber, field.field).then((memo: string | undefined) => {
          if (memo) {
            const memoIndicator = DOMBuilder.create('span', {
              textContent: '*',
              className: 'memo-indicator',
              styles: {
                color: '#FF6B6B',
                fontWeight: 'bold',
                marginLeft: '2px'
              }
            });
            DOMBuilder.append(td, memoIndicator);
          }
        });
      }
      
      DOMBuilder.append(tr, td);
    }

    // 削除ボタンセルを追加
    const deleteCell = DOMBuilder.create('td', { className: 'delete-column' }) as HTMLTableCellElement;

    const deleteButton = DOMBuilder.create('span', {
      textContent: '×',
      className: 'delete-link',
      attributes: { 'aria-label': `カット${cut.cutNumber}を削除` }
    });
    deleteButton.setAttribute('role', 'button');
    deleteButton.setAttribute('tabindex', '0');
    deleteButton.title = `カット${cut.cutNumber}を削除`;

    // 行にカットIDを設定（削除処理で使用）
    tr.setAttribute('data-cut-id', cut.id);

    // イベントハンドラーは setupTableClickEvents() で委譲処理される

    DOMBuilder.append(deleteCell, deleteButton);
    DOMBuilder.append(tr, deleteCell);

    return tr;
  }


  /**
   * テーブルの総幅を計算
   */
  private calculateTotalWidth(): number {
    // 表示フィールドの幅 + 削除列の幅
    return DataProcessor.sum(this.visibleFields.map(field => field.width)) + COLUMN_WIDTHS.DELETE;
  }

  /**
   * ソート処理
   */
  private sort(field: string): void {
    if (this.currentSort?.field === field) {
      this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort = { field, order: 'asc' };
    }
    this.render();
    
    // 状態を保存
    if (!this.isRestoringState) {
      this.saveState();
    }
  }

  /**
   * レンダリング
   */
  protected render(): void {
    const state = this.stateManager.getState();
    
    console.log('[ProgressTable.render] ========== RENDER START ==========');
    console.log('[ProgressTable.render] Called with state:', {
      isLoading: state.isLoading,
      hasTable: !!this.table,
      dataLength: state.data?.length,
      visibleFieldsLength: this.visibleFields?.length
    });
    
    if (state.isLoading || !this.table) {
      console.log('[ProgressTable.render] Early return - isLoading or no table');
      return;
    }
    
    // visibleFieldsが設定されていない場合は更新
    if (!this.visibleFields || DataProcessor.isEmpty(this.visibleFields)) {
      console.log('[ProgressTable.render] visibleFields is empty, updating...');
      this.updateVisibleFields();
      console.log('[ProgressTable.render] After update, visibleFields length:', this.visibleFields?.length);
    }
    
    // 全データを保存
    this.allCuts = state.data;
    
    // フィルタを適用
    this.cuts = this.filterManager.applyFilters(this.allCuts);
    
    console.log('[ProgressTable.render] Rendering with:', {
      allCutsLength: this.allCuts.length,
      filteredCutsLength: this.cuts.length,
      visibleFieldsLength: this.visibleFields.length,
      currentFilters: this.filterManager.getFilters()
    });
    
    // フィルタによってすべてのデータが除外された場合の警告
    if (this.allCuts.length > 0 && this.cuts.length === 0) {
      console.log('[ProgressTable.render] All data filtered out! Filters:', this.filterManager.getFilters());
    }
    
    console.log('[ProgressTable.render] Creating table elements...');
    
    // 既存のイベントハンドラーをクリーンアップ（メモリリーク防止）
    if (this.table) {
      this.tableEventManager.removeAllEventListenersFromTree(this.table);
      // AutoFillManagerの既存ハンドラーもクリア
      this.autoFillManager.removeAllFillHandles();
    }
    
    // テーブルをクリア
    this.table.innerHTML = '';
    
    // テーブル幅を再計算
    const totalWidth = this.calculateTotalWidth();
    this.table.style.width = `${totalWidth}px`;
    
    // colgroup要素を作成して列幅を明示的に定義
    const colgroup = this.createColGroup();
    DOMBuilder.append(this.table, colgroup);

    // ヘッダーを作成
    const thead = this.createTableHeader();
    DOMBuilder.append(this.table, thead);

    // ボディを作成
    const tbody = this.createTableBody();
    DOMBuilder.append(this.table, tbody);
    
    // フィルハンドルを追加（最小実装版）
    this.addFillHandlesToCells();
    
    // テーブルイベントを再設定（重要：removeAllEventListenersFromTreeの後に必要）
    this.setupEventDelegation();
    
    console.log('[ProgressTable.render] ========== RENDER END ==========');
  }


  /**
   * カットをソート
   */
  private sortCuts(cuts: CutReadModel[]): CutReadModel[] {
    if (!this.currentSort) return cuts;
    
    return cuts.sort((a, b) => {
      const aValue = a[this.currentSort!.field as FieldKey];
      const bValue = b[this.currentSort!.field as FieldKey];
      
      // 空白値の処理（常に最下段）
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;
      
      // フィールドタイプに応じた比較
      const field = this.visibleFields.find(f => f.field === this.currentSort!.field);
      let comparison = 0;
      
      if (this.currentSort!.field === 'cutNumber') {
        // カット番号フィールドの処理
        try {
          const cutA = new CutNumber(String(aValue));
          const cutB = new CutNumber(String(bValue));
          comparison = cutA.compare(cutB);
        } catch (error) {
          // CutNumberの作成に失敗した場合は文字列として比較
          ErrorHandler.handle(error, 'ProgressTable.sortCutNumbers', {
            logLevel: 'warn'
          });
          comparison = aValue.toString().localeCompare(bValue.toString());
        }
      } else if (field?.type === 'currency' || this.isNumericField(this.currentSort!.field)) {
        // 数値フィールドの処理
        const numA = this.parseNumericValue(aValue);
        const numB = this.parseNumericValue(bValue);
        comparison = numA - numB;
      } else if (field?.type === 'progress') {
        // 進捗フィールドの処理（日付として比較）
        comparison = this.compareProgressValues(DataProcessor.safeString(aValue), DataProcessor.safeString(bValue));
      } else {
        // 文字列として比較
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
      }
      
      return this.currentSort!.order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 数値フィールドかどうかを判定
   */
  private isNumericField(fieldName: string): boolean {
    const numericFields = ['maisu', 'loCost', 'genCost', 'dougaCost', 'doukenCost', 'shiageCost', 'dougaMaki'];
    return numericFields.includes(fieldName);
  }

  /**
   * 数値を解析
   */
  private parseNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      // 通貨形式の場合、記号とカンマを削除
      const cleaned = value.replace(/[¥,]/g, '');
      const num = ValidationHelper.ensureNumber(cleaned, 0);
      return ValidationHelper.isValidNumber(num) ? num : 0;
    }
    return 0;
  }

  /**
   * 進捗値を比較
   */
  private compareProgressValues(a: string, b: string): number {
    // 特殊ステータスの優先順位
    const statusOrder: { [key: string]: number } = {
      '不要': 1,
      'リテイク': 2
    };
    
    // 両方が特殊ステータスの場合
    if (statusOrder[a] && statusOrder[b]) {
      return statusOrder[a] - statusOrder[b];
    }
    
    // 片方が特殊ステータスの場合
    if (statusOrder[a]) return 1;
    if (statusOrder[b]) return -1;
    
    // 両方が日付の場合
    if (a.match(/^\d{4}\/\d{2}\/\d{2}$/) && b.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      return new Date(a).getTime() - new Date(b).getTime();
    }
    
    // その他の場合は文字列として比較
    return a.localeCompare(b);
  }

  /**
   * 表示フィールドを更新
   */
  protected updateVisibleFields(): void {
    const allFields = this.getAllFieldDefinitions();
    const viewModeConfig = VIEW_MODES[this.currentViewMode];
    
    if (viewModeConfig.type === 'detail') {
      this.visibleFields = allFields;
    } else {
      this.visibleFields = allFields.filter(field => 
        viewModeConfig.fields.includes(field.field as FieldKey)
      );
    }
  }

  /**
   * 全フィールド定義を取得
   */
  private getAllFieldDefinitions(): FieldDefinition[] {
    const registry = FieldMetadataRegistry.getInstance();
    const allMetadata = registry.getAllFieldMetadata();
    
    // FieldMetadataをFieldDefinitionに変換
    const fields: FieldDefinition[] = allMetadata.map(metadata => ({
      id: metadata.id,
      field: metadata.field,
      title: metadata.title,
      width: metadata.width,
      category: metadata.category,
      type: metadata.type,
      editable: metadata.editable,
      fixed: metadata.fixed,
      calcType: metadata.calcType
    }));

    return fields;
  }

  /**
   * 非進捗フィールドのダブルクリック処理
   */
  private handleNonProgressCellDoubleClick(
    cell: HTMLTableCellElement,
    cut: CutReadModel,
    fieldKey: FieldKey,
    field: FieldDefinition
  ): void {
    // 既に編集中の場合は無視
    if (cell.querySelector('input, textarea')) return;

    try {
      // フェーズ1対象フィールドの判定
      const dropdownFields: FieldKey[] = [
        'manager', 
        // 演出・作監フィールド
        'ensyutsu',
        'sousakkan',
        'loSakkan',
        'genSakkan',
        // Manager（担当）フィールド
        'loManager',
        'genManager',
        'dougaManager',
        'doukenManager',
        'shiageManager',
        // Office（事務所）フィールド
        'loOffice', 
        'genOffice', 
        'dougaOffice', 
        'doukenOffice', 
        'shiageOffice',
        // その他の情報フィールド
        'dougaMaki'
      ];
      
      if (fieldKey === 'kenyo') {
        // 兼用フィールドは複数選択ポップアップを表示
        new KenyoMultiSelectPopup(
          cell,
          cut.id,
          cut.cutNumber,
          cut[fieldKey] || '',
          this.cuts,
          this.appFacade,
          (cutId, value) => {
            // セルの値を更新（メモインジケーターを保持）
            const formattedValue = this.formatKenyoValue(value, cut.cutNumber);
            this.updateCellContent(cell, formattedValue, cut.cutNumber, fieldKey);
          }
        );
      } else if (fieldKey === 'special') {
        // 特殊フィールドは複数選択ポップアップを表示
        new SpecialMultiSelectPopup(
          cell,
          cut.id,
          cut[fieldKey] || '',
          this.appFacade,
          (cutId, value) => {
            // セルの値を更新（メモインジケーターを保持）
            const formattedValue = this.formatSpecialValue(value);
            this.updateCellContent(cell, formattedValue, cut.cutNumber, fieldKey);
          }
        );
      } else if (dropdownFields.includes(fieldKey)) {
        // ドロップダウンポップアップを表示
        new DropdownPopup(
          cell,
          cut.id,
          fieldKey,
          DataProcessor.safeString(cut[fieldKey]),
          this.cuts,  // 全カットデータを渡す
          async (cutId, field, value) => {
            try {
              // 直接ApplicationFacadeのupdateCutメソッドを使用
              await this.appFacade.updateCut(cutId, { [field]: value });
              
              // セルの値を更新（メモインジケーターを保持）
              const formattedValue = this.formatFieldValue(value, this.visibleFields.find(f => f.field === field)!);
              this.updateCellContent(cell, formattedValue, cut.cutNumber, field);
            } catch (error) {
              ErrorHandler.handle(error, 'ProgressTable.updateField', {
                showAlert: true,
                logLevel: 'error'
              });
            }
          }
        );
      } else {
        // 通常のCellEditorを使用
        const editor = this.cellEditorFactory.createEditor(cell, cut, fieldKey, field);
        editor.start();
      }
    } catch (error) {
      ErrorHandler.handle(error, 'ProgressTable.startCellEditor', {
        logLevel: 'error'
      });
    }
  }

  /**
   * セルの右クリック処理
   */
  private async handleCellRightClick(
    cell: HTMLTableCellElement,
    cut: CutReadModel,
    fieldKey: FieldKey,
    event: MouseEvent
  ): Promise<void> {
    try {
      // 既存のメモを取得
      // ApplicationFacadeのgetCellMemoメソッドを使用
      const existingMemo = await this.appFacade.getCellMemo(cut.cutNumber, fieldKey);
      
      // MemoPopupを表示（次のタスクで実装）
      const { MemoPopup } = await import('../MemoPopup');
      new MemoPopup(
        cell,
        cut.cutNumber,
        fieldKey,
        existingMemo || '',
        event.clientX,
        event.clientY,
        async (content: string) => {
          // メモを更新 - ApplicationFacadeのupdateCellMemoメソッドを使用
          await this.appFacade.updateCellMemo(cut.cutNumber, fieldKey, content);
          
          // セルの表示を更新
          this.updateCellMemoIndicator(cell, cut.cutNumber, fieldKey);
        }
      );
    } catch (error) {
      ErrorHandler.handle(error, 'ProgressTable.showMemoPopup', {
        logLevel: 'error'
      });
    }
  }

  /**
   * セルの内容を更新（メモインジケーターを保持）
   */
  private updateCellContent(
    cell: HTMLTableCellElement,
    content: string,
    cutNumber: string,
    fieldKey: string
  ): void {
    // DOMHelperを使用してテキストを更新（フィルハンドルとメモインジケーターを保持）
    DOMHelper.updateTextKeepingElements(cell, content);
    
    // メモインジケーターを再追加
    this.updateCellMemoIndicator(cell, cutNumber, fieldKey);
    
    // フィルハンドルが削除されていた場合のみ再追加
    const hasFillHandle = cell.dataset.editable === 'true' && !['cutNumber', 'kenyo'].includes(fieldKey);
    if (hasFillHandle && !cell.querySelector('.fill-handle')) {
      this.autoFillManager.createFillHandle(cell);
    }
  }

  /**
   * セルのメモインジケーターを更新
   */
  private async updateCellMemoIndicator(
    cell: HTMLTableCellElement,
    cutNumber: string,
    fieldKey: string
  ): Promise<void> {
    // 既存のインジケーターを削除
    const existingIndicator = cell.querySelector('.memo-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // メモがある場合は新しいインジケーターを追加
    // ApplicationFacadeのgetCellMemoメソッドを使用
    const hasMemo = await this.appFacade.getCellMemo(cutNumber, fieldKey);
    if (hasMemo) {
      const memoIndicator = DOMBuilder.create('span', {
        textContent: '*',
        className: 'memo-indicator',
        styles: {
          color: '#FF6B6B',
          fontWeight: 'bold',
          marginLeft: '2px'
        }
      });
      DOMBuilder.append(cell, memoIndicator);
    }
  }

  /**
   * メモのツールチップを表示
   */
  private showMemoTooltip(cell: HTMLTableCellElement, memoContent: string): HTMLDivElement {
    const tooltip = DOMBuilder.create('div', { className: 'kdp-memo-tooltip' }) as HTMLDivElement;
    
    // スタイル設定
    tooltip.style.cssText = `
      position: absolute;
      background-color: #333;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.4;
      max-width: 300px;
      word-wrap: break-word;
      z-index: 9999;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    
    // メモ内容を設定
    tooltip.textContent = memoContent;
    
    // DOMに追加
    DOMBuilder.append(document.body as HTMLElement, tooltip);
    
    // 位置を調整
    const cellRect = cell.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top = cellRect.bottom + 5;
    let left = cellRect.left;
    
    // 画面右端を超える場合は左にずらす
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    // 画面下端を超える場合は上に表示
    if (top + tooltipRect.height > window.innerHeight - 10) {
      top = cellRect.top - tooltipRect.height - 5;
    }
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    
    return tooltip;
  }

  /**
   * 兼用フィールドの値をフォーマット
   */
  private formatKenyoValue(value: string, currentCutNumber: string): string {
    // 値がない場合は空文字を返す
    if (ValidationHelper.isNullOrEmpty(value)) return '';
    
    // カット番号を配列に分解
    const cutNumbers = value.split('/').filter(Boolean);
    
    // 自身のみの場合は空欄表示
    if (cutNumbers.length === 1 && cutNumbers[0] === currentCutNumber) {
      return '';
    }
    
    // それ以外はそのまま表示
    return value;
  }

  /**
   * 特殊フィールドの値をフォーマット
   */
  private formatSpecialValue(value: string): string {
    // 値がない場合は空文字を返す
    if (ValidationHelper.isNullOrEmpty(value)) return '';
    
    // スラッシュ区切りをそのまま表示（保存形式と表示形式を統一）
    return value;
  }

  /**
   * 表示モードを変更（オーバーライド）
   */
  async changeViewMode(mode: string): Promise<void> {
    console.error(`[ProgressTable.changeViewMode] Changing to mode: ${mode}`);
    
    // 基底クラスの処理を実行
    await super.changeViewMode(mode);
    
    // 最適化版: NodeListを配列に変換してfor-ofで処理
    const buttons = this.container.querySelectorAll('.view-mode-button');
    const buttonArray = Array.from(buttons) as HTMLElement[];
    for (const button of buttonArray) {
      const buttonMode = button.textContent ? 
        Object.entries(VIEW_MODES).find(([_, config]) => config.label === button.textContent)?.[0] : 
        null;
      
      if (buttonMode === mode) {
        DOMHelper.addClass(button, 'active');
      } else {
        DOMHelper.removeClass(button, 'active');
      }
    }
    
    // 状態を保存
    if (!this.isRestoringState) {
      this.saveState();
    }
  }
  
  /**
   * 新規カットを追加
   */
  private async addNewCut(): Promise<void> {
    try {
      // 既存の最大カット番号を取得
      const maxNumber = await this.getMaxCutNumber();
      const newCutNumber = String(maxNumber + 1);
      
      // 新規カットを作成 - ApplicationFacadeのcreateCutメソッドを使用
      await this.appFacade.createCut({ cutNumber: newCutNumber });
      
      // コンソールログのみ
      console.log(`カット ${newCutNumber} を追加しました`);
      
      // Read Modelを更新
      await this.appFacade.syncReadModels();
      
      // テーブルデータを更新
      await this.refreshData();
    } catch (error) {
      ErrorHandler.handle(error, 'ProgressTable.addNewCut', {
        logLevel: 'error'
      });
    }
  }

  /**
   * ダミーデータを生成
   */
  private async generateDummyData(): Promise<void> {
    try {
      console.log('ダミーデータ生成を開始します...');
      await generateDummyData(this.appFacade, 50);
      console.log('ダミーデータ生成が完了しました');

      // テーブルデータを更新
      await this.refreshData();
    } catch (error) {
      ErrorHandler.handle(error, 'ProgressTable.generateDummyData', {
        logLevel: 'error'
      });
    }
  }

  /**
   * ストレージをクリア
   */
  private clearMockStorage(): void {
    console.log('=== ストレージクリア開始 ===');

    // クリア前のLocalStorageの状態を記録
    const allKeys = Object.keys(localStorage);
    console.log(`クリア前: ${allKeys.length}個のキーが存在`);

    // アプリケーション関連のすべてのデータを削除
    const keysToRemove: string[] = [];
    for (const key in localStorage) {
      if (key.includes('mock') ||
          key.includes('kintone') ||
          key.includes('cut') ||
          key.includes('Cut') ||
          key.includes('simplified') ||
          key.includes('unified') ||
          key.includes('test') ||
          key.includes('memo') ||
          key.includes('norma') ||
          key.includes('simulation') ||
          key.includes('staff') ||
          key.startsWith('user_prefs_') ||
          key.startsWith('cache_')) {
        keysToRemove.push(key);
      }
    }

    // 削除対象のキーを表示
    if (keysToRemove.length > 0) {
      console.log('削除対象のキー:');
      keysToRemove.forEach(key => {
        console.log(`  - ${key}`);
        localStorage.removeItem(key);
      });
    }

    // クリア後の確認
    const remainingKeys = Object.keys(localStorage);
    console.log(`クリア完了: ${keysToRemove.length}個のキーを削除`);
    console.log(`残りのキー: ${remainingKeys.length}個`);
    if (remainingKeys.length > 0) {
      console.log('残っているキー:', remainingKeys);
    }

    console.log(`ストレージをクリアしました（${keysToRemove.length}個のキーを削除）。ページを再読み込みします。`);
    window.location.reload();
  }

  /**
   * jsPDF版PDFエクスポート（元実装と同じAPI）
   */
  private async exportToPDF(): Promise<void> {
    try {
      // データ検証
      PDFExportService.validateExportData(this.cuts, this.visibleFields);
      
      // 列定義を準備
      const columns = this.visibleFields.map(field => ({
        field: field.field,
        title: field.title
      }));
      
      // PDFExportService経由での統一出力
      await PDFExportService.exportProgressTable({
        data: this.cuts,
        columns,
        getValue: (item, field) => this.formatFieldValue(item[field as FieldKey], this.visibleFields.find(f => f.field === field)!)
      });
      
    } catch (error) {
      // エラー処理は既にPDFExportServiceで統一されている
      ErrorHandler.handle(error, 'ProgressTable.exportPDF', {
        logLevel: 'error'
      });
    }
  }
  
  /**
   * 既存の最大カット番号を取得
   */
  private async getMaxCutNumber(): Promise<number> {
    // ApplicationFacadeのgetAllCutsメソッドを直接使用
    const existingCuts = await this.appFacade.getAllCuts();
    
    let maxNumber = 0;
    if (existingCuts && Array.isArray(existingCuts)) {
      // 最適化版: forEachをfor-ofに変更
      for (const cut of existingCuts) {
        const num = ValidationHelper.ensureNumber(cut.cutNumber, 0);
        if (ValidationHelper.isValidInteger(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    return maxNumber;
  }
  
  
  /**
   * 現在の状態を保存
   */
  private saveState(): void {
    if (!this.tableWrapper) return;
    
    const state: ProgressTableState = {
      viewMode: this.currentViewMode,
      sort: this.currentSort ? {
        field: this.currentSort.field,
        order: this.currentSort.order
      } : null,
      filters: this.getFilterState(),
      scroll: this.getScrollState()
    };
    
    this.viewStateManager.saveProgressTableState(state);
  }
  
  /**
   * 保存された状態を復元
   */
  public async restoreState(): Promise<void> {
    const savedState = this.viewStateManager.getProgressTableState();
    if (!savedState) return;
    
    this.isRestoringState = true;
    
    try {
      // 表示モードを復元
      if (savedState.viewMode !== this.currentViewMode) {
        await this.changeViewMode(savedState.viewMode);
      }
      
      // ソート状態を復元
      if (savedState.sort) {
        this.currentSort = {
          field: savedState.sort.field,
          order: savedState.sort.order
        };
      }
      
      // フィルタ状態を復元
      if (savedState.filters && Object.keys(savedState.filters).length > 0) {
        console.log('[ProgressTable.restoreState] Restoring filters...');
        this.restoreFilterState(savedState.filters);
        
        // データがある場合、フィルタ適用後にすべてのデータが除外されたかチェック
        const state = this.stateManager.getState();
        if (state.data.length > 0) {
          const filteredCuts = this.filterManager.applyFilters(state.data);
          console.log(`[ProgressTable.restoreState] After filter restore: ${filteredCuts.length}/${state.data.length} items visible`);
          
          if (filteredCuts.length === 0 && state.data.length > 0) {
            console.warn('[ProgressTable.restoreState] Filters excluded all data, clearing filters');
            this.filterManager.clearAll();
          }
        }
      } else {
        console.log('[ProgressTable.restoreState] No filters to restore');
      }
      
      // レンダリング後にスクロール位置を復元
      setTimeout(() => {
        this.setScrollState(savedState.scroll);
      }, 100);
      
    } finally {
      this.isRestoringState = false;
    }
  }
  
  /**
   * フィルタ状態を取得
   */
  private getFilterState(): FilterState {
    // FilterManagerから現在のフィルタ状態を取得
    const currentFilters = this.filterManager.getFilters();
    const result: FilterState = {};
    
    // 最適化版: forEachをfor-ofに変更
    for (const [fieldKey, values] of Object.entries(currentFilters)) {
      if (values.length > 0) {
        result[fieldKey] = {
          values: values,
          isEnabled: true
        };
      }
    }
    
    return result;
  }
  
  /**
   * フィルタ状態を復元
   */
  private restoreFilterState(filterState: FilterState): void {
    console.log('[ProgressTable.restoreFilterState] Restoring filter state:', filterState);
    
    // ViewStateManagerのFilterStateをFilterManagerのFilterStateに変換
    const filterManagerState: { [fieldKey: string]: string[] } = {};
    
    // 最適化版: forEachをfor-ofに変更
    for (const [fieldKey, filter] of Object.entries(filterState)) {
      if (filter.isEnabled && filter.values.length > 0) {
        filterManagerState[fieldKey] = filter.values;
      }
    }
    
    console.log('[ProgressTable.restoreFilterState] Setting filters to FilterManager:', filterManagerState);
    
    // FilterManagerにフィルタ状態を設定
    this.filterManager.setFilters(filterManagerState);
    
    // フィルタ設定後の状態を確認
    const currentFilters = this.filterManager.getFilters();
    console.log('[ProgressTable.restoreFilterState] Current filters after restore:', currentFilters);
  }
  
  /**
   * スクロールイベントを設定
   */
  private setupScrollEvents(): void {
    if (!this.tableWrapper) return;
    
    // スクロール位置の変更を監視して状態を保存
    this.tableEventManager.on(
      this.tableWrapper,
      'scroll',
      () => {
        if (!this.isRestoringState) {
          // デバウンスして保存頻度を減らす
          this.debounceScrollSave();
        }
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
    }, 500); // 500ms後に保存
  }
  
  /**
   * スクロール状態を取得
   */
  private getScrollState(): ScrollState {
    // メインのスクロールコンテナを取得
    const scrollContainer = this.tableWrapper || this.container.querySelector('.table-wrapper') as HTMLElement;
    
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
    // メインのスクロールコンテナを取得
    const scrollContainer = this.tableWrapper || this.container.querySelector('.table-wrapper') as HTMLElement;
    
    if (!scrollContainer) return;
    
    scrollContainer.scrollLeft = scrollState.scrollLeft;
    scrollContainer.scrollTop = scrollState.scrollTop;
  }
  

  /**
   * オートフィル用バッチ更新処理
   * 複数のセルに同じ値を一括で適用する
   */
  private async executeBatchUpdate(updates: Array<{row: number, column: string, value: string | number | boolean | undefined, cutId: string}>): Promise<void> {
    try {
      // 更新処理を並列実行
      const updatePromises = updates.map(async (update) => {
        const { row, column, value, cutId } = update;
        
        // 対象セルを取得
        const cell = this.getCellByRowColumn(row, column);
        if (!cell) return;

        // 進捗フィールドかどうかを判定
        const isProgressField = PROGRESS_FIELDS.includes(column as ProgressFieldKey);
        
        // 進捗フィールドでも基本情報フィールドでも同じインターフェースで更新
        await this.appFacade.updateCut(
          cutId,
          { [column]: value }
        );

        // cutNumberをcutIdから抽出（例: "Cut:cut-001" -> "001"）
        const cutNumber = cutId.match(/cut-(\d+)/i)?.[1] || '';
        
        // セルの表示を更新
        const field = this.visibleFields.find(f => f.field === column);
        if (field) {
          const formattedValue = this.formatFieldValue(value, field);
          // updateCellContentがフィルハンドルを保持するため、追加の処理は不要
          this.updateCellContent(cell, formattedValue, cutNumber, column);
          
          // data-cut-id属性が設定されていることを確認（フィルハンドルのために必要）
          if (!cell.dataset.cutId) {
            DOMHelper.setAttributes(cell, {
              'data-cut-id': cutId
            });
          }
        }
      });

      // すべての更新が完了するまで待機
      await Promise.all(updatePromises);

    } catch (error) {
      ErrorHandler.handle(error, 'ProgressTable.executeBatchUpdate', {
        logLevel: 'error'
      });
    }
  }

  /**
   * 行・列指定でセル要素を取得（AutoFillManager用ヘルパー）
   */
  private getCellByRowColumn(row: number, column: string): HTMLTableCellElement | null {
    const selector = `td[data-row="${row}"][data-column="${column}"]`;
    return this.container.querySelector(selector) as HTMLTableCellElement;
  }

  /**
   * 編集可能セルにフィルハンドルを追加（特定フィールドを除外）
   */
  private addFillHandlesToCells(): void {
    if (!this.table) return;

    // 既存のフィルハンドルをクリア
    this.autoFillManager.removeAllFillHandles();

    // オートフィルを無効にするフィールド
    const excludedFields = ['cutNumber', 'kenyo'];

    // 編集可能なセルを取得（除外フィールドを除く）
    const editableCells = this.table.querySelectorAll('td[data-editable="true"]') as NodeListOf<HTMLTableCellElement>;
    
    // 最適化版: NodeListを配列に変換してfor-ofで処理
    const cells = Array.from(editableCells);
    for (const cell of cells) {
      // セルにデータ属性があることを確認
      const rowIndex = ValidationHelper.ensureNumber(cell.dataset.row || '0', 0);
      const column = cell.dataset.column;
      
      if (column && rowIndex >= 0) {
        // 除外フィールドのチェック
        if (excludedFields.includes(column)) {
          continue; // カット番号・兼用フィールドはオートフィル無効
        }
        
        // カット情報から cutId を取得
        const cut = this.cuts[rowIndex];
        if (cut) {
          // data-cut-id属性を設定
          cell.dataset.cutId = cut.id;
          
          // フィルハンドルを作成・追加
          this.autoFillManager.createFillHandle(cell);
          
          // セルの位置を相対位置に設定（CSSでposition:relativeが必要）
          if (cell.style.position !== 'relative' && cell.style.position !== 'absolute') {
            cell.style.position = 'relative';
          }
        }
      }
    }
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    // スクロール保存のタイマーをクリア
    if (this.scrollSaveTimeout) {
      clearTimeout(this.scrollSaveTimeout);
      this.scrollSaveTimeout = null;
    }
    
    // 状態を保存してからクリーンアップ
    this.saveState();
    
    // イベントマネージャーのクリーンアップ
    this.tableEventManager.destroy();
    
    // フィルタマネージャーのクリーンアップ
    this.filterManager.destroy();
    
    // AutoFillManagerのクリーンアップ
    this.autoFillManager.destroy();
    
    // 親クラスのクリーンアップ
    super.destroy();
  }
}