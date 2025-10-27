/**
 * 基底通知インターフェース
 */
export interface BaseNotification {
  type: string;
  aggregateIds?: string[];
  error?: Error;
}

/**
 * UI更新通知
 */
export interface UIUpdateNotification extends BaseNotification {
  type: 'data-changed' | 'error' | 'loading';
  aggregateId?: string;
}

/**
 * 状態変更通知
 */
export interface StateChangeNotification extends BaseNotification {
  type: 'state-changed' | 'error' | 'transaction-start' | 'transaction-complete';
}

/**
 * 統合通知型
 */
export type SystemNotification = UIUpdateNotification | StateChangeNotification;