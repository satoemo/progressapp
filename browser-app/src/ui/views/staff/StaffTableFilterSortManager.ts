/**
 * StaffView専用のテーブルフィルタ・ソートマネージャー
 */
import { TableFilterSortManager } from '../../shared/utils/TableFilterSortManager';
import { TableEventManager } from '../../../core/events/TableEventManager';
import { FieldKey } from '../../../models/types';
import { FilterDropdown } from '../../components/filter/FilterDropdown';

/**
 * 担当者情報
 */
export interface StaffInfo {
  name: string;
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  progressRate: number;
  firstAppearanceOrder: number;
  fieldCounts: Record<string, number>;
}

/**
 * StaffView専用テーブルフィルタ・ソートマネージャー
 */
export class StaffTableFilterSortManager extends TableFilterSortManager {
  private allStaffData: StaffInfo[] = [];
  private filterDropdowns: Map<string, FilterDropdown> = new Map();

  constructor(
    tableEventManager: TableEventManager,
    onFilterChange?: () => void,
    onSortChange?: (sort: any) => void
  ) {
    super(tableEventManager, onFilterChange, onSortChange);
  }

  /**
   * 全担当者データを設定（フィルタ用）
   */
  setAllStaffData(staffData: StaffInfo[]): void {
    this.allStaffData = staffData;
  }

  /**
   * 特定のテーブルデータに対するフィルタドロップダウンを表示
   */
  protected showFilterDropdownForTable(fieldKey: string, fieldTitle: string, targetElement: HTMLElement, tableData: StaffInfo[]): void {
    this.showFilterDropdownWithData(fieldKey, fieldTitle, targetElement, tableData);
  }

  /**
   * フィルタドロップダウンを表示
   */
  protected showFilterDropdown(fieldKey: string, fieldTitle: string, targetElement: HTMLElement): void {
    this.showFilterDropdownWithData(fieldKey, fieldTitle, targetElement, this.allStaffData);
  }

  /**
   * 指定されたデータを使用してフィルタドロップダウンを表示
   */
  private showFilterDropdownWithData(fieldKey: string, fieldTitle: string, targetElement: HTMLElement, staffData: StaffInfo[]): void {
    // 指定された担当者データから値を取得（重複除去せずそのまま）
    let values: string[] = [];
    
    staffData.forEach(staff => {
      const value = this.getStaffFieldValueForFilter(staff, fieldKey);
      if (value && value.trim() !== '') {
        values.push(value);
      }
    });
    
    // FilterDropdownを直接使用
    let dropdown = this.filterDropdowns.get(fieldKey);
    if (!dropdown) {
      dropdown = new FilterDropdown(
        fieldKey as FieldKey,
        fieldTitle,
        (selectedValues) => {
          // 現在のフィルタ状態を取得
          const currentFilters = this.getFilterManager().getFilters();
          
          // 新しいフィルタ状態を作成
          const newFilters = { ...currentFilters };
          if (selectedValues.length === 0) {
            delete newFilters[fieldKey];
          } else {
            newFilters[fieldKey] = selectedValues;
          }
          
          // フィルタ状態を設定
          this.getFilterManager().setFilters(newFilters);
        }
      );
      this.filterDropdowns.set(fieldKey, dropdown);
    }
    
    // 現在のフィルタ値を取得
    const currentFilterValues = this.getFilterManager().getFilters()[fieldKey] || [];
    
    // ドロップダウンを表示
    dropdown.show(targetElement, values, currentFilterValues);
  }

  /**
   * StaffInfoからフィールド値を取得
   */
  getStaffFieldValue(staff: StaffInfo, field: string): any {
    switch (field) {
      case 'name':
        // 複合キーの場合は作監名のみ、そうでなければ担当者名をそのまま
        if (staff.name.includes('__')) {
          const [sakkan] = staff.name.split('__');
          return sakkan;
        } else {
          return staff.name;
        }
      case 'manager':
        // 複合キーから担当者名を抽出
        if (staff.name.includes('__')) {
          const [, manager] = staff.name.split('__');
          return manager || '';
        } else {
          return '';
        }
      case 'progressRate':
        return staff.progressRate;
      case 'totalCount':
        return staff.totalCount;
      case 'completedCount':
        return staff.completedCount;
      case 'inProgressCount':
        return staff.inProgressCount;
      default:
        // フィールドカウントやその他のフィールド
        return staff.fieldCounts[field] || (staff as any)[field] || 0;
    }
  }

  /**
   * StaffInfoからフィルタ用文字列値を取得
   */
  getStaffFieldValueForFilter(staff: StaffInfo, field: string): string {
    switch (field) {
      case 'name':
        // 複合キーの場合は作監名のみ、そうでなければ担当者名をそのまま
        if (staff.name.includes('__')) {
          const [sakkan] = staff.name.split('__');
          return sakkan;
        } else {
          return staff.name;
        }
      case 'manager':
        // 複合キーから担当者名を抽出
        if (staff.name.includes('__')) {
          const [, manager] = staff.name.split('__');
          return manager || '';
        } else {
          return '';
        }
      case 'progressRate':
        return `${staff.progressRate.toFixed(1)}%`;
      default:
        const value = this.getStaffFieldValue(staff, field);
        return value.toString();
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // FilterDropdownsをクリーンアップ
    this.filterDropdowns.forEach(dropdown => dropdown.destroy());
    this.filterDropdowns.clear();
    
    // 親クラスのクリーンアップを呼び出し
    super.destroy();
  }
}