import { UnifiedEventCoordinator } from './coordinators/UnifiedEventCoordinator';
import { UnifiedStateManager } from '@/services/state/UnifiedStateManager';
import { DebouncedSyncManager } from '@/services/state/DebouncedSyncManager';
import { UnifiedDataStore, LocalStorageAdapter, MemoryStorageAdapter } from '@/data/UnifiedDataStore';
import { EventDispatcher } from './EventDispatcher';
import { DomainEvent } from '@/models/events/DomainEvent';
import { RealtimeSyncService } from '@/services/sync/RealtimeSyncService';
import { KintoneUICustomizationService } from '@/services/kintone/KintoneUICustomizationService';
import { sharedUICustomizationSettings } from '@/config/kintone.config';
import { CoreService } from '@/services/core/CoreService';
import { IRepository } from '@/types/repository';
import { CutData } from '@/types/cut';
import {
  IDataAccessFacade,
  DataAccessStatistics,
  FilterOptions,
  DataChangeEvent
} from './interfaces/IDataAccessFacade';
import { CutReadModel } from '@/data/models/CutReadModel';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { StorageHelper } from '@/ui/shared/utils/StorageHelper';
import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';
import { ProjectSettings, createDefaultProjectSettings, validateProjectSettings } from '@/types/project';

// ApplicationFacade設定型
export interface ApplicationFacadeConfig {
  useLocalStorage?: boolean;
  snapshotFrequency?: number;
  enablePerformanceMonitoring?: boolean;
}

export interface CutCreateData {
  cutNumber: string;
  scene?: string;
  status?: string;
  special?: string;
  kenyo?: string;
  maisu?: string;
  manager?: string;
  ensyutsu?: string;
  sousakkan?: string;
  [key: string]: string | number | boolean | null | undefined;
}


export interface CutFilter {
  scene?: string;
  status?: string;
  manager?: string;
  cutNumber?: string;
  cutNumberFrom?: string;
  cutNumberTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * アプリケーションファサード
 * アプリケーション全体の統一されたインターフェースを提供
 * Gang of Fourの「Facade」パターンを実装
 */
export class ApplicationFacade implements IDataAccessFacade {
  // サービス管理（ServiceContainer機能を統合）
  private services: Map<string, unknown> = new Map();
  private factories: Map<string, () => unknown> = new Map();
  private singletons: Map<string, unknown> = new Map();
  
  // コアコンポーネント
  private unifiedStore: UnifiedDataStore;
  private eventDispatcher: EventDispatcher;
  private coreService: CoreService;
  
  private eventCoordinator: UnifiedEventCoordinator;
  private stateManager: UnifiedStateManager;
  private syncManager: DebouncedSyncManager;
  private realtimeSyncService: RealtimeSyncService;
  private uiCustomizationService: KintoneUICustomizationService;

  // プロジェクト設定
  private projectSettings: ProjectSettings | null = null;

  // シングルトンインスタンス
  private static instance: ApplicationFacade | null = null;

  constructor(config: ApplicationFacadeConfig = {}) {
    // UnifiedDataStoreを直接初期化
    const adapter = config?.useLocalStorage !== false 
      ? new LocalStorageAdapter('unified_store_')
      : new MemoryStorageAdapter();
    
    this.unifiedStore = new UnifiedDataStore(adapter, {
      cacheSize: 200,
      enableBackup: true,
      maxBackups: 3,
      enableIntegrityCheck: true
    });
    
    // EventDispatcherを初期化
    this.eventDispatcher = new EventDispatcher();
    
    // CoreServiceを初期化
    this.coreService = new CoreService(this.unifiedStore, this.eventDispatcher);
    
    // デフォルトサービスを登録
    this.registerDefaultServices();

    // 統一状態管理を初期化
    this.stateManager = new UnifiedStateManager(
      this.unifiedStore,
      null, // Repositoryを削除
      this.eventDispatcher,
      null  // MemoRepositoryを削除
    );

    // デバウンス同期マネージャーを初期化
    this.syncManager = new DebouncedSyncManager();

    // イベントコーディネーターを初期化
    this.eventCoordinator = new UnifiedEventCoordinator(
      this.eventDispatcher,
      this.unifiedStore,
      null, // Repositoryを削除
      null  // MemoRepositoryを削除
    );

    // リアルタイム同期サービスを初期化
    this.realtimeSyncService = RealtimeSyncService.getInstance();

    // UI カスタマイズサービスを初期化
    this.uiCustomizationService = new KintoneUICustomizationService({
      hideGlobalNavigation: sharedUICustomizationSettings.hideGlobalNavigation,
      hideActionMenu: sharedUICustomizationSettings.hideActionMenu,
      customStyles: sharedUICustomizationSettings.customStyles
    });

    this.initializeServices();

    // 初期化処理を実行
    this.initialize();
  }

