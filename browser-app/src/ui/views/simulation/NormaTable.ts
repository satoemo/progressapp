import { TableEventManager } from '../../../core/events/TableEventManager';
import { ApplicationFacade } from '../../../core/ApplicationFacade';
import { CutReadModel } from '../../../data/models/CutReadModel';
import { NormaDataService, NormaData } from '../../../services/NormaDataService';
import { EventPriority } from '../../../core/events/EventPriority';
import { DynamicStyleManager } from '../../../utils/DynamicStyleManager';
import { DebouncedSyncManager, SyncPriority } from '../../../services/state/DebouncedSyncManager';
import { UI_TIMING, ACHIEVEMENT_THRESHOLDS } from '../../shared/constants/TableConstants';
import { NormaCellEditor } from './NormaCellEditor';
import { ErrorHandler } from '../../shared/utils/ErrorHandler';
import { DOMBuilder } from '../../shared/utils/DOMBuilder';
import { DataProcessor, DATE_FORMATS } from '../../shared/utils/DataProcessor';
import { ValidationHelper } from '../../shared/utils/ValidationHelper';
import { DateHelper } from '../../shared/utils/DateHelper';
import { DOMHelper } from '../../shared/utils/DOMHelper';

/**
 * セクション定義（担当者フィールドが存在するセクションのみ）
 */
interface SectionConfig {
  name: string;
  fieldName: keyof CutReadModel;
}

/**
 * フラットな行データ（セクション-担当者の組み合わせ）
 */
interface NormaRowData {
  sectionName: string;
  managerName: string;
  fieldName: keyof CutReadModel;
}

/**
 * ノルマ表コンポーネント
 * セクション・担当者別の作業目標と実績を管理
 */
export class NormaTable {
  private container: HTMLElement;
  private projectStartDate: Date;
  private projectEndDate: Date;
  private projectId: string;
  private tableEventManager: TableEventManager;
  private dateRange: Date[] = [];
  private appFacade: ApplicationFacade | null = null;
  private normaDataService: NormaDataService;
  private normaData: NormaData = {};
  private targets: Record<string, number> = {};
  private currentEditingCell: HTMLElement | null = null;
  private currentEditor: NormaCellEditor | null = null;
  private editableCells: HTMLElement[] = [];
  private errorNotificationTimeout: number | null = null;
  private debouncedSyncManager: DebouncedSyncManager;
  private cachedActuals: NormaData | null = null;
  private lastActualsCalculation: number = 0;
  private readonly ACTUALS_CACHE_DURATION = 60000; // 1分間のキャッシュ
  private dailyTotals: Record<string, { target: number; actual: number }> = {};
  private personalTotals: Record<string, Record<string, { target: number; actual: number }>> = {};
  private grandTotal: { target: number; actual: number } = { target: 0, actual: 0 };
  private weeklyTotals: Record<number, { target: number; actual: number }> = {};
  private sectionTotals: Record<string, { target: number; actual: number }> = {};
  private weekInfo: Array<{ weekNumber: number; dates: Date[] }> = [];
  private showAchievementRate: boolean = false;
  private globalEventsSetup: boolean = false;
  private isRendering: boolean = false;

  // 対象セクション（担当者フィールドが存在するもののみ）
  private sections: SectionConfig[] = [
    { name: 'LO', fieldName: 'loManager' },
    { name: '原画', fieldName: 'genManager' },
    { name: '動画', fieldName: 'dougaManager' },
    { name: '動検', fieldName: 'doukenManager' },
    { name: '仕上げ', fieldName: 'shiageManager' }
  ];

  constructor(container: HTMLElement, projectId: string, projectStartDate: Date, projectEndDate: Date) {
    this.container = container;
    this.projectId = projectId;
    this.projectStartDate = projectStartDate;
    this.projectEndDate = projectEndDate;
    this.tableEventManager = new TableEventManager();
    this.normaDataService = new NormaDataService(projectId);
    this.debouncedSyncManager = new DebouncedSyncManager();
    
    this.initialize();
  }

  /**
   * ApplicationFacadeを設定
   */
  setApplicationFacade(appFacade: ApplicationFacade): void {
    this.appFacade = appFacade;
    // 初回レンダリング（ApplicationFacade設定後）
    if (this.container.children.length === 0) {
      this.render();
    }
  }

  /**
   * 初期化
   */
  private initialize(): void {
    // 日付範囲を生成
    this.generateDateRange();
    // 保存済みの目標値を読み込む
    this.targets = this.normaDataService.loadTargets();
    // 初期化時はレンダリングしない（ApplicationFacade設定後にレンダリング）
  }

  /**
   * 日付範囲を生成
   */
  private generateDateRange(): void {
    this.dateRange = [];
    this.weekInfo = [];
    
    const current = new Date(this.projectStartDate);
    const end = new Date(this.projectEndDate);
    
    let weekNumber = 1;
    let currentWeekDates: Date[] = [];
    
    while (current <= end) {
      const date = new Date(current);
      this.dateRange.push(date);
      currentWeekDates.push(date);
      
      // 日曜日または最終日の場合、週を区切る
      if (current.getDay() === 0 || current.getTime() === end.getTime()) {
        this.weekInfo.push({
          weekNumber: weekNumber,
          dates: [...currentWeekDates]
        });
        weekNumber++;
        currentWeekDates = [];
      }
      
      current.setDate(current.getDate() + 1);
    }
  }

