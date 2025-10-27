/**
 * jsPDF代替PDFエクスポーター
 * pdfMakeと完全に同じAPI・仕様を提供
 */
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { MPLUS_REGULAR_DATA, MPLUS_BOLD_DATA } from './FontData';
import { ErrorHandler } from '../../shared/utils/ErrorHandler';
import { DataProcessor, DATE_FORMATS } from '../../shared/utils/DataProcessor';
import { DateHelper } from '../../shared/utils/DateHelper';

export interface TableColumn {
  field: string;
  title: string;
  width?: number; // 担当者別表示での列幅指定用（オプション）
}

export interface PDFOptions {
  title: string;
  filename?: string;
  pageSize?: 'a4' | 'a3' | 'a2' | 'a1';
  orientation?: 'portrait' | 'landscape';
}

/**
 * jsPDFベースPDFエクスポーター
 */
export class JSPDFExporter {
  
  /**
   * M+フォントをjsPDFに登録
   * @returns フォント登録に成功した場合はtrue
   */
  private static registerFonts(doc: jsPDF): boolean {
    try {
      // M+ Regular フォント登録
      doc.addFileToVFS('MPlusRegular.ttf', MPLUS_REGULAR_DATA);
      doc.addFont('MPlusRegular.ttf', 'MPlus', 'normal');
      
      // M+ Bold フォント登録  
      doc.addFileToVFS('MPlusBold.ttf', MPLUS_BOLD_DATA);
      doc.addFont('MPlusBold.ttf', 'MPlus', 'bold');
      
      console.log('M+ fonts successfully registered');
      return true;
    } catch (error) {
      ErrorHandler.handle(error, 'JSPDFExporter.registerFonts', {
        logLevel: 'warn',
        customMessage: 'Failed to register M+ fonts, falling back to helvetica'
      });
      return false;
    }
  }
  
  /**
   * 使用するフォント名を取得（フォールバック対応）
   */
  private static getFontName(fontsRegistered: boolean): string {
    return fontsRegistered ? 'MPlus' : 'helvetica';
  }
  
