/**
 * UnifiedDataStore
 *
 * SimplifiedStoreと読み取りモデルの機能を統合した単一のデータストア
 * - スナップショット保存
 * - ReadModelの管理
 * - LRUキャッシュによる高速アクセス
 * - LocalStorage/Memory両対応
 */

import { DataProcessor } from '@/ui/shared/utils/DataProcessor';
import { StorageHelper } from '@/ui/shared/utils/StorageHelper';
import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';

import { CutData } from '@/models/types';
import { DomainEvent } from '@/models/events/DomainEvent';
import { CutReadModel, createCutReadModel } from './models/CutReadModel';
import { MemoReadModel, createMemoReadModel } from './models/MemoReadModel';
import { FieldMetadataRegistry } from '@/models/metadata/FieldMetadataRegistry';
import { Logger } from '@/utils/Logger';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';

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
 * メモリストレージアダプタ（開発・テスト用）
 */
export class MemoryStorageAdapter implements IStorageAdapter {
  private store: Map<string, unknown> = new Map();

  async get(key: string): Promise<unknown | null> {
    const value = this.store.get(key);
    return value ? DataProcessor.deepClone(value) : null;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, DataProcessor.deepClone(value));
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());
    if (prefix) {
      return keys.filter(key => key.startsWith(prefix));
    }
    return keys;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * LocalStorageアダプタ（ブラウザ用）
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private prefix: string;
  private logger = Logger.getInstance();

  constructor(prefix: string = 'unified_store_') {
    this.prefix = prefix;
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<unknown | null> {
    try {
      const fullKey = this.getFullKey(key);
      const item = StorageHelper.loadRaw(key, this.prefix);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      return parsed.data || parsed;
    } catch (error) {
      return ErrorHandler.handle(error, 'LocalStorageAdapter.get', {
        fallback: null,
        logLevel: 'error'
      });
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const data = {
        data: value,
        timestamp: Date.now()
      };
      StorageHelper.saveRaw(key, JSON.stringify(data), this.prefix);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.logger.warn('LocalStorageAdapter', 'LocalStorage quota exceeded, attempting cleanup');
        await this.cleanupOldEntries();
        // 再試行
        await ErrorHandler.withRetry(
          async () => {
            const fullKey = this.getFullKey(key);
            const data = {
              data: value,
              timestamp: Date.now()
            };
            StorageHelper.saveRaw(key, JSON.stringify(data), this.prefix);
          },
          'LocalStorageAdapter.set.retry',
          { maxRetries: 1, delay: 0 }
        );
      } else {
        ErrorHandler.handle(error, 'LocalStorageAdapter.set', {
          rethrow: true,
          logLevel: 'error'
        });
      }
    }
  }

  async delete(key: string): Promise<void> {
    StorageHelper.remove(key, { prefix: this.prefix });
  }

  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const searchPrefix = this.getFullKey(DataProcessor.safeString(prefix));
    
    const allKeys = StorageHelper.getKeys(searchPrefix);
    for (const key of allKeys) {
      keys.push(key);
    }
    
    return keys;
  }

  async clear(): Promise<void> {
    const keys = await this.list();
    for (const key of keys) {
      await this.delete(key);
    }
  }

  private async cleanupOldEntries(): Promise<void> {
    const keys = await this.list();
    const entries: Array<{ key: string; timestamp: number }> = [];

    for (const key of keys) {
      try {
        const item = StorageHelper.loadRaw(key, this.prefix);
        if (item) {
          const parsed = JSON.parse(item);
          entries.push({
            key,
            timestamp: parsed.timestamp || 0
          });
        }
      } catch (error) {
        // 無効なエントリは削除対象
        ErrorHandler.handle(error, 'LocalStorageAdapter.cleanupOldEntries', {
          logLevel: 'warn'
        });
        entries.push({ key, timestamp: 0 });
      }
    }

    // 古い順にソート
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // 古い10%を削除
    const deleteCount = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < deleteCount; i++) {
      await this.delete(entries[i].key);
    }

    this.logger.info('LocalStorageAdapter', `Cleaned up ${deleteCount} old entries from LocalStorage`);
  }
}

