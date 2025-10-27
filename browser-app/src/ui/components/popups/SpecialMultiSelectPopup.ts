/**
 * 特殊フィールド複数選択ポップアップ
 * 特殊項目を複数選択できるチェックボックス形式のポップアップ
 */
import { BasePopup } from '../BasePopup';
import { ApplicationFacade } from '@/core/ApplicationFacade';
import { EventPriority } from '@/core/events/EventPriority';
import { FieldValueService } from '@/services/FieldValueService';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { DOMBuilder } from '@/ui/shared/utils/DOMBuilder';

export class SpecialMultiSelectPopup extends BasePopup {
  private currentCutId: string;
  private currentValue: string;
  private selectedValues: Set<string>;
  private appFacade: ApplicationFacade;
  private onUpdate: (cutId: string, value: string) => void;
  
  // 特殊項目の選択肢（定義順で表示）
  private readonly specialOptions: string[];
  
  // UI要素
  private checkboxContainer!: HTMLDivElement;
  private confirmButton!: HTMLButtonElement;
  
  constructor(
    targetCell: HTMLElement,
    currentCutId: string,
    currentValue: string,
    appFacade: ApplicationFacade,
    onUpdate: (cutId: string, value: string) => void
  ) {
    super(targetCell);
    
    this.currentCutId = currentCutId;
    this.currentValue = currentValue;
    this.appFacade = appFacade;
    this.onUpdate = onUpdate;
    
    // 特殊項目の選択肢を取得（空文字列を除外）
    this.specialOptions = this.getSpecialOptions();
    
    // 現在の選択状態を初期化
    this.selectedValues = new Set(
      currentValue ? currentValue.split('/').filter(Boolean) : []
    );
    
    // コンテナとポップアップのクラス名を設定（兼用フィールドと同じスタイルを使用）
    this.container.className = 'kenyo-popup-container';
    this.popup.className = 'kenyo-multi-select-popup';
    
    this.showPopup();
  }
  
  /**
   * 特殊項目の選択肢を取得
   */
  private getSpecialOptions(): string[] {
    const fieldValueService = new FieldValueService();
    const allOptions = fieldValueService.collectFieldValues([], 'special');
    
    // 空文字列を除外して返す
    return allOptions.filter(option => option && option.trim() !== '');
  }
  
  /**
   * ポップアップの内容を作成
   */
  protected createContent(): void {
    // ヘッダー
    const header = this.createHeader();

    // チェックボックスリスト
    this.checkboxContainer = this.createCheckboxList();

    // ボタンエリア
    const buttonArea = this.createButtonArea();

    DOMBuilder.append(this.popup, header, this.checkboxContainer, buttonArea);
    
    // Enterキーで適用
    const enterHandler = (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
        keyEvent.preventDefault();
        this.handleApply();
      }
    };
    
    const enterId = this.tableEventManager.addEventListener(
      this.popup,
      'keydown',
      enterHandler,
      false,
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(enterId);
    
    // ポップアップをコンテナに追加
    DOMBuilder.append(this.container, this.popup);
    
    // 次のフレームで位置を再調整（DOMサイズが確定した後）
    requestAnimationFrame(() => {
      this.positionPopup();
    });
  }
  
  /**
   * ヘッダーを作成
   */
  private createHeader(): HTMLDivElement {
    const header = DOMBuilder.create('div');
    header.className = 'filter-dropdown-header';
    
    const title = DOMBuilder.create('span');
    title.className = 'filter-dropdown-title';
    title.textContent = '特殊項目を選択';

    const count = DOMBuilder.create('span');
    count.className = 'filter-dropdown-count';
    count.textContent = this.getCountText();

    DOMBuilder.append(header, title, count);
    
    return header;
  }
  
  /**
   * 選択数のテキストを取得
   */
  private getCountText(): string {
    const totalCount = this.specialOptions.length;
    const checkedCount = this.selectedValues.size;
    return `${checkedCount}/${totalCount}`;
  }
  
  /**
   * 選択数を更新
   */
  private updateCheckedCount(): void {
    const countElement = this.popup.querySelector('.filter-dropdown-count');
    if (countElement) {
      countElement.textContent = this.getCountText();
    }
  }
  
