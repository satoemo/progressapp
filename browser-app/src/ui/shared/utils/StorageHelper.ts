/**
 * ローカルストレージ操作の統一ユーティリティ
 * 75箇所のlocalStorage操作を統一化
 */

import { ErrorHandler } from './ErrorHandler';

export interface StorageOptions {
  prefix?: string;
  ttl?: number; // Time to live in milliseconds
  compress?: boolean;
  encrypt?: boolean;
}

interface StorageItem<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

export class StorageHelper {
  private static readonly DEFAULT_PREFIX = 'kintone_';
  
  /**
   * localStorageが利用可能かチェック
   */
  static isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      // テスト書き込み
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * データ保存（最頻出パターン）
   */
  static save<T>(key: string, data: T, options: StorageOptions = {}): boolean {
    try {
      const { prefix = this.DEFAULT_PREFIX, ttl } = options;
      const fullKey = prefix + key;
      
      const item: StorageItem<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      
      const serialized = JSON.stringify(item);
      localStorage.setItem(fullKey, serialized);
      
      return true;
    } catch (error) {
      ErrorHandler.handle(error, 'StorageHelper.save', {
        fallback: false,
        logLevel: 'error'
      });
      return false;
    }
  }
  
  /**
   * データ読み込み（最頻出パターン）
   */
  static load<T>(key: string, defaultValue?: T, options: StorageOptions = {}): T | undefined {
    try {
      const { prefix = this.DEFAULT_PREFIX } = options;
      const fullKey = prefix + key;
      
      const stored = localStorage.getItem(fullKey);
      if (!stored) return defaultValue;
      
      const item: StorageItem<T> = JSON.parse(stored);
      
      // TTLチェック
      if (item.ttl) {
        const elapsed = Date.now() - item.timestamp;
        if (elapsed > item.ttl) {
          this.remove(key, options);
          return defaultValue;
        }
      }
      
      return item.data;
    } catch {
      return defaultValue;
    }
  }
  
  /**
   * 生のデータ読み込み（互換性のため）
   */
  static loadRaw(key: string, prefix: string = ''): string | null {
    try {
      const fullKey = prefix + key;
      return localStorage.getItem(fullKey);
    } catch {
      return null;
    }
  }
  
