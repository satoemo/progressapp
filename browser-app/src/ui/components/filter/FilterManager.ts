/**
 * フィルタ管理クラス
 */
import { FieldKey } from '@/models/types';
import { CutReadModel } from '@/data/models/CutReadModel';
import { FilterDropdown } from './FilterDropdown';

export interface FilterState {
  [fieldKey: string]: string[];
}

export class FilterManager {
  private filters: FilterState = {};
  private dropdowns: Map<FieldKey, FilterDropdown> = new Map();
  private currentDropdown: FilterDropdown | null = null;
  private onFilterChange?: () => void;
  private statusCalculator?: (cut: CutReadModel) => { status: string; isRetake: boolean };
  
  /**
   * フィルタを適用してカットをフィルタリング
   */
  applyFilters(cuts: CutReadModel[]): CutReadModel[] {
    // フィルタが設定されていない場合はそのまま返す
    const activeFilters = Object.entries(this.filters).filter(([_, values]) => values.length > 0);
    if (activeFilters.length === 0) {
      return cuts;
    }
    
    // 各カットがすべてのフィルタ条件を満たすかチェック
    return cuts.filter(cut => {
      return activeFilters.every(([fieldKey, allowedValues]) => {
        let cutValue: string;
        
        // ステータスフィールドの特別処理
        if (fieldKey === 'status' && this.statusCalculator) {
          const statusInfo = this.statusCalculator(cut);
          cutValue = statusInfo.status;
        } else {
          cutValue = cut[fieldKey as keyof CutReadModel] as string || '';
        }
        
        return allowedValues.includes(cutValue);
      });
    });
  }
  
  /**
   * フィルタドロップダウンを表示
   */
  showFilterDropdown(
    fieldKey: FieldKey,
    fieldTitle: string,
    targetElement: HTMLElement,
    allCuts: CutReadModel[]
  ): void {
    // 既存のドロップダウンを閉じる
    if (this.currentDropdown) {
      this.currentDropdown.close();
    }
    
    // ドロップダウンを取得または作成
    let dropdown = this.dropdowns.get(fieldKey);
    if (!dropdown) {
      dropdown = new FilterDropdown(
        fieldKey,
        fieldTitle,
        (selectedValues) => {
          this.setFilter(fieldKey, selectedValues);
        }
      );
      this.dropdowns.set(fieldKey, dropdown);
    }
    
    // すべての値を取得
    let values: string[];
    if (fieldKey === 'status' && this.statusCalculator) {
      // ステータスフィールドの特別処理
      values = allCuts.map(cut => {
        const statusInfo = this.statusCalculator!(cut);
        return statusInfo.status;
      });
    } else {
      values = allCuts.map(cut => cut[fieldKey as keyof CutReadModel] as string || '');
    }
    
    // 現在のフィルタ値を取得
    const currentFilterValues = this.filters[fieldKey] || [];
    
    // ドロップダウンを表示
    dropdown.show(targetElement, values, currentFilterValues);
    this.currentDropdown = dropdown;
  }
  
  /**
   * フィルタ変更時のコールバックを設定
   */
  setOnFilterChange(callback: () => void): void {
    this.onFilterChange = callback;
  }
  
  /**
   * ステータス計算関数を設定
   */
  setStatusCalculator(calculator: (cut: CutReadModel) => { status: string; isRetake: boolean }): void {
    this.statusCalculator = calculator;
  }
  
  /**
   * フィルタを設定
   */
  private setFilter(fieldKey: FieldKey, values: string[]): void {
    if (values.length === 0) {
      delete this.filters[fieldKey];
    } else {
      this.filters[fieldKey] = values;
    }
    
    // コールバックを実行
    if (this.onFilterChange) {
      this.onFilterChange();
    }
  }
  
  /**
   * フィールドにフィルタが適用されているか
   */
  hasFilter(fieldKey: FieldKey): boolean {
    return (this.filters[fieldKey] || []).length > 0;
  }
  
  /**
   * すべてのフィルタをクリア
   */
  clearAll(): void {
    this.filters = {};
  }
  
  /**
   * 現在のフィルタ状態を取得
   */
  getFilters(): FilterState {
    return { ...this.filters };
  }
  
  /**
   * フィルタ状態を設定
   */
  setFilters(filterState: FilterState): void {
    this.filters = { ...filterState };
    
    // コールバックを実行
    if (this.onFilterChange) {
      this.onFilterChange();
    }
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.dropdowns.forEach(dropdown => dropdown.destroy());
    this.dropdowns.clear();
    this.filters = {};
  }
}