  /**
   * チェックボックスリストを作成
   */
  private createCheckboxList(): HTMLDivElement {
    const container = DOMBuilder.create('div');
    container.className = 'filter-dropdown-body';
    
    // 特殊項目を定義順で表示
    this.specialOptions.forEach(option => {
      const checkboxItem = this.createCheckboxItem(option);
      DOMBuilder.append(container, checkboxItem);
    });
    
    return container;
  }
  
  /**
   * チェックボックスアイテムを作成
   */
  private createCheckboxItem(option: string): HTMLLabelElement {
    const label = DOMBuilder.create('label');
    label.className = 'filter-option';
    
    const checkbox = DOMBuilder.create('input');
    checkbox.type = 'checkbox';
    checkbox.value = option;
    
    // 既に選択されている場合はチェック
    checkbox.checked = this.selectedValues.has(option);
    
    // チェックボックスの変更イベント
    const eventId = this.tableEventManager.addEventListener(
      checkbox,
      'change',
      () => this.handleCheckboxChange(option, checkbox.checked),
      false,
      EventPriority.MEDIUM
    );
    this.eventHandlerIds.push(eventId);
    
    const valueSpan = DOMBuilder.create('span');
    valueSpan.className = 'filter-option-value';
    valueSpan.textContent = option;
    
    DOMBuilder.append(label, checkbox, valueSpan);
    
    return label;
  }
  
  /**
   * チェックボックスの変更処理
   */
  private handleCheckboxChange(option: string, checked: boolean): void {
    if (checked) {
      this.selectedValues.add(option);
    } else {
      this.selectedValues.delete(option);
    }
    // 選択数を更新
    this.updateCheckedCount();
  }
  
  /**
   * ボタンエリアを作成
   */
  private createButtonArea(): HTMLDivElement {
    const footer = DOMBuilder.create('div');
    footer.className = 'filter-dropdown-footer';
    
    // すべて解除ボタン
    const clearButton = DOMBuilder.create('button');
    clearButton.className = 'filter-btn filter-btn-clear';
    clearButton.textContent = 'すべて解除';
    
    const clearEventId = this.tableEventManager.addEventListener(
      clearButton,
      'click',
      () => this.handleClearAll(),
      false,
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(clearEventId);
    
    // 適用ボタン
    this.confirmButton = DOMBuilder.create('button');
    this.confirmButton.className = 'filter-btn filter-btn-apply';
    this.confirmButton.textContent = '適用';
    
    const applyEventId = this.tableEventManager.addEventListener(
      this.confirmButton,
      'click',
      () => this.handleApply(),
      false,
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(applyEventId);
    
    DOMBuilder.append(footer, clearButton, this.confirmButton);
    
    return footer;
  }
  
  /**
   * すべて解除
   */
  private handleClearAll(): void {
    // すべてのチェックボックスを解除
    this.selectedValues.clear();
    
    // UIを更新
    const checkboxes = this.popup.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox: Element) => {
      (checkbox as HTMLInputElement).checked = false;
    });
    
    // 選択数を更新
    this.updateCheckedCount();
  }
  
  /**
   * 適用処理
   */
  private async handleApply(): Promise<void> {
    // スラッシュ区切りで値を作成（兼用フィールドと同じ形式）
    const newValue = Array.from(this.selectedValues).join('/');
    
    try {
      // ApplicationFacadeを使用して更新
      await this.appFacade.updateCut(
        this.currentCutId,
        { special: newValue }
      );
      
      // UIを更新
      this.onUpdate(this.currentCutId, newValue);
      
      // ポップアップを閉じる
      this.close();
    } catch (error) {
      ErrorHandler.handle(error, 'SpecialMultiSelectPopup.onConfirm', {
        showAlert: true,
        logLevel: 'error',
        customMessage: '更新に失敗しました。もう一度お試しください。'
      });
    }
  }
  
  /**
   * ポップアップを閉じる（オーバーライド）
   */
  public close(): void {
    // イベントハンドラーを個別にクリーンアップ
    this.eventHandlerIds.forEach(id => {
      this.tableEventManager.removeEventListener(id);
    });
    this.eventHandlerIds = [];
    
    // 親クラスのclose処理を実行
    super.close();
  }
}