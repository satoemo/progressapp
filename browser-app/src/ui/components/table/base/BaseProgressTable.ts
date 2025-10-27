/**
 * 進捗管理テーブルの基底クラス（v10.3版）
 * UnifiedEventCoordinatorとTableStateManagerを使用した改善版
 */

// Windowインターフェースの拡張
declare global {
  interface Window {
    DEBUG_SERVICES?: boolean;
    __disableAutoRefresh?: boolean;
  }
}

import { ApplicationFacade } from '@/core/ApplicationFacade';
import { CutReadModel } from '@/data/models/CutReadModel';
import { 
  FieldKey, 
  ProgressFieldKey, 
  PROGRESS_FIELDS,
  CutData 
} from '@/models/types';
import { ProgressStatus } from '@/models/values/ProgressStatus';
import { CalendarPopup } from '../../popups/CalendarPopup';
import { VIEW_MODES, ViewModeType } from '../../../config/ViewMode';
import { FIELD_TYPES, CALC_TYPES, SPECIAL_VALUES, PROGRESS_STATUS } from '../../../shared/constants/TableConstants';
import { DynamicStyleManager } from '@/utils/DynamicStyleManager';
import { FieldFormatter } from '../../../shared/formatters/FieldFormatter';
import { CSSClassBuilder } from '../../../shared/builders/CSSClassBuilder';
import { ValidationHelper } from '../../../shared/utils/ValidationHelper';
import { FIELD_LABELS } from '../../../config/FieldLabels';
import { FieldGroup, FIELD_GROUPS } from '../../../shared/types/groups';
import { TableStateManager } from '../../../base/TableStateManager';
import { TableEventManager } from '@/core/events/TableEventManager';
import { EventPriority } from '@/core/events/EventPriority';
import { TooltipManager, TableElementFactory, DateFormatter } from '../../../shared/utils/TableUtils';
import { CutStatusCalculator, CutStatusResult } from '@/services/domain/CutStatusCalculator';
import { ErrorHandler } from '../../../shared/utils/ErrorHandler';
import { DOMBuilder } from '../../../shared/utils/DOMBuilder';
import { DataProcessor } from '../../../shared/utils/DataProcessor';
import { FieldDefinition } from '../../../shared/types/FieldDefinition';


/**
 * 進捗サマリーデータ
 */
interface ProgressSummaryData {
  completed: number;
  notRequired: number;
  retake: number;
  blank: number;
  agari: number;
  nokori: number;
}

/**
 * 特殊サマリーデータ
 */
interface SpecialSummaryData {
  normal: number;
  special: number;  // 特効系
  _3d: number;      // 3D系
  bg: number;       // BG系
  _2d: number;      // 2D系
  other: number;    // その他特殊
  total: number;
}

/**
 * グループサマリー
 */
export interface GroupSummary {
  type: 'progress' | 'currency' | 'maisu' | 'special' | 'count';
  data: ProgressSummaryData | SpecialSummaryData | number;
  displayText: string;
}

/**
 * 進捗管理テーブルの共通機能を提供する基底クラス
 */
export abstract class BaseProgressTable {
  protected container: HTMLElement;
  protected appFacade: ApplicationFacade;
  protected cuts: CutReadModel[] = [];
  protected currentViewMode: ViewModeType = 'detail';
  protected visibleFields: FieldDefinition[] = [];
  protected stateManager: TableStateManager;
  protected table?: HTMLElement;
  protected tableEventManager: TableEventManager;
  protected tooltipManager: TooltipManager;
  private unsubscribe?: () => void;
  private errorNotificationTimeout: number | null = null;
  private cutStatusCalculator: CutStatusCalculator;
  private cutStatusCache: Map<string, CutStatusResult> = new Map();
  
  // Debounce用のタイマー
  private refreshDebounceTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_DEBOUNCE_DELAY = 300; // 300ms
  
