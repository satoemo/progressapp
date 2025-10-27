import { ApplicationFacade } from './core/ApplicationFacade';
import { AppInitializer } from './core/AppInitializer';
import { TabManager } from './ui/features/tabs/TabManager';
import { TabType } from './ui/features/tabs/TabTypes';
import { ProgressTable } from './ui/components/table/ProgressTable';
import { StaffView } from './ui/views/staff/StaffView';
import { SimulationView } from './ui/views/simulation/SimulationView';
import { RetakeView } from './ui/views/retake/RetakeView';
import { generateDummyData } from '../test/generateDummyData';
import { SyncIndicator } from './ui/components/SyncIndicator';
import { StateManagerService } from './services/state/StateManagerService';
import { isKintoneEnvironment } from './utils/Environment';
import { ErrorHandler } from './ui/shared/utils/ErrorHandler';
import { DOMBuilder } from './ui/shared/utils/DOMBuilder';
import { StorageHelper } from './ui/shared/utils/StorageHelper';
import { ValidationHelper } from './ui/shared/utils/ValidationHelper';
import '../styles/main.css';
import '../styles/components/sidebar.css';
import '../styles/features/simulation.css';
import '../styles/features/staff.css';
import '../styles/features/norma-table.css';

// Kintone型定義
interface KintoneEvent {
  appId: number;
  recordId?: string;
  record?: Record<string, unknown>;
  records?: Array<Record<string, unknown>>;
  type: string;
}

interface KintoneAPI {
  events: {
    on: (eventType: string, handler: (event: KintoneEvent) => Promise<KintoneEvent | void> | KintoneEvent | void) => void;
  };
  app: {
    getHeaderSpaceElement: () => HTMLElement | null;
  };
}

declare global {
  interface Window {
    kintone?: KintoneAPI;
    KintoneProgressAppV10_3?: typeof KintoneProgressAppV10_3;
    kintoneProgressAppV10_3?: KintoneProgressAppV10_3;
    app?: KintoneProgressAppV10_3;
    ApplicationFacade?: typeof ApplicationFacade;
  }
}

/**
 * 統一アプリケーションクラス（v10.3 リファクタリング版）
 * AppInitializerを使用した初期化処理の統一
 */
class KintoneProgressAppV10_3 {
  private appFacade: ApplicationFacade;
  private appInitializer: AppInitializer;
  private tabManager: TabManager | null = null;
  private progressTable: ProgressTable | null = null;
  private staffView: StaffView | null = null;
  private simulationView: SimulationView | null = null;
  private activeTab: TabType = 'progress';
  private isKintoneEnvironment: boolean;
  private stateManagerService: StateManagerService;

  constructor(config: { useLocalStorage?: boolean } = {}) {
    // kintone環境の判定
    this.isKintoneEnvironment = isKintoneEnvironment();
    
    // LocalStorageをデフォルトで有効化（kintone環境・ローカル環境両方で）
    const useLocalStorage = config.useLocalStorage !== undefined
      ? config.useLocalStorage
      : true;

    // ApplicationFacadeを初期化
    this.appFacade = ApplicationFacade.create({
      useLocalStorage,
      snapshotFrequency: 10
    });
    
    // StateManagerServiceを初期化
    this.stateManagerService = new StateManagerService(useLocalStorage);
    
    // 保存されたアプリケーション状態を復元（StateManagerService経由）
    const savedTabState = this.stateManagerService.getActiveTab();
    if (savedTabState) {
      this.activeTab = savedTabState;
    }
    
    // AppInitializerを初期化
    this.appInitializer = new AppInitializer(this.appFacade, this.stateManagerService);
  }

  /**
   * アプリケーションを初期化
   */
  async initialize(containerId: string): Promise<void> {
    try {
      const container = typeof containerId === 'string' 
        ? document.getElementById(containerId)
        : containerId;
        
      if (!container) {
        console.error('Container not found:', containerId);
        throw new Error('Container not found');
      }

      // AppInitializerによる統一初期化
      const components = await this.appInitializer.initialize(container, this.activeTab);
      
      // 初期化されたコンポーネントを取得
      this.tabManager = components.tabManager;
      this.progressTable = components.progressTable;
      this.staffView = components.staffView;
      this.simulationView = components.simulationView;

      // タブ切り替えイベントを設定
      this.tabManager.onTabSwitch(async (tab: TabType) => {
        await this.handleTabSwitch(tab);
      });
      
      // 初期タブを表示（保存されたアクティブタブ）
      await this.handleTabSwitch(this.activeTab);
      
      console.log(`KintoneProgressAppV10.3 initialized successfully${this.isKintoneEnvironment ? ' in kintone environment' : ''}`);
    } catch (error) {
      ErrorHandler.handle(error, 'KintoneProgressAppV103.initialize', {
        showAlert: true,
        logLevel: 'error'
      });
      throw error;
    }
  }


