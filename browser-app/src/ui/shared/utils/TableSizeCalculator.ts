/**
 * TableSizeCalculator
 * テーブルのサイズ計算ロジックを一元管理
 * CSS変数と同期して一貫性のあるサイズを提供
 */
export class TableSizeCalculator {
  // 基本サイズ定数（CSS変数と同期）
  private static readonly TABLE_ROW_HEIGHT = 20;
  private static readonly TABLE_HEADER_HEIGHT = 28;
  private static readonly TABLE_CELL_PADDING_Y = 2;
  private static readonly BORDER_WIDTH = 1;
  private static readonly BORDER_WIDTH_THICK = 2;

  // 固定列の幅（CSS変数と同期）
  private static readonly FIXED_COLUMN_WIDTHS = {
    cutNumber: 90,    // 1列目：カット番号
    status: 120,      // 2列目：ステータス
  };

  /**
   * グループヘッダーの高さを取得
   * @returns グループヘッダーの高さ（border込み）
   */
  public static getGroupHeaderHeight(): number {
    // table-row-height + border-bottom (thick)
    return this.TABLE_ROW_HEIGHT + this.BORDER_WIDTH_THICK;
  }

  /**
   * フィールドヘッダーの固定位置を取得
   * @returns フィールドヘッダーのtop位置
   */
  public static getFieldHeaderPosition(): number {
    return this.getGroupHeaderHeight();
  }

  /**
   * 固定列の幅を取得
   * @param columnIndex 列インデックス（1から開始）
   * @returns 列の幅（undefined if not fixed）
   */
  public static getFixedColumnWidth(columnIndex: number): number | undefined {
    switch (columnIndex) {
      case 1:
        return this.FIXED_COLUMN_WIDTHS.cutNumber;
      case 2:
        return this.FIXED_COLUMN_WIDTHS.status;
      default:
        return undefined;
    }
  }

  /**
   * 固定列の左位置を取得
   * @param columnIndex 列インデックス（1から開始）
   * @returns 列の左位置（累積幅）
   */
  public static getFixedColumnOffset(columnIndex: number): number {
    let offset = 0;
    
    for (let i = 1; i < columnIndex; i++) {
      const width = this.getFixedColumnWidth(i);
      if (width !== undefined) {
        offset += width;
      }
    }
    
    return offset;
  }

  /**
   * セルの実際の高さを取得（padding込み）
   * @returns セルの高さ
   */
  public static getCellComputedHeight(): number {
    return this.TABLE_ROW_HEIGHT + (this.TABLE_CELL_PADDING_Y * 2);
  }

  /**
   * ヘッダーの実際の高さを取得（padding込み）
   * @returns ヘッダーの高さ
   */
  public static getHeaderComputedHeight(): number {
    return this.TABLE_HEADER_HEIGHT + (this.TABLE_CELL_PADDING_Y * 2);
  }

  /**
   * CSS変数を動的に設定
   * @param element ルート要素（通常はdocument.documentElement）
   */
  public static applyCSSVariables(element: HTMLElement = document.documentElement): void {
    const style = element.style;

    // 計算済み変数を設定
    style.setProperty('--group-header-computed-height', `${this.getGroupHeaderHeight()}px`);
    style.setProperty('--field-header-sticky-top', `${this.getFieldHeaderPosition()}px`);
    
    // 固定列の幅を設定
    style.setProperty('--fixed-column-1-actual-width', `${this.FIXED_COLUMN_WIDTHS.cutNumber}px`);
    style.setProperty('--fixed-column-2-actual-width', `${this.FIXED_COLUMN_WIDTHS.status}px`);
    
    // 固定列のオフセットを設定
    style.setProperty('--fixed-column-2-offset', `${this.getFixedColumnOffset(2)}px`);
  }

  /**
   * デバッグ情報を出力
   */
  public static debugSizes(): void {
    console.group('TableSizeCalculator Debug Info');
    console.log('Group Header Height:', this.getGroupHeaderHeight());
    console.log('Field Header Position:', this.getFieldHeaderPosition());
    console.log('Fixed Column 1 Width:', this.getFixedColumnWidth(1));
    console.log('Fixed Column 2 Width:', this.getFixedColumnWidth(2));
    console.log('Fixed Column 2 Offset:', this.getFixedColumnOffset(2));
    console.log('Cell Computed Height:', this.getCellComputedHeight());
    console.log('Header Computed Height:', this.getHeaderComputedHeight());
    console.groupEnd();
  }
}