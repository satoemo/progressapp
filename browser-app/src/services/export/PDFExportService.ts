import { JSPDFExporter, TableColumn, PDFOptions } from '../../ui/features/export/JSPDFExporter';
import { ErrorHandler } from '../../ui/shared/utils/ErrorHandler';
import { DataProcessor } from '../../ui/shared/utils/DataProcessor';
import { DateHelper } from '../../ui/shared/utils/DateHelper';

/**
 * PDF出力統一サービス
 * 
 * 各ビューでのPDF出力処理を統一し、以下の問題を解決：
 * - エラーハンドリングの重複
 * - 設定管理の重複
 * - 文字化け問題の根本対策
 */
export class PDFExportService {

  /**
   * 単一テーブルのPDF出力
   */
  static async exportSingleTable<T>(config: {
    data: T[];
    columns: TableColumn[];
    getValue: (item: T, field: string) => string;
    title: string;
    filename?: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'a3' | 'a2' | 'a1';
    onError?: (error: Error) => void;
  }): Promise<void> {
    try {
      console.log(`PDFExportService: 単一テーブルPDF出力開始 - ${config.title}`);
      
      const options: PDFOptions = {
        title: config.title,
        filename: config.filename,
        orientation: config.orientation || 'landscape',
        pageSize: config.pageSize
      };

      await JSPDFExporter.exportTable(
        config.data,
        config.columns,
        config.getValue,
        options
      );
      
      console.log(`PDFExportService: 単一テーブルPDF出力完了 - ${config.title}`);
      
    } catch (error) {
      ErrorHandler.handle(error, 'PDFExportService.exportSingleTable', {
        showAlert: !config.onError,
        logLevel: 'error',
        customMessage: 'PDF出力に失敗しました。'
      });
      
      if (config.onError) {
        config.onError(error as Error);
      }
      
      throw error; // 呼び出し元で必要に応じて処理
    }
  }

  /**
   * 複数テーブルのPDF出力
   */
  static async exportMultipleTables<T>(config: {
    tables: Array<{
      data: T[];
      columns: TableColumn[];
      getValue: (item: T, field: string) => string;
      title: string;
    }>;
    title: string;
    filename?: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'a3' | 'a2' | 'a1';
    onError?: (error: Error) => void;
  }): Promise<void> {
    try {
      console.log(`PDFExportService: 複数テーブルPDF出力開始 - ${config.title}`);
      
      const options: PDFOptions = {
        title: config.title,
        filename: config.filename,
        orientation: config.orientation || 'landscape',
        pageSize: config.pageSize
      };

      await JSPDFExporter.exportMultipleTables(
        config.tables,
        options
      );
      
      console.log(`PDFExportService: 複数テーブルPDF出力完了 - ${config.title}`);
      
    } catch (error) {
      ErrorHandler.handle(error, 'PDFExportService.exportMultipleTables', {
        showAlert: !config.onError,
        logLevel: 'error',
        customMessage: 'PDF出力に失敗しました。'
      });
      
      if (config.onError) {
        config.onError(error as Error);
      }
      
      throw error; // 呼び出し元で必要に応じて処理
    }
  }

  /**
   * 進捗管理表専用のPDF出力
   */
  static async exportProgressTable<T>(config: {
    data: T[];
    columns: TableColumn[];
    getValue: (item: T, field: string) => string;
  }): Promise<void> {
    await this.exportSingleTable({
      ...config,
      title: '進捗管理表',
      filename: this.generateFilename('進捗管理表')
    });
  }

  /**
   * 担当者別表示専用のPDF出力（単一テーブル）
   */
  static async exportStaffTable<T>(config: {
    data: T[];
    columns: TableColumn[];
    getValue: (item: T, field: string) => string;
    roleLabel: string;
  }): Promise<void> {
    await this.exportSingleTable({
      ...config,
      title: `担当者別表示 - ${config.roleLabel}`,
      filename: this.generateFilename(`担当者別表示_${config.roleLabel}`),
      pageSize: 'a4' // 担当者別表示は常にA4サイズ
    });
  }

  /**
   * 担当者別表示専用のPDF出力（複数テーブル）
   */
  static async exportStaffMultipleTables<T>(config: {
    tables: Array<{
      data: T[];
      columns: TableColumn[];
      getValue: (item: T, field: string) => string;
      title: string;
    }>;
    roleLabel: string;
  }): Promise<void> {
    await this.exportMultipleTables({
      ...config,
      title: `担当者別表示 - ${config.roleLabel}`,
      filename: this.generateFilename(`担当者別表示_${config.roleLabel}`),
      pageSize: 'a4' // 担当者別表示は常にA4サイズ
    });
  }

  /**
   * ファイル名生成（統一形式）
   */
  private static generateFilename(baseName: string): string {
    const date = new Date();
    const dateStr = DateHelper.formatDate(date); // YYYY-MM-DD形式
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS形式
    return `${baseName}_${dateStr}_${timeStr}.pdf`;
  }

  /**
   * エラー処理の統一
   */
  static createErrorHandler(context: string): (error: Error) => void {
    return (error: Error) => {
      // エラー内容に応じたメッセージ
      let userMessage = 'PDF出力に失敗しました。';
      
      if (error.message.includes('font')) {
        userMessage = 'フォントの読み込みに失敗しました。再試行してください。';
      } else if (error.message.includes('memory')) {
        userMessage = 'データが大きすぎます。表示項目を減らして再試行してください。';
      } else if (error.message.includes('network')) {
        userMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
      }
      
      ErrorHandler.handle(error, `PDFExportService.${context}`, {
        showAlert: true,
        logLevel: 'error',
        customMessage: userMessage
      });
    };
  }

  /**
   * PDF出力前のデータ検証
   */
  static validateExportData<T>(data: T[], columns: TableColumn[]): void {
    if (!data || DataProcessor.isEmpty(data)) {
      throw new Error('出力するデータがありません。');
    }
    
    if (!columns || DataProcessor.isEmpty(columns)) {
      throw new Error('出力する列が定義されていません。');
    }
    
    // 大量データの警告
    if (data.length > 1000) {
      console.warn(`PDFExportService: 大量データ (${data.length}件) のPDF出力。処理に時間がかかる可能性があります。`);
    }
    
    // カラム数の警告
    if (columns.length > 30) {
      console.warn(`PDFExportService: 多列データ (${columns.length}列) のPDF出力。レイアウトが最適化されます。`);
    }
  }

  /**
   * 環境情報の出力（デバッグ用）
   */
  static logEnvironmentInfo(): void {
    console.log('PDFExportService Environment Info:', {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
      } : 'not available'
    });
  }
}