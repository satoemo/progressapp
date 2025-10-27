/**
 * フィルタドロップダウンコンポーネント
 * FilterManagerから再利用されるため、特殊な初期化パターンを使用
 */
import { FieldKey } from '@/models/types';
import { BasePopup } from '../BasePopup';
import { EventPriority } from '@/core/events/EventPriority';
import { DOMUtils } from '@/utils/DOMUtils';
import { DynamicStyleManager } from '@/utils/DynamicStyleManager';
import { DOMBuilder } from '../../shared/utils/DOMBuilder';

export interface FilterOption {
  value: string;
  count: number;
  checked: boolean;
}

export class FilterDropdown extends BasePopup {
  private options: FilterOption[] = [];
  private readonly onApply: (selectedValues: string[]) => void;
  
  constructor(
    private readonly fieldKey: FieldKey,
    private readonly fieldTitle: string,
    onApply: (selectedValues: string[]) => void
  ) {
    super();
    this.onApply = onApply;
    
    // FilterDropdownは再利用されるため、初期化時はアクティブにしない
    this.deactivateFromBasePopup();
    
    // コンテナの初期化とイベント設定
    this.initializeContainer();
    this.setupEventHandlers();
  }
  
  /**
   * BasePopupから非アクティブ化
   */
  private deactivateFromBasePopup(): void {
    if (BasePopup.getActivePopup() === this) {
      (BasePopup as any).activePopup = null;
    }
  }

  /**
   * コンテナを初期化
   */
  private initializeContainer(): void {
    this.container = DOMBuilder.create('div', {
      className: 'filter-dropdown'
    });
    DynamicStyleManager.setVisibility(this.container, false);
    DOMBuilder.append(document.body as HTMLElement, this.container);
  }

  /**
   * BasePopupの抽象メソッドを実装
   */
  protected createContent(): void {
    // FilterDropdownは独自のレンダリング方式を使用
  }
  
  /**
   * ドロップダウンを表示
   */
  show(targetElement: HTMLElement, values: string[], currentFilterValues: string[] = []): void {
    // アクティブポップアップを管理
    this.activateAsPopup();
    
    // オプションを準備
    this.prepareOptions(values, currentFilterValues);
    
    // レンダリングして表示
    this.render();
    this.position(targetElement);
    
    // BasePopupのイベントリスナーを設定
    this.showManually(targetElement);
  }

  /**
   * アクティブポップアップとして設定
   */
  private activateAsPopup(): void {
    const currentActive = BasePopup.getActivePopup();
    if (currentActive && currentActive !== this) {
      currentActive.close();
    }
    (BasePopup as any).activePopup = this;
  }

  /**
   * 値を集計してオプションを準備
   */
  private prepareOptions(values: string[], currentFilterValues: string[]): void {
    // 値を集計
    const valueCounts = this.aggregateValues(values);
    
    // オプションを作成（出現順を保持）
    this.options = this.createOptions(values, valueCounts, currentFilterValues);
  }

  /**
   * 値を集計
   */
  private aggregateValues(values: string[]): Map<string, number> {
    const valueCounts = new Map<string, number>();
    values.forEach(value => {
      const key = value || '(空白)';
      valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
    });
    return valueCounts;
  }

  /**
   * オプションを作成
   */
  private createOptions(
    values: string[], 
    valueCounts: Map<string, number>, 
    currentFilterValues: string[]
  ): FilterOption[] {
    const options: FilterOption[] = [];
    const seen = new Set<string>();
    
    values.forEach(value => {
      const key = value || '(空白)';
      if (!seen.has(key)) {
        seen.add(key);
        const actualValue = key === '(空白)' ? '' : key;
        options.push({
          value: key,
          count: valueCounts.get(key) || 0,
          checked: currentFilterValues.includes(actualValue)
        });
      }
    });
    
    return options;
  }
  
  /**
   * ドロップダウンを閉じる
   */
  close(): void {
    // コンテナを非表示
    DynamicStyleManager.setVisibility(this.container, false);
    
    // BasePopupのイベントハンドラーをクリーンアップ（再利用のため）
    this.cleanupEventHandlers();
    
    // アクティブポップアップをクリア
    this.deactivateFromBasePopup();
  }