  /**
   * レンダリング
   */
  private async render(): Promise<void> {
    // 既にレンダリング中の場合はスキップ
    if (this.isRendering) {
      console.log('[NormaTable] Already rendering, skipping...');
      return;
    }

    this.isRendering = true;
    const startTime = performance.now();

    // 既存のイベントハンドラーをクリーンアップ
    this.tableEventManager.removeAllEventListenersFromTree(this.container);

    this.container.innerHTML = '';
    this.container.className = 'norma-table-container';
    
    // 編集可能セルリストをクリア
    this.editableCells = [];

    try {
      // 実績値を計算（キャッシュを使用）
      if (this.appFacade) {
        const actualsStartTime = performance.now();
        this.normaData = await this.getActualsWithCache();
        console.log(`[NormaTable] Actuals calculation: ${(performance.now() - actualsStartTime).toFixed(2)}ms`);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'NormaTable.calculateActuals', {
        showAlert: true,
        logLevel: 'error',
        customMessage: '実績値の計算中にエラーが発生しました'
      });
    }
    
    // 集計値を計算
    this.calculateTotals();

    // エラー通知エリア
    const errorArea = DOMBuilder.create('div');
    errorArea.className = 'norma-error-notification';
    DynamicStyleManager.setVisibility(errorArea, false);
    DOMBuilder.append(this.container, errorArea);

    // ヘッダー
    const header = this.createHeader();
    DOMBuilder.append(this.container, header);
    
    // テーブルラッパー（スクロール用）
    const tableWrapper = DOMBuilder.create('div');
    tableWrapper.className = 'table-wrapper';
    
    // テーブル本体
    const table = await this.createTable();
    DOMBuilder.append(tableWrapper, table);
    
    DOMBuilder.append(this.container, tableWrapper);

    // グローバルイベントの設定（キーボード＋クリック）- 一度だけ実行
    if (!this.globalEventsSetup) {
      this.setupGlobalEvents();
      this.globalEventsSetup = true;
    }
    
    // パフォーマンスログ
    console.log(`[NormaTable] Total render time: ${(performance.now() - startTime).toFixed(2)}ms`);
    console.log(`[NormaTable] Total editable cells: ${this.editableCells.length}`);
    console.log(`[NormaTable] Event handlers by type:`, this.tableEventManager.getHandlerCountByType());

    // レンダリング完了
    this.isRendering = false;
  }

  /**
   * ヘッダーを作成
   */
  private createHeader(): HTMLElement {
    const header = DOMBuilder.create('div');
    header.className = 'norma-table-header';
    
    const titleRow = DOMBuilder.create('div');
    titleRow.className = 'norma-table-title-row';
    
    const title = DOMBuilder.create('h3');
    title.className = 'norma-table-title';
    title.textContent = 'ノルマ表（実績値/目標値）';
    DOMBuilder.append(titleRow, title);
    
    // 達成率表示切り替えボタン
    const toggleButton = DOMBuilder.create('button');
    toggleButton.className = 'norma-toggle-achievement';
    toggleButton.textContent = this.showAchievementRate ? '実績/目標表示' : '達成率表示';
    
    this.tableEventManager.on(
      toggleButton,
      'click',
      () => this.toggleAchievementRate(),
      EventPriority.HIGH
    );
    
    DOMBuilder.append(titleRow, toggleButton);
    DOMBuilder.append(header, titleRow);
    
    return header;
  }
  
  /**
   * 達成率表示を切り替え
   */
  private toggleAchievementRate(): void {
    this.showAchievementRate = !this.showAchievementRate;
    
    // ボタンのテキストを更新
    const button = this.container.querySelector('.norma-toggle-achievement') as HTMLButtonElement;
    if (button) {
      button.textContent = this.showAchievementRate ? '実績/目標表示' : '達成率表示';
    }
    
    // すべてのセルを更新
    this.updateAllCells();
  }
  
  /**
   * すべてのセルを更新
   */
  private updateAllCells(): void {
    // 編集可能セルを更新
    this.editableCells.forEach(cell => {
      const target = ValidationHelper.ensureNumber(cell.dataset.target || '0', 0);
      const actual = ValidationHelper.ensureNumber(cell.dataset.actual || '0', 0);
      this.setCellContent(cell, target, actual);
    });
    
    // 集計セルを更新
    this.updateTotalCells();
  }

  /**
   * テーブルを作成
   */
  private async createTable(): Promise<HTMLTableElement> {
    const table = DOMBuilder.create('table');
    table.className = 'norma-table';
    
    // colgroup要素を追加（列幅管理）
    const colgroup = this.createColGroup();
    DOMBuilder.append(table, colgroup);
    
    // ヘッダー（2行構造）
    const thead = DOMBuilder.create('thead');
    const groupHeaderRow = this.createGroupHeaderRow();
    const fieldHeaderRow = this.createFieldHeaderRow();
    DOMBuilder.append(thead, groupHeaderRow, fieldHeaderRow);
    DOMBuilder.append(table, thead);
    
    // ボディ
    const tbody = DOMBuilder.create('tbody');
    
    // フラットな行を追加
    if (this.appFacade) {
      await this.createFlatRows(tbody);
    }
    
    DOMBuilder.append(table, tbody);
    
    return table;
  }
  
