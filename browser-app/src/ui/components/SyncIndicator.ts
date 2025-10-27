import { SyncStatus } from '../../services/sync/RealtimeSyncService';
import { DOMBuilder } from '../shared/utils/DOMBuilder';
import { DOMHelper } from '../shared/utils/DOMHelper';

/**
 * 同期状態表示コンポーネント
 */
export class SyncIndicator {
  private element: HTMLElement;
  private statusElement: HTMLElement;
  private currentStatus: SyncStatus = { type: 'idle' };
  
  constructor() {
    this.element = this.createElement();
    this.statusElement = this.element.querySelector('.sync-status') as HTMLElement;
    this.addStyles();
    this.updateDisplay();
  }

  private createElement(): HTMLElement {
    const statusElement = DOMBuilder.create('div', {
      className: 'sync-status'
    });
    
    const container = DOMBuilder.create('div', {
      className: 'sync-indicator',
      children: [statusElement]
    });
    
    return container;
  }

  /**
   * 要素を取得
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * 同期状態を更新
   */
  updateStatus(status: SyncStatus): void {
    this.currentStatus = status;
    this.updateDisplay();
  }

  /**
   * 表示を更新
   */
  private updateDisplay(): void {
    if (!this.statusElement) return;
    
    // 既存のクラスをクリア
    this.statusElement.className = 'sync-status';
    
    switch (this.currentStatus.type) {
      case 'idle':
        this.statusElement.textContent = '';
        DOMHelper.addClass(this.statusElement, 'sync-idle');
        break;
        
      case 'pending':
        this.statusElement.textContent = '保存待機中...';
        DOMHelper.addClass(this.statusElement, 'sync-pending');
        break;
        
      case 'syncing':
        this.statusElement.textContent = '保存中...';
        DOMHelper.addClass(this.statusElement, 'sync-syncing');
        break;
        
      case 'success':
        this.statusElement.textContent = '保存完了';
        DOMHelper.addClass(this.statusElement, 'sync-success');
        // 2秒後に非表示
        setTimeout(() => {
          if (this.currentStatus.type === 'success') {
            this.updateStatus({ type: 'idle' });
          }
        }, 2000);
        break;
        
      case 'error':
        this.statusElement.textContent = `エラー: ${this.currentStatus.error}`;
        DOMHelper.addClass(this.statusElement, 'sync-error');
        break;
    }
  }

  /**
   * スタイルを追加
   */
  private addStyles(): void {
    if (document.getElementById('sync-indicator-styles')) return;
    
    const style = DOMBuilder.create('style', {
      attributes: { id: 'sync-indicator-styles' },
      textContent: `
      .sync-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        pointer-events: none;
      }
      
      .sync-status {
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(-10px);
      }
      
      .sync-status.sync-idle {
        opacity: 0;
      }
      
      .sync-status.sync-pending {
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
        opacity: 1;
        transform: translateY(0);
      }
      
      .sync-status.sync-syncing {
        background-color: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
        opacity: 1;
        transform: translateY(0);
      }
      
      .sync-status.sync-success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
        opacity: 1;
        transform: translateY(0);
      }
      
      .sync-status.sync-error {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
        opacity: 1;
        transform: translateY(0);
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.6; }
        100% { opacity: 1; }
      }
      
      .sync-status.sync-syncing::before {
        content: '⟳ ';
        display: inline-block;
        animation: pulse 1s ease-in-out infinite;
      }
    `
    });
    
    DOMBuilder.append(document.head as HTMLElement, style);
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}