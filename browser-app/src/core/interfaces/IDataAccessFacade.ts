/**
 * データアクセスファサードインターフェース
 * 
 * UI層がデータアクセスを行うための統一インターフェース。
 * UnifiedDataStoreへの直接アクセスを防ぎ、ApplicationFacade経由でのアクセスを強制する。
 */

import { CutData } from '@/models/types';
import { CutReadModel } from '@/data/models/CutReadModel';

/**
 * 統計情報インターフェース
 */
export interface DataAccessStatistics {
  totalCuts: number;
  activeCuts: number;
  deletedCuts: number;
  lastUpdated: Date | null;
  cacheHitRate?: number;
}

/**
 * フィルタオプション
 */
export interface FilterOptions {
  includeDeleted?: boolean;
  filterBy?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * データアクセスファサード
 * 
 * UI層がデータ操作を行うための統一されたインターフェース。
 * すべてのデータアクセスはこのインターフェースを通じて行う。
 */
export interface IDataAccessFacade {
  /**
   * すべてのカットデータを取得
   */
  getAllCuts(options?: FilterOptions): CutData[];
  
  /**
   * すべてのReadModelを取得
   */
  getAllReadModels(): CutReadModel[];
  
  /**
   * 特定のカットデータを取得
   */
  getCut(id: string): CutData | null;
  
  /**
   * 特定のReadModelを取得
   */
  getReadModel(id: string): CutReadModel | null;
  
  /**
   * カットデータを更新
   */
  updateCut(id: string, data: Partial<CutData>): Promise<void>;
  
  /**
   * カットを削除（論理削除）
   */
  deleteCut(id: string): Promise<void>;
  
  /**
   * カットを作成
   */
  createCut(data: Partial<CutData>): Promise<CutData>;
  
  /**
   * 統計情報を取得
   */
  getStatistics(): DataAccessStatistics;
  
  /**
   * データを同期
   */
  syncData(): Promise<void>;
  
  /**
   * キャッシュをクリア
   */
  clearCache(): void;
  
  /**
   * データ変更の購読
   */
  subscribe(callback: (event: DataChangeEvent) => void): () => void;
}

/**
 * データ変更イベント
 */
export interface DataChangeEvent {
  type: 'created' | 'updated' | 'deleted' | 'synced';
  cutId?: string;
  data?: CutData;
  timestamp: Date;
}

/**
 * データアクセスプロバイダー
 * ApplicationFacadeで実装され、UI層に提供される
 */
export interface IDataAccessProvider {
  getDataAccess(): IDataAccessFacade;
}