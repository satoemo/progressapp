/**
 * 統一されたエラーハンドリングユーティリティ
 * 136箇所に散在するエラー処理を一元化
 */

/**
 * エラー分類
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN'
}

/**
 * エラーコード体系
 */
export enum ErrorCode {
  // ネットワークエラー (1xxx)
  NETWORK_TIMEOUT = 'ERR_1001',
  NETWORK_OFFLINE = 'ERR_1002',
  NETWORK_FETCH_FAILED = 'ERR_1003',
  
  // バリデーションエラー (2xxx)
  VALIDATION_REQUIRED = 'ERR_2001',
  VALIDATION_FORMAT = 'ERR_2002',
  VALIDATION_RANGE = 'ERR_2003',
  
  // 権限エラー (3xxx)
  PERMISSION_DENIED = 'ERR_3001',
  PERMISSION_EXPIRED = 'ERR_3002',
  PERMISSION_INSUFFICIENT = 'ERR_3003',
  
  // システムエラー (4xxx)
  SYSTEM_STORAGE_FULL = 'ERR_4001',
  SYSTEM_MEMORY_ERROR = 'ERR_4002',
  SYSTEM_INTERNAL = 'ERR_4003',
  
  // 不明なエラー (9xxx)
  UNKNOWN_ERROR = 'ERR_9999'
}

/**
 * ユーザー向けメッセージ定義
 */
const USER_MESSAGES: Record<ErrorCode, string> = {
  // ネットワークエラー
  [ErrorCode.NETWORK_TIMEOUT]: 'ネットワーク接続がタイムアウトしました。接続状況を確認してください。',
  [ErrorCode.NETWORK_OFFLINE]: 'オフラインです。インターネット接続を確認してください。',
  [ErrorCode.NETWORK_FETCH_FAILED]: 'データの取得に失敗しました。しばらく待ってから再度お試しください。',
  
  // バリデーションエラー
  [ErrorCode.VALIDATION_REQUIRED]: '必須項目が入力されていません。',
  [ErrorCode.VALIDATION_FORMAT]: '入力形式が正しくありません。',
  [ErrorCode.VALIDATION_RANGE]: '入力値が有効な範囲を超えています。',
  
  // 権限エラー
  [ErrorCode.PERMISSION_DENIED]: 'この操作を実行する権限がありません。',
  [ErrorCode.PERMISSION_EXPIRED]: 'セッションの有効期限が切れました。再度ログインしてください。',
  [ErrorCode.PERMISSION_INSUFFICIENT]: '権限が不足しています。管理者にお問い合わせください。',
  
  // システムエラー
  [ErrorCode.SYSTEM_STORAGE_FULL]: 'ストレージの空き容量が不足しています。',
  [ErrorCode.SYSTEM_MEMORY_ERROR]: 'メモリエラーが発生しました。ページを再読み込みしてください。',
  [ErrorCode.SYSTEM_INTERNAL]: 'システムエラーが発生しました。管理者にお問い合わせください。',
  
  // 不明なエラー
  [ErrorCode.UNKNOWN_ERROR]: '予期しないエラーが発生しました。'
};

/**
 * エラー詳細情報
 */
export interface ErrorDetail {
  type: ErrorType;
  code: ErrorCode;
  context: string;
  message: string;
  userMessage: string;
  timestamp: number;
  metadata?: Record<string, any>;
  stack?: string;
}

export interface ErrorOptions {
  showAlert?: boolean;
  fallback?: any;
  rethrow?: boolean;
  logLevel?: 'error' | 'warn' | 'info';
  customMessage?: string;
  metadata?: Record<string, any>;
  errorType?: ErrorType;
  errorCode?: ErrorCode;
}

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
  retryableErrors?: ErrorType[];
}

export class ErrorHandler {
  private static errorCounts = new Map<string, number>();
  private static errorHistory: ErrorDetail[] = [];
  private static readonly MAX_HISTORY = 100;
  
  /**
   * 汎用エラーハンドリング
   */
  static handle(error: unknown, context: string, options: ErrorOptions = {}): any {
    const {
      showAlert = false,
      fallback = undefined,
      rethrow = false,
      logLevel = 'error',
      customMessage,
      metadata,
      errorType,
      errorCode
    } = options;
    
    const message = customMessage || this.formatError(error);
    const type = errorType || this.classifyError(error);
    const code = errorCode || this.determineErrorCode(error, type);
    const userMessage = this.getUserMessage(code, customMessage);
    
    // エラー詳細の記録
    const errorDetail: ErrorDetail = {
      type,
      code,
      context,
      message,
      userMessage,
      timestamp: Date.now(),
      metadata,
      stack: error instanceof Error ? error.stack : undefined
    };
    this.recordErrorDetail(errorDetail);
    
    // エラー頻度の記録
    this.recordError(context);
    
    // 開発者向け詳細ログ（改善版）
    this.logDeveloperInfo(errorDetail, error, logLevel);
    
    // アラート表示（ユーザー向けメッセージを使用）
    if (showAlert) {
      console.error(userMessage);
    }
    
    // 再スロー
    if (rethrow) {
      throw error;
    }
    
    return fallback;
  }
  