  constructor(container: HTMLElement, appFacade: ApplicationFacade) {
    this.container = container;
    this.appFacade = appFacade;
    this.stateManager = new TableStateManager();
    this.tableEventManager = new TableEventManager();
    this.tooltipManager = new TooltipManager();
    this.cutStatusCalculator = new CutStatusCalculator();
    
    // UIイベントのみを購読
    this.subscribeToUIEvents();
    
    // 状態変更を購読
    this.stateManager.subscribe((state) => {
      if (!state.isLoading) {
        this.cuts = state.data;
        // データが更新されたらキャッシュをクリア
        this.clearAllCutStatusCache();
        
        // テーブルが存在し、データがある場合のみレンダリング
        if (this.table && state.data.length > 0) {
          console.log('[BaseProgressTable] State changed, rendering with data:', state.data.length);
          this.render();
        }
      }
    });
  }

  /**
   * 派生クラスで実装すべきメソッド
   */
  protected abstract render(): void;
  protected abstract createTableStructure(): void;
  protected abstract updateVisibleFields(): void;

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
      console.log('[BaseProgressTable] ========== INITIALIZE START ==========');
    }
    
    // テーブル構造を作成
    this.createTableStructure();
    
    // 初回のみsyncReadModelsを実行（タブ切り替えでは実行しない）
    // syncReadModelsはアプリケーション起動時のみ必要
    const currentCuts = this.appFacade.getAllReadModels();
    if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
      console.log(`[BaseProgressTable] initialize: Current data store has ${currentCuts.length} cuts`);
    }
    
    if (DataProcessor.isEmpty(currentCuts)) {
      if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
        console.log('[BaseProgressTable] initialize: Data store is empty, syncing from repository...');
      }
      await this.appFacade.syncData();
      const afterSync = this.appFacade.getAllReadModels();
      if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
        console.log(`[BaseProgressTable] initialize: After sync, data store has ${afterSync.length} cuts`);
      }
    } else {
      if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
        console.log('[BaseProgressTable] initialize: Data store has data, skipping sync');
      }
    }
    
    if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
      console.log('[BaseProgressTable] initialize: Calling refreshData...');
    }
    await this.refreshData();
    
    const state = this.stateManager.getState();
    if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
      console.log('[BaseProgressTable] initialize: After refreshData, state:', {
        isLoading: state.isLoading,
        dataLength: state.data?.length,
        hasTable: !!this.table
      });
    }
    
    // データ読み込み後、明示的にレンダリング
    if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
      console.log('[BaseProgressTable] initialize: Calling render after data load');
    }
    this.render();
    
    if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
      console.log('[BaseProgressTable] ========== INITIALIZE END ==========');
    }
  }

  /**
   * UIイベントを購読
   */
  private subscribeToUIEvents(): void {
    const coordinator = this.appFacade.getEventCoordinator();
    this.unsubscribe = coordinator.subscribeToUIUpdates(async (notification) => {
      if (notification.type === 'data-changed') {
        await this.refreshData();
      } else if (notification.type === 'error') {
        this.renderError(notification.error?.message || 'エラーが発生しました');
      }
    });
    
    // カスタムイベントをリッスン（UI自動更新用）
    window.addEventListener('cutCreated', () => {
      console.log('[BaseProgressTable] cutCreated event received');
      this.debouncedRefreshData();
    });
    window.addEventListener('cutUpdated', () => {
      console.log('[BaseProgressTable] cutUpdated event received');
      this.debouncedRefreshData();
    });
    window.addEventListener('cutDeleted', () => {
      console.log('[BaseProgressTable] cutDeleted event received');
      this.debouncedRefreshData();
    });
    window.addEventListener('cutRestored', () => {
      console.log('[BaseProgressTable] cutRestored event received');
      this.debouncedRefreshData();
    });
  }

  /**
   * データを更新（Debounce付き）
   */
  private debouncedRefreshData(): void {
    // 自動更新が無効化されている場合はスキップ
    if (window.__disableAutoRefresh) {
      console.log('[BaseProgressTable] Auto refresh is disabled, skipping');
      return;
    }
    
    // 既存のタイマーをクリア
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
    }
    
    // 新しいタイマーを設定
    this.refreshDebounceTimer = setTimeout(() => {
      console.log('[BaseProgressTable] Executing debounced refreshData');
      this.refreshData();
    }, this.REFRESH_DEBOUNCE_DELAY);
  }
  
  /**
   * データを更新
   */
  public async refreshData(): Promise<void> {
    if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
      console.log('[BaseProgressTable.refreshData] Loading data...');
    }
    await this.stateManager.loadData(async () => {
      const cuts = await this.appFacade.getAllCuts() as CutReadModel[];
      if (typeof window !== 'undefined' && window.DEBUG_SERVICES) {
        console.log(`[BaseProgressTable.refreshData] Loaded ${cuts.length} cuts`);
      }
      return cuts;
    });
  }

  /**
   * エラー表示
   */
  protected renderError(message: string): void {
    // 既存の内容をクリア
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    
    // エラーメッセージ要素を作成
    const errorDiv = DOMBuilder.create('div', {
      className: 'error-message',
      textContent: message // XSS対策: textContentを使用
    });
    
    DOMBuilder.append(this.container, errorDiv);
  }

  /**
   * 一時的なエラー通知を表示
   * @param message エラーメッセージ
   * @param duration 表示時間（ミリ秒）デフォルト3秒
   */
  protected showErrorNotification(message: string, duration: number = 3000): void {
    // エラー通知エリアを探すか作成
    let errorArea = this.container.querySelector('.error-notification') as HTMLElement;
    if (!errorArea) {
      errorArea = DOMBuilder.create('div', { className: 'error-notification' });
      DOMBuilder.append(document.body as HTMLElement, errorArea);
    }
    
    errorArea.textContent = message;
    DynamicStyleManager.setVisibility(errorArea, true);
    
    // 既存のタイムアウトをクリア
    if (this.errorNotificationTimeout) {
      clearTimeout(this.errorNotificationTimeout);
    }
    
    // 指定時間後に非表示
    this.errorNotificationTimeout = window.setTimeout(() => {
      DynamicStyleManager.setVisibility(errorArea, false);
      this.errorNotificationTimeout = null;
    }, duration);
  }

  /**
   * フィールド値のフォーマット
   */
  protected formatFieldValue(value: unknown, field: FieldDefinition): string {
    if (ValidationHelper.isNullOrEmpty(value)) {
      return '';
    }

    // 兼用フィールドの特別処理
    if (field.field === 'kenyo') {
      return this.formatKenyo(value);
    }

    switch (field.type) {
      case 'currency':
        return this.formatCurrency(value);
      case 'date':
        return this.formatDate(value);
      case 'progress':
        return this.formatProgress(value);
      case 'special':
        return String(value);
      default:
        return String(value);
    }
  }

  /**
   * フォーマット処理はFieldFormatterに委譲
   */
  protected formatCurrency(value: unknown): string {
    return FieldFormatter.formatCurrency(value as string | number | null | undefined);
  }

  protected formatDate(value: unknown): string {
    return FieldFormatter.formatDate(value as string | Date | null | undefined);
  }

  protected formatProgress(value: unknown): string {
    return FieldFormatter.formatProgress(value as string | number | null | undefined);
  }

  protected formatKenyo(value: unknown): string {
    // デフォルトの実装では、値をそのまま返す
    // 継承クラスでオーバーライドして、カット番号に応じた処理を実装する
    return value ? value.toString() : '';
  }

  /**
   * フィールドサマリーの計算
   */
  protected calculateFieldSummary(field: FieldDefinition): GroupSummary | null {
    if (!field.calcType) return null;

    const values = this.cuts.map(cut => DataProcessor.safeString(cut[field.field]));

    switch (field.calcType) {
      case 'progress':
        return this.calculateProgressSummary(values);
        
      case 'currency':
        return this.calculateCurrencySummary(values);
        
      case 'maisu':
        return this.calculateMaisuSummary(values);
        
      case 'special':
        return this.calculateSpecialSummary(values);
        
      case 'count':
        return this.calculateCountSummary(values);
        
      default:
        return null;
    }
  }

  /**
   * 進捗サマリーの計算
   */
  protected calculateProgressSummary(values: string[]): GroupSummary {
    let completed = 0;
    let notRequired = 0;
    let retake = 0;
    let blank = 0;

    values.forEach(value => {
      const status = new ProgressStatus(value);
      if (status.isCompleted()) {
        completed++;
      } else if (status.isNotRequired()) {
        notRequired++;
      } else if (status.isRetake()) {
        retake++;
      } else {
        blank++;
      }
    });

    const agari = completed + notRequired;
    const nokori = blank + retake;

    const displayText = `あがり:${agari} (不要${notRequired})\nのこり:${nokori} (リテ${retake})`;

    return {
      type: 'progress',
      data: { completed, notRequired, retake, blank, agari, nokori },
      displayText
    };
  }

  /**
   * 通貨サマリーの計算
   */
  protected calculateCurrencySummary(values: string[]): GroupSummary {
    const sum = values.reduce((total, v) => {
      const num = ValidationHelper.ensureNumber(v.replace(/[¥,]/g, ''), 0);
      return total + (ValidationHelper.isValidNumber(num) ? num : 0);
    }, 0);

    return {
      type: 'currency',
      data: sum,
      displayText: `¥${DataProcessor.formatNumber(sum)}`
    };
  }

  /**
   * 枚数サマリーの計算
   */
  protected calculateMaisuSummary(values: string[]): GroupSummary {
    const sum = values.reduce((total, v) => {
      const num = ValidationHelper.ensureNumber(v, 0);
      return total + (ValidationHelper.isValidInteger(num) ? num : 0);
    }, 0);

    return {
      type: 'maisu',
      data: sum,
      displayText: `${DataProcessor.formatNumber(sum)}枚`
    };
  }

  /**
   * 特殊サマリーの計算
   * 複数選択対応：スラッシュ区切りの値を分割して個別に集計
   */
  protected calculateSpecialSummary(values: string[]): GroupSummary {
    let normal = 0;
    let special = 0;  // 特効系
    let _3d = 0;      // 3D系
    let bg = 0;       // BG系
    let _2d = 0;      // 2D系
    let other = 0;    // その他特殊

    values.forEach(v => {
      if (ValidationHelper.isNullOrEmpty(ValidationHelper.trim(v))) return;
      
      // スラッシュ区切りで分割して個別に処理
      const individualValues = v.split('/').map(val => val.trim()).filter(val => val);
      
      individualValues.forEach(value => {
        const lowerValue = value.toLowerCase();
        
        // 特効系
        if (lowerValue === '特効') {
          special++;
        }
        // 3D系
        else if (lowerValue === '3d' || lowerValue === '3d-only' || lowerValue === '2d3d') {
          _3d++;
        }
        // BG系
        else if (lowerValue === 'bg-only' || lowerValue.includes('bank')) {
          bg++;
        }
        // 2D系
        else if (lowerValue === '2d' || lowerValue === '2d-only') {
          _2d++;
        }
        // その他の特殊値（欠番、PV、予告、ハーモニー、擬斗、プロップなど）
        else if (lowerValue === '欠番' || lowerValue === 'pv' || lowerValue === '予告' || 
                 lowerValue === 'ハーモニー' || lowerValue === '擬斗' || lowerValue === 'プロップ') {
          other++;
        }
        // 通常カット
        else {
          normal++;
        }
      });
    });

    const total = normal + special + _3d + bg + _2d + other;
    let displayText = `計${total}`;
    
    // 特殊項目の内訳表示
    const parts = [];
    if (special > 0) parts.push(`特効${special}`);
    if (_3d > 0) parts.push(`3D${_3d}`);
    if (bg > 0) parts.push(`BG${bg}`);
    if (_2d > 0) parts.push(`2D${_2d}`);
    if (other > 0) parts.push(`他${other}`);
    
    if (parts.length > 0) {
      displayText += ` (${parts.join(' ')})`;
    }

    return {
      type: 'special',
      data: { normal, special, _3d, bg, _2d, other, total },
      displayText
    };
  }

  /**
   * カットの進捗状態を計算（キャッシュ付き）
   */
  protected calculateCutStatus(cut: CutReadModel): CutStatusResult {
    // キャッシュから取得を試みる
    const cached = this.cutStatusCache.get(cut.id);
    if (cached) {
      return cached;
    }
    
    // キャッシュにない場合は計算
    const result = this.cutStatusCalculator.calculateCutStatus(cut);
    this.cutStatusCache.set(cut.id, result);
    
    return result;
  }
  
  /**
   * 特定のカットのステータスキャッシュをクリア
   */
  protected clearCutStatusCache(cutId: string): void {
    this.cutStatusCache.delete(cutId);
  }
  
  /**
   * 全てのステータスキャッシュをクリア
   */
  protected clearAllCutStatusCache(): void {
    this.cutStatusCache.clear();
  }

  /**
   * カウントサマリーの計算
   */
  protected calculateCountSummary(values: string[]): GroupSummary {
    const count = values.filter(v => v && v.trim()).length;
    
    return {
      type: 'count',
      data: count,
      displayText: `入力数:${count}`
    };
  }


  /**
   * 進捗セルのダブルクリックハンドラー
   */
  protected handleProgressCellDoubleClick(
    cell: HTMLElement,
    cut: CutReadModel,
    fieldKey: FieldKey
  ): void {
    if (!PROGRESS_FIELDS.includes(fieldKey as ProgressFieldKey)) return;

    const currentValue = cut[fieldKey] || '';
    
    const popup = new CalendarPopup(
      cell,
      cut.id,
      fieldKey,
      String(currentValue),
      async (cutId, field, value) => {
        try {
          await this.appFacade.updateCut(
            cutId,
            { [field]: value }
          );
          // キャッシュをクリア
          this.clearCutStatusCache(cutId);
        } catch (error) {
          ErrorHandler.handle(error, 'BaseProgressTable.updateProgress', {
            showAlert: true,
            logLevel: 'error',
            customMessage: '進捗の更新に失敗しました。もう一度お試しください。'
          });
        }
      }
    );
  }

  /**
   * 表示モードを変更
   */
  async changeViewMode(mode: string): Promise<void> {
    this.currentViewMode = mode as ViewModeType;
    this.updateVisibleFields();
    
    // データが既に読み込まれていない場合のみ再読み込み
    const state = this.stateManager.getState();
    if (DataProcessor.isEmpty(state.data) && !state.isLoading) {
      await this.refreshData();
    }
    
    this.render();
  }

  /**
   * グループクラス名の取得
   */
  protected getGroupClassName(category: string): string {
    return CSSClassBuilder.buildGroupClassName(category);
  }

  /**
   * フィールドクラス名の取得
   */
  protected getFieldClassName(field: FieldDefinition): string {
    const classes = [`field-${field.category || 'default'}`];
    
    if (field.type) {
      classes.push(`field-${field.type}`);
    }
    
    if (field.type === 'progress' && field.editable) {
      classes.push('clickable-progress');
    }
    
    return classes.join(' ');
  }

  /**
   * サマリークラス名の取得
   */
  protected getSummaryClassName(type: string): string {
    return CSSClassBuilder.buildSummaryClassName(type);
  }

  /**
   * ヘッダーセルを作成
   */
  protected createHeaderCell(
    content: string,
    options?: {
      className?: string;
      colspan?: number;
      dataset?: Record<string, string>;
      sortable?: boolean;
    }
  ): HTMLTableCellElement {
    return TableElementFactory.createHeaderCell(content, options);
  }

  /**
   * データセルを作成
   */
  protected createDataCell(
    content: string | number,
    options?: {
      className?: string;
      dataset?: Record<string, string>;
      editable?: boolean;
    }
  ): HTMLTableCellElement {
    return TableElementFactory.createDataCell(content, options);
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    // TableEventManagerで管理されているイベントを削除
    this.tableEventManager.destroy();
    
    // エラー通知のタイムアウトをクリア
    if (this.errorNotificationTimeout) {
      clearTimeout(this.errorNotificationTimeout);
    }
    
    // エラー通知エリアを削除
    const errorArea = document.body.querySelector('.error-notification');
    if (errorArea) {
      errorArea.remove();
    }
    
    // ツールチップマネージャーのクリーンアップ
    this.tooltipManager.cleanup();
    
    // イベントリスナーのクリーンアップ
    this.unsubscribe?.();
    this.container.innerHTML = '';
  }
}