/**
 * LRUキャッシュ実装
 */
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 最近使用したものを末尾に移動
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // 既存のキーは削除して末尾に追加
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 最も古いエントリ（先頭）を削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * 統合データストア設定
 */
export interface UnifiedDataStoreConfig {
  cacheSize?: number;
  enableBackup?: boolean;
  maxBackups?: number;
  enableIntegrityCheck?: boolean;
}

/**
 * 統合データストア
 */
export class UnifiedDataStore {
  private adapter: IStorageAdapter;
  private cache: LRUCache<string, unknown>;
  private logger = Logger.getInstance();
  private config: Required<UnifiedDataStoreConfig>;
  
  // ReadModel管理
  private readModels: Map<string, CutReadModel> = new Map();
  private memoReadModel: MemoReadModel | null = null;

  constructor(
    adapter: IStorageAdapter,
    config: UnifiedDataStoreConfig = {}
  ) {
    this.adapter = adapter;
    this.config = {
      cacheSize: config.cacheSize || 100,
      enableBackup: config.enableBackup ?? true,
      maxBackups: config.maxBackups || 3,
      enableIntegrityCheck: config.enableIntegrityCheck ?? true
    };
    this.cache = new LRUCache(this.config.cacheSize);
  }

  /**
   * バッチ保存（最適化版）
   * 複数エンティティを効率的に保存
   */
  async saveBatch(entities: Array<{ id: string, data: unknown }>): Promise<void> {
    try {
      // バッチでLocalStorageに保存
      const promises: Promise<void>[] = [];
      
      for (const { id, data } of entities) {
        promises.push(this.save(id, data));
      }
      
      await Promise.all(promises);
      
      // キャッシュ無効化
      this.allReadModelsCache = null;
      
      this.logger.debug('UnifiedDataStore', `Batch save completed: ${entities.length} entities`);
    } catch (error) {
      ErrorHandler.handle(error, 'UnifiedDataStore.saveBatch', {
        rethrow: true,
        logLevel: 'error'
      });
    }
  }

  /**
   * エンティティの保存（SimplifiedStore機能）
   */
  async save(id: string, data: unknown): Promise<void> {
    try {
      // 整合性チェック用のチェックサム追加
      let dataToSave = data;
      if (this.config.enableIntegrityCheck && typeof data === 'object' && data !== null) {
        dataToSave = { ...data, _checksum: this.calculateChecksum(data) };
      }

      // バックアップ作成
      if (this.config.enableBackup) {
        await this.createBackup(id);
      }

      // アダプタに保存
      await this.adapter.set(id, dataToSave);
      
      // キャッシュ更新
      this.cache.set(id, dataToSave);

      // ReadModel更新（CutDataの場合）
      if (this.isCutData(dataToSave)) {
        const readModel = createCutReadModel(dataToSave as CutData);
        this.readModels.set(id, readModel);
        
        // LocalStorageにも保存（SimpleCutDeletionService連携用）
        // 重要：削除サービスとの互換性のため、両方のプレフィックスで保存
        if (StorageHelper.isAvailable()) {
          // SimpleCutDeletionService用（従来のプレフィックス）
          const compatKey = `Cut:${id}`;
          StorageHelper.saveRaw(compatKey, JSON.stringify(dataToSave), 'kintone_cuts_');
        }
      }

      this.logger.debug('UnifiedDataStore', `Entity saved: ${id}`);
    } catch (error) {
      ErrorHandler.handle(error, `UnifiedDataStore.save[${id}]`, {
        rethrow: true,
        logLevel: 'error'
      });
    }
  }

  /**
   * エンティティの取得（SimplifiedStore機能）
   */
  async load(id: string): Promise<unknown | null> {
    try {
      // キャッシュから取得
      const cached = this.cache.get(id);
      if (cached) {
        this.logger.debug('UnifiedDataStore', `Cache hit: ${id}`);
        return cached;
      }

      // アダプタから取得
      const data = await this.adapter.get(id);
      if (!data) {
        return null;
      }

      // 整合性チェック
      if (this.config.enableIntegrityCheck && 
          typeof data === 'object' && 
          data !== null && 
          '_checksum' in data) {
        const dataWithChecksum = data as { _checksum: string };
        const checksum = this.calculateChecksum(data);
        if (checksum !== dataWithChecksum._checksum) {
          this.logger.warn('UnifiedDataStore', `Checksum mismatch, attempting recovery: ${id}`);
          const backup = await this.recoverFromBackup(id);
          if (backup) {
            return backup;
          }
        }
      }

      // キャッシュに追加
      this.cache.set(id, data);

      return data;
    } catch (error) {
      return ErrorHandler.handle(error, `UnifiedDataStore.load[${id}]`, {
        fallback: null,
        logLevel: 'error'
      });
    }
  }

