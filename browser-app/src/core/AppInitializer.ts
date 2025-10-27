import { ApplicationFacade } from './ApplicationFacade';
import { ProgressTable } from '../ui/components/table/ProgressTable';
import { TabManager } from '../ui/features/tabs/TabManager';
import { TabType } from '../ui/features/tabs/TabTypes';
import { SimulationView } from '../ui/views/simulation/SimulationView';
import { StaffView } from '../ui/views/staff/StaffView';
import { RetakeView } from '../ui/views/retake/RetakeView';
import { ScheduleView } from '../ui/views/schedule/ScheduleView';
import { OrderView } from '../ui/views/order/OrderView';
import { CutBagView } from '../ui/views/cutbag/CutBagView';
import { SyncIndicator } from '../ui/components/SyncIndicator';
import { StateManagerService } from './services/StateManagerService';
import { DOMBuilder } from '../ui/shared/utils/DOMBuilder';

/**
 * アプリケーション初期化管理クラス
 * 
 * 各ビューの初期化順序を管理し、依存関係を明確にする。
 * 初期化順序問題やデータ依存の問題を解決する。
 */
export class AppInitializer {
  private appFacade: ApplicationFacade;
  private tabManager: TabManager;
  private progressTable: ProgressTable | null = null;
  private staffView: StaffView | null = null;
  private simulationView: SimulationView | null = null;
  private retakeView: RetakeView | null = null;
  private scheduleView: ScheduleView | null = null;
  private orderView: OrderView | null = null;
  private cutBagView: CutBagView | null = null;
  private syncIndicator: SyncIndicator | null = null;

  constructor(
    appFacade: ApplicationFacade,
    _stateManagerService: StateManagerService
  ) {
    this.appFacade = appFacade;
    this.tabManager = new TabManager(this.appFacade.getEventDispatcher());
  }

  /**
   * アプリケーション全体を初期化
   * 依存関係を考慮した適切な順序で各コンポーネントを初期化
   */
  async initialize(container: HTMLElement, initialTab: TabType): Promise<{
    tabManager: TabManager;
    progressTable: ProgressTable | null;
    staffView: StaffView | null;
    simulationView: SimulationView | null;
    retakeView: RetakeView | null;
    scheduleView: ScheduleView | null;
    orderView: OrderView | null;
    cutBagView: CutBagView | null;
    syncIndicator: SyncIndicator | null;
  }> {
    console.log('AppInitializer: 初期化開始');

    try {
      // 1. レイアウト作成（最優先）
      this.createLayout(container);
      
      // 2. 同期インジケーター初期化（UI関連だが独立）
      await this.initializeSyncIndicator();
      
      // 3. タブマネージャー初期化（UI構造の基盤）
      this.initializeTabManager(initialTab);
      
      // 4. データ共有のため進捗管理表を事前初期化（データ依存解決）
      // ただし、初期タブが'progress'以外の場合は、表示に影響しないよう配慮
      await this.ensureProgressTableInitialized(initialTab);
      
      console.log('AppInitializer: 初期化完了');
      
      return {
        tabManager: this.tabManager,
        progressTable: this.progressTable,
        staffView: this.staffView,
        simulationView: this.simulationView,
        retakeView: this.retakeView,
        scheduleView: this.scheduleView,
        orderView: this.orderView,
        cutBagView: this.cutBagView,
        syncIndicator: this.syncIndicator
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`アプリケーション初期化に失敗しました: ${errorMessage}`);
    }
  }

  /**
   * レイアウト作成
   */
  private createLayout(container: HTMLElement): void {
    container.innerHTML = `
      <div class="app-layout">
        <nav class="tab-sidebar"></nav>
        <main class="tab-content-area">
          <div class="tab-content-container"></div>
        </main>
      </div>
    `;
  }

  /**
   * 同期インジケーター初期化
   */
  private async initializeSyncIndicator(): Promise<void> {
    const realtimeSyncService = this.appFacade.getRealtimeSyncService();
    if (realtimeSyncService) {
      this.syncIndicator = new SyncIndicator();
      document.body.appendChild(this.syncIndicator.getElement());
      
      // 同期状態の変更を監視
      realtimeSyncService.setSyncStatusListener((status) => {
        this.syncIndicator?.updateStatus(status);
      });
    }
  }

  /**
   * タブマネージャー初期化
   */
  private initializeTabManager(initialTab: TabType): void {
    this.tabManager.initialize('.tab-sidebar', '.tab-content-container', initialTab);
  }

