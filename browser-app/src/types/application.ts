/**
 * アプリケーション層の型定義
 * Phase 3: 型定義の集約
 */

import { CutData } from './cut';

// ================================================================================
// サービス設定
// ================================================================================

/**
 * UIカスタマイズ設定
 */
export interface UICustomizationConfig {
  hideNativeToolbar?: boolean;
  customStyles?: string;
  customScripts?: string[];
}

// ================================================================================
// 状態管理
// ================================================================================

/**
 * 同期タスク
 */
export interface SyncTask {
  id: string;
  type: string;
  payload: unknown;
  priority: SyncPriority;
}

/**
 * 同期優先度
 */
export enum SyncPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * デバウンス設定
 */
export interface DebounceConfig {
  delay: number;
  maxWait?: number;
  priority?: SyncPriority;
}

/**
 * トランザクション結果
 */
export interface TransactionResult {
  success: boolean;
  error?: Error;
  data?: unknown;
}

// ================================================================================
// 通知
// ================================================================================

/**
 * 通知タイプ
 */
export enum NotificationType {
  UI_UPDATE = 'UI_UPDATE',
  STATE_CHANGE = 'STATE_CHANGE',
  ERROR = 'ERROR',
  INFO = 'INFO'
}

/**
 * 基本通知
 */
export interface BaseNotification {
  type: NotificationType;
  timestamp: number;
  source?: string;
}

/**
 * UI更新通知
 */
export interface UIUpdateNotification extends BaseNotification {
  type: NotificationType.UI_UPDATE;
  targetElement?: string;
  action: string;
  data?: unknown;
}

/**
 * 状態変更通知
 */
export interface StateChangeNotification extends BaseNotification {
  type: NotificationType.STATE_CHANGE;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown>;
}

// ================================================================================
// イベント
// ================================================================================

/**
 * ドメインイベント基底インターフェース
 */
export interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  occurredAt: Date;
  version: number;
  getEventData(): unknown;
}

/**
 * カット作成イベント
 */
export interface CutCreatedEvent extends DomainEvent {
  eventType: 'CutCreated';
  getEventData(): {
    initialData: CutData;
  };
}

/**
 * カット更新イベント
 */
export interface CutUpdatedEvent extends DomainEvent {
  eventType: 'CutUpdated';
  getEventData(): {
    changes: Partial<CutData>;
    previousData?: Partial<CutData>;
  };
}

/**
 * カット削除イベント
 */
export interface CutDeletedEvent extends DomainEvent {
  eventType: 'CutDeleted';
  getEventData(): {
    deletedAt: Date;
    deletedBy?: string;
  };
}

// ================================================================================
// サービスインターフェース
// ================================================================================

/**
 * カットサービスインターフェース
 */
export interface ICutService {
  createCut(data: Partial<CutData>): Promise<CutData>;
  updateCut(id: string, changes: Partial<CutData>): Promise<CutData>;
  deleteCut(id: string): Promise<void>;
  getCutById(id: string): Promise<CutData | null>;
  getAllCuts(): Promise<CutData[]>;
}

/**
 * リアルタイム同期サービスインターフェース
 */
export interface IRealtimeSyncService {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  forceSync(): Promise<void>;
}

/**
 * ReadModel更新サービスインターフェース
 */
export interface IReadModelUpdateService {
  handleCutCreated(event: CutCreatedEvent): void;
  handleCutUpdated(event: CutUpdatedEvent): void;
  handleCutDeleted(event: CutDeletedEvent): void;
}

// ================================================================================
// ファサード
// ================================================================================

/**
 * ApplicationFacade戻り値型
 */
export interface FacadeResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * 一括更新パラメータ
 */
export interface BulkUpdateParams {
  cuts: Array<{
    id: string;
    changes: Partial<CutData>;
  }>;
}

/**
 * 検索パラメータ
 */
export interface SearchParams {
  query: string;
  fields?: string[];
  limit?: number;
  offset?: number;
}