import { CutData } from '@/models/types';

/**
 * リポジトリインターフェース
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Record<string, unknown>): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

/**
 * カットリポジトリインターフェース
 */
export interface ICutRepository extends IRepository<CutData> {
  findAll(): Promise<CutData[]>;

  // 削除機能簡素化のため追加
  softDelete?(id: string): Promise<void>;
  findIncludingDeleted?(id: string): Promise<CutData | null>;
  findAllIncludingDeleted?(): Promise<CutData[]>;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}