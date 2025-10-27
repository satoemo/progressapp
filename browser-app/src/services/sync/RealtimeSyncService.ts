import { IKintoneApiClient } from '@/data/api/IKintoneApiClient';
import { DebouncedSyncManager, SyncPriority } from '../state/DebouncedSyncManager';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';

/**
 * リアルタイム同期サービス
 * データ変更時の同期処理を管理
 */
export class RealtimeSyncService {
  private static instance: RealtimeSyncService | null = null;
  private syncTimer: number | null = null;
  private pendingSync = false;
  private isEnabled = false;
  private onSyncStatusChange?: (status: SyncStatus) => void;
  private syncManager?: DebouncedSyncManager;
  
  private constructor() {
    this.isEnabled = false;
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): RealtimeSyncService {
    if (!RealtimeSyncService.instance) {
      RealtimeSyncService.instance = new RealtimeSyncService();
    }
    return RealtimeSyncService.instance;
  }

  /**
   * 手動で同期をトリガー（外部から呼び出し可能）
   */
  public triggerSync(): void {
    if (this.isEnabled) {
      this.triggerDebouncedSync();
    }
  }

  /**
   * DebouncedSyncManagerを設定
   */
  setSyncManager(syncManager: DebouncedSyncManager): void {
    this.syncManager = syncManager;
  }

  /**
   * デバウンス付き同期をトリガー
   */
  private triggerDebouncedSync(): void {
    if (!this.isEnabled) return;
    
    // DebouncedSyncManagerが設定されている場合はそちらを使用
    if (this.syncManager) {
      this.notifySyncStatus({ type: 'pending' });
      
      this.syncManager.scheduleSyncTask(
        'kintone-sync',
        [],  // aggregateIdsは現時点では使用しない
        () => this.performSync(),
        SyncPriority.MEDIUM
      );
      return;
    }
    
    // 従来のデバウンス処理（後方互換性のため保持）
    if (ValidationHelper.isDefined(this.syncTimer)) {
      clearTimeout(this.syncTimer as number);
    }
    
    this.notifySyncStatus({ type: 'pending' });
    
    this.syncTimer = window.setTimeout(() => {
      this.performSync();
    }, 500);
  }

  /**
   * 同期を実行
   */
  private async performSync(): Promise<void> {
    if (!this.isEnabled || this.pendingSync) return;
    
    this.pendingSync = true;
    this.notifySyncStatus({ type: 'syncing' });
    
    try {
      // KintoneEventStoreを使用している場合、既に同期されているため
      // ここでは同期成功を通知するのみ
      this.notifySyncStatus({ type: 'success' });
    } catch (error) {
      const errorMessage = ErrorHandler.handle(error, 'RealtimeSyncService.performSync', {
        logLevel: 'error',
        fallback: 'Unknown error'
      });
      this.notifySyncStatus({ 
        type: 'error', 
        error: errorMessage
      });
    } finally {
      this.pendingSync = false;
    }
  }

  /**
   * 同期状態の変更を通知
   */
  private notifySyncStatus(status: SyncStatus): void {
    if (this.onSyncStatusChange) {
      this.onSyncStatusChange(status);
    }
  }

  /**
   * 同期状態変更リスナーを設定
   */
  setSyncStatusListener(listener: (status: SyncStatus) => void): void {
    this.onSyncStatusChange = listener;
  }

  /**
   * 手動同期を実行
   */
  async syncNow(): Promise<void> {
    if (ValidationHelper.isDefined(this.syncTimer)) {
      clearTimeout(this.syncTimer as number);
      this.syncTimer = null;
    }
    await this.performSync();
  }

  /**
   * 同期を有効/無効化
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`RealtimeSyncService: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    if (ValidationHelper.isDefined(this.syncTimer)) {
      clearTimeout(this.syncTimer as number);
      this.syncTimer = null;
    }
    this.onSyncStatusChange = undefined;
  }
}

/**
 * 同期状態
 */
export type SyncStatus = 
  | { type: 'idle' }
  | { type: 'pending' }
  | { type: 'syncing' }
  | { type: 'success' }
  | { type: 'error'; error: string };