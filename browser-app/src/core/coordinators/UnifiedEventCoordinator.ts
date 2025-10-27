import { UnifiedDataStore } from '@/data/UnifiedDataStore';
import { EventDispatcher } from '../EventDispatcher';
import { ApplicationFacade } from '../ApplicationFacade';
import { perfMonitor } from '@/utils/PerformanceMonitor';
import { ReadModelUpdateService } from '@/services/sync/ReadModelUpdateService';
import { LoggerFactory } from '@/utils/Logger';
import { DebouncedSyncManager, SyncPriority } from '@/services/state/DebouncedSyncManager';
import { UIUpdateNotification } from '../types/notifications';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { DataProcessor } from '@/ui/shared/utils/DataProcessor';
import { DomainEvent } from '@/models/events/DomainEvent';
import { IRepository } from '@/types/repository';
import { IMemoRepository } from '@/data/IMemoRepository';

/**
 * 統一イベントコーディネーター
 * イベント処理の重複を防ぎ、一元的にイベントを管理する
 * Martin Fowlerの「Event Aggregator」パターンとKent Beckの「Coordinator」パターンを組み合わせた実装
 */
interface CutDataWrapper {
  getData(): any;
}

interface ExtendedRepository<T> extends IRepository<T> {
  findAll(): Promise<T[]>;
}

export class UnifiedEventCoordinator {
  private uiSubscribers: Set<(notification: UIUpdateNotification) => void> = new Set();
  private eventQueue: DomainEvent[] = [];
  private isProcessing = false;
  private debouncedSyncManager: DebouncedSyncManager;
  private isInitialized = false;
  private readModelUpdateService: ReadModelUpdateService;
  private logger = LoggerFactory.create('UnifiedEventCoordinator');

  constructor(
    private eventDispatcher: EventDispatcher,
    private unifiedStore: UnifiedDataStore,
    private repository: ExtendedRepository<CutDataWrapper> | null,
    private _memoRepository?: IMemoRepository | null
  ) {
    this.readModelUpdateService = new ReadModelUpdateService(
      unifiedStore,
      repository,
      this._memoRepository || null,
      this.logger
    );
    this.debouncedSyncManager = new DebouncedSyncManager();
  }

  /**
   * 初期化
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // 単一のイベント購読ポイント
    this.eventDispatcher.subscribeToAll(this.handleEvent.bind(this));
    this.isInitialized = true;
  }

  /**
   * ドメインイベントを処理
   */
  private async handleEvent(event: DomainEvent): Promise<void> {
    // パフォーマンスモニタリング
    const operationId = `handleEvent-${event.eventType}-${Date.now()}`;
    perfMonitor.startOperation(operationId, 'handleEvent', { 
      eventType: event.eventType, 
      aggregateId: event.aggregateId 
    });
    
    try {
      // CutCreatedイベントは即座に処理（ReadModelを早く更新するため）
      if (event.eventType === 'CutCreated') {
        await this.readModelUpdateService.updateReadModel(event);
        
        // UI層に通知
        const notification: DomainEvent = {
          eventType: 'DataChanged',
          aggregateId: event.aggregateId,
          occurredAt: new Date(),
          aggregateVersion: 0
        };
        await this.eventDispatcher.dispatch(notification);
      } else {
        // その他のイベントはキューに追加
        this.eventQueue.push(event);
        
        // DebouncedSyncManagerを使用してデバウンス処理
        this.debouncedSyncManager.scheduleSyncTask(
          'event-queue-processing',
          [event.aggregateId],
          () => this.processEventQueue(),
          SyncPriority.HIGH
        );
      }
    } finally {
      perfMonitor.endOperation(operationId);
    }
  }

