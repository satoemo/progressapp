/**
 * コアビジネスロジックサービス
 * ApplicationFacadeから基本的なCRUD操作を移管
 * 
 * このサービスは、カット（Cut）データの管理とメモ機能の
 * 中核となるビジネスロジックを担当します。
 */

import { UnifiedDataStore } from '@/data/UnifiedDataStore';
import { EventDispatcher } from '@/core/EventDispatcher';
import { DomainEvent } from '@/models/events/DomainEvent';
import { CutData } from '@/models/types';
import { CutReadModel } from '@/data/models/CutReadModel';
import { FilterOptions } from '@/core/interfaces/IDataAccessFacade';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';
import { DataProcessor } from '@/ui/shared/utils/DataProcessor';
import { IdGenerator } from '@/utils/IdGenerator';

export class CoreService {
  constructor(
    private unifiedStore: UnifiedDataStore,
    private eventDispatcher: EventDispatcher
  ) {}

  // ========== CUT操作 ==========

  /**
   * カットを作成
   */
  public async createCut(data: Partial<CutData>): Promise<CutData> {
    return ErrorHandler.wrap(async () => {
      // デフォルト値を設定
      const cutData = this.buildDefaultCutData(data) as CutData;

      // バリデーション
      this.validateCutData(cutData);

      // ストアに保存（upsertを使用）
      this.unifiedStore.upsert(cutData);

      // イベント発行
      this.emitCutEvent('CutCreated', cutData);

      return cutData;
    }, 'CoreService.createCut');
  }

  /**
   * カットを更新
   */
  public async updateCut(id: string, data: Partial<CutData>): Promise<void> {
    return ErrorHandler.wrap(async () => {
      // 既存データ取得
      const existing = this.getCut(id);
      if (!existing) {
        throw new Error(`Cut not found: ${id}`);
      }

      // バリデーション
      this.validateCutData(data);

      // データをマージして更新（upsertを使用）
      const updatedData: CutData = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
      this.unifiedStore.upsert(updatedData);

      // イベント発行
      this.emitCutEvent('CutUpdated', { id, ...data });
    }, 'CoreService.updateCut');
  }

  /**
   * カットを削除
   */
  public async deleteCut(cutId: string): Promise<void> {
    return ErrorHandler.wrap(async () => {
      // ストアから削除
      await this.unifiedStore.delete(cutId);

      // イベント発行
      this.emitCutEvent('CutDeleted', { id: cutId });
    }, 'CoreService.deleteCut');
  }

  /**
   * IDでカットを非同期取得
   */
  public async getCutById(id: string): Promise<CutData | null> {
    return ErrorHandler.wrap(async () => {
      return this.getCut(id);
    }, 'CoreService.getCutById');
  }

  /**
   * IDでカットを同期取得
   */
  public getCut(id: string): CutData | null {
    try {
      const result = this.unifiedStore.findById(id);
      return result as CutData | null;
    } catch (error) {
      ErrorHandler.handle(error, 'CoreService.getCut');
      return null;
    }
  }

  /**
   * 全カットを取得（フィルタリング可能）
   */
  public getAllCuts(options?: FilterOptions): CutData[] {
    try {
      const cuts = this.unifiedStore.findAll() as CutData[];

      if (!options) {
        return cuts;
      }

      let filtered = [...cuts];

      // フィルタリング
      if (options.filter) {
        filtered = filtered.filter(cut => {
          for (const [key, value] of Object.entries(options.filter!)) {
            const cutValue = DataProcessor.getNestedValue(cut, key);
            if (cutValue !== value) {
              return false;
            }
          }
          return true;
        });
      }

      // ソート
      if (options.sort) {
        const { field, order = 'asc' } = options.sort;
        filtered.sort((a, b) => {
          const aVal = DataProcessor.getNestedValue(a, field);
          const bVal = DataProcessor.getNestedValue(b, field);
          const result = DataProcessor.compareValues(aVal, bVal);
          return order === 'desc' ? -result : result;
        });
      }

      // ページング
      if (options.page && options.pageSize) {
        const start = (options.page - 1) * options.pageSize;
        const end = start + options.pageSize;
        filtered = filtered.slice(start, end);
      }

      return filtered;
    } catch (error) {
      ErrorHandler.handle(error, 'CoreService.getAllCuts');
      return [];
    }
  }

  // ========== メモ管理 ==========

  /**
   * セルメモを取得
   */
  public async getCellMemo(cutNumber: string, fieldKey: string): Promise<string | undefined> {
    return ErrorHandler.wrap(async () => {
      const memos = this.unifiedStore.getMemosByEntity('cut', cutNumber);
      const memo = memos.find(m => m.fieldKey === fieldKey);
      return memo?.content;
    }, 'CoreService.getCellMemo');
  }

  /**
   * セルメモを更新
   */
  public async updateCellMemo(cutNumber: string, fieldKey: string, content: string): Promise<void> {
    return ErrorHandler.wrap(async () => {
      const memoId = `${cutNumber}_${fieldKey}`;
      
      if (content) {
        // メモの追加または更新
        await this.unifiedStore.setMemo(memoId, {
          id: memoId,
          entityType: 'cut',
          entityId: cutNumber,
          fieldKey,
          content,
          updatedAt: new Date().toISOString()
        });
      } else {
        // 空の場合はメモを削除
        await this.unifiedStore.deleteMemo(memoId);
      }
      
      // イベント発行
      this.emitCutEvent('CellMemoUpdated', {
        cutNumber,
        fieldKey,
        content
      });
    }, 'CoreService.updateCellMemo');
  }

  // ========== 内部ヘルパー ==========

  /**
   * デフォルトのカットデータを構築
   */
  private buildDefaultCutData(data: Partial<CutData> = {}): Partial<CutData> {
    const now = new Date().toISOString();

    return {
      id: data.id || IdGenerator.generateCutId(data.cutNumber || '0'),
      cutNumber: data.cutNumber || '',
      status: data.status || '',
      special: data.special || '',
      kenyo: data.kenyo || '',
      maisu: data.maisu || '',
      size: data.size || '',
      bumon: data.bumon || '',
      jisseki: data.jisseki || '',
      tanto: data.tanto || '',
      team: data.team || '',
      biko: data.biko || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
      ...data
    };
  }

  /**
   * カットデータのバリデーション
   */
  private validateCutData(data: Partial<CutData>): void {
    // 必須フィールドのチェック
    if (data.cutNumber !== undefined && ValidationHelper.isNullOrEmpty(data.cutNumber)) {
      throw new Error('Invalid cut number');
    }

    // 数値フィールドのチェック
    if (data.maisu !== undefined && data.maisu !== '') {
      const maisu = ValidationHelper.ensureNumber(data.maisu);
      if (maisu < 0) {
        throw new Error('Maisu must be non-negative');
      }
    }
  }

  /**
   * カット関連イベントを発行
   */
  private emitCutEvent(type: string, data: any): void {
    const event = new DomainEvent(type, data, {
      timestamp: Date.now(),
      source: 'CoreService'
    });
    this.eventDispatcher.dispatch(event);
  }
}