import { BasePopup } from './BasePopup';
import { ErrorHandler } from '../shared/utils/ErrorHandler';
import { DOMBuilder } from '../shared/utils/DOMBuilder';

/**
 * 削除確認ダイアログのオプション
 */
export interface DeletionConfirmOptions {
  /** 削除対象のカットID（バッチ削除時は複数） */
  cutIds: string[];
  /** 削除理由の入力を必須にするか */
  requireReason?: boolean;
  /** 削除成功時のコールバック */
  onConfirm: (cutIds: string[], reason?: string) => Promise<void>;
  /** キャンセル時のコールバック */
  onCancel?: () => void;
  /** カスタムメッセージ */
  customMessage?: string;
}

/**
 * 削除確認ダイアログコンポーネント
 */
export class DeletionConfirmDialog extends BasePopup {
  private options: DeletionConfirmOptions;
  private confirmButton!: HTMLButtonElement;
  private cancelButton!: HTMLButtonElement;
  private reasonInput?: HTMLTextAreaElement;
  private isProcessing = false;

  constructor(targetElement: HTMLElement, options: DeletionConfirmOptions) {
    super(targetElement);
    this.options = options;
    this.showPopup();
  }

  protected createContent(): void {
    // コンテナのスタイル設定
    this.container.className = 'kdp-deletion-confirm-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // ポップアップのスタイル設定
    this.popup.className = 'kdp-deletion-confirm-dialog';
    this.popup.style.cssText = `
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      padding: 24px;
      width: 400px;
      max-width: 90vw;
    `;

    // アイコンとタイトル
    const header = DOMBuilder.create('div');
    header.className = 'kdp-deletion-confirm-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    `;

    const icon = DOMBuilder.create('span');
    icon.style.cssText = `
      font-size: 24px;
      color: #f44336;
      margin-right: 12px;
    `;
    icon.textContent = '⚠️';

    const title = DOMBuilder.create('h3');
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      color: #333;
      font-weight: 600;
    `;
    title.textContent = this.options.cutIds.length > 1 
      ? `${this.options.cutIds.length}件のレコードを削除` 
      : 'レコードの削除';

    DOMBuilder.append(header, icon, title);

    // メッセージ
    const message = DOMBuilder.create('div');
    message.className = 'kdp-deletion-confirm-message';
    message.style.cssText = `
      margin-bottom: 20px;
      color: #555;
      line-height: 1.5;
    `;
    
    if (this.options.customMessage) {
      message.textContent = this.options.customMessage;
    } else {
      const itemText = this.options.cutIds.length > 1 
        ? `選択された${this.options.cutIds.length}件のレコード` 
        : `カット番号 ${this.options.cutIds[0]}`;
      message.textContent = `${itemText}を削除してもよろしいですか？この操作は取り消すことができません。`;
    }

    // 削除対象リスト（複数の場合）
    let itemList: HTMLElement | undefined;
    if (this.options.cutIds.length > 1 && this.options.cutIds.length <= 10) {
      itemList = DOMBuilder.create('div');
      itemList.className = 'kdp-deletion-confirm-items';
      itemList.style.cssText = `
        background-color: #f5f5f5;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 16px;
        max-height: 150px;
        overflow-y: auto;
      `;

      const itemListTitle = DOMBuilder.create('div');
      itemListTitle.style.cssText = `
        font-weight: 600;
        margin-bottom: 8px;
        color: #666;
        font-size: 13px;
      `;
      itemListTitle.textContent = '削除対象:';
      DOMBuilder.append(itemList, itemListTitle);

      const list = DOMBuilder.create('ul');
      list.style.cssText = `
        margin: 0;
        padding-left: 20px;
        color: #777;
        font-size: 13px;
      `;
      
      this.options.cutIds.forEach(id => {
        const listItem = DOMBuilder.create('li');
        listItem.textContent = `カット番号 ${id}`;
        DOMBuilder.append(list, listItem);
      });
      
      DOMBuilder.append(itemList, list);
    } else if (this.options.cutIds.length > 10) {
      itemList = DOMBuilder.create('div');
      itemList.className = 'kdp-deletion-confirm-items';
      itemList.style.cssText = `
        background-color: #f5f5f5;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 16px;
        color: #777;
        font-size: 13px;
      `;
      itemList.textContent = `削除対象: ${this.options.cutIds.slice(0, 10).join(', ')} ... 他${this.options.cutIds.length - 10}件`;
    }

    // 削除理由入力フィールド（オプション）
    let reasonSection: HTMLElement | undefined;
    if (this.options.requireReason || this.options.cutIds.length > 5) {
      reasonSection = DOMBuilder.create('div');
      reasonSection.className = 'kdp-deletion-confirm-reason';
      reasonSection.style.cssText = `
        margin-bottom: 20px;
      `;

      const reasonLabel = DOMBuilder.create('label');
      reasonLabel.style.cssText = `
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #555;
        font-size: 14px;
      `;
      reasonLabel.textContent = this.options.requireReason ? '削除理由（必須）:' : '削除理由（任意）:';

      this.reasonInput = DOMBuilder.create('textarea');
      this.reasonInput.className = 'kdp-deletion-confirm-reason-input';
      this.reasonInput.placeholder = '削除する理由を入力してください...';
      this.reasonInput.style.cssText = `
        width: 100%;
        min-height: 60px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        resize: vertical;
        box-sizing: border-box;
      `;

      DOMBuilder.append(reasonSection, reasonLabel, this.reasonInput);
    }

    // ボタンセクション
    const buttonSection = DOMBuilder.create('div');
    buttonSection.className = 'kdp-deletion-confirm-buttons';
    buttonSection.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;

    // キャンセルボタン
    this.cancelButton = DOMBuilder.create('button');
    this.cancelButton.className = 'kdp-deletion-confirm-cancel';
    this.cancelButton.textContent = 'キャンセル';
    this.cancelButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      background-color: #fff;
      color: #666;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      min-width: 80px;
    `;

    // 削除ボタン
    this.confirmButton = DOMBuilder.create('button');
    this.confirmButton.className = 'kdp-deletion-confirm-delete';
    this.confirmButton.textContent = '削除';
    this.confirmButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      background-color: #f44336;
      color: #fff;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      min-width: 80px;
      font-weight: 600;
    `;

    // ホバーエフェクト
    this.cancelButton.addEventListener('mouseenter', () => {
      this.cancelButton.style.backgroundColor = '#f5f5f5';
    });
    this.cancelButton.addEventListener('mouseleave', () => {
      this.cancelButton.style.backgroundColor = '#fff';
    });

    this.confirmButton.addEventListener('mouseenter', () => {
      if (!this.isProcessing) {
        this.confirmButton.style.backgroundColor = '#d32f2f';
      }
    });
    this.confirmButton.addEventListener('mouseleave', () => {
      if (!this.isProcessing) {
        this.confirmButton.style.backgroundColor = '#f44336';
      }
    });

    DOMBuilder.append(buttonSection, this.cancelButton, this.confirmButton);

    // ポップアップに追加
    DOMBuilder.append(this.popup, header, message);
    if (itemList) {
      DOMBuilder.append(this.popup, itemList);
    }
    if (reasonSection) {
      DOMBuilder.append(this.popup, reasonSection);
    }
    DOMBuilder.append(this.popup, buttonSection);

    DOMBuilder.append(this.container, this.popup);

    // イベントリスナーの設定
    this.setupEventListeners();

    // フォーカスを確認ボタンに設定
    setTimeout(() => this.cancelButton.focus(), 100);
  }

  private setupEventListeners(): void {
    // 確認ボタン
    this.confirmButton.addEventListener('click', async () => {
      if (this.isProcessing) return;

      // 削除理由の検証
      if (this.options.requireReason && this.reasonInput) {
        const reason = this.reasonInput.value.trim();
        if (!reason) {
          this.reasonInput.style.borderColor = '#f44336';
          this.reasonInput.focus();
          return;
        }
      }

      this.isProcessing = true;
      this.confirmButton.disabled = true;
      this.confirmButton.textContent = '削除中...';
      this.confirmButton.style.backgroundColor = '#ccc';
      this.confirmButton.style.cursor = 'not-allowed';

      try {
        const reason = this.reasonInput?.value.trim() || undefined;
        await this.options.onConfirm(this.options.cutIds, reason);
        this.close();
      } catch (error) {
        ErrorHandler.handle(error, 'DeletionConfirmDialog.onConfirm', {
          showAlert: true,
          logLevel: 'error',
          customMessage: '削除処理に失敗しました'
        });
        this.confirmButton.disabled = false;
        this.confirmButton.textContent = '削除';
        this.confirmButton.style.backgroundColor = '#f44336';
        this.confirmButton.style.cursor = 'pointer';
        this.isProcessing = false;
        
        // エラーメッセージを表示
        console.error('削除処理に失敗しました。詳細はコンソールを確認してください。');
      }
    });

    // キャンセルボタン
    this.cancelButton.addEventListener('click', () => {
      if (this.options.onCancel) {
        this.options.onCancel();
      }
      this.close();
    });

    // ESCキーでキャンセル
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.isProcessing) {
        if (this.options.onCancel) {
          this.options.onCancel();
        }
        this.close();
      }
    };
    document.addEventListener('keydown', handleEscKey);
    
    // クリーンアップ時にイベントリスナーを削除
    const originalClose = this.close.bind(this);
    this.close = () => {
      document.removeEventListener('keydown', handleEscKey);
      originalClose();
    };

    // 背景クリックでキャンセル（ダイアログ外をクリック）
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container && !this.isProcessing) {
        if (this.options.onCancel) {
          this.options.onCancel();
        }
        this.close();
      }
    });
  }

  /**
   * ダイアログを閉じる
   */
  close(): void {
    if (this.container.parentNode) {
      this.container.remove();
    }
    
    // セルの編集中スタイルを削除
    if (this.targetCell?.classList.contains('cell-editing')) {
      this.targetCell.classList.remove('cell-editing');
    }
  }
}

/**
 * 削除確認ダイアログを表示するヘルパー関数
 */
export function showDeletionConfirmDialog(
  targetElement: HTMLElement,
  options: DeletionConfirmOptions
): DeletionConfirmDialog {
  return new DeletionConfirmDialog(targetElement, options);
}