  /**
   * 進捗管理表を確実に初期化（データ共有のため）
   * 他のビュー（特に担当者別表示）がこのデータに依存するため事前初期化
   */
  private async ensureProgressTableInitialized(initialTab: TabType): Promise<void> {
    if (!this.progressTable) {
      console.log('[AppInitializer] ProgressTableを初期化します');
      
      // コンテンツエリアを取得
      const contentContainer = document.querySelector('.tab-content-container');
      if (!contentContainer) {
        throw new Error('Content container not found');
      }
      
      // 非表示で進捗管理表のコンテナを作成
      const progressDiv = DOMBuilder.create('div', {
        attributes: { id: 'progress-table-container' },
        styles: {
          display: 'none', // 初期状態では非表示
          // 初期タブが'progress'以外の場合は、他のビューとの競合を避けるため
          // z-indexを下げて優先度を下げる
          ...(initialTab !== 'progress' && {
            zIndex: '-1',
            position: 'relative'
          })
        }
      });
      
      contentContainer.appendChild(progressDiv);
      
      // ProgressTableを作成・初期化
      this.progressTable = new ProgressTable(progressDiv, this.appFacade);
      await this.progressTable.initialize();
      
      console.log('[AppInitializer] ProgressTableの初期化が完了しました');
    } else {
      // console.log('[AppInitializer] ProgressTable already exists');
    }
  }

  /**
   * 特定ビューの初期化（遅延初期化）
   */
  async initializeView(viewType: TabType, container: Element): Promise<any> {
    switch (viewType) {
      case 'progress':
        return this.initializeProgressView(container);
        
      case 'staff':
        return this.initializeStaffView(container);
        
      case 'simulation':
        return this.initializeSimulationView(container);
        
      case 'retake':
        return this.initializeRetakeView(container);
        
      case 'schedule':
        return this.initializeScheduleView(container);
        
      case 'order':
        return this.initializeOrderView(container);
        
      case 'cutBag':
        return this.initializeCutBagView(container);
        
      default:
        throw new Error(`未知のビュータイプ: ${viewType}`);
    }
  }

  /**
   * 進捗管理ビュー初期化
   */
  private async initializeProgressView(container: Element): Promise<ProgressTable> {
    // ensureProgressTableInitializedで既に作成済みのはず
    const progressContainer = document.getElementById('progress-table-container');
    if (progressContainer && this.progressTable) {
      // console.log('[AppInitializer] ProgressTableを表示');
      progressContainer.style.display = 'block';
      // z-indexを元に戻す（他のビューとの競合を解決）
      progressContainer.style.zIndex = '';
      progressContainer.style.position = '';
      
      // UnifiedDataStoreの状態を確認
      const unifiedStore = this.appFacade.getUnifiedStore();
      const cuts = unifiedStore.getAll();
      console.log(`[AppInitializer] データ件数: ${cuts.length}件`);
      
      // 状態を復元
      await this.progressTable.restoreState();
      // データを再読み込み（タブ切り替え時にデータが消える問題の修正）
      await this.progressTable.refreshData();
      
      // console.log(`[AppInitializer] 更新後のデータ件数: ${readModelStore.getAll().length}件`);
      return this.progressTable;
    } else {
      // フォールバック：まだ作成されていない場合
      const progressDiv = DOMBuilder.create('div', {
        attributes: { id: 'progress-table-container' },
        styles: { display: 'block' }
      });
      container.appendChild(progressDiv);
      
      this.progressTable = new ProgressTable(progressDiv, this.appFacade);
      await this.progressTable.initialize();
      return this.progressTable;
    }
  }

  /**
   * 担当者別ビュー初期化
   */
  private async initializeStaffView(container: Element): Promise<StaffView> {
    // 既存のStaffViewがある場合は表示を切り替え
    if (this.staffView) {
      const staffContainer = document.getElementById('staff-view-container');
      if (staffContainer) {
        staffContainer.style.display = 'block';
      }
      // データをリフレッシュ
      if (this.staffView.refreshData) {
        await this.staffView.refreshData();
      }
      return this.staffView;
    } else {
      // 初回作成 - StaffViewの初期化を明示的に待つ
      const staffDiv = DOMBuilder.create('div', {
        attributes: { id: 'staff-view-container' },
        styles: { display: 'block' }
      });
      container.appendChild(staffDiv);
      
      // StaffViewを作成し、初期化を待つ
      this.staffView = new StaffView(
        'staff-view-container',
        this.appFacade
      );
      
      // StaffViewの初期化完了を待つ
      await this.staffView.initialize();
      return this.staffView;
    }
  }

  /**
   * シミュレーションビュー初期化
   */
  private async initializeSimulationView(container: Element): Promise<SimulationView> {
    // 既存のSimulationViewがある場合は表示を切り替え
    if (this.simulationView) {
      const simulationContainer = document.getElementById('simulation-view-container');
      if (simulationContainer) {
        simulationContainer.style.display = 'block';
      }
      // データをリフレッシュ
      if (this.simulationView.refreshData) {
        await this.simulationView.refreshData();
      }
    } else {
      // 初回作成
      const simulationDiv = DOMBuilder.create('div', {
        attributes: { id: 'simulation-view-container' },
        styles: { display: 'block' }
      });
      container.appendChild(simulationDiv);
      
      this.simulationView = new SimulationView(
        'simulation-view-container',
        this.appFacade,
        this.appFacade
      );
      
      // SimulationViewの初期化を待つ
      await this.simulationView.initialize();
    }
    
    // タブがアクティブになったことを通知
    if (this.simulationView.onTabActivated) {
      await this.simulationView.onTabActivated();
    }
    
    return this.simulationView;
  }

