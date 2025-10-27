/**
 * データ処理の統一ユーティリティ
 * 583箇所のデータ処理パターンを統一化
 */

import { DateHelper } from './DateHelper';
import { ValidationHelper } from './ValidationHelper';

/**
 * 日付フォーマットのプリセット
 */
export const DATE_FORMATS = {
  ISO: 'ISO',
  ISO_DATE: 'ISO_DATE',
  JP_DATE: 'JP_DATE',
  JP_DATETIME: 'JP_DATETIME',
  JP_DATE_SHORT: 'JP_DATE_SHORT',
  JP_MONTH_DAY: 'JP_MONTH_DAY',
  YYYY_MM_DD: 'YYYY_MM_DD',
  YYYY_MM_DD_SLASH: 'YYYY/MM/DD',
  CUSTOM: 'CUSTOM'
} as const;

export type DateFormatType = typeof DATE_FORMATS[keyof typeof DATE_FORMATS];

/**
 * データ処理ヘルパークラス
 * 配列、日付、オブジェクト、数値、文字列の処理を統一
 */
export class DataProcessor {
  
  // ================================================================================
  // 配列処理メソッド
  // ================================================================================
  
  /**
   * 配列から重複を除去（高優先度）
   * 使用箇所: 多数のフィルタリング処理
   */
  static unique<T>(array: T[]): T[] {
    return Array.from(new Set(array));
  }
  
  /**
   * 配列からnull/undefinedを除去（高優先度）
   * 使用箇所: データ検証、表示前処理
   */
  static compact<T>(array: (T | null | undefined)[]): NonNullable<T>[] {
    return array.filter((item): item is NonNullable<T> => item != null);
  }
  