  /**
   * 非同期処理のエラーハンドリング
   */
  static async handleAsync<T>(
    fn: () => Promise<T>,
    context: string,
    fallback?: T,
    options?: ErrorOptions
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      return this.handle(error, context, { fallback, ...options });
    }
  }
  
  /**
   * リトライ機能付きエラーハンドリング（改善版）
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    context: string,
    options: RetryOptions = {}
  ): Promise<T> {
    const { 
      maxRetries = 3, 
      delay = 1000, 
      backoff = true,
      retryableErrors = [ErrorType.NETWORK, ErrorType.SYSTEM]
    } = options;
    
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const errorType = this.classifyError(error);
        
        // リトライ可能なエラーかチェック
        if (!retryableErrors.includes(errorType)) {
          console.error(`[${context}] Non-retryable error (${errorType}):`, error);
          throw error;
        }
        
        console.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed (${errorType}):`, error);
        
        if (attempt < maxRetries) {
          // 指数バックオフ（2のべき乗で増加）
          const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
          console.info(`[${context}] Retrying in ${waitTime}ms...`);
          await this.sleep(waitTime);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * JSONパース専用エラーハンドリング
   */
  static parseJSON<T>(json: string, fallback: T): T {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }
  
  /**
   * バッチ処理のエラーハンドリング
   */
  static async handleBatch<T>(
    tasks: Array<() => Promise<T>>,
    context: string
  ): Promise<Array<{ success: boolean; result?: T; error?: unknown }>> {
    return Promise.all(
      tasks.map(async (task) => {
        try {
          const result = await task();
          return { success: true, result };
        } catch (error) {
          console.error(`[${context}] Batch task failed:`, error);
          return { success: false, error };
        }
      })
    );
  }
  
  /**
   * 同期処理のラップ
   */
  static wrap<T>(fn: () => T, context: string, fallback?: T): T | undefined {
    try {
      return fn();
    } catch (error) {
      return this.handle(error, context, { fallback });
    }
  }
  
  /**
   * エラーメッセージのフォーマット
   */
  private static formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'Unknown error occurred';
  }
  
  /**
   * エラー頻度の記録
   */
  private static recordError(context: string): void {
    const count = this.errorCounts.get(context) || 0;
    this.errorCounts.set(context, count + 1);
  }
  
  /**
   * 遅延処理用のユーティリティ
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * エラー統計の取得
   */
  static getStatistics(): Map<string, number> {
    return new Map(this.errorCounts);
  }
  
  /**
   * エラー統計のリセット
   */
  static resetStatistics(): void {
    this.errorCounts.clear();
  }
  
  /**
   * エラー統計のサマリー取得
   */
  static getStatisticsSummary(): { total: number; byContext: Record<string, number> } {
    const byContext: Record<string, number> = {};
    let total = 0;
    
    this.errorCounts.forEach((count, context) => {
      byContext[context] = count;
      total += count;
    });
    
    return { total, byContext };
  }
  
  /**
   * エラー分類の判定
   */
  private static classifyError(error: unknown): ErrorType {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // ネットワークエラー
      if (message.includes('network') || 
          message.includes('fetch') || 
          message.includes('timeout') ||
          message.includes('connection')) {
        return ErrorType.NETWORK;
      }
      
      // バリデーションエラー
      if (message.includes('validation') || 
          message.includes('invalid') || 
          message.includes('required')) {
        return ErrorType.VALIDATION;
      }
      
      // 権限エラー
      if (message.includes('permission') || 
          message.includes('unauthorized') || 
          message.includes('forbidden')) {
        return ErrorType.PERMISSION;
      }
      
      // システムエラー
      if (message.includes('system') || 
          message.includes('internal') || 
          message.includes('critical')) {
        return ErrorType.SYSTEM;
      }
    }
    
    return ErrorType.UNKNOWN;
  }
  
  /**
   * エラー詳細の記録
   */
  private static recordErrorDetail(detail: ErrorDetail): void {
    this.errorHistory.unshift(detail);
    
    // 履歴の最大数を超えた場合は古いものを削除
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_HISTORY);
    }
  }
  
  /**
   * エラー履歴の取得
   */
  static getErrorHistory(limit?: number): ErrorDetail[] {
    if (limit) {
      return this.errorHistory.slice(0, limit);
    }
    return [...this.errorHistory];
  }
  
  /**
   * エラーレポートの生成
   */
  static generateReport(since?: number): {
    summary: {
      total: number;
      byType: Record<ErrorType, number>;
      byContext: Record<string, number>;
      timeRange: {
        start: number;
        end: number;
      };
    };
    topErrors: Array<{
      context: string;
      count: number;
      lastOccurred: number;
    }>;
    recentErrors: ErrorDetail[];
  } {
    const sinceTime = since || Date.now() - 24 * 60 * 60 * 1000; // デフォルト24時間
    const relevantErrors = this.errorHistory.filter(e => e.timestamp >= sinceTime);
    
    // タイプ別集計
    const byType: Record<ErrorType, number> = {
      [ErrorType.NETWORK]: 0,
      [ErrorType.VALIDATION]: 0,
      [ErrorType.PERMISSION]: 0,
      [ErrorType.SYSTEM]: 0,
      [ErrorType.UNKNOWN]: 0
    };
    
    relevantErrors.forEach(error => {
      byType[error.type]++;
    });
    
    // コンテキスト別集計
    const byContext: Record<string, number> = {};
    const contextLastOccurred: Record<string, number> = {};
    
    relevantErrors.forEach(error => {
      byContext[error.context] = (byContext[error.context] || 0) + 1;
      contextLastOccurred[error.context] = Math.max(
        contextLastOccurred[error.context] || 0,
        error.timestamp
      );
    });
    
    // トップエラーの抽出
    const topErrors = Object.entries(byContext)
      .map(([context, count]) => ({
        context,
        count,
        lastOccurred: contextLastOccurred[context]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      summary: {
        total: relevantErrors.length,
        byType,
        byContext,
        timeRange: {
          start: sinceTime,
          end: Date.now()
        }
      },
      topErrors,
      recentErrors: relevantErrors.slice(0, 10)
    };
  }
  
  /**
   * エラー履歴のクリア
   */
  static clearHistory(): void {
    this.errorHistory = [];
  }
  
  /**
   * フォールバック処理付きラッパー
   */
  static withFallback<T>(
    tryFn: () => T,
    fallbackFn: () => T,
    context: string
  ): T {
    try {
      return tryFn();
    } catch (error) {
      console.warn(`[${context}] Using fallback due to error:`, error);
      return fallbackFn();
    }
  }
  
  /**
   * エラーコードの判定
   */
  private static determineErrorCode(error: unknown, type: ErrorType): ErrorCode {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      switch (type) {
        case ErrorType.NETWORK:
          if (message.includes('timeout')) return ErrorCode.NETWORK_TIMEOUT;
          if (message.includes('offline')) return ErrorCode.NETWORK_OFFLINE;
          return ErrorCode.NETWORK_FETCH_FAILED;
          
        case ErrorType.VALIDATION:
          if (message.includes('required')) return ErrorCode.VALIDATION_REQUIRED;
          if (message.includes('format')) return ErrorCode.VALIDATION_FORMAT;
          if (message.includes('range')) return ErrorCode.VALIDATION_RANGE;
          return ErrorCode.VALIDATION_FORMAT;
          
        case ErrorType.PERMISSION:
          if (message.includes('expired')) return ErrorCode.PERMISSION_EXPIRED;
          if (message.includes('insufficient')) return ErrorCode.PERMISSION_INSUFFICIENT;
          return ErrorCode.PERMISSION_DENIED;
          
        case ErrorType.SYSTEM:
          if (message.includes('storage')) return ErrorCode.SYSTEM_STORAGE_FULL;
          if (message.includes('memory')) return ErrorCode.SYSTEM_MEMORY_ERROR;
          return ErrorCode.SYSTEM_INTERNAL;
      }
    }
    
    return ErrorCode.UNKNOWN_ERROR;
  }
  
  /**
   * ユーザー向けメッセージの取得
   */
  private static getUserMessage(code: ErrorCode, customMessage?: string): string {
    if (customMessage) {
      // カスタムメッセージが指定されている場合は優先
      return customMessage;
    }
    
    return USER_MESSAGES[code] || USER_MESSAGES[ErrorCode.UNKNOWN_ERROR];
  }
  
  /**
   * 開発者向け詳細ログ出力
   */
  private static logDeveloperInfo(
    detail: ErrorDetail,
    originalError: unknown,
    logLevel: 'error' | 'warn' | 'info'
  ): void {
    const timestamp = new Date(detail.timestamp).toISOString();
    
    // コンソールグループで構造化ログ
    console.groupCollapsed(
      `%c[${detail.code}] ${detail.context}`,
      logLevel === 'error' ? 'color: red; font-weight: bold' :
      logLevel === 'warn' ? 'color: orange; font-weight: bold' :
      'color: blue'
    );
    
    console.log('%cError Details:', 'font-weight: bold');
    console.table({
      'Error Code': detail.code,
      'Error Type': detail.type,
      'Context': detail.context,
      'Timestamp': timestamp,
      'User Message': detail.userMessage
    });
    
    if (detail.message !== detail.userMessage) {
      console.log('%cTechnical Message:', 'font-weight: bold', detail.message);
    }
    
    if (detail.metadata && Object.keys(detail.metadata).length > 0) {
      console.log('%cMetadata:', 'font-weight: bold');
      console.table(detail.metadata);
    }
    
    if (detail.stack) {
      console.log('%cStack Trace:', 'font-weight: bold');
      console.log(detail.stack);
    }
    
    console.log('%cOriginal Error:', 'font-weight: bold', originalError);
    
    console.groupEnd();
  }
}