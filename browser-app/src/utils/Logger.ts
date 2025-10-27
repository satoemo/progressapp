import { DataProcessor } from '@/ui/shared/utils/DataProcessor';

/**
 * ログレベル
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * ログエントリー
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  error?: Error;
}

/**
 * ログ設定
 */
export interface LoggerConfig {
  level: LogLevel;
  enabledCategories?: string[];
  disabledCategories?: string[];
  showTimestamp?: boolean;
  showCategory?: boolean;
  colorize?: boolean;
}

/**
 * 構造化ログシステム
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config || {
        level: LogLevel.INFO,
        showTimestamp: true,
        showCategory: true,
        colorize: true
      });
    }
    return Logger.instance;
  }

  /**
   * ログレベルを設定
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * カテゴリを有効化
   */
  enableCategory(category: string): void {
    if (!this.config.enabledCategories) {
      this.config.enabledCategories = [];
    }
    this.config.enabledCategories.push(category);
  }

  /**
   * カテゴリを無効化
   */
  disableCategory(category: string): void {
    if (!this.config.disabledCategories) {
      this.config.disabledCategories = [];
    }
    this.config.disabledCategories.push(category);
  }

  /**
   * エラーログ
   */
  error(category: string, message: string, error?: Error, data?: unknown): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  /**
   * 警告ログ
   */
  warn(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * 情報ログ
   */
  info(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * デバッグログ
   */
  debug(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * トレースログ
   */
  trace(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.TRACE, category, message, data);
  }

  /**
   * ログを記録
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: unknown,
    error?: Error
  ): void {
    // 本番環境ではERROR以外をスキップ
    if (import.meta.env.PROD && level > LogLevel.ERROR) return;

    // レベルチェック
    if (level > this.config.level) return;

    // カテゴリフィルタリング
    if (!this.isCategoryEnabled(category)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      error
    };

    // 本番環境ではメモリ保存をスキップ
    if (!import.meta.env.PROD) {
      // メモリに保存
      this.logs.push(entry);
      if (this.logs.length > this.MAX_LOGS) {
        this.logs.shift();
      }
    }

    // コンソールに出力
    this.outputToConsole(entry);
  }

  /**
   * カテゴリが有効か判定
   */
  private isCategoryEnabled(category: string): boolean {
    // 無効化リストに含まれていたら無効
    if (this.config.disabledCategories?.includes(category)) {
      return false;
    }

    // 有効化リストが定義されていない場合は全て有効
    if (!this.config.enabledCategories || this.config.enabledCategories.length === 0) {
      return true;
    }

    // 有効化リストに含まれているかチェック
    return this.config.enabledCategories.includes(category);
  }

  /**
   * コンソールに出力
   */
  private outputToConsole(entry: LogEntry): void {
    // 本番環境ではエラーのみ出力
    if (import.meta.env.PROD) {
      if (entry.level === LogLevel.ERROR) {
        console.error(entry.message, DataProcessor.safeString(entry.error));
      }
      return;
    }

    const parts: string[] = [];

    // タイムスタンプ
    if (this.config.showTimestamp) {
      parts.push(`[${entry.timestamp.toISOString()}]`);
    }

    // カテゴリ
    if (this.config.showCategory) {
      parts.push(`[${entry.category}]`);
    }

    // レベル
    parts.push(`[${LogLevel[entry.level]}]`);

    // メッセージ
    parts.push(entry.message);

    const message = parts.join(' ');

    // レベルに応じてコンソール出力
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(this.colorize(message, 'red'), entry.data, entry.error);
        break;
      case LogLevel.WARN:
        console.warn(this.colorize(message, 'yellow'), entry.data);
        break;
      case LogLevel.INFO:
        console.info(this.colorize(message, 'cyan'), entry.data);
        break;
      case LogLevel.DEBUG:
        console.debug(this.colorize(message, 'gray'), entry.data);
        break;
      case LogLevel.TRACE:
        console.trace(this.colorize(message, 'gray'), entry.data);
        break;
    }
  }

  /**
   * 色付け（ブラウザ環境でのみ有効）
   */
  private colorize(message: string, _color: string): string {
    if (!this.config.colorize || typeof window === 'undefined') {
      return message;
    }

    return `%c${message}`;
  }

  /**
   * ログを検索
   */
  searchLogs(criteria: {
    level?: LogLevel;
    category?: string;
    messagePattern?: RegExp;
    fromDate?: Date;
    toDate?: Date;
  }): LogEntry[] {
    return this.logs.filter(entry => {
      if (criteria.level !== undefined && entry.level !== criteria.level) {
        return false;
      }

      if (criteria.category && entry.category !== criteria.category) {
        return false;
      }

      if (criteria.messagePattern && !criteria.messagePattern.test(entry.message)) {
        return false;
      }

      if (criteria.fromDate && entry.timestamp < criteria.fromDate) {
        return false;
      }

      if (criteria.toDate && entry.timestamp > criteria.toDate) {
        return false;
      }

      return true;
    });
  }

  /**
   * ログをクリア
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * ログ統計を取得
   */
  getStatistics(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    this.logs.forEach(entry => {
      // レベル別集計
      const levelName = LogLevel[entry.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;

      // カテゴリ別集計
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    });

    return {
      totalLogs: this.logs.length,
      byLevel,
      byCategory
    };
  }
}

/**
 * カテゴリ別ロガーファクトリ
 */
export class LoggerFactory {
  static create(category: string): {
    error: (message: string, error?: Error, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
    trace: (message: string, data?: unknown) => void;
  } {
    const logger = Logger.getInstance();
    
    return {
      error: (message: string, error?: Error, data?: unknown) => 
        logger.error(category, message, error, data),
      warn: (message: string, data?: unknown) => 
        logger.warn(category, message, data),
      info: (message: string, data?: unknown) => 
        logger.info(category, message, data),
      debug: (message: string, data?: unknown) => 
        logger.debug(category, message, data),
      trace: (message: string, data?: unknown) => 
        logger.trace(category, message, data)
    };
  }
}