  /**
   * colgroup要素を作成（列幅管理）
   */
  private createColGroup(): HTMLElement {
    const colgroup = DOMBuilder.create('colgroup');
    
    // 1列目：セクション
    const col1 = DOMBuilder.create('col');
    col1.style.width = '80px';
    DOMBuilder.append(colgroup, col1);
    
    // 2列目：担当者名
    const col2 = DOMBuilder.create('col');
    col2.style.width = '100px';
    DOMBuilder.append(colgroup, col2);
    
    // 3列目：個人集計
    const col3 = DOMBuilder.create('col');
    col3.style.width = '80px';
    DOMBuilder.append(colgroup, col3);
    
    // 日付列と週計列
    this.weekInfo.forEach(week => {
      // 日付列
      week.dates.forEach(() => {
        const dateCol = DOMBuilder.create('col');
        dateCol.style.width = '60px';
        DOMBuilder.append(colgroup, dateCol);
      });
      
      // 週計列
      const weekCol = DOMBuilder.create('col');
      weekCol.style.width = '70px';
      DOMBuilder.append(colgroup, weekCol);
    });
    
    return colgroup;
  }

  /**
   * グループヘッダー行を作成
   */
  private createGroupHeaderRow(): HTMLTableRowElement {
    const row = DOMBuilder.create('tr');
    row.className = 'group-header-row';
    
    // 基本情報グループ（セクション、担当者、個人計）
    const basicGroup = DOMBuilder.create('th');
    basicGroup.setAttribute('colspan', '3');
    basicGroup.textContent = '基本情報';
    basicGroup.className = 'group-header basic-group';
    DOMBuilder.append(row, basicGroup);
    
    // 日付グループを週ごとに作成
    this.weekInfo.forEach(week => {
      const weekGroup = DOMBuilder.create('th');
      weekGroup.setAttribute('colspan', String(week.dates.length + 1)); // 日付 + 週計
      weekGroup.textContent = `第${week.weekNumber}週`;
      weekGroup.className = 'group-header date-group';
      DOMBuilder.append(row, weekGroup);
    });
    
    return row;
  }
  
  /**
   * フィールドヘッダー行を作成
   */
  private createFieldHeaderRow(): HTMLTableRowElement {
    const row = DOMBuilder.create('tr');
    row.className = 'field-header-row';
    
    // セクション
    const sectionHeader = DOMBuilder.create('th');
    sectionHeader.className = 'field-header';
    sectionHeader.textContent = 'セクション';
    DOMBuilder.append(row, sectionHeader);
    
    // 担当者
    const managerHeader = DOMBuilder.create('th');
    managerHeader.className = 'field-header';
    managerHeader.textContent = '担当者';
    DOMBuilder.append(row, managerHeader);
    
    // 個人計
    const personalTotalHeader = DOMBuilder.create('th');
    personalTotalHeader.className = 'field-header';
    personalTotalHeader.textContent = '個人計';
    DOMBuilder.append(row, personalTotalHeader);
    
    // 日付と週計
    this.weekInfo.forEach(week => {
      // 日付ヘッダー
      week.dates.forEach(date => {
        const dateHeader = DOMBuilder.create('th');
        dateHeader.className = 'field-header date-header';
        
        // 日付表示（月/日形式）
        const formatted = DateHelper.format(date, 'MM/DD'); // MM/DD形式
        const [month, day] = formatted.split('/');
        dateHeader.innerHTML = `<div class="date-month">${month}月</div><div class="date-day">${day}日</div>`;
        
        DOMBuilder.append(row, dateHeader);
      });
      
      // 週計ヘッダー（日付と同じ2行構造）
      const weekHeader = DOMBuilder.create('th');
      weekHeader.className = 'field-header week-header';
      weekHeader.innerHTML = `<div class="date-month">W${week.weekNumber}</div><div class="date-day">小計</div>`;
      DOMBuilder.append(row, weekHeader);
    });
    
    return row;
  }
  
  /**
   * フラットな行を作成
   */
  private async createFlatRows(tbody: HTMLTableSectionElement): Promise<void> {
    // 全カットデータを取得
    const cuts = this.appFacade!.getAllReadModels();
    
    // DocumentFragmentを使用してDOM操作を最適化
    const fragment = document.createDocumentFragment();
    
    // セクションごとに処理
    this.sections.forEach(section => {
      const managers = this.getUniqueManagers(cuts, section.fieldName);
      
      // セクション内の各担当者の行を作成
      managers.forEach(manager => {
        const rowData: NormaRowData = {
          sectionName: section.name,
          managerName: manager,
          fieldName: section.fieldName
        };
        const row = this.createDataRow(rowData);
        DOMBuilder.append(fragment, row);
      });
      
      // セクション小計行を追加
      if (managers.length > 0) {
        const sectionTotalRow = this.createSectionTotalRow(section.name);
        DOMBuilder.append(fragment, sectionTotalRow);
      }
    });
    
    // 一度にすべての行を追加
    DOMBuilder.append(tbody, fragment);
  }
  
