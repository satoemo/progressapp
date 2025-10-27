/**
 * フィールド値のフォーマット処理を統一管理
 * 単一責任の原則に基づき、フォーマット処理を分離
 */

import { PROGRESS_STATUS, FIELD_TYPES } from '../constants/TableConstants';
import { DataProcessor, DATE_FORMATS } from '../utils/DataProcessor';
import { ValidationHelper } from '../utils/ValidationHelper';
import { DateHelper } from '../utils/DateHelper';

export class FieldFormatter {
  /**
   * フィールド値を適切な形式にフォーマット
   */
  static formatFieldValue(value: unknown, type?: string): string {
    if (value === null || value === undefined || value === '') return '';
    
    switch (type) {
      case FIELD_TYPES.CURRENCY:
        return this.formatCurrency(value as string | number | null | undefined);
      case FIELD_TYPES.DATE:
        return this.formatDate(value as string | Date | null | undefined);
      case FIELD_TYPES.PROGRESS:
        return this.formatProgress(value as string | number | null | undefined);
      default:
        return value.toString();
    }
  }

  /**
   * 通貨形式のフォーマット
   */
  static formatCurrency(value: string | number | null | undefined): string {
    const num = ValidationHelper.ensureNumber(value, 0);
    if (!ValidationHelper.isValidNumber(num)) return '';
    return `¥${num.toLocaleString()}`;
  }

  /**
   * 日付形式のフォーマット
   */
  static formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    
    try {
      // YYYY-MM-DD形式を想定
      const date = new Date(value);
      if (isNaN(date.getTime())) return value.toString();
      
      return DateHelper.formatDate(date); // YYYY-MM-DD形式で出力
    } catch {
      return value.toString();
    }
  }

  /**
   * 進捗形式のフォーマット
   */
  static formatProgress(value: string | number | null | undefined): string {
    if (!value) return '';
    
    const str = value.toString().toLowerCase();
    
    // 不要チェック
    if (PROGRESS_STATUS.NOT_REQUIRED.includes(str)) {
      return '不要';
    }
    
    // リテイクチェック
    if (PROGRESS_STATUS.RETAKE.includes(str)) {
      return 'リテイク';
    }
    
    // それ以外は日付として扱う
    return this.formatDate(value as string | Date | null | undefined);
  }

  /**
   * 数値を枚数形式でフォーマット
   */
  static formatMaisu(value: string | number | null | undefined): string {
    const num = Math.floor(ValidationHelper.ensureNumber(value, 0));
    if (!ValidationHelper.isValidInteger(num)) return '0枚';
    return `${num}枚`;
  }

  /**
   * パーセンテージ形式のフォーマット
   */
  static formatPercentage(value: number): string {
    return `${Math.round(value)}%`;
  }
}