import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';

/**
 * 動的スタイル管理クラス
 * インラインCSSの使用を最小限に抑え、CSS変数とクラスベースの管理を提供
 */
export class DynamicStyleManager {
  /**
   * 固定的なスタイルのためのCSSクラス定義
   */
  static readonly STYLE_CLASSES = {
    // 表示状態
    hidden: 'kdp-hidden',
    visible: 'kdp-visible',
    
    // インタラクション
    clickable: 'kdp-clickable',
    disabled: 'kdp-disabled',
    
    // アイコン状態
    iconInactive: 'kdp-icon-inactive',
    iconActive: 'kdp-icon-active',
    
    // フィルター状態
    filterActive: 'kdp-filter-active',
    
    // 位置関連
    fixedPosition: 'kdp-fixed-position',
    dynamicPosition: 'kdp-dynamic-position',
    
    // サイズ関連
    dynamicSize: 'kdp-dynamic-size',
    
    // テーブル関連
    tableCell: 'kdp-table-cell',
    table: 'kdp-table',
    fixedColumn: 'kdp-fixed-column'
  } as const;

  /**
   * CSS変数名の定義
   */
  static readonly CSS_VARS = {
    // 位置
    top: '--kdp-top',
    left: '--kdp-left',
    right: '--kdp-right',
    bottom: '--kdp-bottom',
    
    // サイズ
    width: '--kdp-width',
    height: '--kdp-height',
    minWidth: '--kdp-min-width',
    maxWidth: '--kdp-max-width',
    
    // その他
    opacity: '--kdp-opacity',
    zIndex: '--kdp-z-index'
  } as const;

  /**
   * 要素の表示/非表示を制御
   * @param element 対象要素
   * @param visible 表示状態
   */
  static setVisibility(element: HTMLElement, visible: boolean): void {
    if (visible) {
      element.classList.remove(this.STYLE_CLASSES.hidden);
      element.classList.add(this.STYLE_CLASSES.visible);
    } else {
      element.classList.remove(this.STYLE_CLASSES.visible);
      element.classList.add(this.STYLE_CLASSES.hidden);
    }
  }

  /**
   * 動的な値をCSS変数として設定
   * @param element 対象要素
   * @param styles スタイル定義
   */
  static setDynamicStyles(
    element: HTMLElement,
    styles: {
      top?: number | string;
      left?: number | string;
      right?: number | string;
      bottom?: number | string;
      width?: number | string;
      height?: number | string;
      minWidth?: number | string;
      maxWidth?: number | string;
      opacity?: number;
      zIndex?: number;
    }
  ): void {
    // 動的位置・サイズクラスを追加
    if (ValidationHelper.isDefined(styles.top) || ValidationHelper.isDefined(styles.left) || 
        ValidationHelper.isDefined(styles.right) || ValidationHelper.isDefined(styles.bottom)) {
      element.classList.add(this.STYLE_CLASSES.dynamicPosition);
    }
    
    if (ValidationHelper.isDefined(styles.width) || ValidationHelper.isDefined(styles.height) ||
        ValidationHelper.isDefined(styles.minWidth) || ValidationHelper.isDefined(styles.maxWidth)) {
      element.classList.add(this.STYLE_CLASSES.dynamicSize);
    }

    // CSS変数を設定
    Object.entries(styles).forEach(([property, value]) => {
      if (ValidationHelper.isDefined(value)) {
        const cssVar = this.CSS_VARS[property as keyof typeof this.CSS_VARS];
        if (cssVar) {
          const formattedValue = this.formatValue(property, value);
          element.style.setProperty(cssVar, formattedValue);
        }
      }
    });
  }


  /**
   * 固定スタイルクラスを追加
   * @param element 対象要素
   * @param classNames 追加するクラス名
   */
  static addStyleClasses(
    element: HTMLElement,
    ...classNames: (keyof typeof DynamicStyleManager.STYLE_CLASSES)[]
  ): void {
    classNames.forEach(className => {
      const cssClass = this.STYLE_CLASSES[className];
      if (cssClass) {
        element.classList.add(cssClass);
      }
    });
  }

  /**
   * 固定スタイルクラスを削除
   * @param element 対象要素
   * @param classNames 削除するクラス名
   */
  static removeStyleClasses(
    element: HTMLElement,
    ...classNames: (keyof typeof DynamicStyleManager.STYLE_CLASSES)[]
  ): void {
    classNames.forEach(className => {
      const cssClass = this.STYLE_CLASSES[className];
      if (cssClass) {
        element.classList.remove(cssClass);
      }
    });
  }

  /**
   * 値のフォーマット
   * @param property プロパティ名
   * @param value 値
   * @returns フォーマットされた値
   */
  private static formatValue(property: string, value: number | string): string {
    // 数値の場合、位置やサイズ関連はpx単位を付与
    if (typeof value === 'number') {
      switch (property) {
        case 'opacity':
        case 'zIndex':
          return value.toString();
        default:
          return `${value}px`;
      }
    }
    
    // 文字列の場合はそのまま返す
    return value;
  }

  /**
   * テーブルセルのスタイルを設定
   * @param element テーブルセル要素（td/th）
   * @param width 幅（ピクセル値）
   */
  static setTableCellStyles(element: HTMLTableCellElement, width: number): void {
    element.style.setProperty('--kdp-width', `${width}px`);
    element.style.setProperty('--kdp-min-width', `${width}px`);
    element.style.setProperty('--kdp-max-width', `${width}px`);
    element.classList.add(this.STYLE_CLASSES.tableCell);
  }

  /**
   * テーブル要素の幅を設定
   * @param element テーブル要素
   * @param width 幅（ピクセル値）
   */
  static setTableWidth(element: HTMLTableElement, width: number): void {
    element.style.setProperty('--kdp-width', `${width}px`);
    element.classList.add(this.STYLE_CLASSES.table);
  }

  /**
   * 固定カラムの位置を設定
   * @param element テーブルセル要素
   * @param left 左端からの位置（ピクセル値）
   */
  static setFixedColumnPosition(element: HTMLTableCellElement, left: number): void {
    element.style.setProperty('--kdp-left', `${left}px`);
    element.classList.add(this.STYLE_CLASSES.fixedColumn);
  }
}