import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { DOMBuilder } from '@/ui/shared/utils/DOMBuilder';
import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';

/**
 * kintone UI カスタマイズサービス
 * kintoneの標準UIを安全にカスタマイズするための独立したサービス
 */
export class KintoneUICustomizationService {
  private isInitialized = false;
  private config: UICustomizationConfig;
  private styleElement: HTMLStyleElement | null = null;

  constructor(config: UICustomizationConfig = {}) {
    this.config = {
      hideGlobalNavigation: false,
      hideActionMenu: false,
      customStyles: '',
      ...config
    };
  }

  /**
   * サービスを初期化
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // kintone環境でのみ実行
    if (!this.isKintoneEnvironment()) {
      ErrorHandler.handle(new Error('kintone環境ではないため、初期化をスキップします'), 'KintoneUICustomizationService.initialize', {
        logLevel: 'warn'
      });
      return;
    }

    this.waitForKintoneReady(() => {
      this.applyCustomizations();
      this.isInitialized = true;
      console.log('[KintoneUICustomizationService] 初期化完了');
    });
  }

  /**
   * サービスを破棄
   */
  destroy(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    this.isInitialized = false;
    console.log('[KintoneUICustomizationService] 破棄完了');
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<UICustomizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isInitialized) {
      this.applyCustomizations();
      console.log('[KintoneUICustomizationService] 設定更新完了');
    }
  }

  /**
   * kintone環境かどうかを判定
   */
  private isKintoneEnvironment(): boolean {
    return ValidationHelper.isDefined(window) && 
           ValidationHelper.isDefined(window.kintone);
  }

  /**
   * kintoneの読み込み完了を待機
   */
  private waitForKintoneReady(callback: () => void): void {
    // DOMが完全に読み込まれてから実行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.executeWithRetry(callback);
      });
    } else {
      this.executeWithRetry(callback);
    }
  }

  /**
   * リトライ機能付きで実行
   */
  private executeWithRetry(callback: () => void, maxRetries = 5, delay = 500): void {
    let attempts = 0;
    
    const tryExecute = () => {
      attempts++;
      
      // 対象要素が存在するかチェック
      const hasTargetElements = this.checkTargetElements();
      
      if (hasTargetElements || attempts >= maxRetries) {
        callback();
      } else {
        setTimeout(tryExecute, delay);
      }
    };
    
    tryExecute();
  }

  /**
   * 対象要素が存在するかチェック
   */
  private checkTargetElements(): boolean {
    const globalNav = document.getElementById('header-global-navigation-root');
    const actionMenu = document.querySelector('.contents-actionmenu-gaia');
    
    return !!(globalNav || actionMenu);
  }

  /**
   * カスタマイズを適用
   */
  private applyCustomizations(): void {
    // 既存のスタイルを削除
    if (this.styleElement) {
      this.styleElement.remove();
    }

    // 新しいスタイル要素を作成
    this.styleElement = DOMBuilder.create('style', {
      attributes: {
        'data-source': 'kintone-ui-customization'
      }
    });
    
    let css = '';

    // グローバルナビゲーション非表示
    if (this.config.hideGlobalNavigation) {
      css += `
        #header-global-navigation-root {
          display: none !important;
        }
      `;
    }

    // アクションメニュー非表示
    if (this.config.hideActionMenu) {
      css += `
        .contents-actionmenu-gaia {
          display: none !important;
        }
      `;
    }

    // カスタムスタイル追加
    if (this.config.customStyles) {
      css += this.config.customStyles;
    }

    this.styleElement.textContent = css;
    document.head.appendChild(this.styleElement);

    // JavaScriptによる補完的な非表示処理
    this.applyJavaScriptCustomizations();
  }

  /**
   * JavaScriptによる補完的なカスタマイズを適用
   */
  private applyJavaScriptCustomizations(): void {
    if (this.config.hideGlobalNavigation) {
      const globalNav = document.getElementById('header-global-navigation-root');
      if (globalNav) {
        globalNav.style.display = 'none';
      }
    }

    if (this.config.hideActionMenu) {
      const actionMenu = document.querySelector('.contents-actionmenu-gaia') as HTMLElement;
      if (actionMenu) {
        actionMenu.style.display = 'none';
      }
    }
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): UICustomizationConfig {
    return { ...this.config };
  }

  /**
   * 初期化状態を取得
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

/**
 * UI カスタマイズ設定
 */
export interface UICustomizationConfig {
  /** グローバルナビゲーションを非表示にするか */
  hideGlobalNavigation?: boolean;
  /** アクションメニューを非表示にするか */
  hideActionMenu?: boolean;
  /** カスタムCSS */
  customStyles?: string;
}