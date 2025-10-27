import { ApplicationFacade } from '../../../core/ApplicationFacade';
import { CutReadModel } from '../../../data/models/CutReadModel';
import { CutData } from '../../../models/types';
import { StaffRole, ROLE_CONFIGS, ROLE_LIST, RoleConfig } from './StaffRoleConfig';
import { TableEventManager } from '../../../core/events/TableEventManager';
import { EventPriority } from '../../../core/events/EventPriority';
import { DOMUtils } from '../../../utils/DOMUtils';
import { DynamicStyleManager } from '../../../utils/DynamicStyleManager';
import { FIELD_LABELS } from '../../config/FieldLabels';
import { CutNumber } from '../../../models/values/CutNumber';
import { ViewStateManager, StaffViewState, ScrollState } from '../../shared/state/ViewStateManager';
import { StaffTableFilterSortManager, StaffInfo } from './StaffTableFilterSortManager';
import { TableField } from '../../shared/utils/TableFilterSortManager';
import { PDFExportService } from '../../../services/export/PDFExportService';
import { ErrorHandler } from '../../shared/utils/ErrorHandler';
import { DOMBuilder } from '../../shared/utils/DOMBuilder';
import { DataProcessor } from '../../shared/utils/DataProcessor';

/**
 * 担当者情報（表示用に拡張）
 */
interface ExtendedStaffInfo extends StaffInfo {
  cuts: CutData[];
}

/**
 * 担当者別表示コンポーネント
 */
export class StaffView {
  private container: HTMLElement;
  private appFacade: ApplicationFacade;
  private cuts: CutData[] = [];
  private currentRole: StaffRole = 'loManager';
  private staffInfoMap: Map<string, ExtendedStaffInfo> = new Map();
  private loSakkanStaffInfoMap: Map<string, ExtendedStaffInfo> = new Map(); // LO作監用の集計データ
  private genSakkanStaffInfoMap: Map<string, ExtendedStaffInfo> = new Map(); // 原画作監用の集計データ
  private tableEventManager: TableEventManager;
  private viewStateManager: ViewStateManager;
  private isRestoringState = false;
  private filterSortManagers: Map<string, StaffTableFilterSortManager> = new Map();