  /**
   * エンティティの削除（SimplifiedStore機能）
   * キャッシュ最適化版
   */
  async delete(id: string): Promise<void> {
    try {
      // バックアップも削除
      if (this.config.enableBackup) {
        await this.deleteBackups(id);
      }

      await this.adapter.delete(id);
      this.cache.delete(id);
      this.cache.delete(`readmodel:${id}`); // ReadModelキャッシュも削除
      this.readModels.delete(id);
      this.allReadModelsCache = null; // 全件キャッシュ無効化
      
      // LocalStorageからも削除（SimpleCutDeletionService連携用）
      if (StorageHelper.isAvailable()) {
        const storageKey = `Cut:${id}`;
        StorageHelper.remove(storageKey, { prefix: 'kintone_cuts_' });
      }

      this.logger.debug('UnifiedDataStore', `Entity deleted: ${id}`);
    } catch (error) {
      ErrorHandler.handle(error, `UnifiedDataStore.delete[${id}]`, {
        rethrow: true,
        logLevel: 'error'
      });
    }
  }

  /**
   * 全エンティティの取得（SimplifiedStore機能）
   */
  async loadAll(prefix?: string): Promise<Map<string, unknown>> {
    try {
      const keys = await this.adapter.list(prefix);
      const result = new Map<string, unknown>();

      for (const key of keys) {
        // バックアップファイルをスキップ
        if (key.includes('_backup_')) continue;
        
        const data = await this.load(key);
        if (data) {
          result.set(key, data);
        }
      }

      return result;
    } catch (error) {
      return ErrorHandler.handle(error, 'UnifiedDataStore.loadAll', {
        fallback: new Map(),
        logLevel: 'error'
      });
    }
  }

  /**
   * 全カットデータの読み込み（後方互換性）
   * リロード時に既存のlocalStorageデータを読み込む
   */
  async loadAllCuts(): Promise<unknown[]> {
    try {
      // まず、UnifiedDataStoreの標準プレフィックス（unified_store_）から読み込み
      const allData = await this.loadAll('cut-');
      const cuts: unknown[] = [];
      
      for (const [, value] of allData) {
        if (this.isCutData(value)) {
          cuts.push(value);
          // ReadModelも更新
          const readModel = createCutReadModel(value as CutData);
          this.readModels.set((value as CutData).id, readModel);
        }
      }
      
      // 既存のlocalStorageデータ（kintone_cuts_Cut:プレフィックス）も読み込み
      if (StorageHelper.isAvailable()) {
        const compatKeys = StorageHelper.getKeys('kintone_cuts_');
        for (const key of compatKeys) {
          if (key && key.startsWith('Cut:') && !key.includes('backup')) {
            try {
              const data = StorageHelper.loadRaw(key, 'kintone_cuts_');
              if (data) {
                const parsed = JSON.parse(data);
                // 重複チェック
                if (!cuts.find((c: unknown) => (c as CutData).id === parsed.id)) {
                  cuts.push(parsed);
                  // UnifiedDataStoreの標準形式でも保存（データ移行）
                  await this.save(parsed.id, parsed);
                }
              }
            } catch (error) {
              ErrorHandler.handle(error, `UnifiedDataStore.loadAllCuts.parse[${key}]`, {
                logLevel: 'warn'
              });
            }
          }
        }
      }
      
      console.log(`[UnifiedDataStore] loadAllCuts: Loaded ${cuts.length} cuts from storage`);
      return cuts;
    } catch (error) {
      return ErrorHandler.handle(error, 'UnifiedDataStore.loadAllCuts', {
        fallback: [],
        logLevel: 'error'
      });
    }
  }

