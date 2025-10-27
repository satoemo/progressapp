import { IRepository } from '@/types/repository';

/**
 * メモデータの簡易型
 */
export interface MemoData {
  id: string;
  cutNumber: string;
  fieldKey: string;
  content: string;
}

/**
 * メモリポジトリインターフェース
 */
export interface IMemoRepository extends IRepository<MemoData> {
  /**
   * シングルトンのメモ集約を取得
   * 存在しない場合は新規作成
   */
  findOrCreate(): Promise<MemoData>;
}