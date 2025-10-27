import { BasePopup } from './BasePopup';
import { DynamicStyleManager } from '@/utils/DynamicStyleManager';
import { EventPriority } from '@/core/events/EventPriority';
import { UI } from '@/constants';
import { ErrorHandler } from '../shared/utils/ErrorHandler';
import { DOMBuilder } from '../shared/utils/DOMBuilder';

export class MemoPopup extends BasePopup {
  private cutNumber: string;
  private fieldKey: string;
  private initialContent: string;
  private x: number;
  private y: number;
  private onSave: (content: string) => Promise<void>;
  private textarea!: HTMLTextAreaElement;
  private saveButton!: HTMLButtonElement;
  private deleteButton!: HTMLButtonElement;
  private isSaving = false;

  constructor(
    targetCell: HTMLElement,
    cutNumber: string,
    fieldKey: string,
    initialContent: string,
    x: number,
    y: number,
    onSave: (content: string) => Promise<void>
  ) {
    super(targetCell);
    this.cutNumber = cutNumber;
    this.fieldKey = fieldKey;
    this.initialContent = initialContent;
    this.x = x;
    this.y = y;
    this.onSave = onSave;
    
    this.showPopup();
  }

  protected createContent(): void {
    // コンテナのスタイル設定
    this.container.className = 'kdp-memo-popup-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
      pointer-events: none;
    `;

    // ポップアップのスタイル設定
    this.popup.className = 'kdp-memo-popup';
    this.popup.style.cssText = `
      position: absolute;
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      padding: 16px;
      width: 300px;
      pointer-events: auto;
    `;

    // ヘッダー
    const header = DOMBuilder.create('div', {
      className: 'kdp-memo-popup-header',
      textContent: `メモ: ${this.cutNumber} - ${this.fieldKey}`,
      styles: {
        marginBottom: '12px',
        fontWeight: 'bold',
        fontSize: '14px',
        color: '#333'
      }
    });

    // テキストエリア
    this.textarea = DOMBuilder.create('textarea', {
      className: 'kdp-memo-popup-textarea',
      attributes: {
        placeholder: 'メモを入力してください...'
      },
      styles: {
        width: '100%',
        height: '120px',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'inherit',
        resize: 'vertical',
        boxSizing: 'border-box'
      }
    });
    this.textarea.value = this.initialContent;

    // ボタンコンテナ
    const buttonContainer = DOMBuilder.create('div', {
      className: 'kdp-memo-popup-buttons',
      styles: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '12px',
        gap: '8px'
      }
    });

    // 削除ボタン
    this.deleteButton = DOMBuilder.create('button', {
      className: 'kdp-memo-popup-delete',
      textContent: 'クリア',
      styles: {
        padding: '6px 12px',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px',
        color: '#666'
      }
    });

    // 保存ボタン
    this.saveButton = DOMBuilder.create('button', {
      className: 'kdp-memo-popup-save',
      textContent: '保存',
      styles: {
        padding: '6px 16px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 'bold',
        marginLeft: 'auto'
      }
    });

    // 要素を組み立て
    DOMBuilder.append(buttonContainer, this.deleteButton, this.saveButton);

    DOMBuilder.append(this.popup, header, this.textarea, buttonContainer);

    DOMBuilder.append(this.container, this.popup);

    // イベントリスナーを設定
    this.setupEventListeners();

    // フォーカスを設定
    setTimeout(() => {
      this.textarea.focus();
      this.textarea.select();
    }, 10);
  }

  private setupEventListeners(): void {
    // 保存ボタン
    this.saveButton.addEventListener('click', () => this.handleSave());

    // 削除ボタン
    this.deleteButton.addEventListener('click', () => this.handleDelete());

    // Ctrl+Enter で保存
    const ctrlEnterId = this.tableEventManager.on(
      this.textarea,
      'keydown',
      (e) => {
        const keyboardEvent = e as KeyboardEvent;
        if (keyboardEvent.ctrlKey && keyboardEvent.key === 'Enter') {
          e.preventDefault();
          this.handleSave();
        }
      },
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(ctrlEnterId);

    // ポップアップ内のクリックは伝播を停止
    this.popup.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  private async handleSave(): Promise<void> {
    if (this.isSaving) return;
    
    this.isSaving = true;
    this.saveButton.disabled = true;
    this.saveButton.textContent = '保存中...';

    try {
      const content = this.textarea.value.trim();
      await this.onSave(content);
      this.close();
    } catch (error) {
      ErrorHandler.handle(error, 'MemoPopup.handleSave', {
        logLevel: 'error',
        customMessage: 'Failed to save memo'
      });
      this.saveButton.textContent = 'エラー';
      setTimeout(() => {
        this.saveButton.textContent = '保存';
        this.saveButton.disabled = false;
        this.isSaving = false;
      }, 2000);
    }
  }

  private async handleDelete(): Promise<void> {
    // 入力欄をクリア
    this.textarea.value = '';
    this.textarea.focus();
  }

  protected positionPopup(): void {
    // マウスカーソル位置を基準に配置
    const popupRect = this.popup.getBoundingClientRect();
    
    let top = this.y + UI.MARGIN.WINDOW_EDGE;
    let left = this.x + UI.MARGIN.WINDOW_EDGE;
    
    // 画面右端を超える場合は左にずらす
    if (left + popupRect.width > window.innerWidth - UI.MARGIN.WINDOW_EDGE) {
      left = this.x - popupRect.width - UI.MARGIN.WINDOW_EDGE;
    }
    
    // 画面下端を超える場合は上に表示
    if (top + popupRect.height > window.innerHeight - UI.MARGIN.WINDOW_EDGE) {
      top = this.y - popupRect.height - UI.MARGIN.WINDOW_EDGE;
    }
    
    // 最小値の設定
    top = Math.max(UI.MARGIN.WINDOW_EDGE, top);
    left = Math.max(UI.MARGIN.WINDOW_EDGE, left);
    
    DynamicStyleManager.setDynamicStyles(this.popup, {
      top: top,
      left: left
    });
  }
}