  constructor(containerId: string, appFacade: ApplicationFacade) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container #${containerId} not found`);
    }

    this.container = container;
    this.appFacade = appFacade;
    this.tableEventManager = new TableEventManager();
    this.viewStateManager = ViewStateManager.getInstance();

    // 初期化は明示的に呼び出すように変更
    // this.initialize();
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    try {
      // データを読み込み
      await this.loadCuts();

      // イベントリスナーを設定
      this.setupEventListeners();

      // 保存された状態を復元
      this.restoreState();

      // 担当者情報を計算
      this.calculateStaffInfo();
      
      // LO作監情報を計算
      this.calculateLoSakkanStaffInfo();
      
      // 原画作監情報を計算
      this.calculateGenSakkanStaffInfo();

      // レンダリング
      this.render();
      
    } catch (error) {
      ErrorHandler.handle(error, 'StaffView.initialize', {
        showAlert: true,
        logLevel: 'error'
      });
      throw error; // エラーを再スロー
    }
  }

  /**
   * カットデータを読み込み
   */
  private async loadCuts(): Promise<void> {
    // ApplicationFacadeから統一的にデータを取得
    const allCuts = await this.appFacade.getAllCuts();
    console.log(`[StaffView] loadCuts: Loaded ${allCuts.length} cuts from ApplicationFacade`);
    
    this.cuts = allCuts
      .filter(cut => cut.cutNumber && cut.cutNumber.trim() !== '') // 空のカット番号を除外
      .sort((a, b) => {
        try {
          const cutA = new CutNumber(a.cutNumber);
          const cutB = new CutNumber(b.cutNumber);
          return cutA.compare(cutB);
        } catch (error) {
          // CutNumberの作成に失敗した場合は文字列として比較
          ErrorHandler.handle(error, 'StaffView.sortCuts', {
            logLevel: 'warn',
            customMessage: `Invalid cut number detected, falling back to string comparison: "${a.cutNumber}" vs "${b.cutNumber}"`
          });
          return a.cutNumber.localeCompare(b.cutNumber);
        }
      }); // カット番号順でソート
  }
  
  /**
   * データをリフレッシュ（タブ切り替え時に呼ばれる）
   */
  async refreshData(): Promise<void> {
    console.log('[StaffView] refreshData: Starting data refresh');
    await this.loadCuts();
    this.calculateStaffInfo();
    this.calculateLoSakkanStaffInfo();
    this.calculateGenSakkanStaffInfo();
    this.render();
    console.log('[StaffView] refreshData: Data refresh completed');
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // ReadModelの更新を監視
    this.appFacade.getEventDispatcher().subscribeToAll((event) => {
      // カット情報が更新された場合
      if (event?.eventType && (event.eventType.includes('Updated') || event.eventType === 'CutCreated')) {
        this.loadCuts().then(() => {
          this.calculateStaffInfo();
          this.calculateLoSakkanStaffInfo();
          this.calculateGenSakkanStaffInfo();
          this.render();
        });
      }
    });
    
    // スクロールイベントを設定
    this.setupScrollEvents();
  }

  /**
   * 担当者情報を計算
   */
  private calculateStaffInfo(): void {
    this.staffInfoMap.clear();
    const roleConfig = ROLE_CONFIGS[this.currentRole];
    const fieldName = roleConfig.fieldName;
    const appearanceOrder = new Map<string, number>();
    let orderIndex = 0;

    // カット番号順に処理して登場順を記録
    this.cuts.forEach(cut => {
      const staffName = cut[fieldName] as string;
      if (DataProcessor.isEmpty(staffName)) return;

      // 初登場の順番を記録
      if (!appearanceOrder.has(staffName)) {
        appearanceOrder.set(staffName, orderIndex++);
      }

      // 担当者情報を集計
      if (!this.staffInfoMap.has(staffName)) {
        this.staffInfoMap.set(staffName, {
          name: staffName,
          totalCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          progressRate: 0,
          firstAppearanceOrder: appearanceOrder.get(staffName)!,
          cuts: [],
          fieldCounts: {}
        });
      }

      const staffInfo = this.staffInfoMap.get(staffName)!;
      staffInfo.cuts.push(cut);
      staffInfo.totalCount++;

      // 完了判定（本撮が入力されている）
      if (cut.satsuHon && cut.satsuHon.trim() !== '') {
        staffInfo.completedCount++;
      } else {
        staffInfo.inProgressCount++;
      }
    });

    // 進捗率とフィールドカウントを統合計算（最適化版）
    this.calculateStaffMetrics(this.staffInfoMap, roleConfig);
  }

  /**
   * LO作監情報を計算
   */
  private calculateLoSakkanStaffInfo(): void {
    this.loSakkanStaffInfoMap.clear();
    const roleConfig = ROLE_CONFIGS.loSakkan;
    const appearanceOrder = new Map<string, number>();

    this.cuts.forEach((cut, index) => {
      const loSakkan = cut.loSakkan?.trim();
      const loManager = cut.loManager?.trim() || '担当者未設定';
      
      // LO作監が空欄のカットは除外
      if (!loSakkan) return;
      
      // LO作監＋LO担当者の組み合わせキーを作成
      const compositeKey = `${loSakkan}__${loManager}`;
      
      // 初登場順を記録
      if (!appearanceOrder.has(compositeKey)) {
        appearanceOrder.set(compositeKey, index);
      }

      // 担当者情報を取得または作成
      let staffInfo = this.loSakkanStaffInfoMap.get(compositeKey);
      if (!staffInfo) {
        staffInfo = {
          name: compositeKey, // 後で分割して表示
          totalCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          progressRate: 0,
          firstAppearanceOrder: appearanceOrder.get(compositeKey) || 0,
          cuts: [],
          fieldCounts: {}
        };
        this.loSakkanStaffInfoMap.set(compositeKey, staffInfo);
      }

      // カットを追加
      staffInfo.cuts.push(cut);
      staffInfo.totalCount++;

      // 進捗状況をカウント
      const cutProgress = cut.completionRate || 0;
      if (cutProgress >= 100) {
        staffInfo.completedCount++;
      } else if (cutProgress > 0) {
        staffInfo.inProgressCount++;
      }
    });

    // 進捗率とフィールドカウントを統合計算（最適化版）
    this.calculateStaffMetrics(this.loSakkanStaffInfoMap, roleConfig);
  }

  /**
   * 原画作監情報を計算
   */
  private calculateGenSakkanStaffInfo(): void {
    this.genSakkanStaffInfoMap.clear();
    const roleConfig = ROLE_CONFIGS.genSakkan;
    const appearanceOrder = new Map<string, number>();

    this.cuts.forEach((cut, index) => {
      const genSakkan = cut.genSakkan?.trim();
      const genManager = cut.genManager?.trim() || '担当者未設定';
      
      // 原画作監が空欄のカットは除外
      if (!genSakkan) return;
      
      // 原画作監＋原画担当者の組み合わせキーを作成
      const compositeKey = `${genSakkan}__${genManager}`;
      
      // 初登場順を記録
      if (!appearanceOrder.has(compositeKey)) {
        appearanceOrder.set(compositeKey, index);
      }

      // 担当者情報を取得または作成
      let staffInfo = this.genSakkanStaffInfoMap.get(compositeKey);
      if (!staffInfo) {
        staffInfo = {
          name: compositeKey, // 後で分割して表示
          totalCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          progressRate: 0,
          firstAppearanceOrder: appearanceOrder.get(compositeKey) || 0,
          cuts: [],
          fieldCounts: {}
        };
        this.genSakkanStaffInfoMap.set(compositeKey, staffInfo);
      }

      // カットを追加
      staffInfo.cuts.push(cut);
      staffInfo.totalCount++;

      // 進捗状況をカウント
      const cutProgress = cut.completionRate || 0;
      if (cutProgress >= 100) {
        staffInfo.completedCount++;
      } else if (cutProgress > 0) {
        staffInfo.inProgressCount++;
      }
    });

    // 進捗率とフィールドカウントを統合計算（最適化版）
    this.calculateStaffMetrics(this.genSakkanStaffInfoMap, roleConfig);
  }

  /**
   * キャッシュ用のWeakMap
   */
  private progressRateCache = new WeakMap<CutData[], number>();
  private fieldCountCache = new Map<string, Map<string, number>>();

  /**
   * 統合メトリクス計算（最適化版）
   * 3重ネストループを単一パスに統合
   */
  private calculateStaffMetrics(
    staffInfoMap: Map<string, StaffInfo>,
    roleConfig: typeof ROLE_CONFIGS[StaffRole]
  ): void {
    const fields = roleConfig.progressFields;
    const fieldCount = fields.length;

    // 単一パスですべてを計算
    for (const [key, staffInfo] of staffInfoMap) {
      let totalProgress = 0;
      const fieldCounts: Record<string, number> = {};

      // フィールドカウントを初期化
      for (const field of fields) {
        fieldCounts[field] = 0;
      }

      // 各カットを一度だけ走査
      for (const cut of (staffInfo as ExtendedStaffInfo).cuts) {
        if (fieldCount === 0) {
          totalProgress += cut.completionRate || 0;
        } else {
          let completedFields = 0;
          for (const field of fields) {
            const value = cut[field] as string;
            if (value && value.trim() !== '') {
              completedFields++;
              fieldCounts[field]++;
            }
          }
          totalProgress += (completedFields / fieldCount) * 100;
        }
      }

      staffInfo.progressRate = (staffInfo as ExtendedStaffInfo).cuts.length > 0 
        ? totalProgress / (staffInfo as ExtendedStaffInfo).cuts.length 
        : 0;
      staffInfo.fieldCounts = fieldCounts;
    }
  }

  /**
   * 進捗率を計算
   */
  private calculateProgressRate(cuts: CutData[], roleConfig: typeof ROLE_CONFIGS[StaffRole]): number {
    if (cuts.length === 0) return 0;

    let totalProgress = 0;

    cuts.forEach(cut => {
      if (roleConfig.progressFields.length === 0) {
        // 基本担当者は全体進捗を使用
        totalProgress += cut.completionRate || 0;
      } else {
        // 役割別の進捗フィールドを使用
        let fieldCount = 0;
        let completedFields = 0;

        roleConfig.progressFields.forEach(field => {
          fieldCount++;
          const value = cut[field] as string;
          if (value && value.trim() !== '') {
            completedFields++;
          }
        });

        if (fieldCount > 0) {
          totalProgress += (completedFields / fieldCount) * 100;
        }
      }
    });

    return totalProgress / cuts.length;
  }

  /**
   * 特定のテーブル用のFilterSortManagerを取得または作成
   */
  private getFilterSortManager(tableKey: string): StaffTableFilterSortManager {
    if (!this.filterSortManagers.has(tableKey)) {
      const manager = new StaffTableFilterSortManager(
        this.tableEventManager,
        () => this.render(), // フィルタ変更時に再レンダリング
        () => this.render()  // ソート変更時に再レンダリング
      );
      this.filterSortManagers.set(tableKey, manager);
    }
    return this.filterSortManagers.get(tableKey)!;
  }

  /**
   * フィルタ・ソート済みの担当者データを取得
   */
  private getFilteredSortedStaffData(
    staffInfoMap: Map<string, ExtendedStaffInfo>, 
    filterSortManager: StaffTableFilterSortManager
  ): ExtendedStaffInfo[] {
    let staffArray = Array.from(staffInfoMap.values());
    
    // フィルタを適用
    staffArray = filterSortManager.applyFilters(
      staffArray,
      (staff, field) => filterSortManager.getStaffFieldValueForFilter(staff, field)
    );
    
    // ソートを適用
    staffArray = filterSortManager.applySort(
      staffArray,
      (staff, field) => filterSortManager.getStaffFieldValue(staff, field)
    );
    
    return staffArray;
  }

  /**
   * レンダリング
   */
  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'staff-view';

    // ヘッダー
    const header = this.createHeader();
    DOMBuilder.append(this.container, header);

    // 役割切り替えタブ
    const roleSelector = this.createRoleSelector();
    DOMBuilder.append(this.container, roleSelector);

    // 担当者テーブルコンテナ
    const tableContainer = this.createTableContainer();
    DOMBuilder.append(this.container, tableContainer);
  }

  /**
   * ヘッダーを作成
   */
  private createHeader(): HTMLElement {
    const header = DOMBuilder.create('div', { className: 'staff-header' });
    
    // タイトル部分のみ（PDF出力ボタンは役割選択バーに移動）
    const title = DOMBuilder.create('h2', { textContent: '担当者別表示' });
    DOMBuilder.append(header, title);
    
    return header;
  }

  /**
   * 役割切り替えタブを作成
   */
  private createRoleSelector(): HTMLElement {
    const controlBar = DOMBuilder.create('div', { className: 'view-mode-controls' });

    // ビューモード切り替えボタン
    const viewButtons = DOMBuilder.create('div', { className: 'view-mode-buttons' });

    ROLE_LIST.forEach(role => {
      const config = ROLE_CONFIGS[role];
      const button = DOMBuilder.create('button') as HTMLButtonElement;
      button.className = `view-mode-button ${role === this.currentRole ? 'active' : ''}`;
      button.textContent = config.label;
      button.dataset.role = role;
      
      this.tableEventManager.on(
        button,
        'click',
        () => {
          if (role !== this.currentRole) {
            this.currentRole = role;
            this.calculateStaffInfo();
            this.calculateLoSakkanStaffInfo();
            this.calculateGenSakkanStaffInfo();
            this.render();
            
            // 状態を保存
            if (!this.isRestoringState) {
              this.saveState();
            }
          }
        },
        EventPriority.HIGH
      );
      
      DOMBuilder.append(viewButtons, button);
    });

    DOMBuilder.append(controlBar, viewButtons);
    
    // 右側のアクションボタングループ（進捗管理表と同じ配置）
    const actionButtons = DOMBuilder.create('div');
    actionButtons.className = 'action-buttons';
    
    // PDF出力ボタン
    const exportButton = DOMBuilder.create('button');
    exportButton.className = 'export-pdf-button';
    exportButton.textContent = 'PDF出力';
    exportButton.onclick = () => this.exportToPDF();
    
    DOMBuilder.append(actionButtons, exportButton);
    DOMBuilder.append(controlBar, actionButtons);
    
    return controlBar;
  }

  /**
   * 担当者テーブルコンテナを作成
   */
  private createTableContainer(): HTMLElement {
    const container = DOMBuilder.create('div');
    container.className = 'staff-table-container';

    // LOタブの場合は2つの表を表示
    if (this.currentRole === 'loManager') {
      // LO担当表
      const loManagerFilterSort = this.getFilterSortManager('loManager');
      const filteredLoManagerData = this.getFilteredSortedStaffData(this.staffInfoMap, loManagerFilterSort);
      const loManagerTable = this.createSingleTable('loManager', filteredLoManagerData, 'LO担当別', false, loManagerFilterSort);
      DOMBuilder.append(container, loManagerTable);
      
      // 間隔を空ける
      const spacer = DOMBuilder.create('div', { styles: { height: '40px' } });
      DOMBuilder.append(container, spacer);
      
      // LO作監表
      const loSakkanFilterSort = this.getFilterSortManager('loSakkan');
      const filteredLoSakkanData = this.getFilteredSortedStaffData(this.loSakkanStaffInfoMap, loSakkanFilterSort);
      const loSakkanTable = this.createSingleTable('loSakkan', filteredLoSakkanData, 'LO作監別', true, loSakkanFilterSort);
      DOMBuilder.append(container, loSakkanTable);
    } else if (this.currentRole === 'genManager') {
      // 原画タブの場合も2つの表を表示
      // 原画担当表
      const genManagerFilterSort = this.getFilterSortManager('genManager');
      const filteredGenManagerData = this.getFilteredSortedStaffData(this.staffInfoMap, genManagerFilterSort);
      const genManagerTable = this.createSingleTable('genManager', filteredGenManagerData, '原画担当別', false, genManagerFilterSort);
      DOMBuilder.append(container, genManagerTable);
      
      // 間隔を空ける
      const spacer = DOMBuilder.create('div', { styles: { height: '40px' } });
      DOMBuilder.append(container, spacer);
      
      // 原画作監表
      const genSakkanFilterSort = this.getFilterSortManager('genSakkan');
      const filteredGenSakkanData = this.getFilteredSortedStaffData(this.genSakkanStaffInfoMap, genSakkanFilterSort);
      const genSakkanTable = this.createSingleTable('genSakkan', filteredGenSakkanData, '原画作監別', true, genSakkanFilterSort);
      DOMBuilder.append(container, genSakkanTable);
    } else {
      // その他のタブは通常通り
      const normalFilterSort = this.getFilterSortManager(this.currentRole);
      const filteredStaffData = this.getFilteredSortedStaffData(this.staffInfoMap, normalFilterSort);
      const table = this.createSingleTable(this.currentRole, filteredStaffData, undefined, false, normalFilterSort);
      DOMBuilder.append(container, table);
    }
    
    return container;
  }
  
  /**
   * 単一のテーブルを作成
   */
  private createSingleTable(
    role: StaffRole, 
    staffInfoArray: ExtendedStaffInfo[], 
    title?: string,
    isComposite?: boolean,
    filterSortManager?: StaffTableFilterSortManager
  ): HTMLElement {
    // 全体のコンテナ
    const container = DOMBuilder.create('div');
    container.className = 'staff-table-section';
    
    // タイトルがある場合は表示（表の外に配置）
    if (title) {
      const titleElement = DOMBuilder.create('h3');
      titleElement.className = 'staff-table-title';
      titleElement.textContent = title;
      DOMBuilder.append(container, titleElement);
    }

    // テーブルラッパー
    const tableWrapper = DOMBuilder.create('div');
    tableWrapper.className = 'table-wrapper';

    // テーブルをDOM要素として作成（既にフィルタ・ソート済み配列）
    const table = this.createTableElement(role, staffInfoArray, isComposite, filterSortManager);
    DOMBuilder.append(tableWrapper, table);
    
    // テーブルイベントを設定（このテーブルの実際のデータを渡す）
    if (filterSortManager) {
      // 各テーブルのデータをFilterSortManagerに設定
      filterSortManager.setAllStaffData(staffInfoArray);
      filterSortManager.setupTableEvents(tableWrapper, staffInfoArray);
    }
    
    // プログレスバーの幅をCSS変数で設定（最適化版）
    const progressBars = tableWrapper.querySelectorAll('.kdp-progress-bar');
    // NodeListを配列に変換して高速化
    const bars = Array.from(progressBars) as HTMLElement[];
    for (const bar of bars) {
      const progress = bar.getAttribute('data-progress');
      if (progress) {
        DynamicStyleManager.setDynamicStyles(bar, {
          width: `${progress}%`
        });
      }
    }
    
    DOMBuilder.append(container, tableWrapper);
    return container;
  }



  /**
   * テーブル要素を作成（DOM要素ベース）
   */
  private createTableElement(
    role: StaffRole, 
    staffInfoArray: ExtendedStaffInfo[], 
    isComposite?: boolean,
    filterSortManager?: StaffTableFilterSortManager
  ): HTMLTableElement {
    const table = DOMBuilder.create('table');
    table.className = 'staff-table';
    
    // colgroup要素を追加（列幅管理）
    const colgroup = this.createColGroup(role, isComposite);
    DOMBuilder.append(table, colgroup);
    
    // ヘッダー（2行構造）
    const thead = DOMBuilder.create('thead');
    const groupHeaderRow = this.createGroupHeaderRow(role, isComposite);
    const fieldHeaderRow = this.createFieldHeaderRow(role, isComposite, filterSortManager);
    DOMBuilder.append(thead, groupHeaderRow, fieldHeaderRow);
    DOMBuilder.append(table, thead);
    
    // ボディ（DocumentFragmentで最適化）
    const tbody = DOMBuilder.create('tbody');
    const fragment = document.createDocumentFragment();
    
    // バッチでDOM要素を作成
    for (const staffInfo of staffInfoArray) {
      const row = this.createStaffRowElement(staffInfo, role, isComposite);
      DOMBuilder.append(fragment, row);
    }
    
    // 一度にDOMに追加
    DOMBuilder.append(tbody, fragment);
    DOMBuilder.append(table, tbody);
    
    return table;
  }

  /**
   * colgroup要素を作成（列幅管理）
   */
  private createColGroup(role: StaffRole, isComposite?: boolean): HTMLElement {
    const colgroup = DOMBuilder.create('colgroup');
    const roleConfig = ROLE_CONFIGS[role];
    
    // 名前列
    if (isComposite) {
      // 作監名列
      const col1 = DOMBuilder.create('col');
      col1.style.width = '80px';
      DOMBuilder.append(colgroup, col1);
      
      // 担当者名列
      const col2 = DOMBuilder.create('col');
      col2.style.width = '80px';
      DOMBuilder.append(colgroup, col2);
    } else {
      // 担当者名列（LO作監別の作監+担当者列幅と同じ160pxに設定）
      const col1 = DOMBuilder.create('col');
      col1.style.width = '160px';
      DOMBuilder.append(colgroup, col1);
    }
    
    // 進捗率列
    const progressRateCol = DOMBuilder.create('col');
    progressRateCol.style.width = '80px';
    DOMBuilder.append(colgroup, progressRateCol);
    
    // 進捗バー列
    const progressBarCol = DOMBuilder.create('col');
    progressBarCol.style.width = '150px';
    DOMBuilder.append(colgroup, progressBarCol);
    
    // 持ち列
    const totalCol = DOMBuilder.create('col');
    totalCol.style.width = '60px';
    DOMBuilder.append(colgroup, totalCol);
    
    // フィールド列（最適化版）
    for (let i = 0; i < roleConfig.progressFields.length; i++) {
      const fieldCol = DOMBuilder.create('col');
      fieldCol.style.width = '60px';
      DOMBuilder.append(colgroup, fieldCol);
    }
    
    return colgroup;
  }

  /**
   * グループヘッダー行を作成
   */
  private createGroupHeaderRow(role: StaffRole, isComposite?: boolean): HTMLTableRowElement {
    const row = DOMBuilder.create('tr');
    row.className = 'group-header-row';
    const roleConfig = ROLE_CONFIGS[role];
    
    // 基本情報グループ
    const basicGroup = DOMBuilder.create('th');
    const nameColspan = isComposite ? 2 : 1;
    basicGroup.setAttribute('colspan', String(nameColspan + 3)); // 名前 + 進捗率 + 進捗バー + 持ち
    basicGroup.textContent = '基本情報';
    basicGroup.className = 'group-header basic-group';
    DOMBuilder.append(row, basicGroup);
    
    // 進捗状況グループ
    if (roleConfig.progressFields.length > 0) {
      const progressGroup = DOMBuilder.create('th');
      progressGroup.setAttribute('colspan', String(roleConfig.progressFields.length));
      progressGroup.textContent = '進捗状況';
      progressGroup.className = 'group-header progress-group';
      DOMBuilder.append(row, progressGroup);
    }
    
    return row;
  }

  /**
   * フィールドヘッダー行を作成
   */
  private createFieldHeaderRow(
    role: StaffRole, 
    isComposite?: boolean,
    filterSortManager?: StaffTableFilterSortManager
  ): HTMLTableRowElement {
    const row = DOMBuilder.create('tr');
    row.className = 'field-header-row';
    const roleConfig = ROLE_CONFIGS[role];
    
    // フィールド定義を作成
    const fields: TableField[] = [];
    
    // 名前フィールド
    if (isComposite) {
      fields.push({ 
        field: 'name', 
        title: role === 'loSakkan' ? 'LO作監' : role === 'genSakkan' ? '原画作監' : '作監',
        width: 80
      });
      fields.push({ 
        field: 'manager', 
        title: role === 'loSakkan' ? 'LO担当者' : role === 'genSakkan' ? '原画担当者' : '担当者',
        width: 80
      });
    } else {
      fields.push({ field: 'name', title: '担当者名', width: 160 });
    }
    
    // その他のフィールド
    fields.push({ field: 'progressRate', title: '進捗率', width: 80 });
    fields.push({ field: 'totalCount', title: '持ち', width: 60 });
    
    // 進捗フィールド（最適化版）  
    for (const field of roleConfig.progressFields) {
      fields.push({ 
        field: field, 
        title: FIELD_LABELS[field] || field,
        width: 60
      });
    }
    
    // ヘッダーセルを作成（最適化版）
    for (const field of fields) {
      if (field.title === '進捗率') {
        // 進捗バーヘッダーも追加（フィルタ・ソートなし）
        if (filterSortManager) {
          const progressRateHeader = filterSortManager.createSortableFilterableHeader(field);
          DOMBuilder.append(row, progressRateHeader);
        } else {
          const progressRateHeader = DOMBuilder.create('th');
          progressRateHeader.textContent = field.title;
          progressRateHeader.className = 'field-header';
          DOMBuilder.append(row, progressRateHeader);
        }
        
        const progressBarHeader = DOMBuilder.create('th');
        progressBarHeader.textContent = '進捗バー';
        progressBarHeader.className = 'field-header';
        progressBarHeader.style.width = '150px';
        DOMBuilder.append(row, progressBarHeader);
      } else {
        if (filterSortManager) {
          const header = filterSortManager.createSortableFilterableHeader(field);
          DOMBuilder.append(row, header);
        } else {
          const header = DOMBuilder.create('th');
          header.textContent = field.title;
          header.className = 'field-header';
          DOMBuilder.append(row, header);
        }
      }
    }
    
    return row;
  }


  /**
   * 担当者行を作成（DOM要素ベース）
   */
  private createStaffRowElement(staffInfo: ExtendedStaffInfo, role: StaffRole, isComposite?: boolean): HTMLTableRowElement {
    const isInactive = staffInfo.totalCount === 0;
    const row = DOMBuilder.create('tr');
    row.className = isInactive ? 'staff-row inactive' : 'staff-row';
    
    const progressBarWidth = DataProcessor.clamp(staffInfo.progressRate, 0, 100);
    const roleConfig = ROLE_CONFIGS[role];
    
    // 名前セル
    if (isComposite) {
      const [sakkan, manager] = staffInfo.name.split('__');
      
      const sakkanCell = DOMBuilder.create('td');
      sakkanCell.className = 'staff-name';
      sakkanCell.textContent = sakkan;
      DOMBuilder.append(row, sakkanCell);
      
      const managerCell = DOMBuilder.create('td');
      managerCell.className = 'staff-name';
      managerCell.textContent = manager;
      DOMBuilder.append(row, managerCell);
    } else {
      const nameCell = DOMBuilder.create('td');
      nameCell.className = 'staff-name';
      nameCell.textContent = staffInfo.name;
      DOMBuilder.append(row, nameCell);
    }
    
    // 進捗率セル
    const progressRateCell = DOMBuilder.create('td');
    progressRateCell.className = 'progress-rate';
    progressRateCell.textContent = `${staffInfo.progressRate.toFixed(1)}%`;
    DOMBuilder.append(row, progressRateCell);
    
    // 進捗バーセル
    const progressBarCell = DOMBuilder.create('td');
    progressBarCell.className = 'progress-bar-cell';
    
    const progressBarContainer = DOMBuilder.create('div');
    progressBarContainer.className = 'staff-progress-bar';
    
    const progressBarFill = DOMBuilder.create('div');
    progressBarFill.className = 'progress-bar-fill kdp-progress-bar';
    progressBarFill.setAttribute('data-progress', String(progressBarWidth));
    
    DOMBuilder.append(progressBarContainer, progressBarFill);
    DOMBuilder.append(progressBarCell, progressBarContainer);
    DOMBuilder.append(row, progressBarCell);
    
    // 持ちセル
    const totalCountCell = DOMBuilder.create('td');
    totalCountCell.className = 'total-count';
    totalCountCell.textContent = String(staffInfo.totalCount);
    DOMBuilder.append(row, totalCountCell);
    
    // フィールドセル（最適化版）
    for (const field of roleConfig.progressFields) {
      const fieldCell = DOMBuilder.create('td');
      fieldCell.className = 'field-count';
      const count = staffInfo.fieldCounts[field] || 0;
      fieldCell.textContent = String(count);
      DOMBuilder.append(row, fieldCell);
    }
    
    return row;
  }

  /**
   * 現在の状態を保存
   */
  private saveState(): void {
    const state: StaffViewState = {
      currentRole: this.currentRole,
      scroll: this.getScrollState()
    };
    
    this.viewStateManager.saveStaffViewState(state);
  }
  
  /**
   * 保存された状態を復元
   */
  private restoreState(): void {
    const savedState = this.viewStateManager.getStaffViewState();
    if (!savedState) return;
    
    this.isRestoringState = true;
    
    try {
      // 現在のロールを復元
      if (savedState.currentRole !== this.currentRole) {
        this.currentRole = savedState.currentRole as StaffRole;
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
   * スクロールイベントを設定
   */
  private setupScrollEvents(): void {
    // コンテナのスクロールを監視
    this.tableEventManager.on(
      this.container,
      'scroll',
      () => {
        if (!this.isRestoringState) {
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
    // メインのコンテナとテーブルコンテナの両方をチェック
    const scrollContainer = this.container.querySelector('.staff-table-container') as HTMLElement || this.container;
    
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
    // メインのコンテナとテーブルコンテナの両方をチェック
    const scrollContainer = this.container.querySelector('.staff-table-container') as HTMLElement || this.container;
    
    if (!scrollContainer) return;
    
    scrollContainer.scrollLeft = scrollState.scrollLeft;
    scrollContainer.scrollTop = scrollState.scrollTop;
  }
  
  /**
   * 担当者データをPDF出力
   */
  private async exportToPDF(): Promise<void> {
    try {
      // 現在の役割と設定を取得
      const roleConfig = ROLE_CONFIGS[this.currentRole];
      
      // LOタブ・原画タブの場合は2つの表を出力
      if (this.currentRole === 'loManager' || this.currentRole === 'genManager') {
        await this.exportManagerAndSakkanTables();
      } else {
        // その他の役割は1つの表を出力（フィルタ適用済みデータを使用）
        const filterSortManager = this.getFilterSortManager(this.currentRole);
        const staffData = this.getFilteredSortedStaffData(this.staffInfoMap, filterSortManager);
        const columns = this.buildPDFColumns(roleConfig, false);
        
        // データ検証
        PDFExportService.validateExportData(staffData, columns);
        
        // PDFExportService経由での統一出力
        await PDFExportService.exportStaffTable({
          data: staffData,
          columns,
          getValue: (item, field) => this.getPDFFieldValue(item, field, roleConfig),
          roleLabel: roleConfig.label
        });
      }
    } catch (error) {
      // エラー処理は既にPDFExportServiceで統一されている
      ErrorHandler.handle(error, 'StaffView.exportToPDF', {
        showAlert: true,
        logLevel: 'error',
        customMessage: 'PDFエクスポートに失敗しました'
      });
    }
  }

  /**
   * LOタブ・原画タブの2表PDF出力
   */
  private async exportManagerAndSakkanTables(): Promise<void> {
    const isLO = this.currentRole === 'loManager';
    const managerRoleConfig = ROLE_CONFIGS[this.currentRole];
    const sakkanRole = isLO ? 'loSakkan' : 'genSakkan';
    const sakkanRoleConfig = ROLE_CONFIGS[sakkanRole];
    const sakkanDataMap = isLO ? this.loSakkanStaffInfoMap : this.genSakkanStaffInfoMap;
    
    // 1. 担当者表のデータ（フィルタ適用済み）
    const managerFilterSort = this.getFilterSortManager(this.currentRole);
    const managerData = this.getFilteredSortedStaffData(this.staffInfoMap, managerFilterSort);
    const managerColumns = this.buildPDFColumns(managerRoleConfig, false);
    
    // 2. 作監表のデータ（フィルタ適用済み）
    const sakkanFilterSort = this.getFilterSortManager(sakkanRole);
    const sakkanData = this.getFilteredSortedStaffData(sakkanDataMap, sakkanFilterSort);
    const sakkanColumns = this.buildPDFColumns(sakkanRoleConfig, true);
    
    
    // 3. 複数表としてPDF出力
    const tables = [
      {
        data: managerData,
        columns: managerColumns,
        getValue: (item: ExtendedStaffInfo, field: string) => this.getPDFFieldValue(item, field, managerRoleConfig),
        title: `${managerRoleConfig.label}担当別`
      },
      {
        data: sakkanData,
        columns: sakkanColumns,
        getValue: (item: ExtendedStaffInfo, field: string) => this.getPDFFieldValue(item, field, sakkanRoleConfig),
        title: `${sakkanRoleConfig.label}別`
      }
    ];
    
    // PDFExportService経由での統一出力
    await PDFExportService.exportStaffMultipleTables({
      tables,
      roleLabel: managerRoleConfig.label
    });
  }

  /**
   * 複合役割（LO作監・原画作監）のPDF出力
   */
  private async exportCompositeRolePDF(roleConfig: RoleConfig): Promise<void> {
    // データソースを取得
    const compositeDataMap = this.currentRole === 'loSakkan' 
      ? this.loSakkanStaffInfoMap 
      : this.genSakkanStaffInfoMap;
    
    // フィルタ適用済み担当者データを取得
    const filterSortManager = this.getFilterSortManager(this.currentRole);
    const filteredStaffData = this.getFilteredSortedStaffData(compositeDataMap, filterSortManager);
    
    // 1. 作監表のデータを作成（フィルタ適用済みデータから）
    const filteredCompositeDataMap = new Map(filteredStaffData.map(staff => [staff.name, staff]));
    const managerData = this.buildManagerTableData(filteredCompositeDataMap, roleConfig);
    const managerColumns = this.buildManagerColumns(roleConfig);
    
    // 2. 担当者表のデータ（既にフィルタ適用済み）
    const staffData = filteredStaffData;
    const staffColumns = this.buildPDFColumns(roleConfig, true);
    
    // 3. 複数表としてPDF出力
    const tables = [
      {
        data: managerData,
        columns: managerColumns,
        getValue: (item: ExtendedStaffInfo, field: string) => this.getPDFFieldValue(item, field, roleConfig),
        title: `${roleConfig.label}別集計`
      },
      {
        data: staffData,
        columns: staffColumns,
        getValue: (item: ExtendedStaffInfo, field: string) => this.getPDFFieldValue(item, field, roleConfig),
        title: `${roleConfig.label}別担当者詳細`
      }
    ];
    
    // PDFExportService経由での統一出力
    await PDFExportService.exportStaffMultipleTables({
      tables,
      roleLabel: roleConfig.label
    });
  }

  /**
   * 作監表のデータを構築
   */
  private buildManagerTableData(
    compositeDataMap: Map<string, ExtendedStaffInfo>,
    roleConfig: RoleConfig
  ): ExtendedStaffInfo[] {
    const managerMap = new Map<string, ExtendedStaffInfo>();
    
    // 複合キーから作監名だけを抜き出してグループ化
    compositeDataMap.forEach(staffInfo => {
      const [managerName] = staffInfo.name.split('__');
      
      let managerInfo = managerMap.get(managerName);
      if (!managerInfo) {
        managerInfo = {
          name: managerName,
          totalCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          progressRate: 0,
          firstAppearanceOrder: staffInfo.firstAppearanceOrder,
          cuts: [] as CutData[],
          fieldCounts: {}
        };
        managerMap.set(managerName, managerInfo);
      }
      
      // 集計値を追加
      managerInfo.totalCount += staffInfo.totalCount;
      managerInfo.completedCount += staffInfo.completedCount;
      managerInfo.inProgressCount += staffInfo.inProgressCount;
      managerInfo.cuts.push(...staffInfo.cuts);
      
      // フィールドカウントを合算
      Object.keys(staffInfo.fieldCounts).forEach(field => {
        managerInfo.fieldCounts[field] = (managerInfo.fieldCounts[field] || 0) + (staffInfo.fieldCounts[field] || 0);
      });
    });
    
    // 進捗率を再計算
    managerMap.forEach(managerInfo => {
      managerInfo.progressRate = this.calculateProgressRate(managerInfo.cuts, ROLE_CONFIGS[roleConfig.role]);
    });
    
    return Array.from(managerMap.values()).sort((a, b) => a.firstAppearanceOrder - b.firstAppearanceOrder);
  }

  /**
   * 作監表のカラム定義を構築
   */
  private buildManagerColumns(roleConfig: RoleConfig): { field: string; title: string; width?: number }[] {
    const columns: { field: string; title: string; width?: number }[] = [];
    
    // 列数を計算してデフォルト幅を決定
    const baseColumnCount = 1 + 2 + roleConfig.progressFields.length;
    
    // 通常の幅を計算（JSPDFExporterの計算ロジックと同じ）
    let defaultWidth: number;
    if (baseColumnCount <= 15) {
      // 15列以下は均等配分（デフォルトの自動調整に任せる）
      defaultWidth = 0;
    } else {
      // 固定幅計算
      const availableWidth = baseColumnCount <= 20 ? 800 : 820;
      const normalWidth = Math.max(25, availableWidth / baseColumnCount);
      // 通常の幅を使用
      defaultWidth = normalWidth;
      // 最小幅を確保
      defaultWidth = Math.max(30, defaultWidth);
    }
    
    // 作監名カラム
    columns.push({ 
      field: 'name', 
      title: roleConfig.role === 'loSakkan' ? 'LO作監' : roleConfig.role === 'genSakkan' ? '原画作監' : '作監',
      width: defaultWidth > 0 ? defaultWidth : undefined
    });
    
    // 基本情報カラム
    columns.push({ 
      field: 'progressRate', 
      title: '進捗率',
      width: defaultWidth > 0 ? defaultWidth : undefined
    });
    columns.push({ 
      field: 'totalCount', 
      title: '持ち',
      width: defaultWidth > 0 ? defaultWidth : undefined
    });
    
    // 進捗フィールドカラム
    roleConfig.progressFields.forEach((field: string) => {
      columns.push({ 
        field: field, 
        title: (FIELD_LABELS as any)[field] || field,
        width: defaultWidth > 0 ? defaultWidth : undefined
      });
    });
    
    return columns;
  }

  /**
   * PDF用のカラム定義を構築
   */
  private buildPDFColumns(roleConfig: RoleConfig, isComposite?: boolean): { field: string; title: string; width?: number }[] {
    const columns: { field: string; title: string; width?: number }[] = [];
    
    // 列数を計算してデフォルト幅を決定
    const baseColumnCount = (isComposite ? 2 : 1) + 2 + roleConfig.progressFields.length;
    
    // 通常の幅を計算（JSPDFExporterの計算ロジックと同じ）
    let defaultWidth: number;
    if (baseColumnCount <= 15) {
      // 15列以下は均等配分（デフォルトの自動調整に任せる）
      defaultWidth = 0;
    } else {
      // 固定幅計算
      const availableWidth = baseColumnCount <= 20 ? 800 : 820;
      const normalWidth = Math.max(25, availableWidth / baseColumnCount);
      // 通常の幅を使用
      defaultWidth = normalWidth;
      // 最小幅を確保
      defaultWidth = Math.max(30, defaultWidth);
    }
    
    // 担当者名カラム
    if (isComposite) {
      columns.push({ 
        field: 'name', 
        title: roleConfig.role === 'loSakkan' ? 'LO作監' : roleConfig.role === 'genSakkan' ? '原画作監' : '作監',
        width: defaultWidth > 0 ? defaultWidth : undefined
      });
      columns.push({ 
        field: 'manager', 
        title: roleConfig.role === 'loSakkan' ? 'LO担当者' : roleConfig.role === 'genSakkan' ? '原画担当者' : '担当者',
        width: defaultWidth > 0 ? defaultWidth : undefined
      });
    } else {
      columns.push({ 
        field: 'name', 
        title: '担当者名',
        width: defaultWidth > 0 ? defaultWidth : undefined
      });
    }
    
    // 基本情報カラム
    columns.push({ 
      field: 'progressRate', 
      title: '進捗率',
      width: defaultWidth > 0 ? defaultWidth : undefined
    });
    columns.push({ 
      field: 'totalCount', 
      title: '持ち',
      width: defaultWidth > 0 ? defaultWidth : undefined
    });
    
    // 進捗フィールドカラム
    roleConfig.progressFields.forEach((field: string) => {
      columns.push({ 
        field: field, 
        title: (FIELD_LABELS as any)[field] || field,
        width: defaultWidth > 0 ? defaultWidth : undefined
      });
    });
    
    return columns;
  }

  /**
   * PDF用のフィールド値を取得
   */
  private getPDFFieldValue(item: ExtendedStaffInfo, field: string, roleConfig: RoleConfig): string {
    switch (field) {
      case 'name':
        // 複合キーの場合は作監名のみ、そうでなければ担当者名をそのまま
        if (item.name.includes('__')) {
          const [sakkan] = item.name.split('__');
          return sakkan;
        } else {
          return item.name;
        }
      case 'manager':
        // 複合キーから担当者名を抽出
        if (item.name.includes('__')) {
          const [, manager] = item.name.split('__');
          return manager || '';
        } else {
          return '';
        }
      case 'progressRate':
        return `${item.progressRate.toFixed(1)}%`;
      case 'totalCount':
        return item.totalCount.toString();
      default:
        // 進捗フィールドの場合
        const fieldCount = item.fieldCounts[field];
        return fieldCount !== undefined ? fieldCount.toString() : '0';
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // スクロール保存のタイマーをクリア
    if (this.scrollSaveTimeout) {
      clearTimeout(this.scrollSaveTimeout);
      this.scrollSaveTimeout = null;
    }
    
    // 状態を保存してからクリーンアップ
    this.saveState();
    
    // TableEventManagerで管理されているイベントを削除
    this.tableEventManager.destroy();
    
    // すべてのFilterSortManagerをクリーンアップ
    this.filterSortManagers.forEach(manager => manager.destroy());
    this.filterSortManagers.clear();
    
    // コンテナをクリア
    this.container.innerHTML = '';
  }
}