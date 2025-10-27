import { UnifiedDataStore } from '../../data/UnifiedDataStore';
import { EventDispatcher } from '../../core/EventDispatcher';
import { LoggerFactory } from '../../utils/Logger';
import { perfMonitor } from '../../utils/PerformanceMonitor';
import { ReadModelUpdateService } from '../sync/ReadModelUpdateService';
import { StateChangeNotification } from '../../models/types';
import { ApplicationFacade } from '../../core/ApplicationFacade';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { DataProcessor } from '../../ui/shared/utils/DataProcessor';
import { DomainEvent } from '../../domain/events/DomainEvent';
import { ICutRepository } from '@/types/repository';
import { IMemoRepository } from '../../data/IMemoRepository';

/**
 * トランザクション結果
 */
export interface TransactionResult {
  success: boolean;
  events?: DomainEvent[];
  error?: Error;
}

/**
 * 統一状態管理クラス
 * イベントソーシングとReadModelの状態を一元的に管理
 */
export class UnifiedStateManager {
  private logger = LoggerFactory.create('UnifiedStateManager');
  private subscribers: Set<(notification: StateChangeNotification) => void> = new Set();
  private isTransactionInProgress = false;
  private pendingEvents: DomainEvent[] = [];
  private readModelUpdateService: ReadModelUpdateService;

  constructor(
    private readonly _unifiedStore: UnifiedDataStore,
    private readonly repository: ICutRepository | null,
    private readonly eventDispatcher: EventDispatcher,
    private readonly _memoRepository?: IMemoRepository | null
  ) {
    this.readModelUpdateService = new ReadModelUpdateService(
      this._unifiedStore,
      repository,
      this._memoRepository,
      this.logger
    );
  }


  /**
   * イベントを追加（トランザクション内で使用）
   */
  addEvent(event: DomainEvent): void {
    this.pendingEvents.push(event);
    this.logger.debug('Event added to pending queue', { 
      eventType: event.eventType,
      aggregateId: event.aggregateId 
    });
  }

  /**
   * 保留中のイベントを処理
   */
  private async processPendingEvents(): Promise<void> {
    if (DataProcessor.isEmpty(this.pendingEvents)) return;
    
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    
    const result = await this.executeTransaction(events);
    if (!result.success) {
      this.logger.error('Transaction failed', result.error);
      throw result.error;
    }
  }

  /**
   * トランザクション実行
   * イベント保存とReadModel更新を原子的に実行
   */
  async executeTransaction(events: DomainEvent[]): Promise<TransactionResult> {
    if (this.isTransactionInProgress) {
      const error = new Error('Transaction already in progress');
      this.logger.error('Concurrent transaction attempt', error);
      return { success: false, error };
    }

    const operationId = `transaction_${Date.now()}`;
    perfMonitor.startOperation(operationId, 'StateTransaction', {
      eventCount: events.length
    });

    this.isTransactionInProgress = true;
    this.notifySubscribers({ type: 'transaction-start' });

    try {
      // ReadModelを更新
      const affectedAggregateIds = new Set<string>();
      for (const event of events) {
        affectedAggregateIds.add(event.aggregateId);
        await this.readModelUpdateService.updateReadModel(event);
      }

      // Phase 3: イベントをディスパッチ
      for (const event of events) {
        await this.eventDispatcher.dispatch(event);
      }

      this.logger.info('Transaction completed successfully', {
        eventCount: events.length,
        aggregateIds: Array.from(affectedAggregateIds)
      });

      this.notifySubscribers({
        type: 'transaction-complete',
        aggregateIds: Array.from(affectedAggregateIds)
      });

      return { success: true, events };
    } catch (error) {
      ErrorHandler.handle(error, 'UnifiedStateManager.transaction', {
        logLevel: 'error',
        metadata: { eventCount: events.length }
      });

      // ロールバック（実装は簡略化）
      // 実際のプロダクションでは、より高度なロールバック機構が必要
      
      this.notifySubscribers({
        type: 'error',
        error: error as Error
      });

      return { success: false, error: error as Error };
    } finally {
      this.isTransactionInProgress = false;
      perfMonitor.endOperation(operationId);
    }
  }

  /**
   * 状態変更を購読
   */
  subscribe(callback: (notification: StateChangeNotification) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * 購読者に通知
   */
  private notifySubscribers(notification: StateChangeNotification): void {
    this.subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        ErrorHandler.handle(error, 'UnifiedStateManager.notifySubscribers', {
          logLevel: 'error'
        });
      }
    });
  }

  /**
   * 全ReadModelを同期
   */
  async syncAllReadModels(): Promise<void> {
    const operationId = `sync_all_${Date.now()}`;
    perfMonitor.startOperation(operationId, 'SyncAllReadModels');

    try {
      if (!this.repository) {
        throw new Error('Repository is not available');
      }
      const allCuts = await this.repository.findAll();
      
      // UnifiedDataStoreを取得
      const store = ApplicationFacade.getInstance().getUnifiedStore();
      store.clearReadModels();
      
      for (const cut of allCuts) {
        store.updateReadModel(cut.id, cut);
      }
      
      this.logger.info(`All read models synced: ${allCuts.length}`);
      
      this.notifySubscribers({
        type: 'state-changed',
        aggregateIds: allCuts.map(cut => cut.id)
      });
    } catch (error) {
      ErrorHandler.handle(error, 'UnifiedStateManager.syncReadModels', {
        logLevel: 'error'
      });
      throw error;
    } finally {
      perfMonitor.endOperation(operationId);
    }
  }

  /**
   * 現在のトランザクション状態を取得
   */
  isInTransaction(): boolean {
    return this.isTransactionInProgress;
  }

  /**
   * 保留中のイベント数を取得
   */
  getPendingEventCount(): number {
    return this.pendingEvents.length;
  }
}