  /**
   * データ行を作成
   */
  private createDataRow(rowData: NormaRowData): HTMLTableRowElement {
    const row = DOMBuilder.create('tr');
    row.className = 'norma-data-row';
    
    // セクションセル
    const sectionCell = DOMBuilder.create('td');
    sectionCell.className = 'norma-section-cell';
    sectionCell.textContent = rowData.sectionName;
    DOMBuilder.append(row, sectionCell);
    
    // 担当者名セル
    const nameCell = DOMBuilder.create('td');
    nameCell.className = 'norma-manager-cell';
    nameCell.textContent = rowData.managerName;
    DOMBuilder.append(row, nameCell);
    
    // 個人別集計セル
    const personalTotalCell = DOMBuilder.create('td');
    personalTotalCell.className = 'norma-personal-total-cell';
    const personalTotal = this.personalTotals[rowData.sectionName]?.[rowData.managerName] || { target: 0, actual: 0 };
    this.setCellContent(personalTotalCell, personalTotal.target, personalTotal.actual);
    personalTotalCell.dataset.type = 'personal-total';
    personalTotalCell.dataset.section = rowData.sectionName;
    personalTotalCell.dataset.manager = rowData.managerName;
    DOMBuilder.append(row, personalTotalCell);
    
    // 日付と週計セル
    this.weekInfo.forEach((week, weekIndex) => {
      // この週の日付セル
      week.dates.forEach(date => {
        const cell = DOMBuilder.create('td');
        cell.className = 'norma-data-cell';
        
        // セル用のキーを生成
        const cellKey = this.normaDataService.generateCellKey(rowData.sectionName, rowData.managerName, date);
        
        // 目標値と実績値を取得
        const target = this.targets[cellKey] || 0;
        const dateString = this.formatDateString(date);
        const actual = this.normaData[rowData.sectionName]?.[rowData.managerName]?.[dateString]?.actual || 0;
        
        // 表示形式: "実績/目標" または 達成率
        this.setCellContent(cell, target, actual);
        cell.dataset.cellKey = cellKey;
        cell.dataset.section = rowData.sectionName;
        cell.dataset.manager = rowData.managerName;
        cell.dataset.date = dateString;
        cell.dataset.target = String(target);
        cell.dataset.actual = String(actual);
        
        // 編集可能セルとしてリストに追加
        this.editableCells.push(cell);
        cell.setAttribute('tabindex', '0');
        DOMHelper.addClass(cell, 'norma-editable-cell');
        
        DOMBuilder.append(row, cell);
      });
      
      // 週計セル
      const weekTotalCell = DOMBuilder.create('td');
      weekTotalCell.className = 'norma-week-total-cell';
      const weekTotal = this.calculateWeekTotalForManager(rowData.sectionName, rowData.managerName, week.weekNumber);
      this.setCellContent(weekTotalCell, weekTotal.target, weekTotal.actual);
      weekTotalCell.dataset.type = 'week-total';
      weekTotalCell.dataset.section = rowData.sectionName;
      weekTotalCell.dataset.manager = rowData.managerName;
      weekTotalCell.dataset.week = String(week.weekNumber);
      DOMBuilder.append(row, weekTotalCell);
    });
    
    return row;
  }
  

  /**
   * 日付を文字列形式に変換（YYYY-MM-DD）
   */
  private formatDateString(date: Date): string {
    return DateHelper.formatDate(date); // YYYY-MM-DD形式
  }
  