  /**
   * 初期化処理
   */
  private initialize(): void {
    // リアルタイム同期サービスにDebouncedSyncManagerを設定
    this.realtimeSyncService.setSyncManager(this.syncManager);

    // イベントハンドラーを初期化
    this.eventCoordinator.initialize();

    // プロジェクト設定を読み込み
    this.loadProjectSettings();

    // UI カスタマイズサービスを初期化（設定で有効な場合のみ）
    if (sharedUICustomizationSettings.enabled) {
      this.uiCustomizationService.initialize();
    }
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(config?: ApplicationFacadeConfig): ApplicationFacade {
    if (!ApplicationFacade.instance) {
      ApplicationFacade.instance = new ApplicationFacade(config);
    }
    return ApplicationFacade.instance;
  }

  /**
   * テスト用：インスタンスをリセット
   */
  static resetInstance(): void {
    if (ApplicationFacade.instance) {
      ApplicationFacade.instance.cleanup();
    }
    ApplicationFacade.instance = null;
  }

  // ========== ServiceContainer機能（統合） ==========

  /**
   * デフォルトサービスを登録
   */
  private registerDefaultServices(): void {
    this.services.set('UnifiedDataStore', this.unifiedStore);
    this.services.set('EventDispatcher', this.eventDispatcher);
  }

  /**
   * サービスを取得
   */
  public getService<T>(name: string): T {
    // まずサービスを確認
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }
    
    // 次にシングルトンを確認
    if (this.singletons.has(name)) {
      return this.singletons.get(name) as T;
    }
    
    // ファクトリがあれば実行
    if (this.factories.has(name)) {
      const factory = this.factories.get(name)!;
      const instance = factory() as T;
      this.services.set(name, instance);
      return instance;
    }
    
    throw new Error(`Service not found: ${name}`);
  }

  /**
   * サービスを登録
   */
  public registerService<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * ファクトリを登録
   */
  public registerFactory<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  /**
   * シングルトンサービスを登録
   */
  public registerSingleton<T>(name: string, factory: () => T): void {
    if (!this.singletons.has(name)) {
      const instance = factory();
      this.singletons.set(name, instance);
    }
  }

  /**
   * UnifiedDataStoreを取得
   */
  getUnifiedStore(): UnifiedDataStore {
    return this.unifiedStore;
  }

  /**
   * イベントディスパッチャーを取得
   */
  getEventDispatcher(): EventDispatcher {
    return this.eventDispatcher;
  }

  /**
   * リポジトリを取得（互換性のため残す）
   */
  getRepository(): IRepository<CutData> {
    // StoreRepositoryAdapterを直接返すのではなく、簡易実装を提供
    return {
      save: async (data: CutData) => {
        await this.unifiedStore.save(data.id, data);
        return data;
      },
      findById: async (id: string) => {
        return await this.unifiedStore.load(id) as CutData | null;
      },
      findAll: async () => {
        return this.unifiedStore.getAllReadModels() as CutData[];
      },
      delete: async (id: string) => {
        const data = await this.unifiedStore.load(id) as CutData | null;
        if (data) {
          const deleted = { ...data, isDeleted: true };
          await this.unifiedStore.save(id, deleted);
        }
      },
      update: async (data: CutData) => {
        await this.unifiedStore.save(data.id, data);
        return data;
      },
      exists: async (id: string) => {
        const data = await this.unifiedStore.load(id);
        return data !== null;
      }
    };
  }