  /**
   * リテイクビュー初期化
   */
  private async initializeRetakeView(container: Element): Promise<RetakeView> {
    // 既存のRetakeViewがある場合は表示を切り替え
    if (this.retakeView) {
      const retakeContainer = document.getElementById('retake-view-container');
      if (retakeContainer) {
        retakeContainer.style.display = 'block';
      }
    } else {
      // 初回作成
      const retakeDiv = DOMBuilder.create('div', {
        attributes: { id: 'retake-view-container' },
        styles: { display: 'block' }
      });
      container.appendChild(retakeDiv);
      
      this.retakeView = new RetakeView(
        'retake-view-container',
        this.appFacade
      );
    }
    
    return this.retakeView;
  }

  /**
   * 香盤表ビュー初期化
   */
  private async initializeScheduleView(container: Element): Promise<ScheduleView> {
    // 既存のScheduleViewがある場合は表示を切り替え
    if (this.scheduleView) {
      const scheduleContainer = document.getElementById('schedule-view-container');
      if (scheduleContainer) {
        scheduleContainer.style.display = 'block';
      }
    } else {
      // 初回作成
      const scheduleDiv = DOMBuilder.create('div', {
        attributes: { id: 'schedule-view-container' },
        styles: { display: 'block' }
      });
      container.appendChild(scheduleDiv);
      
      this.scheduleView = new ScheduleView(
        'schedule-view-container',
        this.appFacade
      );
      await this.scheduleView.initialize();
    }
    
    return this.scheduleView;
  }

  /**
   * 発注伝票ビュー初期化
   */
  private async initializeOrderView(container: Element): Promise<OrderView> {
    // 既存のOrderViewがある場合は表示を切り替え
    if (this.orderView) {
      const orderContainer = document.getElementById('order-view-container');
      if (orderContainer) {
        orderContainer.style.display = 'block';
      }
    } else {
      // 初回作成
      const orderDiv = DOMBuilder.create('div', {
        attributes: { id: 'order-view-container' },
        styles: { display: 'block' }
      });
      container.appendChild(orderDiv);
      
      this.orderView = new OrderView(
        'order-view-container',
        this.appFacade
      );
      await this.orderView.initialize();
    }
    
    return this.orderView;
  }

  /**
   * カット袋出力ビュー初期化
   */
  private async initializeCutBagView(container: Element): Promise<CutBagView> {
    // 既存のCutBagViewがある場合は表示を切り替え
    if (this.cutBagView) {
      const cutBagContainer = document.getElementById('cutbag-view-container');
      if (cutBagContainer) {
        cutBagContainer.style.display = 'block';
      }
    } else {
      // 初回作成
      const cutBagDiv = DOMBuilder.create('div', {
        attributes: { id: 'cutbag-view-container' },
        styles: { display: 'block' }
      });
      container.appendChild(cutBagDiv);
      
      this.cutBagView = new CutBagView(
        'cutbag-view-container',
        this.appFacade
      );
      await this.cutBagView.initialize();
    }
    
    return this.cutBagView;
  }

  /**
   * 全てのタブを非表示
   */
  hideAllTabs(): void {
    const progressContainer = document.getElementById('progress-table-container');
    const staffContainer = document.getElementById('staff-view-container');
    const simulationContainer = document.getElementById('simulation-view-container');
    const retakeContainer = document.getElementById('retake-view-container');
    const scheduleContainer = document.getElementById('schedule-view-container');
    const orderContainer = document.getElementById('order-view-container');
    const cutBagContainer = document.getElementById('cutbag-view-container');
    
    if (progressContainer) progressContainer.style.display = 'none';
    if (staffContainer) staffContainer.style.display = 'none';
    if (simulationContainer) simulationContainer.style.display = 'none';
    if (retakeContainer) retakeContainer.style.display = 'none';
    if (scheduleContainer) scheduleContainer.style.display = 'none';
    if (orderContainer) orderContainer.style.display = 'none';
    if (cutBagContainer) cutBagContainer.style.display = 'none';
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    
    // 各ビューを個別にクリーンアップ
    if (this.progressTable) {
      this.progressTable.destroy();
      this.progressTable = null;
    }
    if (this.staffView) {
      this.staffView.destroy();
      this.staffView = null;
    }
    if (this.simulationView && this.simulationView.destroy) {
      this.simulationView.destroy();
      this.simulationView = null;
    }
    if (this.retakeView && this.retakeView.destroy) {
      this.retakeView.destroy();
      this.retakeView = null;
    }
    if (this.scheduleView && this.scheduleView.destroy) {
      this.scheduleView.destroy();
      this.scheduleView = null;
    }
    if (this.orderView && this.orderView.destroy) {
      this.orderView.destroy();
      this.orderView = null;
    }
    if (this.cutBagView && this.cutBagView.destroy) {
      this.cutBagView.destroy();
      this.cutBagView = null;
    }
    
    if (this.syncIndicator) {
      this.syncIndicator.destroy();
      this.syncIndicator = null;
    }
    
    this.tabManager.destroy();
  }
}