  /**
   * 集計値を計算
   */
  private calculateTotals(): void {
    // 初期化
    this.dailyTotals = {};
    this.personalTotals = {};
    this.weeklyTotals = {};
    this.sectionTotals = {};
    this.grandTotal = { target: 0, actual: 0 };
    
    // 日付ごとの集計を初期化
    this.dateRange.forEach(date => {
      const dateString = this.formatDateString(date);
      this.dailyTotals[dateString] = { target: 0, actual: 0 };
    });
    
    // 週ごとの集計を初期化
    this.weekInfo.forEach(week => {
      this.weeklyTotals[week.weekNumber] = { target: 0, actual: 0 };
    });
    
    // セクションごとの集計を初期化
    this.sections.forEach(section => {
      this.sectionTotals[section.name] = { target: 0, actual: 0 };
    });
    
    // すべての担当者を収集（実績値と目標値の両方から）
    const allManagers = new Map<string, Set<string>>();
    
    // 実績値から担当者を収集
    Object.entries(this.normaData).forEach(([sectionName, sectionData]) => {
      if (!allManagers.has(sectionName)) {
        allManagers.set(sectionName, new Set());
      }
      Object.keys(sectionData).forEach(managerName => {
        allManagers.get(sectionName)!.add(managerName);
      });
    });
    
    // 目標値から担当者を収集
    Object.keys(this.targets).forEach(cellKey => {
      const [section, manager] = cellKey.split('_');
      if (!allManagers.has(section)) {
        allManagers.set(section, new Set());
      }
      allManagers.get(section)!.add(manager);
    });
    
    // セクションごとに処理
    this.sections.forEach(section => {
      if (!this.personalTotals[section.name]) {
        this.personalTotals[section.name] = {};
      }
      
      const managers = allManagers.get(section.name) || new Set();
      managers.forEach(managerName => {
        if (!this.personalTotals[section.name][managerName]) {
          this.personalTotals[section.name][managerName] = { target: 0, actual: 0 };
        }
        
        // 日付ごとのデータを処理
        this.dateRange.forEach(date => {
          const dateString = this.formatDateString(date);
          const cellKey = this.normaDataService.generateCellKey(section.name, managerName, date);
          const target = this.targets[cellKey] || 0;
          const actual = this.normaData[section.name]?.[managerName]?.[dateString]?.actual || 0;
          
          // 日計に加算
          this.dailyTotals[dateString].target += target;
          this.dailyTotals[dateString].actual += actual;
          
          // 個人別集計に加算
          this.personalTotals[section.name][managerName].target += target;
          this.personalTotals[section.name][managerName].actual += actual;
          
          // セクション別集計に加算
          this.sectionTotals[section.name].target += target;
          this.sectionTotals[section.name].actual += actual;
          
          // 総合計に加算
          this.grandTotal.target += target;
          this.grandTotal.actual += actual;
          
          // 週計に加算
          const weekInfo = this.getWeekNumberForDate(date);
          if (weekInfo) {
            this.weeklyTotals[weekInfo.weekNumber].target += target;
            this.weeklyTotals[weekInfo.weekNumber].actual += actual;
          }
        });
      });
    });
  }
  
  
  /**
   * セクション小計行を作成
   */
  private createSectionTotalRow(sectionName: string): HTMLTableRowElement {
    const row = DOMBuilder.create('tr');
    row.className = 'norma-section-total-row';
    
    // 1列目: セクション列（セクション名）
    const sectionCell = DOMBuilder.create('td');
    sectionCell.className = 'norma-section-cell norma-section-total-section';
    sectionCell.textContent = sectionName;
    DOMBuilder.append(row, sectionCell);
    
    // 2列目: 担当者列（「小計」ラベル）
    const labelCell = DOMBuilder.create('td');
    labelCell.className = 'norma-manager-cell norma-section-total-label';
    labelCell.textContent = '小計';
    DOMBuilder.append(row, labelCell);
    
    // 3列目: セクション総合計セル
    const sectionGrandTotalCell = DOMBuilder.create('td');
    sectionGrandTotalCell.className = 'norma-personal-total-cell norma-section-grand-total-cell';
    const sectionTotal = this.sectionTotals[sectionName] || { target: 0, actual: 0 };
    this.setCellContent(sectionGrandTotalCell, sectionTotal.target, sectionTotal.actual);
    sectionGrandTotalCell.dataset.type = 'section-grand-total';
    sectionGrandTotalCell.dataset.section = sectionName;
    DOMBuilder.append(row, sectionGrandTotalCell);
    
    // 日付ごとのセクション集計セルと週計セル
    this.weekInfo.forEach(week => {
      // この週の日付集計セル
      week.dates.forEach(date => {
        const dateString = this.formatDateString(date);
        const sectionDailyTotal = this.calculateSectionDailyTotal(sectionName, dateString);
        
        const cell = DOMBuilder.create('td');
        cell.className = 'norma-section-total-cell';
        this.setCellContent(cell, sectionDailyTotal.target, sectionDailyTotal.actual);
        cell.dataset.type = 'section-daily-total';
        cell.dataset.section = sectionName;
        cell.dataset.date = dateString;
        
        DOMBuilder.append(row, cell);
      });
      
      // 週計セル
      const weekTotalCell = DOMBuilder.create('td');
      weekTotalCell.className = 'norma-section-week-total-cell';
      const sectionWeekTotal = this.calculateSectionWeekTotal(sectionName, week.weekNumber);
      this.setCellContent(weekTotalCell, sectionWeekTotal.target, sectionWeekTotal.actual);
      weekTotalCell.dataset.type = 'section-week-total';
      weekTotalCell.dataset.section = sectionName;
      weekTotalCell.dataset.week = String(week.weekNumber);
      DOMBuilder.append(row, weekTotalCell);
    });
    
    return row;
  }
  
  /**
   * セクションごとの日別集計を計算
   */
  private calculateSectionDailyTotal(sectionName: string, dateString: string): { target: number; actual: number } {
    let total = { target: 0, actual: 0 };
    
    // 日付文字列から日付オブジェクトを作成
    const dateParts = dateString.split('/');
    const date = new Date(ValidationHelper.ensureNumber(dateParts[0], 0), ValidationHelper.ensureNumber(dateParts[1], 1) - 1, ValidationHelper.ensureNumber(dateParts[2], 1));
    
    // セクション内のすべての担当者の値を集計
    const managers = Object.keys(this.personalTotals[sectionName] || {});
    managers.forEach(managerName => {
      const cellKey = this.normaDataService.generateCellKey(sectionName, managerName, date);
      const target = this.targets[cellKey] || 0;
      const actual = this.normaData[sectionName]?.[managerName]?.[dateString]?.actual || 0;
      total.target += target;
      total.actual += actual;
    });
    
    return total;
  }
  
  /**
   * セクションごとの週別集計を計算
   */
  private calculateSectionWeekTotal(sectionName: string, weekNumber: number): { target: number; actual: number } {
    let total = { target: 0, actual: 0 };
    
    // 該当週の日付を取得
    const week = this.weekInfo.find(w => w.weekNumber === weekNumber);
    if (!week) return total;
    
    // 週内のすべての日付の集計を合算
    week.dates.forEach(date => {
      const dateString = this.formatDateString(date);
      const dailyTotal = this.calculateSectionDailyTotal(sectionName, dateString);
      total.target += dailyTotal.target;
      total.actual += dailyTotal.actual;
    });
    
    return total;
  }
  
  /**
   * カットデータから特定のフィールドのユニークな担当者を取得
   */
  private getUniqueManagers(cuts: CutReadModel[], fieldName: keyof CutReadModel): string[] {
    const managers = new Set<string>();
    cuts.forEach(cut => {
      const value = cut[fieldName];
      if (value && typeof value === 'string' && value.trim()) {
        managers.add(value.trim());
      }
    });
    return Array.from(managers).sort();
  }
  