  /**
   * イベントコーディネーターを取得
   */
  getEventCoordinator(): UnifiedEventCoordinator {
    return this.eventCoordinator;
  }


  /**
   * 統一状態管理を取得
   */
  getStateManager(): UnifiedStateManager {
    return this.stateManager;
  }

  /**
   * デバウンス同期マネージャーを取得
   */
  getSyncManager(): DebouncedSyncManager {
    return this.syncManager;
  }

  /**
   * リアルタイム同期サービスを取得
   */
  getRealtimeSyncService(): RealtimeSyncService {
    return this.realtimeSyncService;
  }

  /**
   * UI カスタマイズサービスを取得
   */
  getUICustomizationService(): KintoneUICustomizationService {
    return this.uiCustomizationService;
  }

  /**
   * UI カスタマイズを有効/無効にする
   */
  toggleUICustomization(enabled: boolean): void {
    sharedUICustomizationSettings.enabled = enabled;
    
    if (enabled) {
      this.uiCustomizationService.initialize();
    } else {
      this.uiCustomizationService.destroy();
    }
  }

  /**
   * グローバルナビゲーション非表示を切り替える
   */
  toggleGlobalNavigation(hide: boolean): void {
    sharedUICustomizationSettings.hideGlobalNavigation = hide;
    
    if (sharedUICustomizationSettings.enabled) {
      this.uiCustomizationService.updateConfig({
        hideGlobalNavigation: hide
      });
    }
  }

  /**
   * アクションメニュー非表示を切り替える
   */
  toggleActionMenu(hide: boolean): void {
    sharedUICustomizationSettings.hideActionMenu = hide;
    
    if (sharedUICustomizationSettings.enabled) {
      this.uiCustomizationService.updateConfig({
        hideActionMenu: hide
      });
    }
  }
  

  /**
   * リポジトリから全データを同期
   */
  async syncReadModels(): Promise<void> {
    // console.log('[ApplicationFacade] syncReadModels: Starting sync...');
    
    // ReadModelを同期
    await this.eventCoordinator.syncReadModels();
    
  }

  /**
   * サービスの初期化
   */
  private initializeServices(): void {
    // デフォルトサービスは既に登録済み

    // デバッグ: 登録されたサービスを確認
    console.log('[ApplicationFacade] Services initialized:', this.getServiceStatistics());
  }

  /**
   * ストアを取得
   */
  private getStore(): UnifiedDataStore {
    return this.unifiedStore;
  }

  /**
   * カットを削除（論理削除）
   */
  public async deleteCut(cutId: string): Promise<void> {
    return this.coreService.deleteCut(cutId);
  }




  /**
   * セルメモ取得の統一インターフェース
   */
  public async getCellMemo(cutNumber: string, fieldKey: string): Promise<string | undefined> {
    
    // UnifiedDataStoreから直接メモを取得（Phase B改善）
    const memo = ErrorHandler.wrap(
      () => {
        return this.unifiedStore.getMemo(cutNumber, fieldKey);
      },
      'ApplicationFacade.getCellMemo',
      undefined
    );
    
    if (memo) {
      return memo;
    }
    
    // フォールバック: localStorageから直接取得
    const memoKey = `memo:${cutNumber}:${fieldKey}`;
    if (StorageHelper.isAvailable()) {
      const memoData = StorageHelper.loadRaw(memoKey, '');
      if (memoData) {
        return ErrorHandler.parseJSON(memoData, memoData);
      }
    }
    
    return undefined;
  }

  /**
   * セルメモ更新の統一インターフェース
   */
  public async updateCellMemo(cutNumber: string, fieldKey: string, content: string): Promise<void> {
    return this.coreService.updateCellMemo(cutNumber, fieldKey, content);
  }

