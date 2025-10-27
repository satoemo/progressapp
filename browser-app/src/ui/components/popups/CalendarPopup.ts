import { FieldKey } from '@/models/types';
import { BasePopup } from '../BasePopup';
import { EventPriority } from '@/core/events/EventPriority';
import { DOMBuilder } from '@/ui/shared/utils/DOMBuilder';
import { DataProcessor, DATE_FORMATS } from '@/ui/shared/utils/DataProcessor';
import { PROGRESS_STATUS_CONSTANTS, ProgressStatus } from '@/models/values/ProgressStatus';
import { DateHelper } from '@/ui/shared/utils/DateHelper';

/**
 * カレンダーポップアップコンポーネント
 * 進捗フィールドの日付入力用
 */
export class CalendarPopup extends BasePopup {
  private field: FieldKey;
  private cutId: string;
  private currentValue: string;
  private onUpdate?: (cutId: string, field: FieldKey, value: string) => void;
  private dateInput: HTMLInputElement | null = null;

  constructor(
    targetCell: HTMLElement, 
    cutId: string, 
    field: FieldKey, 
    currentValue: string,
    onUpdate?: (cutId: string, field: FieldKey, value: string) => void
  ) {
    super(targetCell);
    
    this.cutId = cutId;
    this.field = field;
    this.currentValue = currentValue;
    this.onUpdate = onUpdate;
    
    // コンテナとポップアップのクラス名を設定
    this.container.className = 'calendar-popup-container';
    this.popup.className = 'calendar-popup';
    
    // ポップアップを表示
    this.showPopup();
    
    // 日付入力フィールドにフォーカス
    if (this.dateInput) {
      this.dateInput.focus();
    }
  }

  /**
   * ポップアップの内容を作成（BasePopupの抽象メソッドを実装）
   */
  protected createContent(): void {
    // ポップアップヘッダー
    const header = DOMBuilder.create('div');
    header.className = 'popup-header';
    
    const title = DOMBuilder.create('span');
    title.className = 'popup-title';
    title.textContent = '日付を選択';
    
    const closeBtn = DOMBuilder.create('button');
    closeBtn.className = 'popup-close-btn';
    closeBtn.innerHTML = '×';
    // 閉じるボタンのイベントをTableEventManager経由で登録
    const closeBtnId = this.tableEventManager.on(
      closeBtn,
      'click',
      () => this.close(),
      EventPriority.HIGHEST
    );
    this.eventHandlerIds.push(closeBtnId);
    
    DOMBuilder.append(header, title, closeBtn);
    
    // カレンダー部分
    const calendarSection = DOMBuilder.create('div');
    calendarSection.className = 'calendar-section';
    
    const dateInput = DOMBuilder.create('input');
    dateInput.type = 'date';
    dateInput.className = 'calendar-input';
    this.dateInput = dateInput;
    
    // 現在の値が日付の場合は設定
    if (this.currentValue && this.isValidDate(this.currentValue)) {
      dateInput.value = this.formatDateForInput(this.currentValue);
    }
    
    // 今日の日付ボタン
    const todayBtn = DOMBuilder.create('button');
    todayBtn.className = 'popup-btn btn-today';
    todayBtn.textContent = '今日';
    // 今日ボタンのイベントをTableEventManager経由で登録
    const todayBtnId = this.tableEventManager.on(
      todayBtn,
      'click',
      () => {
        const today = new Date();
        const dateStr = this.formatDate(today);
        dateInput.value = this.formatDateForInput(dateStr);
        this.handleDateSelect(dateStr);
      },
      EventPriority.HIGHEST
    );
    this.eventHandlerIds.push(todayBtnId);
    
    DOMBuilder.append(calendarSection, dateInput);
    
    // ボタン部分
    const buttonsSection = DOMBuilder.create('div');
    buttonsSection.className = 'buttons-section';
    
    // 1行目：今日、不要
    const firstRow = DOMBuilder.create('div');
    firstRow.className = 'button-row';
    
    const fuyouBtn = this.createActionButton('不要', 'btn-fuyou', () => this.handleSpecialValue('不要'));
    
    DOMBuilder.append(firstRow, todayBtn, fuyouBtn);
    
    // 2行目：リテイク、クリア
    const secondRow = DOMBuilder.create('div');
    secondRow.className = 'button-row';
    
    const retakeBtn = this.createActionButton(PROGRESS_STATUS_CONSTANTS.RETAKE, 'btn-retake', () => this.handleSpecialValue(PROGRESS_STATUS_CONSTANTS.RETAKE));
    const clearBtn = this.createActionButton('クリア', 'btn-clear', () => this.handleClear());
    
    DOMBuilder.append(secondRow, retakeBtn, clearBtn);
    
    DOMBuilder.append(buttonsSection, firstRow, secondRow);
    
    // ポップアップに追加
    DOMBuilder.append(this.popup, header, calendarSection, buttonsSection);

    DOMBuilder.append(this.container, this.popup);
    
    // 日付入力のイベントをTableEventManager経由で登録
    const dateInputId = this.tableEventManager.on(
      dateInput,
      'change',
      (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (value) {
          const date = new Date(value);
          this.handleDateSelect(this.formatDate(date));
        }
      },
      EventPriority.HIGHEST
    );
    this.eventHandlerIds.push(dateInputId);
  }

  /**
   * アクションボタンを作成
   */
  private createActionButton(text: string, className: string, onClick: () => void): HTMLButtonElement {
    const button = DOMBuilder.create('button');
    button.className = `popup-btn ${className}`;
    button.textContent = text;
    
    // ボタンのイベントをTableEventManager経由で登録
    const buttonId = this.tableEventManager.on(
      button,
      'click',
      onClick,
      EventPriority.HIGHEST
    );
    this.eventHandlerIds.push(buttonId);
    
    return button;
  }

  // positionPopup メソッドはBasePopupクラスで実装されているため削除

  // setupEventListeners メソッドはBasePopupクラスのsetupCommonEventListenersで実装されているため削除

  // handleOutsideClick メソッドはBasePopupクラスで実装されているため削除

  // handleEscKey メソッドはBasePopupクラスで実装されているため削除

  // handleResize メソッドはBasePopupクラスで実装されているため削除

  /**
   * 日付選択時の処理
   */
  private handleDateSelect(dateValue: string): void {
    this.updateValue(dateValue);
    this.close();
  }

  /**
   * 特殊値の処理
   */
  private handleSpecialValue(value: string): void {
    this.updateValue(value);
    this.close();
  }

  /**
   * クリア処理
   */
  private handleClear(): void {
    this.updateValue('');
    this.close();
  }

  /**
   * 値を更新
   */
  private updateValue(value: string): void {
    if (this.onUpdate) {
      this.onUpdate(this.cutId, this.field, value);
    }
  }

  /**
   * 日付が有効かチェック
   */
  private isValidDate(value: string): boolean {
    const status = new ProgressStatus(value);
    // 不要、リテイク、空の場合は無効
    if (status.isNotRequired() || status.isRetake() || status.isEmpty()) {
      return false;
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  /**
   * 日付をフォーマット（YYYY-MM-DD）
   */
  private formatDate(date: Date): string {
    return DateHelper.formatDate(date); // YYYY-MM-DD形式
  }

  /**
   * 日付を入力用にフォーマット
   */
  private formatDateForInput(dateString: string): string {
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return dateString; // すでに正しい形式
      }
      const date = new Date(dateString);
      return this.formatDate(date);
    } catch {
      return '';
    }
  }

  // close メソッドはBasePopupクラスで実装されているため削除
}