  /**
   * タブ切り替えを処理
   */
  private async handleTabSwitch(tab: TabType): Promise<void> {
    this.activeTab = tab;
    
    // タブ状態を保存（StateManagerService経由）
    this.stateManagerService.saveActiveTab(tab);
    
    // コンテンツエリアを取得
    const contentContainer = document.querySelector('.tab-content-container');
    if (!contentContainer) return;
    
    // AppInitializerを使用してタブ切り替えを処理
    this.appInitializer.hideAllTabs();
    
    // 指定されたビューを初期化・表示
    this._currentView = await this.appInitializer.initializeView(tab, contentContainer);
    
    // ビュー固有の参照を更新
    this.updateViewReferences(tab);
  }

  /**
   * ビュー固有の参照を更新
   */
  private updateViewReferences(tab: TabType): void {
    switch (tab) {
      case 'progress':
        // 進捗管理表は事前初期化済み
        break;
      case 'staff':
        // StaffViewの参照が必要な場合は更新
        break;
      case 'simulation':
        // SimulationViewの参照が必要な場合は更新
        break;
      case 'retake':
        // RetakeViewの参照が必要な場合は更新
        break;
    }
  }

  /**
   * ダミーデータを生成
   */
  async generateDummyData(count: number = 50): Promise<void> {
    await generateDummyData(this.appFacade, count);

    // ProgressTableを明示的に更新
    if (this.progressTable) {
      await this.progressTable.refreshData();
    }
  }


  /**
   * データをクリア
   */
  async clearData(): Promise<void> {
    // ストアをクリア
    const unifiedStore = this.appFacade.getUnifiedStore();
    unifiedStore.clear();

    // ApplicationFacadeのStoreをクリア（後方互換）
    try {
      const facade = ApplicationFacade.getInstance();
      if (facade.getService) {
        const store = facade.getService<any>('Store');
        if (store && store.clear) {
          await store.clear();
        }
      }
    } catch (error) {
      ErrorHandler.handle(error, 'KintoneProgressAppV103.destroy', {
        logLevel: 'warn'
      });
    }
    
    // LocalStorageのデータをクリア（最適化版）
    const keysToRemove = [];
    const storageKeys = StorageHelper.getKeys('');
    const patterns = ['mock', 'kintone', 'cut', 'Cut', 'simplified'];
    
    // パターンマッチを最適化
    for (const key of storageKeys) {
      if (patterns.some(pattern => key.includes(pattern))) {
        keysToRemove.push(key);
      }
    }
    
    // 一括削除
    keysToRemove.forEach(key => StorageHelper.remove(key, { prefix: '' }));

    // ビューの更新を並列化
    const refreshPromises = [];
    
    if (this.progressTable) {
      refreshPromises.push(this.progressTable.refreshData());
    }
    if (this.staffView) {
      refreshPromises.push(this.staffView.refreshData());
    }
    if (this.simulationView) {
      refreshPromises.push(this.simulationView.refreshData());
    }
    
    // 並列実行
    await Promise.all(refreshPromises);
  }