  /**
   * CutCreatedイベントを処理
   */
  public handleCutCreated(event: DomainEvent): void {
    const eventData = event.getEventData();
    const cutData = this.mapEventDataToCutData(event.aggregateId, eventData.initialData);
    const readModel = createCutReadModel(cutData);
    this.readModels.set(event.aggregateId, readModel);
  }

  /**
   * イベントデータをCutDataにマッピング
   */
  private mapEventDataToCutData(aggregateId: string, initialData: unknown): CutData {
    const registry = FieldMetadataRegistry.getInstance();
    const allMetadata = registry.getAllFieldMetadata();
    const CUT_DATA_FIELDS = allMetadata
      .map(m => m.field)
      .filter(f => f !== 'id');

    const cutData: CutData = {
      id: aggregateId
    } as CutData;

    CUT_DATA_FIELDS.forEach(field => {
      const dataObj = initialData as Record<string, unknown>;
      (cutData as unknown as Record<string, unknown>)[field] = DataProcessor.safeString(dataObj[field]);
    });

    return cutData;
  }

  /**
   * カットReadModelを取得
   * キャッシュ最適化版
   */
  getReadModelById(cutId: string): CutReadModel | null {
    // キャッシュからチェック
    const cacheKey = `readmodel:${cutId}`;
    const cached = this.cache.get(cacheKey) as CutReadModel;
    if (cached) {
      return cached;
    }
    
    // キャッシュミスの場合は通常の取得
    const readModel = this.readModels.get(cutId) || null;
    if (readModel) {
      this.cache.set(cacheKey, readModel);
    }
    return readModel;
  }

  /**
   * 全カットReadModelを取得
   * キャッシュ最適化版
   */
  private allReadModelsCache: CutReadModel[] | null = null;
  private allReadModelsCacheTime: number = 0;
  private readonly CACHE_TTL = 5000; // 5秒間キャッシュ
  
  getAllReadModels(): CutReadModel[] {
    const now = Date.now();
    
    // キャッシュが有効な場合はそれを返す
    if (this.allReadModelsCache && (now - this.allReadModelsCacheTime) < this.CACHE_TTL) {
      return this.allReadModelsCache;
    }
    
    // キャッシュを更新
    this.allReadModelsCache = Array.from(this.readModels.values());
    this.allReadModelsCacheTime = now;
    return this.allReadModelsCache;
  }

  /**
   * 全カットReadModelを取得（後方互換性のための旧メソッド名）
   */
  getAll(): CutReadModel[] {
    return this.getAllReadModels();
  }

  /**
   * カットReadModelを更新
   * キャッシュ無効化付き
   */
  updateReadModel(cutId: string, data: CutData): void {
    const readModel = createCutReadModel(data);
    this.readModels.set(cutId, readModel);
    
    // キャッシュを無効化
    this.cache.delete(`readmodel:${cutId}`);
    this.allReadModelsCache = null; // 全件キャッシュも無効化
  }

  /**
   * 全ReadModelをクリア
   */
  clearReadModels(): void {
    this.readModels.clear();
    this.allReadModelsCache = null;
    // キャッシュからもReadModel関連を削除
    this.cache.clear();
  }

  /**
   * カットReadModelを削除
   */
  removeReadModel(cutId: string): void {
    this.readModels.delete(cutId);
  }

  /**
   * カットReadModelを削除（エイリアス）
   */
  deleteReadModel(cutId: string): void {
    this.removeReadModel(cutId);
  }

  /**
   * メモReadModelを取得
   */
  getMemoReadModel(): MemoReadModel | null {
    return this.memoReadModel;
  }

  /**
   * メモReadModelを更新
   */
  updateMemoReadModel(memos: Record<string, string>): void {
    this.memoReadModel = createMemoReadModel(memos);
  }

  /**
   * SimplifiedReadModel互換メソッド：カット番号で検索
   */
  findByCutNumber(cutNumber: string): unknown | undefined {
    // ReadModelからカット番号で検索
    for (const readModel of this.readModels.values()) {
      // CutReadModelは既にCutDataを継承しているので、readModel自体がデータ
      if (readModel.cutNumber === cutNumber) {
        return readModel;
      }
    }
    return undefined;
  }

