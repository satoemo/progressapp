/**
 * サービス層の型定義
 */

import { CutData, CutCreateData, CutUpdateData } from './cut';
import { ValidationResult } from './repository';


/**
 * カットサービスインターフェース
 */
export interface ICutService {
  // 作成
  create(data: CutCreateData): Promise<ServiceResponse<CutData>>;
  
  // 読み取り
  findById(id: string): Promise<CutData | null>;
  findAll(filter?: unknown): Promise<CutData[]>;
  
  // 更新
  update(id: string, data: CutUpdateData): Promise<ServiceResponse<CutData>>;
  updateProgress(id: string, field: string, value: string): Promise<ServiceResponse<CutData>>;
  updateCost(id: string, costData: CostUpdateData): Promise<ServiceResponse<CutData>>;
  updateBasicInfo(id: string, basicData: BasicInfoUpdateData): Promise<ServiceResponse<CutData>>;
  updateKenyo(id: string, kenyoIds: string[]): Promise<ServiceResponse<CutData[]>>;
  
  // 削除
  delete(id: string): Promise<ServiceResponse<void>>;
  
  // ユーティリティ
  exists(id: string): Promise<boolean>;
  validate(data: CutCreateData | CutUpdateData): ValidationResult;
}

/**
 * 削除サービスインターフェース
 */
export interface IDeletionService {
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
}

/**
 * サービスレスポンス
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: Record<string, unknown>;
}

/**
 * サービスエラー
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}


/**
 * バリデーションエラー
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * コスト更新データ
 */
export interface CostUpdateData {
  loCost?: string;
  genCost?: string;
  dougaCost?: string;
  doukenCost?: string;
  shiageCost?: string;
  [key: string]: string | undefined;
}

/**
 * 基本情報更新データ
 */
export interface BasicInfoUpdateData {
  special?: string;
  kenyo?: string;
  maisu?: string;
  manager?: string;
  ensyutsu?: string;
  sousakkan?: string;
  [key: string]: string | undefined;
}

/**
 * サービス設定
 */
export interface ServiceConfig {
  enableCache?: boolean;
  cacheSize?: number;
  enableValidation?: boolean;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

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
 * イベントリスナー
 */
export type EventListener = (event: DomainEvent) => void | Promise<void>;

/**
 * ドメインイベント
 */
export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  eventData: unknown;
  timestamp: number;
  userId?: string;
}

/**
 * 同期状態
 */
export interface SyncState {
  isSyncing: boolean;
  lastSyncAt?: Date;
  pendingChanges: number;
  error?: Error;
}