import { ApplicationFacade } from '../../../core/ApplicationFacade';

/**
 * リテイク表表示コンポーネント
 */
export class RetakeView {
  private container: HTMLElement;
  private appFacade: ApplicationFacade;

  constructor(containerId: string, appFacade: ApplicationFacade) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container #${containerId} not found`);
    }

    this.container = container;
    this.appFacade = appFacade;

    this.initialize();
  }

  /**
   * 初期化
   */
  private initialize(): void {
    this.render();
  }

  /**
   * 画面をレンダリング
   */
  private render(): void {
    this.container.innerHTML = '未実装';
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}