  /**
   * 日付から週番号を取得
   */
  private getWeekNumberForDate(date: Date): { weekNumber: number; dates: Date[] } | null {
    for (const week of this.weekInfo) {
      for (const weekDate of week.dates) {
        if (weekDate.getTime() === date.getTime()) {
          return week;
        }
      }
    }
    return null;
  }
  
  /**
   * 担当者の週計を計算
   */
  private calculateWeekTotalForManager(sectionName: string, managerName: string, weekNumber: number): { target: number; actual: number } {
    const week = this.weekInfo.find(w => w.weekNumber === weekNumber);
    if (!week) return { target: 0, actual: 0 };
    
    let total = { target: 0, actual: 0 };
    week.dates.forEach(date => {
      const dateString = this.formatDateString(date);
      const cellKey = this.normaDataService.generateCellKey(sectionName, managerName, date);
      const target = this.targets[cellKey] || 0;
      const actual = this.normaData[sectionName]?.[managerName]?.[dateString]?.actual || 0;
      total.target += target;
      total.actual += actual;
    });
    
    return total;
  }
  

  /**
   * セルの編集を開始
   */
  private startEditing(cell: HTMLElement): void {
    // 既に編集中のセルがある場合は編集を終了
    if (this.currentEditor) {
      this.currentEditor.destroy();
      this.currentEditor = null;
    }
    
    this.currentEditingCell = cell;
    const currentTarget = ValidationHelper.ensureNumber(cell.dataset.target || '0', 0);
    
    // NormaCellEditorを作成
    this.currentEditor = new NormaCellEditor({
      cell,
      currentValue: currentTarget,
      onSave: (newValue) => this.saveValue(cell, newValue),
      onCancel: () => this.cancelEditing(),
      onNext: () => this.moveToNextCell(cell, false),
      onPrevious: () => this.moveToNextCell(cell, true),
      eventManager: this.tableEventManager
    });
    
    // 編集を開始
    this.currentEditor.start();
  }
  
  /**
   * 値を保存
   */
  private saveValue(cell: HTMLElement, newTarget: number): void {
    const cellKey = cell.dataset.cellKey!;
    
    // 目標値を更新
    if (newTarget === 0) {
      delete this.targets[cellKey];
    } else {
      this.targets[cellKey] = newTarget;
    }
    
    // LocalStorageへの保存をdebounce
    this.debouncedSaveTargets();
    
    // セルの表示を更新（部分的な更新）
    const actual = ValidationHelper.ensureNumber(cell.dataset.actual || '0', 0);
    this.updateCellValue(cellKey, newTarget, actual);
    
    // 集計値を再計算して更新
    this.calculateTotals();
    this.updateTotalCells();
    
    this.currentEditingCell = null;
    this.currentEditor = null;
  }
  
  /**
   * 編集をキャンセル
   */
  private cancelEditing(): void {
    if (this.currentEditor) {
      this.currentEditor.destroy();
      this.currentEditor = null;
    }
    
    if (this.currentEditingCell) {
      const cell = this.currentEditingCell;
      const target = ValidationHelper.ensureNumber(cell.dataset.target || '0', 0);
      const actual = ValidationHelper.ensureNumber(cell.dataset.actual || '0', 0);
      
      this.setCellContent(cell, target, actual);
      this.currentEditingCell = null;
    }
  }

  /**
   * 次のセルに移動
   */
  private moveToNextCell(currentCell: HTMLElement, reverse: boolean = false): void {
    const currentIndex = this.editableCells.indexOf(currentCell);
    if (currentIndex === -1) return;
    
    let nextIndex: number;
    if (reverse) {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = this.editableCells.length - 1;
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= this.editableCells.length) nextIndex = 0;
    }
    