  /**
   * LocalStorageのデバッグ情報を出力
   */
  debugStorage(): void {
    console.log('=== LocalStorage Debug Info ===');
    
    // LocalStorageの全キーを取得
    const allKeys = StorageHelper.getKeys('');
    console.log(`Total keys in LocalStorage: ${allKeys.length}`);
    
    // カテゴリ別にキーを分類
    const categories = {
      cuts: allKeys.filter(k => k.includes('Cut') || k.includes('cut')),
      kintone: allKeys.filter(k => k.includes('kintone')),
      mock: allKeys.filter(k => k.includes('mock')),
      simplified: allKeys.filter(k => k.includes('simplified')),
      other: allKeys.filter(k => 
        !k.includes('Cut') && !k.includes('cut') && 
        !k.includes('kintone') && !k.includes('mock') && 
        !k.includes('simplified')
      )
    };
    
    // カテゴリ別に表示
    for (const [category, keys] of Object.entries(categories)) {
      if (!ValidationHelper.isNullOrEmpty(keys)) {
        console.log(`\n${category.toUpperCase()} (${keys.length} keys):`);
        keys.forEach(key => {
          try {
            const value = StorageHelper.loadRaw(key, '');
            const size = value ? value.length : 0;
            console.log(`  - ${key} (${size} bytes)`);
            
            // カットデータの場合は内容も表示
            if (category === 'cuts' && size < 1000) {
              console.log(`    Content: ${value?.substring(0, 200)}...`);
            }
          } catch (e) {
            ErrorHandler.handle(e, 'DebugCommands.showStorageContents', {
              logLevel: 'warn',
              customMessage: `  - ${key} (error reading)`
            });
          }
        });
      }
    }
    
    // ApplicationFacadeの状態も確認
    console.log('\n=== ApplicationFacade Status ===');
    const appFacade = ApplicationFacade.getInstance();
    const stats = appFacade.getStatistics();
    console.log('ApplicationFacade statistics:', stats);
    
    // UnifiedDataStoreの状態を確認
    try {
      const store = appFacade.getUnifiedStore();
      const storeStats = store.getStatistics();
      console.log('UnifiedDataStore statistics:', storeStats);
    } catch (e) {
      ErrorHandler.handle(e, 'DebugCommands.showStoreStatistics', {
        logLevel: 'warn'
      });
    }
    
    // ApplicationFacadeの状態も確認
    console.log('\n=== ApplicationFacade Status ===');
    const facadeStats = this.appFacade.getServiceStatistics();
    console.log('Registered services:', facadeStats.services);
    console.log('Factories:', facadeStats.factories);
    console.log('Singletons:', facadeStats.singletons);
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // AppInitializerによる統一クリーンアップ
    this.appInitializer.destroy();
    
    // 参照をクリア
    this.tabManager = null;
    this.progressTable = null;
    this.staffView = null;
    this.simulationView = null;
    this._retakeView = null;
    this._syncIndicator = null;
    this._currentView = null;
    
    // RealtimeSyncServiceのクリーンアップ
    const realtimeSyncService = this.appFacade.getRealtimeSyncService();
    if (realtimeSyncService) {
      realtimeSyncService.cleanup();
    }
  }
}

// グローバルに公開（IIFEビルド用）
window.KintoneProgressAppV10_3 = KintoneProgressAppV10_3;
window.ApplicationFacade = ApplicationFacade;

// kintone環境での初期化
if (isKintoneEnvironment()) {
  const kintone = window.kintone;
  if (!kintone) {
    console.error('kintone object not found');
  } else {
    // レコード一覧画面での初期化
    kintone.events.on('app.record.index.show', async (event: KintoneEvent) => {
    const headerElement = kintone.app.getHeaderSpaceElement();
    if (!headerElement) {
      console.error('Header space element not found');
      return event;
    }

    // 既存のコンテナがある場合は削除
    const existingContainer = document.getElementById('kintone-progress-app-v10-3');
    if (existingContainer) {
      existingContainer.remove();
    }

    // アプリコンテナを作成
    const container = DOMBuilder.create('div', {
      attributes: { id: 'kintone-progress-app-v10-3' },
      className: 'kintone-app-container'
    });
    headerElement.appendChild(container);

    // アプリを初期化
    const app = new KintoneProgressAppV10_3();
    await app.initialize('kintone-progress-app-v10-3');

    // グローバルに公開（デバッグ用）
    window.kintoneProgressAppV10_3 = app;

    return event;
  });

    // レコード詳細画面での初期化（必要に応じて）
    kintone.events.on('app.record.detail.show', (event: KintoneEvent) => {
      // 詳細画面では表示しない
      return event;
    });
  }
}

// ローカル環境での自動初期化
if (!isKintoneEnvironment()) {
  window.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('app') || document.getElementById('app-container');
    if (container) {
      const app = new KintoneProgressAppV10_3();
      await app.initialize(container.id);

      // グローバルに公開（デバッグ用）
      window.kintoneProgressAppV10_3 = app;
      window.app = app; // 簡単にアクセスできるようにエイリアス追加
    } else {
      console.error('Container not found in local environment');
    }
  });
}