  /**
   * SimplifiedReadModel互換メソッド：フィルタで検索
   */
  findByFilter(filter: (cut: unknown) => boolean): unknown[] {
    const results: unknown[] = [];
    for (const readModel of this.readModels.values()) {
      // CutReadModelは既にCutDataを継承しているので、readModel自体がデータ
      if (filter(readModel)) {
        results.push(readModel);
      }
    }
    return results;
  }

  /**
   * SimplifiedReadModel互換メソッド：メモ取得
   */
  getMemo(cutNumber: string, fieldKey: string): string | null {
    const memoKey = `memo:${cutNumber}:${fieldKey}`;
    
    // LocalStorageから直接取得
    if (StorageHelper.isAvailable()) {
      const memoData = StorageHelper.loadRaw(memoKey, '');
      if (memoData) {
        return ErrorHandler.parseJSON(memoData, memoData);
      }
    }
    
    return null;
  }

  /**
   * SimplifiedReadModel互換メソッド：メモ設定
   */
  setMemo(cutNumber: string, fieldKey: string, content: string): void {
    const memoKey = `memo:${cutNumber}:${fieldKey}`;
    
    // LocalStorageに保存
    if (StorageHelper.isAvailable()) {
      StorageHelper.saveRaw(memoKey, JSON.stringify(content), '');
    }
    
    // MemoReadModelも更新
    if (this.memoReadModel && 'getMemos' in this.memoReadModel) {
      const memos = (this.memoReadModel as { getMemos(): Record<string, string> }).getMemos();
      memos[memoKey] = content;
      this.updateMemoReadModel(memos);
    }
  }

  /**
   * SimplifiedReadModel互換メソッド：データ挿入/更新
   */
  upsert(cutData: unknown): void {
    if (!cutData || typeof cutData !== 'object' || !('id' in cutData)) {
      console.warn('[UnifiedDataStore] Invalid cutData for upsert:', cutData);
      return;
    }
    
    const data = cutData as CutData;
    console.log(`[UnifiedDataStore] upsert called for cut: ${data.id}, cutNumber: ${data.cutNumber}`);
    
    // 非同期saveをPromiseで実行（即座に完了する想定）
    this.save(data.id, data).catch(error => {
      console.error('[UnifiedDataStore] Failed to save in upsert:', error);
    });
    
    // ReadModelを同期的に更新
    this.updateReadModel(data.id, data);
    console.log(`[UnifiedDataStore] After upsert, readModels size: ${this.readModels.size}`);
  }

  /**
   * SimplifiedReadModel互換メソッド：IDで検索
   */
  findById(id: string): unknown | null {
    const readModel = this.readModels.get(id);
    // CutReadModelは既にCutDataを継承しているので、readModel自体がデータ
    return readModel || null;
  }