  /**
   * イベントキューを処理
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || DataProcessor.isEmpty(this.eventQueue)) return;
    
    const operationId = `processEventQueue-${Date.now()}`;
    perfMonitor.startOperation(operationId, 'processEventQueue', {
      queueSize: this.eventQueue.length
    });
    
    this.isProcessing = true;
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      // バッチ処理でReadModelを更新
      for (const event of events) {
        await this.readModelUpdateService.updateReadModel(event);
      }
      
      // UI層に通知（一度だけ）
      this.notifyUI({ type: 'data-changed' });
    } catch (error) {
      ErrorHandler.handle(error, 'UnifiedEventCoordinator.processEventQueue', {
        logLevel: 'error'
      });
      this.notifyUI({ type: 'error', error: error as Error });
    } finally {
      this.isProcessing = false;
      perfMonitor.endOperation(operationId);
    }
  }

  /**
   * UIアップデートを購読
   */
  public subscribeToUIUpdates(callback: (notification: UIUpdateNotification) => void): () => void {
    this.uiSubscribers.add(callback);
    return () => this.uiSubscribers.delete(callback);
  }

  /**
   * UI層に通知
   */
  private notifyUI(notification: UIUpdateNotification): void {
    this.uiSubscribers.forEach(callback => callback(notification));
  }

  /**
   * リポジトリから全データを同期
   */
  async syncReadModels(): Promise<void> {
    try {
      console.error('[UnifiedEventCoordinator] ========== SYNC READ MODELS START ==========');
      
      const beforeCount = this.unifiedStore.getAllReadModels().length;
      console.error(`[UnifiedEventCoordinator] UnifiedDataStore has ${beforeCount} cuts before sync`);
      
      // repositoryがnullの場合はApplicationFacadeから取得
      let allCuts: CutDataWrapper[] = [];
      if (this.repository) {
        allCuts = await this.repository.findAll();
      } else {
        // ApplicationFacadeから**Storeを直接使用**（CutServiceではなく）
        // CutServiceを使うと循環参照になる
        try {
          const facade = ApplicationFacade.getInstance();
          
          // ApplicationFacadeのストアを取得
          const store = facade.getUnifiedStore();
          if (store) {
            console.error('[UnifiedEventCoordinator] Using Store directly to avoid circular reference');
            const loadedData = await store.loadAll();
            // UnifiedDataStoreはMapを返すが、配列として扱う必要がある
            if (loadedData instanceof Map) {
              allCuts = Array.from(loadedData.values());
            } else if (Array.isArray(loadedData)) {
              allCuts = loadedData;
            } else {
              allCuts = [];
            }
          } else {
            console.error('[UnifiedEventCoordinator] Failed to get Store from ApplicationFacade');
          }
        } catch (error) {
          ErrorHandler.handle(error, 'UnifiedEventCoordinator.setupConnectionWithUnifiedDataStore', {
            logLevel: 'error',
            customMessage: '[UnifiedEventCoordinator] Error getting Store from ApplicationFacade'
          });
        }
      }
      console.error(`[UnifiedEventCoordinator] Retrieved ${allCuts.length} cuts from Store`);
      
      // リポジトリからデータが取得できた場合のみクリア
      if (allCuts.length > 0) {
        await this.unifiedStore.clear();
        
        // Phase B: UnifiedDataStoreが自身でデータを管理するため、SimplifiedReadModelへの同期は不要
        // UnifiedDataStoreのupsertメソッドが内部でsaveとupdateReadModelを実行
        for (const cut of allCuts) {
          // repositoryの場合はgetData()、Storeの場合は直接データ
          const cutData = this.repository ? cut.getData() : cut;
          // UnifiedDataStoreのupsertメソッドを使用（SimplifiedReadModel互換）
          this.unifiedStore.upsert(cutData);
        }
        console.log(`[UnifiedEventCoordinator] Updated UnifiedStore with ${allCuts.length} cuts`);
      } else {
        // console.log('[UnifiedEventCoordinator] syncReadModels: Repository is empty, keeping existing UnifiedStore data');
      }
      
      // console.log(`[UnifiedEventCoordinator] syncReadModels: UnifiedDataStore has cuts after sync`);
    } catch (error) {
      ErrorHandler.handle(error, 'UnifiedEventCoordinator.syncReadModels', {
        logLevel: 'error'
      });
      throw error;
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    // DebouncedSyncManagerのクリーンアップは自動的に行われる
    this.isInitialized = false;
  }
}