    const nextCell = this.editableCells[nextIndex];
    if (nextCell) {
      nextCell.focus();
      nextCell.click();
    }
  }

  /**
   * エラー通知を表示
   */
  private showError(message: string): void {
    const errorArea = this.container.querySelector('.norma-error-notification') as HTMLElement;
    if (!errorArea) return;
    
    DOMHelper.updateTextKeepingElements(errorArea, message);
    DynamicStyleManager.setVisibility(errorArea, true);
    
    // 既存のタイムアウトをクリア
    if (this.errorNotificationTimeout) {
      clearTimeout(this.errorNotificationTimeout);
    }
    
    // エラー表示時間後に非表示
    this.errorNotificationTimeout = window.setTimeout(() => {
      DynamicStyleManager.setVisibility(errorArea, false);
      this.errorNotificationTimeout = null;
    }, UI_TIMING.ERROR_DISPLAY_DURATION);
  }

  /**
   * グローバルイベントの設定（キーボード＋クリック）
   */
  private setupGlobalEvents(): void {
    // クリックイベントの委譲処理
    this.tableEventManager.on(this.container, 'click', (e) => {
      const target = e.target as HTMLElement;
      
      // 編集可能セルがクリックされた場合
      const editableCell = target.closest('.norma-editable-cell') as HTMLElement;
      if (editableCell && this.editableCells.includes(editableCell)) {
        // 既に編集中でない場合のみ編集開始
        if (editableCell !== this.currentEditingCell) {
          this.startEditing(editableCell);
        }
      }
    }, EventPriority.HIGH);
    
    // コンテナ全体でのキーボードイベント
    this.tableEventManager.on(this.container, 'keydown', (e) => {
      const event = e as KeyboardEvent;
      
      // 編集中でない場合のみ
      if (!this.currentEditingCell && event.key === 'Enter') {
        const focused = document.activeElement as HTMLElement;
        if (focused && this.editableCells.includes(focused)) {
          this.startEditing(focused);
        }
      }
    }, EventPriority.LOW);
  }

  /**
   * キャッシュを使用して実績値を取得
   */
  private async getActualsWithCache(): Promise<NormaData> {
    const now = Date.now();
    
    // キャッシュが有効な場合はキャッシュを返す
    if (this.cachedActuals && 
        (now - this.lastActualsCalculation) < this.ACTUALS_CACHE_DURATION) {
      return this.cachedActuals;
    }
    
    // 新しく計算
    console.log(`[NormaTable] 実績値を計算中... 開始日=${DateHelper.format(this.projectStartDate, 'ISO')}, 終了日=${DateHelper.format(this.projectEndDate, 'ISO')}`);
    
    const actuals = await this.normaDataService.calculateActuals(
      this.appFacade!,
      this.projectStartDate,
      this.projectEndDate
    );
    
    // デバッグ：実績値の内容を確認
    console.log('[NormaTable] 計算された実績値:', actuals);
    
    // キャッシュを更新
    this.cachedActuals = actuals;
    this.lastActualsCalculation = now;
    
    return actuals;
  }

  /**
   * 目標値の保存をdebounce
   */
  private debouncedSaveTargets(): void {
    // DebouncedSyncManagerを使用（元の1000msに近いMEDIUM（500ms）を使用）
    this.debouncedSyncManager.scheduleSyncTask(
      'save-norma-targets',
      ['norma-targets'],
      async () => {
        try {
          this.normaDataService.saveTargets(this.targets);
        } catch (error) {
          ErrorHandler.handle(error, 'NormaTable.updateTarget', {
            showAlert: true,
            logLevel: 'error',
            customMessage: '目標値の保存に失敗しました'
          });
        }
      },
      SyncPriority.MEDIUM
    );
  }

  /**
   * セルの値を更新（部分的な更新）
   */
  private updateCellValue(cellKey: string, target: number, actual: number): void {
    // 特定のセルのみを更新
    const cell = this.editableCells.find(c => c.dataset.cellKey === cellKey);
    if (cell) {
      this.setCellContent(cell, target, actual);
      cell.dataset.target = String(target);
      cell.dataset.actual = String(actual);
    }
  }
  
  /**
   * セルの内容を設定（達成率表示対応）
   */
  private setCellContent(cell: HTMLElement, target: number, actual: number): void {
    if (this.showAchievementRate && target > 0) {
      const achievementRate = Math.ceil((actual / target) * 100);
      DOMHelper.updateTextKeepingElements(cell, `${achievementRate}%`);
      
      // 色分けのクラスを設定
      DOMHelper.removeClass(cell, 'achievement-high');
      DOMHelper.removeClass(cell, 'achievement-medium');
      DOMHelper.removeClass(cell, 'achievement-low');
      if (achievementRate >= ACHIEVEMENT_THRESHOLDS.HIGH) {
        DOMHelper.addClass(cell, 'achievement-high');
      } else if (achievementRate >= ACHIEVEMENT_THRESHOLDS.MEDIUM) {
        DOMHelper.addClass(cell, 'achievement-medium');
      } else {
        DOMHelper.addClass(cell, 'achievement-low');
      }
    } else {
      DOMHelper.updateTextKeepingElements(cell, `${actual}/${target}`);
      DOMHelper.removeClass(cell, 'achievement-high');
      DOMHelper.removeClass(cell, 'achievement-medium');
      DOMHelper.removeClass(cell, 'achievement-low');
    }
  }
  
  /**
   * 達成率を計算
   */
  private calculateAchievementRate(target: number, actual: number): string {
    if (target === 0) return '-';
    const rate = Math.ceil((actual / target) * 100);
    return `${rate}%`;
  }
  
  /**
   * 達成率に基づく色分けクラスを取得
   */
  private getAchievementClass(target: number, actual: number): string {
    if (target === 0) return '';
    const rate = (actual / target) * 100;
    if (rate >= 100) return 'achievement-high';
    if (rate >= 80) return 'achievement-medium';
    return 'achievement-low';
  }
  
  /**
   * 集計セルを更新
   */
  private updateTotalCells(): void {
    // 日計セルを更新
    document.querySelectorAll('.norma-daily-total-cell').forEach((cell: Element) => {
      const htmlCell = cell as HTMLElement;
      const dateString = htmlCell.getAttribute('data-date');
      if (dateString && this.dailyTotals[dateString]) {
        const dailyTotal = this.dailyTotals[dateString];
        this.setCellContent(htmlCell, dailyTotal.target, dailyTotal.actual);
      }
    });
    
    // セクション小計セルを更新
    document.querySelectorAll('.norma-section-total-cell').forEach((cell: Element) => {
      const htmlCell = cell as HTMLElement;
      const section = htmlCell.getAttribute('data-section');
      const dateString = htmlCell.getAttribute('data-date');
      if (section && dateString) {
        const sectionDailyTotal = this.calculateSectionDailyTotal(section, dateString);
        this.setCellContent(htmlCell, sectionDailyTotal.target, sectionDailyTotal.actual);
      }
    });
    
    // セクション週計セルを更新
    document.querySelectorAll('.norma-section-week-total-cell').forEach((cell: Element) => {
      const htmlCell = cell as HTMLElement;
      const section = htmlCell.getAttribute('data-section');
      const weekString = htmlCell.getAttribute('data-week');
      if (section && weekString) {
        const weekNumber = ValidationHelper.ensureNumber(weekString, 0);
        const sectionWeekTotal = this.calculateSectionWeekTotal(section, weekNumber);
        this.setCellContent(htmlCell, sectionWeekTotal.target, sectionWeekTotal.actual);
      }
    });
    
    // セクション総合計セルを更新
    document.querySelectorAll('.norma-section-grand-total-cell').forEach((cell: Element) => {
      const htmlCell = cell as HTMLElement;
      const section = htmlCell.getAttribute('data-section');
      if (section) {
        const sectionTotal = this.sectionTotals[section] || { target: 0, actual: 0 };
        this.setCellContent(htmlCell, sectionTotal.target, sectionTotal.actual);
      }
    });
    
    // 個人別集計セルを更新
    document.querySelectorAll('.norma-personal-total-cell').forEach((cell: Element) => {
      const htmlCell = cell as HTMLElement;
      const section = htmlCell.getAttribute('data-section');
      const manager = htmlCell.getAttribute('data-manager');
      if (section && manager && this.personalTotals[section]?.[manager]) {
        const personalTotal = this.personalTotals[section][manager];
        this.setCellContent(htmlCell, personalTotal.target, personalTotal.actual);
      }
    });
    
    // 総合計セルを更新
    const grandTotalCell = document.querySelector('.norma-grand-total-cell') as HTMLElement;
    if (grandTotalCell) {
      this.setCellContent(grandTotalCell, this.grandTotal.target, this.grandTotal.actual);
    }
    
    // 週計セルを更新
    document.querySelectorAll('.norma-week-total-cell').forEach((cell: Element) => {
      const htmlCell = cell as HTMLElement;
      const weekString = htmlCell.getAttribute('data-week');
      const section = htmlCell.getAttribute('data-section');
      const manager = htmlCell.getAttribute('data-manager');
      
      if (weekString) {
        const weekNumber = ValidationHelper.ensureNumber(weekString, 0);
        if (section && manager) {
          // 担当者の週計
          const weekTotal = this.calculateWeekTotalForManager(section, manager, weekNumber);
          this.setCellContent(htmlCell, weekTotal.target, weekTotal.actual);
        } else {
          // 全体の週計
          const weekTotal = this.weeklyTotals[weekNumber] || { target: 0, actual: 0 };
          this.setCellContent(htmlCell, weekTotal.target, weekTotal.actual);
        }
      }
    });
    
    // セクション別集計セルを更新
    document.querySelectorAll('.norma-section-total-cell, .norma-section-day-total-cell, .norma-section-week-total-cell').forEach((cell: Element) => {
      const htmlCell = cell as HTMLElement;
      const section = htmlCell.getAttribute('data-section');
      const type = htmlCell.getAttribute('data-type');
      
      if (section && type) {
        if (type === 'section-total') {
          const sectionTotal = this.sectionTotals[section] || { target: 0, actual: 0 };
          this.setCellContent(htmlCell, sectionTotal.target, sectionTotal.actual);
        } else if (type === 'section-day-total') {
          const dateString = htmlCell.getAttribute('data-date');
          if (dateString) {
            let sectionDayTotal = { target: 0, actual: 0 };
            const managers = Object.keys(this.personalTotals[section] || {});
            managers.forEach(managerName => {
              const date = new Date(dateString);
              const cellKey = this.normaDataService.generateCellKey(section, managerName, date);
              const target = this.targets[cellKey] || 0;
              const actual = this.normaData[section]?.[managerName]?.[dateString]?.actual || 0;
              sectionDayTotal.target += target;
              sectionDayTotal.actual += actual;
            });
            this.setCellContent(htmlCell, sectionDayTotal.target, sectionDayTotal.actual);
          }
        } else if (type === 'section-week-total') {
          const weekString = htmlCell.getAttribute('data-week');
          if (weekString) {
            const weekNumber = ValidationHelper.ensureNumber(weekString, 0);
            const weekTotal = this.calculateSectionWeekTotal(section, weekNumber);
            this.setCellContent(htmlCell, weekTotal.target, weekTotal.actual);
          }
        }
      }
    });
  }

  /**
   * データを更新（タブ切り替え時などに呼び出し）
   */
  async updateData(): Promise<void> {
    if (this.appFacade) {
      // キャッシュをクリアして最新のデータを取得
      this.cachedActuals = null;
      await this.render();
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // 編集中のセルがある場合はキャンセル
    if (this.currentEditingCell) {
      this.cancelEditing();
    }
    
    // エラー通知タイムアウトをクリア
    if (this.errorNotificationTimeout) {
      clearTimeout(this.errorNotificationTimeout);
      this.errorNotificationTimeout = null;
    }
    
    // 現在の編集を終了
    if (this.currentEditor) {
      this.currentEditor.destroy();
      this.currentEditor = null;
    }
    
    // 最後の保存を確実に実行
    try {
      this.normaDataService.saveTargets(this.targets);
    } catch (error) {
      ErrorHandler.handle(error, 'NormaTable.destroy', {
        logLevel: 'error'
      });
    }
    
    // TableEventManagerで管理されているイベントを削除
    this.tableEventManager.destroy();
    
    // コンテナをクリア
    this.container.innerHTML = '';
  }
}