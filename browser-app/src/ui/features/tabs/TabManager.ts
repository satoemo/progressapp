import { TabType, TabConfig, TAB_CONFIGS, TAB_ORDER, TabSwitchedPayload } from './TabTypes';
import { EventDispatcher } from '../../../application/EventDispatcher';
import { DomainEvent } from '../../../models/events/DomainEvent';
import { TableEventManager } from '../../../core/events/TableEventManager';
import { EventPriority } from '../../../core/events/EventPriority';
import { ErrorHandler } from '../../shared/utils/ErrorHandler';
import { DOMBuilder } from '../../shared/utils/DOMBuilder';

/**
 * サイドバータブ管理クラス
 */
export class TabManager {
  private container: HTMLElement | null = null;
  private activeTab: TabType = 'progress';
  private contentArea: HTMLElement | null = null;
  private tabElements: Map<TabType, HTMLElement> = new Map();
  private eventDispatcher: EventDispatcher;
  private onTabSwitchCallbacks: ((tab: TabType) => void)[] = [];
  private tableEventManager: TableEventManager;

  constructor(eventDispatcher: EventDispatcher) {
    this.eventDispatcher = eventDispatcher;
    this.tableEventManager = new TableEventManager();
  }

  /**
   * タブマネージャーを初期化
   */
  initialize(
    containerSelector: string,
    contentAreaSelector: string,
    initialTab: TabType = 'progress'
  ): void {
    this.container = document.querySelector(containerSelector);
    this.contentArea = document.querySelector(contentAreaSelector);

    if (!this.container || !this.contentArea) {
      ErrorHandler.handle(new Error('コンテナーまたはコンテンツエリアが見つかりません'), 'TabManager.initialize', {
        logLevel: 'error'
      });
      return;
    }

    // 常にinitialTabで設定（状態復元はアプリケーション層で管理）
    this.activeTab = initialTab;
    
    this.render();
    // 初期タブのUIを設定
    this.updateActiveTab();
  }

  /**
   * サイドバータブをレンダリング
   */
  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.container.className = 'tab-sidebar';

    // タブヘッダー
    const header = DOMBuilder.create('div', {
      className: 'tab-sidebar-header',
      textContent: 'メニュー'
    });
    DOMBuilder.append(this.container, header);

    // タブリスト
    const tabList = DOMBuilder.create('div', {
      className: 'tab-sidebar-list',
      attributes: {
        role: 'tablist',
        'aria-orientation': 'vertical'
      }
    });

    TAB_ORDER.forEach((tabType) => {
      const config = TAB_CONFIGS[tabType];
      const tabElement = this.createTabElement(config);
      DOMBuilder.append(tabList, tabElement);
      this.tabElements.set(config.type, tabElement);
    });

    DOMBuilder.append(this.container, tabList);
  }

  /**
   * タブ要素を作成
   */
  private createTabElement(config: TabConfig): HTMLElement {
    const button = DOMBuilder.create('button', {
      className: config.type === this.activeTab ? 'tab-sidebar-item active' : 'tab-sidebar-item',
      attributes: {
        role: 'tab',
        'aria-selected': String(config.type === this.activeTab),
        'data-tab-type': config.type
      }
    });

    // アイコン
    if (config.icon) {
      const icon = DOMBuilder.create('span', {
        className: 'tab-sidebar-icon',
        textContent: config.icon
      });
      DOMBuilder.append(button, icon);
    }

    // ラベル
    const label = DOMBuilder.create('span', {
      className: 'tab-sidebar-label',
      textContent: config.label
    });
    DOMBuilder.append(button, label);

    // 説明（ツールチップ）
    if (config.description) {
      button.setAttribute('title', config.description);
    }

    // クリックイベント（TableEventManager経由）
    this.tableEventManager.on(
      button,
      'click',
      () => {
        this.switchTab(config.type);
      },
      EventPriority.HIGH
    );

    return button;
  }

  /**
   * タブを切り替え
   */
  switchTab(tab: TabType): void {
    if (this.activeTab === tab) return;

    const previousTab = this.activeTab;
    this.activeTab = tab;

    // UI更新
    this.updateActiveTab();

    // イベント発火
    const payload: TabSwitchedPayload = {
      previousTab,
      currentTab: tab,
      timestamp: new Date()
    };

    // イベントディスパッチャーに通知
    const event = new (class TabSwitchedEvent extends DomainEvent {
      constructor(public payload: TabSwitchedPayload) {
        super('system', 'TabSwitched');
      }
      getEventData() {
        return this.payload;
      }
    })(payload);
    
    this.eventDispatcher.dispatch(event);

    // コールバック実行
    this.onTabSwitchCallbacks.forEach(callback => callback(tab));
  }

  /**
   * アクティブタブのUIを更新
   */
  private updateActiveTab(): void {
    this.tabElements.forEach((element, type) => {
      const isActive = type === this.activeTab;
      element.classList.toggle('active', isActive);
      element.setAttribute('aria-selected', String(isActive));
    });
  }

  /**
   * 現在のアクティブタブを取得
   */
  getActiveTab(): TabType {
    return this.activeTab;
  }

  /**
   * タブ切り替えコールバックを登録
   */
  onTabSwitch(callback: (tab: TabType) => void): void {
    this.onTabSwitchCallbacks.push(callback);
  }

  /**
   * タブの有効/無効を設定
   */
  setTabEnabled(tab: TabType, enabled: boolean): void {
    const element = this.tabElements.get(tab);
    if (element) {
      element.classList.toggle('disabled', !enabled);
      (element as HTMLButtonElement).disabled = !enabled;
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // TableEventManagerで管理されているイベントを削除
    this.tableEventManager.destroy();
    
    // その他の状態をクリア
    this.tabElements.clear();
    this.onTabSwitchCallbacks = [];
    
    // 最後にDOM要素を削除
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}