  /**
   * 配列を指定キーでグループ化（中優先度）
   */
  static groupBy<T>(array: T[], keyGetter: (item: T) => string): Record<string, T[]> {
    return array.reduce((acc, item) => {
      const key = keyGetter(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
  
  /**
   * 配列を指定サイズのチャンクに分割（低優先度）
   */
  static chunk<T>(array: T[], size: number): T[][] {
    if (size <= 0) return [];
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  // ================================================================================
  // 日付処理メソッド
  // ================================================================================
  
  /**
   * 日付を指定フォーマットで文字列化（高優先度）
   * 使用箇所: 進捗日付、PDFエクスポート等
   * DateHelperに完全委譲
   */
  static formatDate(date: Date | string | null | undefined, format: DateFormatType = DATE_FORMATS.JP_DATE): string {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!ValidationHelper.isValidDate(d)) return '';
    
    // すべてのフォーマットをDateHelperに委譲
    switch (format) {
      case DATE_FORMATS.ISO:
        return DateHelper.format(d, 'ISO');
      
      case DATE_FORMATS.ISO_DATE:
        return DateHelper.formatDate(d); // YYYY-MM-DD形式
      
      case DATE_FORMATS.JP_DATE:
        return DateHelper.format(d, 'JP_DATE');
      
      case DATE_FORMATS.JP_DATETIME:
        return DateHelper.format(d, 'JP_DATETIME');
      
      case DATE_FORMATS.JP_DATE_SHORT:
        return DateHelper.format(d, 'JP_DATE_SHORT');
      
      case DATE_FORMATS.JP_MONTH_DAY:
        return DateHelper.format(d, 'MM/DD');
      
      case DATE_FORMATS.YYYY_MM_DD:
        return DateHelper.format(d, 'YYYY-MM-DD');
      
      case DATE_FORMATS.YYYY_MM_DD_SLASH:
        return DateHelper.format(d, 'YYYY/MM/DD');
      
      default:
        return d.toString();
    }
  }
  
  /**
   * 文字列を日付にパース（中優先度）
   */
  static parseDate(str: string | null | undefined): Date | null {
    if (!str) return null;
    
    // ISO形式
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const date = new Date(str);
      return ValidationHelper.isValidDate(date) ? date : null;
    }
    
    // 日本形式（年/月/日）
    if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(str)) {
      const date = new Date(str.replace(/\//g, '-'));
      return ValidationHelper.isValidDate(date) ? date : null;
    }
    
    // その他
    const date = new Date(str);
    return ValidationHelper.isValidDate(date) ? date : null;
  }
  
  /**
   * 2つの日付間の日数を計算（中優先度）
   */
  static getDaysBetween(date1: Date, date2: Date): number {
    const ms = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }
  
  /**
   * 週末かどうかを判定（低優先度）
   */
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }
  
  // ================================================================================
  // オブジェクト処理メソッド
  // ================================================================================
  
  /**
   * オブジェクトの深いコピー（高優先度）
   * 使用箇所: 状態管理、データ更新前のバックアップ
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as unknown as T;
    if (typeof obj !== 'object') return obj;
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  /**
   * オブジェクトの深いマージ（中優先度）
   */
  static deepMerge<T>(target: T, ...sources: Partial<T>[]): T {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!(target as Record<string, unknown>)[key]) Object.assign(target, { [key]: {} });
          this.deepMerge((target as Record<string, unknown>)[key], source[key] as Record<string, unknown>);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    
    return sources.length > 0 ? this.deepMerge(target, ...sources) : target;
  }
  
  /**
   * オブジェクトから指定キーのみを抽出（低優先度）
   */
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const picked = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        picked[key] = obj[key];
      }
    });
    return picked;
  }
  
  /**
   * オブジェクトから指定キーを除外（低優先度）
   */
  static omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const omitted = { ...obj };
    keys.forEach(key => {
      delete omitted[key];
    });
    return omitted as Omit<T, K>;
  }
  
  // ================================================================================
  // 数値処理メソッド
  // ================================================================================
  
  /**
   * 数値を指定範囲内に制限（高優先度）
   * 使用箇所: 進捗率、座標計算等
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * パーセンテージ計算と文字列化（中優先度）
   */
  static toPercentage(value: number, total: number, decimals: number = 0): string {
    if (total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
  }
  
  /**
   * 数値を指定ロケールでフォーマット（中優先度）
   */
  static formatNumber(value: number, locale: string = 'ja-JP'): string {
    return value.toLocaleString(locale);
  }
  
  /**
   * 数値配列の合計（低優先度）
   */
  static sum(numbers: number[]): number {
    return numbers.reduce((acc, num) => acc + num, 0);
  }
  
  /**
   * 数値配列の平均（低優先度）
   */
  static average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return this.sum(numbers) / numbers.length;
  }
  
  // ================================================================================
  // 文字列処理メソッド
  // ================================================================================
  
  /**
   * 文字列の最初を大文字化（低優先度）
   */
  static capitalize(str: string): string {
    if (ValidationHelper.isNullOrEmpty(str)) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * 文字列を指定長で切り詰め（中優先度）
   */
  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.slice(0, length - suffix.length) + suffix;
  }
  
  /**
   * 複数の区切り文字で文字列を分割（中優先度）
   */
  static splitByMultiple(str: string, delimiters: string[]): string[] {
    const pattern = new RegExp(`[${delimiters.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}]`);
    return str.split(pattern).filter(s => s.length > 0);
  }
  
  /**
   * null/undefinedを安全に文字列化（高優先度）
   */
  static safeString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
  }
  
  /**
   * 文字列から数値を抽出（低優先度）
   */
  static extractNumbers(str: string): number[] {
    const matches = str.match(/\d+(\.\d+)?/g);
    return matches ? matches.map(Number) : [];
  }
  
  // ================================================================================
  // ユーティリティメソッド
  // ================================================================================
  
  /**
   * オブジェクトかどうかを判定
   */
  private static isObject(item: unknown): item is object {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
  }
  
  /**
   * 値が空かどうかを判定
   * ValidationHelperの判定を活用し、配列やオブジェクトにも対応
   */
  static isEmpty(value: unknown): boolean {
    if (ValidationHelper.isNullOrEmpty(value)) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (value !== null && typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * ネストされたプロパティの値を取得
   */
  static getNestedValue(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;

    // ドット記法をサポート (例: "user.name")
    const keys = path.split('.');
    let result: any = obj;

    for (const key of keys) {
      if (result === null || result === undefined) return undefined;
      result = result[key];
    }

    return result;
  }

  /**
   * 2つの値を比較（ソート用）
   * @returns -1 (a < b), 0 (a === b), 1 (a > b)
   */
  static compareValues(a: unknown, b: unknown): number {
    // null/undefined の処理
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
    if (b === null || b === undefined) return 1;

    // 数値比較
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // 日付比較
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // 文字列比較
    const aStr = String(a);
    const bStr = String(b);
    return aStr.localeCompare(bStr);
  }

  /**
   * デバウンス処理
   */
  static debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return function (...args: Parameters<T>) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
  
  /**
   * スロットル処理
   */
  static throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;
    
    return function (...args: Parameters<T>) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}