  /**
   * テーブルをPDF出力（元実装と同じAPI）
   */
  static async exportTable<T>(
    data: T[],
    columns: TableColumn[],
    getValue: (item: T, field: string) => string,
    options: PDFOptions
  ): Promise<void> {
    
    const columnCount = columns.length;
    const fontSize = this.getFontSize(columnCount);
    const headerFontSize = this.getHeaderFontSize(columnCount);
    // pageSizeが明示指定されている場合はそれを使用、そうでなければ列数で自動決定
    const pageSize = options.pageSize ? options.pageSize.toUpperCase() : this.getPageSize(columnCount);
    const margins = this.getPageMargins(columnCount);
    
    // jsPDF設定（元実装と同じサイズ計算）
    const orientation = options.orientation || 'landscape';
    const format = pageSize.toLowerCase() as 'a4' | 'a3' | 'a2' | 'a1';
    
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'pt',
      format: format
    });
    
    // M+フォント登録
    const fontsRegistered = this.registerFonts(doc);
    
    // タイトルを追加（元実装と同じスタイル）
    doc.setFontSize(14);
    doc.setFont(this.getFontName(fontsRegistered), 'bold');
    const pageWidth = doc.internal.pageSize.getWidth();
    const titleWidth = doc.getTextWidth(options.title);
    const titleX = (pageWidth - titleWidth) / 2;
    doc.text(options.title, titleX, margins[1] + 14);
    
    // テーブルデータの準備
    const tableColumns = columns.map(col => ({
      header: col.title,
      dataKey: col.field
    }));
    
    const tableData = data.map(item => {
      const row: { [key: string]: string } = {};
      columns.forEach(col => {
        row[col.field] = DataProcessor.safeString(getValue(item, col.field));
      });
      return row;
    });
    
    // AutoTableでテーブル描画（元実装のスタイルを再現）
    const columnStyles = this.getColumnStyles(columnCount, columns);
    const tableOptions: UserOptions = {
      columns: tableColumns,
      body: tableData,
      startY: margins[1] + 40, // タイトル下のマージン
      margin: {
        top: margins[1],
        right: margins[2],
        bottom: margins[3],
        left: margins[0]
      },
      tableWidth: 'auto', // テーブル幅を自動調整
      styles: {
        fontSize: fontSize,
        font: this.getFontName(fontsRegistered)
      },
      headStyles: {
        fillColor: [221, 221, 221], // #DDDDDD
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: headerFontSize,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: fontSize
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248] // #F8F8F8（縞模様）
      },
      columnStyles: columnStyles,
      didDrawPage: (data) => {
        // フッターページ番号（元実装と同じ）
        const pageNumber = data.pageNumber;
        const totalPages = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont(this.getFontName(fontsRegistered), 'normal');
        const footerText = `${pageNumber} / ${totalPages}`;
        const footerWidth = doc.getTextWidth(footerText);
        const footerX = (pageWidth - footerWidth) / 2;
        const footerY = doc.internal.pageSize.getHeight() - 10;
        doc.text(footerText, footerX, footerY);
      }
    };
    
    autoTable(doc, tableOptions);
    
    // ファイル保存
    const filename = options.filename || this.generateFilename(options.title);
    doc.save(filename);
  }

  /**
   * 複数テーブルをPDF出力（各テーブルを別ページに）
   */
  static async exportMultipleTables<T>(
    tables: Array<{
      data: T[];
      columns: TableColumn[];
      getValue: (item: T, field: string) => string;
      title: string;
    }>,
    options: PDFOptions
  ): Promise<void> {
    if (tables.length === 0) return;
    
    // 実際の最大カラム数に基づいて設定（小さい表を不適切にA1サイズにしない）
    const columnCounts = tables.map(table => table.columns.length);
    const maxColumnCount = Math.max(...columnCounts);
    
    // pageSizeが明示指定されている場合はそれを使用、そうでなければ列数で自動決定
    const pageSize = options.pageSize ? options.pageSize.toUpperCase() : this.getPageSize(maxColumnCount);
    const fontSize = this.getFontSize(maxColumnCount);
    const headerFontSize = this.getHeaderFontSize(maxColumnCount);
    const margins = this.getPageMargins(maxColumnCount);
    
    
    // jsPDF設定
    const orientation = options.orientation || 'landscape';
    const format = pageSize.toLowerCase() as 'a4' | 'a3' | 'a2' | 'a1';
    
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'pt',
      format: format
    });
    
    // M+フォント登録
    const fontsRegistered = this.registerFonts(doc);
    
    // 各テーブルを別ページに描画
    tables.forEach((table, tableIndex) => {
      if (tableIndex > 0) {
        doc.addPage();
      }
      
      // テーブルタイトルを追加
      doc.setFontSize(14);
      doc.setFont(this.getFontName(fontsRegistered), 'bold');
      const pageWidth = doc.internal.pageSize.getWidth();
      const titleWidth = doc.getTextWidth(table.title);
      const titleX = (pageWidth - titleWidth) / 2;
      doc.text(table.title, titleX, margins[1] + 14);
      
      // テーブルデータの準備
      const tableColumns = table.columns.map(col => ({
        header: col.title,
        dataKey: col.field
      }));
      
      const tableData = table.data.map(item => {
        const row: { [key: string]: string } = {};
        table.columns.forEach(col => {
          row[col.field] = DataProcessor.safeString(table.getValue(item, col.field));
        });
        return row;
      });
      
      // AutoTableでテーブル描画
      const columnStyles = this.getColumnStyles(table.columns.length, table.columns);
      const tableOptions: UserOptions = {
        columns: tableColumns,
        body: tableData,
        startY: margins[1] + 40, // タイトル下のマージン
        margin: {
          top: margins[1],
          right: margins[2],
          bottom: margins[3],
          left: margins[0]
        },
        tableWidth: 'auto', // テーブル幅を自動調整
        styles: {
          fontSize: fontSize,
          font: this.getFontName(fontsRegistered)
        },
        headStyles: {
          fillColor: [221, 221, 221], // #DDDDDD
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: headerFontSize,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: fontSize
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248] // #F8F8F8（縞模様）
        },
        columnStyles: columnStyles,
        didDrawPage: (data) => {
          // フッターページ番号
          const pageNumber = data.pageNumber;
          const totalPages = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont(this.getFontName(fontsRegistered), 'normal');
          const footerText = `${pageNumber} / ${totalPages}`;
          const footerWidth = doc.getTextWidth(footerText);
          const footerX = (pageWidth - footerWidth) / 2;
          const footerY = doc.internal.pageSize.getHeight() - 10;
          doc.text(footerText, footerX, footerY);
        }
      };
      
      autoTable(doc, tableOptions);
    });
    
    // ファイル保存
    const filename = options.filename || this.generateFilename(options.title);
    doc.save(filename);
  }
  
  /**
   * カラム数に応じたページサイズ選択（LO対応で調整）
   */
  private static getPageSize(columnCount: number): string {
    if (columnCount <= 5) return 'a4';
    if (columnCount <= 8) return 'a3';
    if (columnCount <= 15) return 'a2'; // LOの13列もA2サイズで適切に表示
    return 'a1';
  }
  
  /**
   * カラム数に応じたフォントサイズ（LO対応で調整）
   */
  private static getFontSize(columnCount: number): number {
    if (columnCount <= 5) return 8;
    if (columnCount <= 8) return 7;
    if (columnCount <= 15) return 6; // LOの13列もフォントサイズ6で読みやすく
    if (columnCount <= 20) return 5;
    return 4;
  }
  
  /**
   * ヘッダーフォントサイズ（元実装と同じ）
   */
  private static getHeaderFontSize(columnCount: number): number {
    const bodyFontSize = this.getFontSize(columnCount);
    return bodyFontSize === 4 ? 4 : Math.max(bodyFontSize - 1, 4);
  }
  
  /**
   * ページマージン（LO対応で調整）
   */
  private static getPageMargins(columnCount: number): number[] {
    if (columnCount <= 8) return [20, 40, 20, 40];
    if (columnCount <= 15) return [15, 30, 15, 30]; // LOの13列も適切なマージンで
    if (columnCount <= 20) return [10, 25, 10, 25];
    return [8, 20, 8, 20];
  }
  
  /**
   * カラムスタイル（元実装の幅計算を再現）
   */
  private static getColumnStyles(columnCount: number, columns?: TableColumn[]): { [key: string]: any } {
    // 個別の列幅が指定されている場合の処理
    if (columns && columns.some(col => col.width)) {
      const columnStyles: { [key: string]: any } = {};
      let totalCustomWidth = 0;
      let customColumnCount = 0;
      
      // カスタム幅の合計を計算
      columns.forEach((col) => {
        if (col.width) {
          totalCustomWidth += col.width;
          customColumnCount++;
        }
      });
      
      // カスタム幅が小さすぎる場合は最小幅を確保
      const minTableWidth = 500; // テーブル全体の最小幅（適度なサイズを確保）
      if (totalCustomWidth < minTableWidth) {
        const scale = minTableWidth / totalCustomWidth;
        columns.forEach((col, index) => {
          if (col.width) {
            columnStyles[index] = { cellWidth: Math.max(25, col.width * scale) };
          }
        });
      } else {
        columns.forEach((col, index) => {
          if (col.width) {
            columnStyles[index] = { cellWidth: Math.max(25, col.width) };
          }
        });
      }
      
      return columnStyles;
    }
    
    if (columnCount <= 12) {
      // 均等配分
      return {};
    }
    
    // 固定幅で収める（元実装と同じ計算）
    const availableWidth = columnCount <= 20 ? 800 : 2300;
    const fixedWidth = Math.max(25, availableWidth / columnCount);
    
    const columnStyles: { [key: string]: any } = {};
    for (let i = 0; i < columnCount; i++) {
      columnStyles[i] = { cellWidth: fixedWidth };
    }
    return columnStyles;
  }
  
  /**
   * ファイル名生成（元実装と同じ）
   */
  private static generateFilename(title: string): string {
    const date = DateHelper.formatDate(new Date()); // YYYY-MM-DD形式
    return `${title}_${date}.pdf`;
  }
}