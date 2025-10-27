import { LoggerFactory } from '../../utils/Logger';
import { perfMonitor } from '../../utils/PerformanceMonitor';
import { DataProcessor } from '../../ui/shared/utils/DataProcessor';

/**
 * 同期タスクの優先度
 */
export enum SyncPriority {
  HIGH = 0,    // UI更新など、即座に反映が必要なもの
  MEDIUM = 1,  // 通常の同期処理
  LOW = 2      // バックグラウンド同期など、遅延してもよいもの
}

/**
 * 同期タスク
 */
export interface SyncTask {
  id: string;
  priority: SyncPriority;
  aggregateIds: Set<string>;
  callback: () => Promise<void>;
  createdAt: number;
}

/**
 * デバウンス設定
 */
export interface DebounceConfig {
  [SyncPriority.HIGH]: number;    // デフォルト: 50ms
  [SyncPriority.MEDIUM]: number;  // デフォルト: 500ms
  [SyncPriority.LOW]: number;     // デフォルト: 2000ms
}

/**
 * デバウンス同期マネージャー
 * すべてのデバウンス処理を一元管理
 */
export class DebouncedSyncManager {
  private logger = LoggerFactory.create('DebouncedSyncManager');
  private syncQueues: Map<SyncPriority, SyncTask[]> = new Map();
  private timers: Map<SyncPriority, NodeJS.Timeout | null> = new Map();
  private isProcessing: Map<SyncPriority, boolean> = new Map();
  private config: DebounceConfig;
  private pendingAggregates: Map<string, Set<string>> = new Map(); // taskId -> aggregateIds

  constructor(config?: Partial<DebounceConfig>) {
    // デフォルト設定
    this.config = {
      [SyncPriority.HIGH]: 50,
      [SyncPriority.MEDIUM]: 500,
      [SyncPriority.LOW]: 2000,
      ...config
    };

    // 各優先度のキューを初期化
    for (const priority of [SyncPriority.HIGH, SyncPriority.MEDIUM, SyncPriority.LOW]) {
      this.syncQueues.set(priority, []);
      this.timers.set(priority, null);
      this.isProcessing.set(priority, false);
    }
  }

  /**
   * 同期タスクをスケジュール
   */
  scheduleSyncTask(
    taskId: string,
    aggregateIds: string[],
    callback: () => Promise<void>,
    priority: SyncPriority = SyncPriority.MEDIUM
  ): void {
    const aggregateIdSet = new Set(aggregateIds);
    
    // 既存のタスクがある場合は、aggregateIdsをマージ
    const existingAggregates = this.pendingAggregates.get(taskId);
    if (existingAggregates) {
      aggregateIds.forEach(id => existingAggregates.add(id));
      this.logger.debug('Merged sync task', {
        taskId,
        priority,
        totalAggregates: existingAggregates.size
      });
      return;
    }

    // 新しいタスクを作成
    const task: SyncTask = {
      id: taskId,
      priority,
      aggregateIds: aggregateIdSet,
      callback,
      createdAt: Date.now()
    };

    // キューに追加
    const queue = this.syncQueues.get(priority)!;
    queue.push(task);
    this.pendingAggregates.set(taskId, aggregateIdSet);

    this.logger.debug('Sync task scheduled', {
      taskId,
      priority,
      aggregateCount: aggregateIdSet.size,
      delay: this.config[priority]
    });

    // デバウンス処理をスケジュール
    this.scheduleDebounce(priority);
  }

  /**
   * デバウンス処理をスケジュール
   */
  private scheduleDebounce(priority: SyncPriority): void {
    const existingTimer = this.timers.get(priority);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const delay = this.config[priority];
    const timer = setTimeout(() => {
      this.processSyncQueue(priority);
    }, delay);

    this.timers.set(priority, timer);
  }

  /**
   * 同期キューを処理
   */
  private async processSyncQueue(priority: SyncPriority): Promise<void> {
    if (this.isProcessing.get(priority)) {
      this.logger.debug('Queue already processing', { priority });
      return;
    }

    const queue = this.syncQueues.get(priority)!;
    if (DataProcessor.isEmpty(queue)) return;

    const operationId = `sync_queue_${priority}_${Date.now()}`;
    perfMonitor.startOperation(operationId, `SyncQueue:${SyncPriority[priority]}`, {
      priority,
      taskCount: queue.length
    });

    this.isProcessing.set(priority, true);
    const tasks = [...queue];
    queue.length = 0; // キューをクリア

    try {
      // 高優先度タスクは並列実行、それ以外は順次実行
      if (priority === SyncPriority.HIGH) {
        await Promise.all(tasks.map(task => this.executeTask(task)));
      } else {
        for (const task of tasks) {
          await this.executeTask(task);
        }
      }

      this.logger.info('Sync queue processed', {
        priority: SyncPriority[priority],
        taskCount: tasks.length
      });
    } catch (error) {
      this.logger.error('Sync queue processing failed', error as Error, {
        priority: SyncPriority[priority]
      });
    } finally {
      this.isProcessing.set(priority, false);
      perfMonitor.endOperation(operationId);
    }
  }

  /**
   * タスクを実行
   */
  private async executeTask(task: SyncTask): Promise<void> {
    const operationId = `sync_task_${task.id}_${Date.now()}`;
    perfMonitor.startOperation(operationId, `SyncTask:${task.id}`, {
      priority: task.priority,
      aggregateCount: task.aggregateIds.size
    });

    try {
      await task.callback();
      this.pendingAggregates.delete(task.id);
      
      this.logger.debug('Sync task executed', {
        taskId: task.id,
        duration: Date.now() - task.createdAt
      });
    } catch (error) {
      this.logger.error('Sync task failed', error as Error, {
        taskId: task.id
      });
      throw error;
    } finally {
      perfMonitor.endOperation(operationId);
    }
  }

  /**
   * 特定の優先度のキューを即座に実行
   */
  async flushQueue(priority?: SyncPriority): Promise<void> {
    if (priority !== undefined) {
      const timer = this.timers.get(priority);
      if (timer) {
        clearTimeout(timer);
        this.timers.set(priority, null);
      }
      await this.processSyncQueue(priority);
    } else {
      // すべての優先度のキューを実行
      for (const p of [SyncPriority.HIGH, SyncPriority.MEDIUM, SyncPriority.LOW]) {
        await this.flushQueue(p);
      }
    }
  }

  /**
   * 保留中のタスク数を取得
   */
  getPendingTaskCount(priority?: SyncPriority): number {
    if (priority !== undefined) {
      return this.syncQueues.get(priority)?.length || 0;
    }
    
    let total = 0;
    this.syncQueues.forEach(queue => {
      total += queue.length;
    });
    return total;
  }

  /**
   * 特定のタスクIDがキューに存在するか確認
   */
  hasTask(taskId: string): boolean {
    return this.pendingAggregates.has(taskId);
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<DebounceConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Config updated', this.config);
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    // すべてのタイマーをクリア
    this.timers.forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    this.timers.clear();
    
    // キューをクリア
    this.syncQueues.forEach(queue => queue.length = 0);
    this.pendingAggregates.clear();
    
    this.logger.info('DebouncedSyncManager cleaned up');
  }
}