  /**
   * IDでカットを取得
   */
  public async getCutById(id: string): Promise<CutData | null> {
    return this.coreService.getCutById(id);
  }

  /**
   * サービス使用統計を取得（デバッグ用）
   */
  public getServiceStatistics() {
    return {
      registeredServices: this.services.size,
      registeredFactories: this.factories.size,
      registeredSingletons: this.singletons.size,
      services: Array.from(this.services.keys()),
      factories: Array.from(this.factories.keys()),
      singletons: Array.from(this.singletons.keys())
    };
  }

  // =====================================
  // IDataAccessFacade実装
  // =====================================

  /**
   * カットデータを更新 (IDataAccessFacade実装)
   */
  public async updateCut(id: string, data: Partial<CutData>): Promise<void> {
    return this.coreService.updateCut(id, data);
  }

  /**
   * カットを作成 (IDataAccessFacade実装)
   */
  public async createCut(data: Partial<CutData>): Promise<CutData> {
    return this.coreService.createCut(data);
  }

  /**
   * すべてのカットデータを取得
   */
  public getAllCuts(options?: FilterOptions): CutData[] {
    return this.coreService.getAllCuts(options);
  }

  /**
   * すべてのReadModelを取得
   */
  public getAllReadModels(): CutReadModel[] {
    return this.getUnifiedStore().getAllReadModels();
  }

  /**
   * カット取得（同期）
   */
  public getCut(id: string): CutData | null {
    return this.coreService.getCut(id);
  }


  /**
   * 特定のReadModelを取得
   */
  public getReadModel(id: string): CutReadModel | null {
    const store = this.getUnifiedStore();
    const cuts = store.getAllReadModels();
    return cuts.find(cut => cut.id === id) || null;
  }

  /**
   * 統計情報を取得
   */
  public getStatistics(): DataAccessStatistics {
    const store = this.getUnifiedStore();
    const cuts = store.getAllReadModels();
    const activeCuts = cuts.filter(cut => !cut.isDeleted);
    const deletedCuts = cuts.filter(cut => cut.isDeleted);

    return {
      totalCuts: cuts.length,
      activeCuts: activeCuts.length,
      deletedCuts: deletedCuts.length,
      lastUpdated: new Date(),
      cacheHitRate: 0
    };
  }

  /**
   * データを同期
   */
  public async syncData(): Promise<void> {
    await this.syncReadModels();
  }

  /**
   * キャッシュをクリア
   */
  public clearCache(): void {
    // UnifiedDataStoreのキャッシュクリア機能があれば呼び出す
    // 現在の実装では必要なし
  }

  /**
   * データ変更の購読
   */
  public subscribe(callback: (event: DataChangeEvent) => void): () => void {
    const dispatcher = this.getEventDispatcher();
    
    // イベントハンドラーをラップ
    const handler = (event: DomainEvent) => {
      let changeEvent: DataChangeEvent;
      
      const eventData = event.getEventData();
      
      if (event.eventType === 'CUT_CREATED') {
        changeEvent = {
          type: 'created',
          cutId: eventData?.id as string | undefined,
          data: eventData as unknown as CutData | undefined,
          timestamp: new Date()
        };
      } else if (event.eventType === 'CUT_UPDATED') {
        changeEvent = {
          type: 'updated',
          cutId: eventData?.id as string | undefined,
          data: eventData as unknown as CutData | undefined,
          timestamp: new Date()
        };
      } else if (event.eventType === 'CUT_DELETED') {
        changeEvent = {
          type: 'deleted',
          cutId: eventData?.id as string | undefined,
          timestamp: new Date()
        };
      } else if (event.eventType === 'DATA_SYNCED') {
        changeEvent = {
          type: 'synced',
          timestamp: new Date()
        };
      } else {
        return; // 関係ないイベントは無視
      }
      
      callback(changeEvent);
    };
    
    // イベント購読
    dispatcher.subscribe('CUT_CREATED', handler);
    dispatcher.subscribe('CUT_UPDATED', handler);
    dispatcher.subscribe('CUT_DELETED', handler);
    dispatcher.subscribe('DATA_SYNCED', handler);
    
    // unsubscribe関数を返す
    return () => {
      dispatcher.unsubscribe('CUT_CREATED', handler);
      dispatcher.unsubscribe('CUT_UPDATED', handler);
      dispatcher.unsubscribe('CUT_DELETED', handler);
      dispatcher.unsubscribe('DATA_SYNCED', handler);
    };
  }