  /**
   * イベントハンドラーをクリーンアップ
   */
  private cleanupEventHandlers(): void {
    this.eventHandlerIds.forEach(id => {
      this.tableEventManager.removeEventListener(id);
    });
    this.eventHandlerIds = [];
  }
  
  /**
   * BasePopupの外部クリック時の動作をオーバーライド
   */
  protected handleOutsideClickAction(): void {
    this.close();
  }
  
  /**
   * イベントハンドラーを設定
   */
  private setupEventHandlers(): void {
    // チェックボックスの変更イベント
    this.tableEventManager.on(
      this.container,
      'change',
      this.handleCheckboxChange.bind(this),
      EventPriority.HIGH
    );
    
    // ボタンクリックイベント
    this.tableEventManager.on(
      this.container,
      'click',
      this.handleButtonClick.bind(this),
      EventPriority.HIGHEST
    );
  }

  /**
   * チェックボックス変更時の処理
   */
  private handleCheckboxChange(e: Event): void {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLInputElement && target.type === 'checkbox' && target.dataset.index) {
      const index = parseInt(target.dataset.index);
      this.options[index].checked = target.checked;
      this.updateCheckedCount();
    }
  }

  /**
   * ボタンクリック時の処理
   */
  private handleButtonClick(e: Event): void {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    
    if (target.classList.contains('filter-btn-clear')) {
      this.handleClearAll();
    } else if (target.classList.contains('filter-btn-apply')) {
      this.handleApply();
    }
  }

  /**
   * すべて解除
   */
  private handleClearAll(): void {
    this.options.forEach(opt => opt.checked = false);
    this.render();
  }

  /**
   * フィルタ適用
   */
  private handleApply(): void {
    const selectedValues = this.options
      .filter(opt => opt.checked)
      .map(opt => opt.value === '(空白)' ? '' : opt.value);
    this.onApply(selectedValues);
    this.close();
  }

  /**
   * 選択数を更新
   */
  private updateCheckedCount(): void {
    const checkedCount = this.options.filter(opt => opt.checked).length;
    const countElement = this.container.querySelector('.filter-dropdown-count');
    if (countElement) {
      countElement.textContent = `${checkedCount}/${this.options.length}`;
    }
  }
  
  /**
   * コンテンツをレンダリング
   */
  private render(): void {
    const checkedCount = this.options.filter(opt => opt.checked).length;
    
    this.container.innerHTML = this.createHTML(checkedCount);
    DynamicStyleManager.setVisibility(this.container, true);
  }

  /**
   * HTMLを生成
   */
  private createHTML(checkedCount: number): string {
    return `
      <div class="filter-dropdown-header">
        <span class="filter-dropdown-title">${this.fieldTitle}でフィルタ</span>
        <span class="filter-dropdown-count">${checkedCount}/${this.options.length}</span>
      </div>
      <div class="filter-dropdown-body">
        ${this.createOptionsHTML()}
      </div>
      <div class="filter-dropdown-footer">
        <button class="filter-btn filter-btn-clear">すべて解除</button>
        <button class="filter-btn filter-btn-apply">適用</button>
      </div>
    `;
  }

  /**
   * オプションのHTMLを生成
   */
  private createOptionsHTML(): string {
    return this.options.map((option, index) => `
      <label class="filter-option">
        <input type="checkbox" 
          data-index="${index}" 
          ${option.checked ? 'checked' : ''}>
        <span class="filter-option-value">${DOMUtils.escapeHtml(option.value)}</span>
        <span class="filter-option-count">(${option.count})</span>
      </label>
    `).join('');
  }
  
  /**
   * 位置を設定
   */
  private position(targetElement: HTMLElement): void {
    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    this.container.classList.add('kdp-dropdown');
    
    DynamicStyleManager.setDynamicStyles(this.container, {
      top: rect.bottom + scrollTop,
      left: rect.left + scrollLeft,
      minWidth: Math.max(rect.width, 200)
    });
  }
  
  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    this.tableEventManager.destroy();
    
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}