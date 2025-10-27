import { IKintoneApiClient, KintoneRecord } from './IKintoneApiClient';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';

/**
 * kintone APIの実装
 */
export class KintoneApiClient implements IKintoneApiClient {
  private kintone: any;

  constructor() {
    if (typeof window === 'undefined' || !(window as any).kintone) {
      throw new Error('kintone API is not available');
    }
    this.kintone = (window as any).kintone;
  }

  async getRecord(appId: number, recordId: number): Promise<KintoneRecord> {
    try {
      const response = await this.kintone.api(
        this.kintone.api.url('/k/v1/record', true),
        'GET',
        {
          app: appId,
          id: recordId
        }
      );
      
      return response.record;
    } catch (error: any) {
      ErrorHandler.handle(error, 'KintoneApiClient.getRecord', {
        logLevel: 'error',
        metadata: { appId, recordId }
      });
      // kintone APIのエラーオブジェクトを正しく処理
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error);
      const httpStatus = error?.code || error?.response?.status;
      
      // 404エラーの場合は特別なメッセージを返す
      if (httpStatus === 'GAIA_RE01' || errorMessage.includes('404') || errorMessage.includes('指定されたレコード')) {
        throw new Error('Record not found');
      }
      
      throw new Error(`Failed to get record: ${errorMessage}`);
    }
  }

  async updateRecord(appId: number, recordId: number, record: Partial<KintoneRecord>): Promise<void> {
    try {
      // $id と $revision は更新時に送信しない
      const { $id, $revision, ...updateFields } = record;
      
      await this.kintone.api(
        this.kintone.api.url('/k/v1/record', true),
        'PUT',
        {
          app: appId,
          id: recordId,
          record: updateFields
        }
      );
    } catch (error: any) {
      ErrorHandler.handle(error, 'KintoneApiClient.updateRecord', {
        logLevel: 'error',
        metadata: { appId, recordId }
      });
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error);
      throw new Error(`Failed to update record: ${errorMessage}`);
    }
  }

  async createRecord(appId: number, record: Partial<KintoneRecord>): Promise<number> {
    try {
      // $id と $revision は作成時に送信しない
      const { $id, $revision, ...createFields } = record;
      
      const response = await this.kintone.api(
        this.kintone.api.url('/k/v1/record', true),
        'POST',
        {
          app: appId,
          record: createFields
        }
      );
      
      return parseInt(response.id);
    } catch (error: any) {
      ErrorHandler.handle(error, 'KintoneApiClient.createRecord', {
        logLevel: 'error',
        metadata: { appId }
      });
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error);
      throw new Error(`Failed to create record: ${errorMessage}`);
    }
  }

  async findFirstRecord(appId: number): Promise<KintoneRecord | null> {
    try {
      const response = await this.kintone.api(
        this.kintone.api.url('/k/v1/records', true),
        'GET',
        {
          app: appId,
          query: '',
          totalCount: true
        }
      );
      
      console.log(`[KintoneApiClient] Found ${response.records.length} existing records`);
      return response.records.length > 0 ? response.records[0] : null;
    } catch (error: any) {
      ErrorHandler.handle(error, 'KintoneApiClient.findFirstRecord', {
        logLevel: 'error',
        metadata: { appId, query: '' }
      });
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error);
      throw new Error(`Failed to find first record: ${errorMessage}`);
    }
  }
}