/**
 * インフラストラクチャ層の型定義
 */

import { CutData } from './cut';
import { ICutRepository } from './repository';
import { IMemoRepository, MemoData } from '../data/IMemoRepository';

// ================================================================================
// Repository関連（repository.tsとIMemoRepository.tsに移動済み）
// ================================================================================

// ICutRepositoryとIMemoRepositoryは各ファイルからインポート
export type { ICutRepository } from './repository';
export type { IMemoRepository, MemoData } from '../data/IMemoRepository';

// ================================================================================
// ReadModel関連
// ================================================================================

/**
 * カット読み取りモデル
 */
export interface CutReadModel extends CutData {
  // 計算済みフィールド
  completionRate: number;
  totalCost: number;
  progressSummary: {
    completed: number;
    notRequired: number;
    inProgress: number;
    notStarted: number;
  };
}

/**
 * メモ読み取りモデル
 */
export interface MemoReadModel {
  getMemos(): Record<string, string>;
  getMemo(cutNumber: string, fieldKey: string): string | null;
  setMemo(cutNumber: string, fieldKey: string, content: string): void;
}

// ================================================================================
// Storage関連
// ================================================================================

/**
 * ストレージアダプタインターフェース
 */
export interface IStorageAdapter {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * UnifiedDataStore設定
 */
export interface UnifiedDataStoreConfig {
  storageAdapter?: IStorageAdapter;
  cacheSize?: number;
  snapshotFrequency?: number;
}

// ================================================================================
// API関連
// ================================================================================

/**
 * Kintoneフィールド値
 */
export interface KintoneFieldValue {
  value: string | number | null;
}

/**
 * Kintoneレコード
 */
export interface KintoneRecord {
  [fieldCode: string]: KintoneFieldValue;
}

/**
 * KintoneAPIクライアントインターフェース
 */
export interface IKintoneApiClient {
  getRecord(appId: string, recordId: string): Promise<KintoneRecord>;
  getRecords(appId: string, query?: string): Promise<KintoneRecord[]>;
  addRecord(appId: string, record: Partial<KintoneRecord>): Promise<string>;
  updateRecord(appId: string, recordId: string, record: Partial<KintoneRecord>): Promise<void>;
  deleteRecords(appId: string, recordIds: string[]): Promise<void>;
}

// ================================================================================
// ログ・モニタリング関連
// ================================================================================

/**
 * ログエントリ
 */
export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * ログレベル
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * 集約メトリクス
 */
export interface AggregatedMetrics {
  operation: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
}