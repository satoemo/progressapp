import { KintoneRecord, KintoneFieldValue } from './IKintoneApiClient';
import { CutData } from '@/models/types';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';

/**
 * ドメインモデルとkintone JSONフィールドの相互変換
 */
export class KintoneJsonMapper {
  /**
   * Cut集約の配列をJSON文字列に変換
   */
  static cutsToJson(cuts: CutData[]): string {
    return JSON.stringify(cuts);
  }

  /**
   * JSON文字列からCutDataの配列に変換
   */
  static jsonToCutData(json: string): CutData[] {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid cut data format');
      }
      return parsed;
    } catch (error) {
      ErrorHandler.handle(error, 'KintoneJsonMapper.jsonToCutData', {
        logLevel: 'error',
        customMessage: 'Failed to parse cut data JSON'
      });
      return [];
    }
  }

  /**
   * ドメインイベントの配列をJSON文字列に変換
   */
  static eventsToJson(events: unknown[]): string {
    return JSON.stringify(events);
  }

  /**
   * JSON文字列からドメインイベントの配列に変換
   */
  static jsonToEvents(json: string): unknown[] {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid events format');
      }
      return parsed;
    } catch (error) {
      ErrorHandler.handle(error, 'KintoneJsonMapper.jsonToEvents', {
        logLevel: 'error',
        customMessage: 'Failed to parse events JSON'
      });
      return [];
    }
  }

  /**
   * メモデータをJSON文字列に変換
   */
  static memoToJson(memoData: Record<string, string>): string {
    return JSON.stringify(memoData);
  }

  /**
   * JSON文字列からメモデータに変換
   */
  static jsonToMemo(json: string): Record<string, string> {
    try {
      return JSON.parse(json);
    } catch (error) {
      ErrorHandler.handle(error, 'KintoneJsonMapper.jsonToMemos', {
        logLevel: 'error',
        customMessage: 'Failed to parse memo JSON'
      });
      return {};
    }
  }

  /**
   * kintoneレコードを作成（初期データ用）
   */
  static createInitialRecord(cuts: CutData[], events: unknown[], memoData: Record<string, string> = {}): Partial<KintoneRecord> {
    return {
      cutDataJson: this.createFieldValue(this.cutsToJson(cuts)),
      eventsJson: this.createFieldValue(this.eventsToJson(events)),
      memoJson: this.createFieldValue(this.memoToJson(memoData)),
      version: this.createFieldValue('1'),
      cutNumber: this.createFieldValue(''), // 必要に応じて設定
      status: this.createFieldValue('') // 必要に応じて設定
    };
  }

  /**
   * フィールド値を作成
   */
  private static createFieldValue<T>(value: T): KintoneFieldValue<T> {
    return { value };
  }
}