  // ========================================
  // プロジェクト設定管理
  // ========================================

  /**
   * プロジェクト設定を読み込み
   */
  private loadProjectSettings(): void {
    try {
      const adapter = this.unifiedStore.getStorageAdapter();

      // 同期的に読み込み（起動時のみ）
      const stored = ErrorHandler.wrap(
        () => {
          // LocalStorageから直接読み込み（同期処理）
          const key = 'unified_store_project_settings';
          const item = localStorage.getItem(key);
          if (!item) return null;

          const parsed = JSON.parse(item);
          return parsed.data || parsed;
        },
        'ApplicationFacade.loadProjectSettings',
        null
      );

      if (stored && typeof stored === 'object' && 'projectStartDate' in stored && 'projectEndDate' in stored) {
        const settings = stored as ProjectSettings;

        // バリデーション
        if (validateProjectSettings(settings)) {
          this.projectSettings = settings;
          console.log('[ApplicationFacade] Project settings loaded:', settings);
          return;
        }
      }

      // デフォルト値を使用
      this.projectSettings = createDefaultProjectSettings();
      console.log('[ApplicationFacade] Using default project settings:', this.projectSettings);

      // デフォルト値を保存（非同期）
      this.saveProjectSettingsToStorage(this.projectSettings);

    } catch (error) {
      ErrorHandler.handle(error, 'ApplicationFacade.loadProjectSettings', {
        logLevel: 'error'
      });

      // エラー時はデフォルト値を使用
      this.projectSettings = createDefaultProjectSettings();
    }
  }

  /**
   * プロジェクト設定をストレージに保存（内部用）
   */
  private async saveProjectSettingsToStorage(settings: ProjectSettings): Promise<void> {
    try {
      const adapter = this.unifiedStore.getStorageAdapter();
      await adapter.set('project_settings', settings);
    } catch (error) {
      ErrorHandler.handle(error, 'ApplicationFacade.saveProjectSettingsToStorage', {
        logLevel: 'error'
      });
    }
  }

  /**
   * プロジェクト設定を取得
   *
   * @returns プロジェクト設定（ディープコピー）
   */
  public getProjectSettings(): ProjectSettings {
    if (!this.projectSettings) {
      // 初期化されていない場合はデフォルト値を返す
      this.projectSettings = createDefaultProjectSettings();
    }
    return { ...this.projectSettings }; // ディープコピーして返す
  }

  /**
   * プロジェクト設定を更新
   *
   * @param settings 新しいプロジェクト設定
   * @throws バリデーションエラー
   */
  public async updateProjectSettings(settings: ProjectSettings): Promise<void> {
    try {
      // バリデーション
      if (!validateProjectSettings(settings)) {
        throw new Error('Invalid project settings: start date must be before or equal to end date');
      }

      // メモリを更新
      this.projectSettings = { ...settings };

      // LocalStorageに保存
      await this.saveProjectSettingsToStorage(settings);

      console.log('[ApplicationFacade] Project settings updated:', settings);

    } catch (error) {
      ErrorHandler.handle(error, 'ApplicationFacade.updateProjectSettings', {
        rethrow: true,
        logLevel: 'error'
      });
    }
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    this.syncManager.cleanup();
    this.eventCoordinator.cleanup();

    // サービスをクリア
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }

  /**
   * 静的ファクトリメソッド
   */
  static create(config?: ApplicationFacadeConfig): ApplicationFacade {
    return new ApplicationFacade(config);
  }
}