  /**
   * SimplifiedReadModel互換メソッド：全データ取得
   */
  findAll(filter?: Partial<CutData>): unknown[] {
    console.log(`[UnifiedDataStore] findAll called, readModels size: ${this.readModels.size}`);
    const results: unknown[] = [];
    
    for (const readModel of this.readModels.values()) {
      // CutReadModelは既にCutDataを継承しているので、readModel自体がデータ
      
      // フィルタがある場合は適用
      if (filter) {
        let matches = true;
        for (const key in filter) {
          if (readModel[key as keyof CutReadModel] !== filter[key as keyof CutData]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }
      
      results.push(readModel);
    }
    
    console.log(`[UnifiedDataStore] findAll returning ${results.length} results`);
    
    // カット番号でソート
    return results.sort((a, b) => {
      const cutA = a as CutData;
      const cutB = b as CutData;
      const numA = ValidationHelper.ensureNumber(cutA.cutNumber || '0', 0);
      const numB = ValidationHelper.ensureNumber(cutB.cutNumber || '0', 0);
      return numA - numB;
    });
  }


  /**
   * 全てクリア
   */
  async clear(): Promise<void> {
    await this.adapter.clear();
    this.cache.clear();
    this.readModels.clear();
    this.memoReadModel = null;
  }

  /**
   * バックアップ作成（SimplifiedStore機能）
   */
  private async createBackup(id: string): Promise<void> {
    try {
      const existing = await this.adapter.get(id);
      if (!existing) return;

      const timestamp = Date.now();
      const backupKey = `${id}_backup_${timestamp}`;
      await this.adapter.set(backupKey, existing);

      // 古いバックアップを削除
      await this.cleanupOldBackups(id);
    } catch (error) {
      ErrorHandler.handle(error, `UnifiedDataStore.createBackup[${id}]`, {
        logLevel: 'warn'
      });
    }
  }

  /**
   * 古いバックアップのクリーンアップ（SimplifiedStore機能）
   */
  private async cleanupOldBackups(id: string): Promise<void> {
    const backupPrefix = `${id}_backup_`;
    const backupKeys = await this.adapter.list(backupPrefix);
    
    if (backupKeys.length > this.config.maxBackups) {
      // タイムスタンプでソート（古い順）
      const sorted = backupKeys.sort((a, b) => {
        const timestampA = ValidationHelper.ensureNumber(a.split('_').pop() || '0', 0);
        const timestampB = ValidationHelper.ensureNumber(b.split('_').pop() || '0', 0);
        return timestampA - timestampB;
      });

      // 古いバックアップを削除
      const toDelete = sorted.slice(0, sorted.length - this.config.maxBackups);
      for (const key of toDelete) {
        await this.adapter.delete(key);
      }
    }
  }

  /**
   * バックアップから復元（SimplifiedStore機能）
   */
  private async recoverFromBackup(id: string): Promise<unknown | null> {
    try {
      const backupPrefix = `${id}_backup_`;
      const backupKeys = await this.adapter.list(backupPrefix);
      
      if (backupKeys.length === 0) {
        return null;
      }

      // 最新のバックアップを取得
      const sorted = backupKeys.sort((a, b) => {
        const timestampA = ValidationHelper.ensureNumber(a.split('_').pop() || '0', 0);
        const timestampB = ValidationHelper.ensureNumber(b.split('_').pop() || '0', 0);
        return timestampB - timestampA;
      });

      const latestBackup = await this.adapter.get(sorted[0]);
      if (latestBackup) {
        this.logger.info('UnifiedDataStore', `Recovered from backup: ${id}, backup: ${sorted[0]}`);
        // 復元したデータで上書き
        await this.save(id, latestBackup);
        return latestBackup;
      }

      return null;
    } catch (error) {
      return ErrorHandler.handle(error, `UnifiedDataStore.recoverFromBackup[${id}]`, {
        fallback: null,
        logLevel: 'error'
      });
    }
  }

  /**
   * バックアップ削除（SimplifiedStore機能）
   */
  private async deleteBackups(id: string): Promise<void> {
    const backupPrefix = `${id}_backup_`;
    const backupKeys = await this.adapter.list(backupPrefix);
    
    for (const key of backupKeys) {
      await this.adapter.delete(key);
    }
  }

  /**
   * チェックサム計算（SimplifiedStore機能）
   */
  private calculateChecksum(data: unknown): string {
    const clone = { ...(data as Record<string, unknown>) };
    delete clone._checksum;
    const str = JSON.stringify(clone);
    
    // 簡易的なハッシュ関数
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(16);
  }

  /**
   * CutDataかどうかの判定
   */
  private isCutData(data: unknown): data is CutData {
    return !!(data && 
           typeof data === 'object' && 
           'id' in data && 
           ('cutNumber' in data || 'cutName' in data));
  }

  /**
   * ストレージアダプタを取得
   */
  getStorageAdapter(): IStorageAdapter {
    return this.adapter;
  }

  /**
   * 統計情報取得
   */
  getStatistics(): {
    cacheSize: number;
    cacheHitRate: number;
    totalEntities: number;
    readModelsCount: number;
  } {
    return {
      cacheSize: this.cache.size,
      cacheHitRate: 0,
      totalEntities: this.readModels.size,
      readModelsCount: this.readModels.size
    };
  }
}

/**
 * ファクトリ関数
 */
export function createUnifiedDataStore(
  storageType: 'memory' | 'localStorage' = 'localStorage',
  config?: UnifiedDataStoreConfig
): UnifiedDataStore {
  const adapter = storageType === 'memory' 
    ? new MemoryStorageAdapter()
    : new LocalStorageAdapter('unified_store_');
    
  return new UnifiedDataStore(adapter, config);
}