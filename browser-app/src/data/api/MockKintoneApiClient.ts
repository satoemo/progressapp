import { IKintoneApiClient, KintoneRecord, KintoneFieldValue } from './IKintoneApiClient';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { DataProcessor } from '@/ui/shared/utils/DataProcessor';
import { StorageHelper } from '@/ui/shared/utils/StorageHelper';
import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';

/**
 * kintone APIのモック実装（ブラウザテスト用）
 */
export class MockKintoneApiClient implements IKintoneApiClient {
  private storage: Map<string, KintoneRecord> = new Map();
  private nextRecordId = 1;
  
  constructor() {
    // LocalStorageから既存データを読み込む
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    if (typeof window !== 'undefined' && (window as any).DEBUG_SERVICES) {
      console.log('[MockKintoneApiClient] ========== LOADING FROM LOCALSTORAGE ==========');
    }
    
    // LocalStorageのすべてのキーをログ出力
    const allKeys = StorageHelper.getKeys('');
    if (typeof window !== 'undefined' && (window as any).DEBUG_SERVICES) {
      console.log('[MockKintoneApiClient] All LocalStorage keys:', allKeys);
    }
    
    // mockKintoneDataを探す
    const savedData = StorageHelper.loadRaw('mockKintoneData', '');
    if (typeof window !== 'undefined' && (window as any).DEBUG_SERVICES) {
      console.log('[MockKintoneApiClient] mockKintoneData exists:', !!savedData);
    }
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (typeof window !== 'undefined' && (window as any).DEBUG_SERVICES) {
          console.log('[MockKintoneApiClient] Parsed data:', parsed);
        }
        
        // storageオブジェクトを正しくMapに変換
        if (parsed.storage && typeof parsed.storage === 'object') {
          this.storage = new Map(Object.entries(parsed.storage));
          if (typeof window !== 'undefined' && (window as any).DEBUG_SERVICES) {
            console.log('[MockKintoneApiClient] Loaded records:', this.storage.size);
          }
        }
        
        this.nextRecordId = parsed.nextRecordId || 1;
      } catch (e) {
        ErrorHandler.handle(e, 'MockKintoneApiClient.loadFromLocalStorage', {
          logLevel: 'error',
          customMessage: '[MockKintone] Failed to load mock data'
        });
        this.storage = new Map();
      }
    } else {
      // kintone_cuts_で始まるキーを探す
      const cutKeys = allKeys.filter(k => k.startsWith('kintone_cuts_'));
      if (typeof window !== 'undefined' && (window as any).DEBUG_SERVICES) {
        console.log('[MockKintoneApiClient] Found kintone_cuts_ keys:', cutKeys.length);
      }
      
      // simplified_store_で始まるキーを探す  
      const simplifiedKeys = allKeys.filter(k => k.startsWith('simplified_store_'));
      if (typeof window !== 'undefined' && (window as any).DEBUG_SERVICES) {
        console.log('[MockKintoneApiClient] Found simplified_store_ keys:', simplifiedKeys.length);
      }
    }
    
    if (typeof window !== 'undefined' && (window as any).DEBUG_SERVICES) {
      console.log('[MockKintoneApiClient] ========== LOADING COMPLETE ==========');
    }
  }

  private saveToLocalStorage(): void {
    const data = {
      storage: Object.fromEntries(this.storage),
      nextRecordId: this.nextRecordId
    };
    StorageHelper.saveRaw('mockKintoneData', JSON.stringify(data), '');
  }

  private createFieldValue<T>(value: T): KintoneFieldValue<T> {
    return { value };
  }

  async getRecord(appId: number, recordId: number): Promise<KintoneRecord> {
    const key = `${appId}_${recordId}`;
    const record = this.storage.get(key);
    
    if (!record) {
      throw new Error(`Record not found: appId=${appId}, recordId=${recordId}`);
    }
    
    // シミュレートのための遅延
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return { ...record };
  }

  async updateRecord(appId: number, recordId: number, record: Partial<KintoneRecord>): Promise<void> {
    const key = `${appId}_${recordId}`;
    const existingRecord = this.storage.get(key);
    
    if (!existingRecord) {
      throw new Error(`Record not found: appId=${appId}, recordId=${recordId}`);
    }
    
    // 既存レコードと新しいデータをマージ
    const updatedRecord: KintoneRecord = {
      ...existingRecord,
      ...record,
      lastModified: this.createFieldValue(new Date().toISOString()),
      $revision: this.createFieldValue(String(ValidationHelper.ensureNumber(DataProcessor.safeString(existingRecord.$revision?.value), 0) + 1))
    };
    
    this.storage.set(key, updatedRecord);
    this.saveToLocalStorage();
    
    // recordIdもLocalStorageに保存（データが更新されたレコードを次回確実に見つけるため）
    StorageHelper.saveRaw(`mockKintone_recordId_${appId}`, String(recordId), '');
    
    // シミュレートのための遅延（短縮）
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  async createRecord(appId: number, record: Partial<KintoneRecord>): Promise<number> {
    const recordId = this.nextRecordId++;
    const key = `${appId}_${recordId}`;
    
    const newRecord: KintoneRecord = {
      ...record,
      $id: this.createFieldValue(String(recordId)),
      $revision: this.createFieldValue('1'),
      lastModified: this.createFieldValue(new Date().toISOString())
    };
    
    this.storage.set(key, newRecord);
    this.saveToLocalStorage();
    
    // recordIdもLocalStorageに保存（KintoneEventStore用）
    StorageHelper.saveRaw(`mockKintone_recordId_${appId}`, String(recordId), '');
    
    // シミュレートのための遅延
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return recordId;
  }

  async findFirstRecord(appId: number): Promise<KintoneRecord | null> {
    // LocalStorageに保存されたrecordIdがあるか確認
    const savedRecordId = StorageHelper.loadRaw(`mockKintone_recordId_${appId}`, '');
    if (savedRecordId) {
      const key = `${appId}_${savedRecordId}`;
      const record = this.storage.get(key);
      if (record) {
        return { ...record };
      }
    }
    
    // appIdに対応する最初のレコードを検索（cutDataJsonを持つレコードを優先）
    let firstRecord: KintoneRecord | null = null;
    let recordWithData: KintoneRecord | null = null;
    
    for (const [key, record] of this.storage.entries()) {
      if (key.startsWith(`${appId}_`)) {
        if (!firstRecord) {
          firstRecord = record;
        }
        // cutDataJsonを持つレコードを優先
        if (record.cutDataJson?.value) {
          recordWithData = record;
          const recordId = key.split('_')[1];
          // 見つかったレコードIDを保存して次回確実に見つけられるようにする
          StorageHelper.saveRaw(`mockKintone_recordId_${appId}`, recordId, '');
          return { ...recordWithData };
        }
      }
    }
    
    if (firstRecord) {
      const key = Array.from(this.storage.entries()).find(([, v]) => v === firstRecord)?.[0];
      if (key) {
        const recordId = key.split('_')[1];
        StorageHelper.saveRaw(`mockKintone_recordId_${appId}`, recordId, '');
      }
      return { ...firstRecord };
    }
    
    return null;
  }
  
  /**
   * モック用: 全データをクリア
   */
  clearAllData(): void {
    this.storage.clear();
    this.nextRecordId = 1;
    StorageHelper.remove('mockKintoneData', { prefix: '' });
    
    // 保存されたrecordIdもクリア
    const keys = StorageHelper.getKeys('');
    const keysToRemove: string[] = keys.filter(key => key.startsWith('mockKintone_recordId_'));
    keysToRemove.forEach(key => StorageHelper.remove(key, { prefix: '' }));
  }
}