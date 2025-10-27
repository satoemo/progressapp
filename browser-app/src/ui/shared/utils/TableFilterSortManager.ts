/**
 * テーブルのフィルタ・ソート機能を管理する共通クラス
 */
import { FilterManager } from '../../components/filter/FilterManager';
import { TableEventManager } from '../../../core/events/TableEventManager';
import { EventPriority } from '../../../core/events/EventPriority';
import { DynamicStyleManager } from '../../../utils/DynamicStyleManager';
import { FieldKey } from '../../../models/types';
import { DOMBuilder } from './DOMBuilder';

/**
 * ソート設定
 */
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * フィールド定義
 */
export interface TableField {
  field: string;
  title: string;
  width?: number;
}

/**
 * テーブルフィルタ・ソートマネージャー
 */
export class TableFilterSortManager {
  private filterManager: FilterManager;
  private currentSort: SortConfig | null = null;
  private tableEventManager: TableEventManager;
  private onSortChange?: (sort: SortConfig | null) => void;
  
  constructor(
    tableEventManager: TableEventManager,
    onFilterChange?: () => void,
    onSortChange?: (sort: SortConfig | null) => void
  ) {
    this.tableEventManager = tableEventManager;
    this.filterManager = new FilterManager();
    this.onSortChange = onSortChange;
    
    if (onFilterChange) {
      this.filterManager.setOnFilterChange(onFilterChange);
    }
  }

  /**
   * ソート・フィルタ可能なヘッダーセルを作成
   */
  createSortableFilterableHeader(field: TableField): HTMLTableCellElement {
    const th = DOMBuilder.create('th', {
      className: 'field-header filterable-header',
      data: { field: field.field },
      styles: field.width ? {
        width: `${field.width}px`,
        minWidth: `${field.width}px`,
        maxWidth: `${field.width}px`
      } : undefined
    });
    
    const titleContainer = DOMBuilder.create('div', {
      className: 'sortable-header field-title',
      textContent: field.title,
      data: { field: field.field }
    });
    DynamicStyleManager.addStyleClasses(titleContainer, 'clickable');
    
    // ソートアイコンを追加
    this.addSortIcon(titleContainer, field.field);
    
    // フィルタアイコンを追加
    this.addFilterIndicator(titleContainer, field.field);
    
    DOMBuilder.append(th, titleContainer);
    return th;
  }

  /**
   * ソートアイコンを追加
   */
  private addSortIcon(container: HTMLElement, fieldKey: string): void {
    const isActive = this.currentSort?.field === fieldKey;
    const icon = DOMBuilder.create('span', {
      className: 'kdp-margin-left-2',
      textContent: isActive && this.currentSort ? 
        (this.currentSort.order === 'asc' ? '▲' : '▼') : '▼'
    });
    
    if (isActive) {
      DynamicStyleManager.addStyleClasses(icon, 'iconActive');
    } else {
      DynamicStyleManager.addStyleClasses(icon, 'iconInactive');
    }
    
    DOMBuilder.append(container, icon);
  }

  /**
   * フィルタインジケーターを追加
   */
  private addFilterIndicator(container: HTMLElement, fieldKey: string): void {
    if (this.filterManager.hasFilter(fieldKey as FieldKey)) {
      const filterIcon = DOMBuilder.create('span', {
        textContent: '*'
      });
      DynamicStyleManager.addStyleClasses(filterIcon, 'filterActive');
      DOMBuilder.append(container, filterIcon);
    }
  }

  /**
   * テーブルにフィルタ・ソートイベントを設定
   */
  setupTableEvents(tableElement: HTMLElement, currentTableData?: any[]): void {
    // ソートイベント
    this.tableEventManager.on(
      tableElement,
      'click',
      (event) => {
        const target = event.target as HTMLElement;
        if (target.classList.contains('sortable-header') || target.closest('.sortable-header')) {
          const header = target.classList.contains('sortable-header') ? target : target.closest('.sortable-header') as HTMLElement;
          const field = header.dataset.field;
          if (field) {
            this.handleSort(field);
          }
        }
      },
      EventPriority.HIGH
    );

    // フィルタイベント
    this.tableEventManager.on(
      tableElement,
      'contextmenu',
      (event) => {
        event.preventDefault();
        const target = event.target as HTMLElement;
        const th = target.closest('th.filterable-header') as HTMLElement;
        if (th) {
          const header = th.querySelector('.sortable-header') as HTMLElement;
          if (header) {
            const field = header.dataset.field;
            const fieldTitle = header.textContent?.replace(/[▲▼*]/g, '').trim() || '';
            if (field && currentTableData) {
              this.showFilterDropdownForTable(field, fieldTitle, th, currentTableData);
            } else if (field) {
              this.showFilterDropdown(field, fieldTitle, th);
            }
          }
        }
      },
      EventPriority.HIGH
    );
  }

  /**
   * 特定のテーブルデータに対するフィルタドロップダウンを表示
   */
  protected showFilterDropdownForTable(fieldKey: string, fieldTitle: string, targetElement: HTMLElement, tableData: any[]): void {
    // サブクラスでオーバーライド
    this.showFilterDropdown(fieldKey, fieldTitle, targetElement);
  }

  /**
   * ソート処理
   */
  private handleSort(field: string): void {
    if (this.currentSort?.field === field) {
      // 同じフィールドの場合は順序を反転
      this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      // 新しいフィールドの場合は昇順から開始
      this.currentSort = {
        field,
        order: 'asc'
      };
    }
    
    if (this.onSortChange) {
      this.onSortChange(this.currentSort);
    }
  }

  /**
   * フィルタドロップダウンを表示（サブクラスでオーバーライド）
   */
  protected showFilterDropdown(fieldKey: string, fieldTitle: string, targetElement: HTMLElement): void {
    // サブクラスで実装
  }

  /**
   * データにフィルタを適用
   */
  applyFilters<T>(data: T[], getFieldValue: (item: T, field: string) => string): T[] {
    const filters = this.filterManager.getFilters();
    const activeFilters = Object.entries(filters).filter(([_, values]) => values.length > 0);
    
    if (activeFilters.length === 0) {
      return data;
    }
    
    return data.filter(item => {
      return activeFilters.every(([fieldKey, allowedValues]) => {
        const value = getFieldValue(item, fieldKey);
        return allowedValues.includes(value);
      });
    });
  }

  /**
   * データにソートを適用
   */
  applySort<T>(data: T[], getFieldValue: (item: T, field: string) => any): T[] {
    if (!this.currentSort) return data;
    
    return data.sort((a, b) => {
      const valueA = getFieldValue(a, this.currentSort!.field);
      const valueB = getFieldValue(b, this.currentSort!.field);
      
      let comparison = 0;
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        comparison = valueA.localeCompare(valueB);
      } else {
        comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      }
      
      return this.currentSort!.order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * フィルタマネージャーを取得
   */
  getFilterManager(): FilterManager {
    return this.filterManager;
  }

  /**
   * 現在のソート状態を取得
   */
  getCurrentSort(): SortConfig | null {
    return this.currentSort;
  }

  /**
   * ソート状態を設定
   */
  setCurrentSort(sort: SortConfig | null): void {
    this.currentSort = sort;
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.filterManager.destroy();
  }
}