  /**
   * 生のデータ保存（互換性のため）
   */
  static saveRaw(key: string, value: string, prefix: string = ''): boolean {
    try {
      const fullKey = prefix + key;
      localStorage.setItem(fullKey, value);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 複数データの一括保存
   */
  static saveMany<T>(
    items: Record<string, T>,
    options: StorageOptions = {}
  ): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    
    Object.entries(items).forEach(([key, data]) => {
      results[key] = this.save(key, data, options);
    });
    
    return results;
  }
  
  /**
   * 複数データの一括読み込み
   */
  static loadMany<T>(
    keys: string[],
    defaultValue?: T,
    options: StorageOptions = {}
  ): Record<string, T | undefined> {
    const results: Record<string, T | undefined> = {};
    
    keys.forEach(key => {
      results[key] = this.load(key, defaultValue, options);
    });
    
    return results;
  }
  
  /**
   * データ削除
   */
  static remove(key: string, options: StorageOptions = {}): void {
    const { prefix = this.DEFAULT_PREFIX } = options;
    const fullKey = prefix + key;
    
    try {
      localStorage.removeItem(fullKey);
    } catch (error) {
      ErrorHandler.handle(error, 'StorageHelper.remove', {
        logLevel: 'warn'
      });
    }
  }
  
  /**
   * プレフィックス付きデータ全削除
   */
  static clear(prefix: string = this.DEFAULT_PREFIX): number {
    const keys = Object.keys(localStorage);
    let removed = 0;
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          localStorage.removeItem(key);
          removed++;
        } catch (error) {
          ErrorHandler.handle(error, 'StorageHelper.clear', {
            logLevel: 'warn'
          });
        }
      }
    });
    
    return removed;
  }
  
  /**
   * データ存在チェック
   */
  static exists(key: string, options: StorageOptions = {}): boolean {
    const { prefix = this.DEFAULT_PREFIX } = options;
    const fullKey = prefix + key;
    
    try {
      return localStorage.getItem(fullKey) !== null;
    } catch {
      return false;
    }
  }
  
  /**
   * ストレージ使用量の取得
   */
  static getSize(): number {
    let size = 0;
    
    try {
      Object.keys(localStorage).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          size += item.length + key.length;
        }
      });
    } catch (error) {
      ErrorHandler.handle(error, 'StorageHelper.getSize', {
        logLevel: 'warn'
      });
    }
    
    return size;
  }
  
  /**
   * ストレージ使用量の取得（MB単位）
   */
  static getSizeMB(): number {
    return this.getSize() / (1024 * 1024);
  }
  
  /**
   * データのマイグレーション
   */
  static migrate<T, U>(
    oldKey: string,
    newKey: string,
    transform?: (data: T) => U,
    options: StorageOptions = {}
  ): boolean {
    const oldData = this.load<T>(oldKey, undefined, options);
    
    if (oldData === undefined) {
      return false;
    }
    
    const newData = transform ? transform(oldData) : oldData as unknown as U;
    const saved = this.save(newKey, newData, options);
    
    if (saved) {
      this.remove(oldKey, options);
    }
    
    return saved;
  }
  
  /**
   * キャッシュのクリーンアップ（期限切れデータ削除）
   */
  static cleanup(prefix: string = this.DEFAULT_PREFIX): number {
    const keys = Object.keys(localStorage);
    let cleaned = 0;
    
    keys.forEach(key => {
      if (!key.startsWith(prefix)) return;
      
      try {
        const stored = localStorage.getItem(key);
        if (!stored) return;
        
        const item = JSON.parse(stored);
        if (item.ttl) {
          const elapsed = Date.now() - item.timestamp;
          if (elapsed > item.ttl) {
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      } catch {
        // Invalid data, remove it
        try {
          localStorage.removeItem(key);
          cleaned++;
        } catch (error) {
          ErrorHandler.handle(error, 'StorageHelper.cleanup', {
            logLevel: 'warn'
          });
        }
      }
    });
    
    return cleaned;
  }
  
  /**
   * キーの一覧取得
   */
  static getKeys(prefix: string = this.DEFAULT_PREFIX): string[] {
    const keys: string[] = [];
    
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          keys.push(key.substring(prefix.length));
        }
      });
    } catch (error) {
      ErrorHandler.handle(error, 'StorageHelper.getKeys', {
        logLevel: 'warn'
      });
    }
    
    return keys;
  }
  
  /**
   * セッションストレージへの保存（一時的なデータ用）
   */
  static saveSession<T>(key: string, data: T, prefix: string = this.DEFAULT_PREFIX): boolean {
    try {
      const fullKey = prefix + key;
      const serialized = JSON.stringify(data);
      sessionStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      ErrorHandler.handle(error, 'StorageHelper.saveSession', {
        fallback: false,
        logLevel: 'error'
      });
      return false;
    }
  }
  
  /**
   * セッションストレージからの読み込み
   */
  static loadSession<T>(key: string, defaultValue?: T, prefix: string = this.DEFAULT_PREFIX): T | undefined {
    try {
      const fullKey = prefix + key;
      const stored = sessionStorage.getItem(fullKey);
      
      if (!stored) return defaultValue;
      
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  }
  
  /**
   * セッションストレージからの削除
   */
  static removeSession(key: string, prefix: string = this.DEFAULT_PREFIX): void {
    try {
      const fullKey = prefix + key;
      sessionStorage.removeItem(fullKey);
    } catch (error) {
      ErrorHandler.handle(error, 'StorageHelper.removeSession', {
        logLevel: 'warn'
      });
    }
  }
  
  /**
   * セッションストレージのクリア
   */
  static clearSession(prefix?: string): number {
    if (!prefix) {
      const count = sessionStorage.length;
      sessionStorage.clear();
      return count;
    }
    
    const keys = Object.keys(sessionStorage);
    let removed = 0;
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          sessionStorage.removeItem(key);
          removed++;
        } catch (error) {
          ErrorHandler.handle(error, 'StorageHelper.clearSession', {
            logLevel: 'warn'
          });
        }
      }
    });
    
    return removed;
  }
  
  /**
   * JSONの安全なパース（ErrorHandler統合）
   */
  static parseJSON<T>(json: string, defaultValue: T): T {
    return ErrorHandler.parseJSON(json, defaultValue);
  }
}