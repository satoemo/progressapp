import { FieldKey } from '@/models/types';
import { BasePopup } from '../BasePopup';
import { EventPriority } from '@/core/events/EventPriority';
import { FieldValueService } from '@/services/FieldValueService';
import { CutReadModel } from '@/data/models/CutReadModel';
import { DOMBuilder } from '@/ui/shared/utils/DOMBuilder';
import { DataProcessor } from '@/ui/shared/utils/DataProcessor';

/**
 * ドロップダウンポップアップコンポーネント
 * 情報フィールドの候補値選択用
 */
export class DropdownPopup extends BasePopup {
  private field: FieldKey;
  private cutId: string;
  private currentValue: string;
  private candidates: string[];
  private onUpdate?: (cutId: string, field: FieldKey, value: string) => void;
  private fieldValueService: FieldValueService;
  private inputField: HTMLInputElement | null = null;

  constructor(
    targetCell: HTMLElement,
    cutId: string,
    field: FieldKey,
    currentValue: string,
    cuts: CutReadModel[],
    onUpdate?: (cutId: string, field: FieldKey, value: string) => void
  ) {
    super(targetCell);
    
    this.cutId = cutId;
    this.field = field;
    this.currentValue = currentValue;
    this.onUpdate = onUpdate;
    
    // FieldValueServiceを初期化
    this.fieldValueService = new FieldValueService();
    
    // 候補値を収集
    this.candidates = this.fieldValueService.collectFieldValues(cuts, field);
    
    // コンテナとポップアップのクラス名を設定
    this.container.className = 'dropdown-popup-container';
    this.popup.className = 'dropdown-popup';
    
    // ポップアップを表示
    this.showPopup();
    
    // 入力フィールドにフォーカス
    if (this.inputField) {
      this.inputField.focus();
      this.inputField.select();
    }
  }

  /**
   * ポップアップの内容を作成（BasePopupの抽象メソッドを実装）
   */
  protected createContent(): void {
    // ポップアップヘッダー
    const header = DOMBuilder.create('div', {
      className: 'popup-header'
    });
    
    const title = DOMBuilder.create('span', {
      className: 'popup-title',
      textContent: '値を選択'
    });
    
    const closeBtn = DOMBuilder.create('button', {
      className: 'popup-close-btn',
      innerHTML: '×'
    });
    
    // 閉じるボタンのイベント
    const closeBtnId = this.tableEventManager.on(
      closeBtn,
      'click',
      () => this.close(),
      EventPriority.HIGHEST
    );
    this.eventHandlerIds.push(closeBtnId);
    
    DOMBuilder.append(header, title, closeBtn);
    
    // 入力セクション
    const inputSection = DOMBuilder.create('div', {
      className: 'dropdown-input-section'
    });
    
    const inputField = DOMBuilder.create('input', {
      className: 'dropdown-input',
      attributes: {
        type: 'text',
        value: this.currentValue,
        placeholder: '値を入力または下から選択'
      }
    });
    this.inputField = inputField;
    
    DOMBuilder.append(inputSection, inputField);
    
    // ドロップダウンセクション
    const dropdownSection = DOMBuilder.create('div', {
      className: 'dropdown-section'
    });
    
    if (this.candidates.length > 0) {
      this.candidates.forEach(value => {
        const item = DOMBuilder.create('div', {
          className: value === this.currentValue ? 'dropdown-item current' : 'dropdown-item',
          textContent: value
        });
        
        // アイテムクリックイベント
        const itemClickId = this.tableEventManager.on(
          item,
          'click',
          () => {
            this.inputField!.value = value;
            this.updateHighlight(value);
          },
          EventPriority.HIGHEST
        );
        this.eventHandlerIds.push(itemClickId);
        
        DOMBuilder.append(dropdownSection, item);
      });
    } else {
      const emptyItem = DOMBuilder.create('div', {
        className: 'dropdown-item empty',
        textContent: '（候補なし）',
        styles: {
          color: '#999',
          fontStyle: 'italic',
          cursor: 'default'
        }
      });
      DOMBuilder.append(dropdownSection, emptyItem);
    }
    
    // ボタンセクション
    const buttonsSection = DOMBuilder.create('div', {
      className: 'buttons-section'
    });
    
    const confirmBtn = this.createActionButton('確定', 'btn-confirm', () => {
      this.handleConfirm();
    });
    
    const cancelBtn = this.createActionButton('キャンセル', 'btn-cancel', () => {
      this.close();
    });
    
    DOMBuilder.append(buttonsSection, confirmBtn, cancelBtn);
    
    // ポップアップに追加
    DOMBuilder.append(this.popup, header, inputSection, dropdownSection, buttonsSection);

    DOMBuilder.append(this.container, this.popup);
    
    // ポップアップの最小サイズを設定
    this.popup.style.minWidth = '200px';
    
    // 入力フィールドのイベント設定
    this.setupInputFieldEvents();
  }

  /**
   * アクションボタンを作成
   */
  private createActionButton(text: string, className: string, onClick: () => void): HTMLButtonElement {
    const button = DOMBuilder.create('button', {
      className: `popup-btn ${className}`,
      textContent: text
    });
    
    const buttonId = this.tableEventManager.on(
      button,
      'click',
      onClick,
      EventPriority.HIGHEST
    );
    this.eventHandlerIds.push(buttonId);
    
    return button;
  }

  /**
   * 入力フィールドのイベントを設定
   */
  private setupInputFieldEvents(): void {
    if (!this.inputField) return;
    
    // 入力値変更イベント
    const inputId = this.tableEventManager.on(
      this.inputField,
      'input',
      () => {
        this.updateHighlight(this.inputField!.value);
      },
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(inputId);
    
    // キーボードイベント
    const keydownId = this.tableEventManager.on(
      this.inputField,
      'keydown',
      (e) => {
        const keyboardEvent = e as KeyboardEvent;
        if (keyboardEvent.key === 'Enter') {
          e.preventDefault();
          this.handleConfirm();
        } else if (keyboardEvent.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      },
      EventPriority.CRITICAL
    );
    this.eventHandlerIds.push(keydownId);
  }

  /**
   * 入力値に基づいて強調表示を更新
   */
  private updateHighlight(inputValue: string): void {
    const items = this.popup.querySelectorAll('.dropdown-item:not(.empty)');
    items.forEach(item => {
      const itemElement = item as HTMLElement;
      if (itemElement.textContent === inputValue) {
        itemElement.classList.add('current');
      } else {
        itemElement.classList.remove('current');
      }
    });
  }

  /**
   * 確定ボタン処理
   */
  private handleConfirm(): void {
    const value = DataProcessor.safeString(this.inputField?.value?.trim());
    this.updateValue(value);
    this.close();
  }

  /**
   * 外部クリック時のアクション（BasePopupのメソッドをオーバーライド）
   */
  protected handleOutsideClickAction(): void {
    // DropdownPopupでは外部クリック時に入力値を保存してから閉じる
    this.handleConfirm();
  }

  /**
   * 値を更新
   */
  private updateValue(value: string): void {
    if (this.onUpdate) {
      this.onUpdate(this.cutId, this.field, value);
    }
  }
}