/**
 * データ検証の統一ユーティリティ
 * 100箇所以上のデータ検証処理を統一化
 */

export class ValidationHelper {
  /**
   * null/undefined/空文字チェック（最頻出）
   */
  static isNullOrEmpty(value: unknown): boolean {
    return value === null || 
           value === undefined || 
           value === '' || 
           value === 'undefined' ||
           value === 'null';
  }
  
  /**
   * 有効な値かチェック
   */
  static hasValue(value: unknown): boolean {
    return !this.isNullOrEmpty(value);
  }
  
  /**
   * undefinedでもnullでもないことをチェック
   */
  static isDefined<T>(value: T | null | undefined): value is T {
    return value !== undefined && value !== null;
  }
  
  /**
   * 有効な日付かチェック
   */
  static isValidDate(value: unknown): boolean {
    if (!value) return false;
    
    // 特殊な値のチェック（プロジェクト特有）
    if (value === '不要' || value === 'リテイク') {
      return true; // これらは有効な進捗値として扱う
    }
    
    const date = value instanceof Date ? value : new Date(String(value));
    return !isNaN(date.getTime());
  }
  
  /**
   * 有効な数値かチェック
   */
  static isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }
  
  /**
   * 有効な整数かチェック
   */
  static isValidInteger(value: unknown): boolean {
    return this.isValidNumber(value) && Number.isInteger(value);
  }
  
  /**
   * 有効な配列かチェック
   */
  static isValidArray<T = unknown>(value: unknown): value is T[] {
    return Array.isArray(value) && value.length > 0;
  }
  
  /**
   * 空でない配列かチェック
   */
  static isNonEmptyArray<T = unknown>(value: unknown): value is T[] {
    return Array.isArray(value) && value.length > 0;
  }
  
  /**
   * 有効なオブジェクトかチェック
   */
  static isValidObject(value: unknown): value is Record<string, unknown> {
    return value !== null &&
           typeof value === 'object' &&
           !Array.isArray(value) &&
           Object.keys(value).length > 0;
  }
  
  /**
   * 空でないオブジェクトかチェック
   */
  static isNonEmptyObject(value: unknown): boolean {
    return this.isValidObject(value) && Object.keys(value).length > 0;
  }
  
  /**
   * デフォルト値の保証
   */
  static ensure<T>(value: T | null | undefined, defaultValue: T): T {
    return this.hasValue(value) ? value! : defaultValue;
  }
  
  /**
   * 配列の保証
   */
  static ensureArray<T>(value: T | T[] | null | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
  
  /**
   * 文字列の保証
   */
  static ensureString(value: unknown, defaultValue = ''): string {
    if (this.isNullOrEmpty(value)) return defaultValue;
    return String(value);
  }
  
  /**
   * 数値の保証
   */
  static ensureNumber(value: unknown, defaultValue = 0): number {
    const num = Number(value);
    return this.isValidNumber(num) ? num : defaultValue;
  }
  
  /**
   * ブール値の保証
   */
  static ensureBoolean(value: unknown, defaultValue = false): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1) return true;
    if (value === 'false' || value === 0) return false;
    return defaultValue;
  }
  
  /**
   * 範囲内チェック
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return this.isValidNumber(value) && value >= min && value <= max;
  }
  
  /**
   * 文字列長チェック
   */
  static isValidLength(value: string, minLength = 0, maxLength = Infinity): boolean {
    const str = this.ensureString(value);
    return str.length >= minLength && str.length <= maxLength;
  }
  
  /**
   * メールアドレスチェック
   */
  static isValidEmail(value: string): boolean {
    if (this.isNullOrEmpty(value)) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }
  
  /**
   * 電話番号チェック（日本）
   */
  static isValidPhoneNumber(value: string): boolean {
    if (this.isNullOrEmpty(value)) return false;
    const phoneRegex = /^[0-9]{2,4}-?[0-9]{2,4}-?[0-9]{4}$/;
    return phoneRegex.test(value.replace(/[^\d-]/g, ''));
  }
  
  /**
   * 郵便番号チェック（日本）
   */
  static isValidPostalCode(value: string): boolean {
    if (this.isNullOrEmpty(value)) return false;
    const postalRegex = /^\d{3}-?\d{4}$/;
    return postalRegex.test(value);
  }
  
  /**
   * URLチェック
   */
  static isValidUrl(value: string): boolean {
    if (this.isNullOrEmpty(value)) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * カット番号チェック（プロジェクト特有）
   */
  static isValidCutNumber(value: string): boolean {
    if (this.isNullOrEmpty(value)) return false;
    return this.isValidLength(value, 1, 10);
  }
  
  /**
   * 進捗状態チェック（プロジェクト特有）
   */
  static isValidProgressStatus(value: string): boolean {
    const validStatuses = ['未着手', '進行中', '完了', '不要', 'リテイク'];
    return validStatuses.includes(value);
  }
  
  /**
   * 複合バリデーション
   */
  static validate<T>(
    value: T,
    rules: Array<(value: T) => boolean | string>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const rule of rules) {
      const result = rule(value);
      if (result !== true) {
        errors.push(typeof result === 'string' ? result : 'Validation failed');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 必須フィールドチェック
   */
  static checkRequired<T extends Record<string, unknown>>(
    data: T,
    requiredFields: (keyof T)[]
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    for (const field of requiredFields) {
      if (this.isNullOrEmpty(data[field])) {
        missing.push(String(field));
      }
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
  
  /**
   * データのサニタイズ（XSS対策）
   */
  static sanitize(value: string): string {
    if (this.isNullOrEmpty(value)) return '';
    
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * トリミング
   */
  static trim(value: string): string {
    return this.ensureString(value).trim();
  }
  
  /**
   * 空白文字の正規化
   */
  static normalizeWhitespace(value: string): string {
    return this.ensureString(value).replace(/\s+/g, ' ').trim();
  }
  
  /**
   * 全角数字を半角に変換
   */
  static toHalfWidth(value: string): string {
    return this.ensureString(value).replace(/[０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
  }
  
  /**
   * 半角数字を全角に変換
   */
  static toFullWidth(value: string): string {
    return this.ensureString(value).replace(/[0-9]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
    });
  }
  
  /**
   * 配列のユニーク化
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }
  
  /**
   * 深い等価性チェック
   */
  static deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    
    if (a == null || b == null) return false;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }
    
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    
    if (aKeys.length !== bKeys.length) return false;
    
    return aKeys.every(key => 
      this.deepEqual((a as any)[key], (b as any)[key])
    );
  }
  
  /**
   * オブジェクトのクローン（浅いコピー）
   */
  static shallowClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (Array.isArray(obj)) return [...obj] as any;
    return { ...obj };
  }
  
  /**
   * オブジェクトのクローン（深いコピー）
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as any;
    }
    
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }
}