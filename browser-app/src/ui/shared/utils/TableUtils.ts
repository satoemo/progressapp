/**
 * テーブル共通ユーティリティ
 * ProgressTableとNormaTableで共通使用される機能
 */

import { DynamicStyleManager } from '@/utils/DynamicStyleManager';
import { TableEventManager } from '@/core/events/TableEventManager';
import { EventPriority } from '@/core/events/EventPriority';
import { UI_TIMING } from '../constants/TableConstants';
import { DOMBuilder } from './DOMBuilder';
import { DataProcessor, DATE_FORMATS } from './DataProcessor';
import { ValidationHelper } from './ValidationHelper';
import { DateHelper } from './DateHelper';

/**
 * ツールチップ管理
 */
export class TooltipManager {
  private tooltipTimeout: number | null = null;
  private currentTooltip: HTMLDivElement | null = null;

  /**
   * ツールチップイベントを設定
   */
  setupTooltipEvents(
    tableEventManager: TableEventManager,
    table: HTMLElement,
    getTooltipContent: (element: HTMLElement) => string | null
  ): void {
    // マウスオーバーイベント
    tableEventManager.on(
      table,
      'mouseover',
      (e) => {
        const target = e.target as HTMLElement;
        const element = target.closest('[data-tooltip]') as HTMLElement;
        
        // 既存のツールチップタイマーをクリア
        this.clearTooltipTimeout();
        
        if (element) {
          const content = getTooltipContent(element);
          if (content) {
            // ツールチップ表示遅延
            this.tooltipTimeout = window.setTimeout(() => {
              this.currentTooltip = this.showTooltip(element, content);
            }, UI_TIMING.TOOLTIP_DELAY);
          }
        }
      },
      EventPriority.LOW
    );

    // マウスアウトイベント
    tableEventManager.on(
      table,
      'mouseout',
      (e) => {
        const target = e.target as HTMLElement;
        const element = target.closest('[data-tooltip]') as HTMLElement;
        
        if (element) {
          this.hideTooltip();
        }
      },
      EventPriority.LOW
    );
  }

  /**
   * ツールチップを表示
   */
  private showTooltip(element: HTMLElement, content: string): HTMLDivElement {
    // 既存のツールチップを削除
    this.hideTooltip();

    const tooltip = DOMBuilder.create('div', {
      className: 'table-tooltip',
      textContent: content
    });
    
    DOMBuilder.append(document.body as HTMLElement, tooltip);
    
    // 位置を計算
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    let top = rect.bottom + 5;
    
    // 画面外にはみ出さないよう調整
    if (left < 5) left = 5;
    if (left + tooltipRect.width > window.innerWidth - 5) {
      left = window.innerWidth - tooltipRect.width - 5;
    }
    if (top + tooltipRect.height > window.innerHeight - 5) {
      top = rect.top - tooltipRect.height - 5;
    }
    
    DynamicStyleManager.setDynamicStyles(tooltip, {
      left,
      top,
      opacity: 1
    });
    
    return tooltip;
  }

  /**
   * ツールチップを非表示
   */
  private hideTooltip(): void {
    this.clearTooltipTimeout();
    
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
  }

  /**
   * ツールチップタイムアウトをクリア
   */
  private clearTooltipTimeout(): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.hideTooltip();
  }
}

/**
 * テーブル要素生成ヘルパー
 */
export class TableElementFactory {
  /**
   * テーブルヘッダーセルを作成
   */
  static createHeaderCell(
    content: string,
    options?: {
      className?: string;
      colspan?: number;
      dataset?: Record<string, string>;
      sortable?: boolean;
    }
  ): HTMLTableCellElement {
    const th = DOMBuilder.create('th', {
      textContent: content,
      className: options?.className,
      attributes: options?.colspan ? { 
        colspan: String(options.colspan) 
      } : undefined,
      data: options?.dataset
    });
    
    if (options?.sortable) {
      th.classList.add('sortable-header');
      const sortIcon = DOMBuilder.create('span', {
        className: 'sort-icon',
        textContent: '▼'
      });
      DynamicStyleManager.addStyleClasses(sortIcon, 'iconInactive');
      DOMBuilder.append(th, sortIcon);
    }
    
    return th;
  }

  /**
   * テーブルデータセルを作成
   */
  static createDataCell(
    content: string | number,
    options?: {
      className?: string;
      dataset?: Record<string, string>;
      editable?: boolean;
    }
  ): HTMLTableCellElement {
    const td = DOMBuilder.create('td', {
      textContent: String(content),
      className: options?.className,
      data: options?.dataset
    });
    
    if (options?.editable) {
      td.classList.add('editable-cell');
      td.dataset.editable = 'true';
    }
    
    return td;
  }
}

/**
 * 日付フォーマットヘルパー
 */
export class DateFormatter {
  /**
   * 日付を年/月/日形式でフォーマット
   */
  static formatDate(date: Date): string {
    return DateHelper.format(date, 'YYYY/MM/DD');
  }

  /**
   * 日付を月/日形式でフォーマット
   */
  static formatShortDate(date: Date): string {
    return DateHelper.format(date, 'MM/DD');
  }

  /**
   * 日付文字列をDateオブジェクトに変換
   */
  static parseDate(dateString: string): Date | null {
    const parsed = DataProcessor.parseDate(dateString);
    return parsed;
  }
}

/**
 * 数値フォーマットヘルパー
 */
export class NumberFormatter {
  /**
   * 数値を3桁区切りでフォーマット
   */
  static formatNumber(value: number): string {
    return DataProcessor.formatNumber(value);
  }

  /**
   * 金額を円マーク付きでフォーマット
   */
  static formatCurrency(value: number): string {
    return `¥${DataProcessor.formatNumber(value)}`;
  }

  /**
   * パーセンテージをフォーマット
   */
  static formatPercentage(value: number, decimals: number = 0): string {
    return `${value.toFixed(decimals)}%`;
  }
}