import { DOMBuilder } from './DOMBuilder';

/**
 * DOM操作のユーティリティクラス
 * UI層で共通的に使用されるDOM操作を集約
 */
export class DOMHelper {
  /**
   * テキストを更新しながら特定の要素を保持
   * @param cell 対象のセル要素
   * @param text 設定するテキスト
   * @param keepSelector 保持する要素のセレクタ（デフォルト: .fill-handle, .memo-indicator）
   */
  static updateTextKeepingElements(
    cell: HTMLElement,
    text: string,
    keepSelector: string = '.fill-handle, .memo-indicator'
  ): void {
    // 保持する要素を退避
    const elementsToKeep: HTMLElement[] = [];
    const keepElements = cell.querySelectorAll(keepSelector);
    keepElements.forEach(el => {
      if (el instanceof HTMLElement) {
        elementsToKeep.push(el);
      }
    });
    
    // 保持する要素以外の子ノードを削除
    const childNodes = Array.from(cell.childNodes);
    childNodes.forEach(node => {
      // 保持する要素でない場合は削除
      if (!elementsToKeep.includes(node as HTMLElement)) {
        cell.removeChild(node);
      }
    });
    
    // テキストノードを最初に挿入
    const textNode = document.createTextNode(text);
    if (elementsToKeep.length > 0) {
      // 保持する要素の前にテキストを挿入
      cell.insertBefore(textNode, elementsToKeep[0]);
    } else {
      // 保持する要素がない場合は単純に追加
      DOMBuilder.append(cell, textNode);
    }
  }
  
  /**
   * セルのDOM上の表示位置（行インデックス）を取得
   * @param cell 対象のセル要素
   * @returns 表示されている行のインデックス（見つからない場合は-1）
   */
  static getVisibleRowIndex(cell: HTMLElement): number {
    const tr = cell.closest('tr');
    if (!tr || !tr.parentElement) return -1;
    
    // tbody内での行インデックスを取得（ヘッダー行を除く）
    const tbody = tr.parentElement;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    return rows.indexOf(tr as HTMLTableRowElement);
  }
  
  /**
   * DOM上の表示位置でセルを取得
   * @param rowIndex 行インデックス
   * @param column カラム名
   * @returns セル要素（見つからない場合はnull）
   */
  static getCellByVisiblePosition(rowIndex: number, column: string): HTMLElement | null {
    const tbody = document.querySelector('tbody');
    if (!tbody) return null;
    
    const rows = tbody.querySelectorAll('tr');
    if (rowIndex < 0 || rowIndex >= rows.length) return null;
    
    const targetRow = rows[rowIndex];
    return targetRow.querySelector(`td[data-column="${column}"]`) as HTMLElement;
  }
  
  /**
   * 表示されている行のみ取得（非表示行を除外）
   * @param tbody テーブルボディ要素
   * @returns 表示されている行の配列
   */
  static getVisibleRows(tbody: HTMLElement): HTMLTableRowElement[] {
    return Array.from(tbody.querySelectorAll('tr'))
      .filter(row => {
        const style = window.getComputedStyle(row);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }) as HTMLTableRowElement[];
  }
  
  /**
   * 指定された列の表示されているセルをすべて取得（DOM順序）
   * @param column カラム名
   * @returns セル要素の配列
   */
  static getVisibleCellsInColumn(column: string): HTMLElement[] {
    const cells = document.querySelectorAll(`td[data-column="${column}"]:not([style*="display: none"])`);
    return Array.from(cells) as HTMLElement[];
  }
  
  /**
   * 要素にクラスを追加
   * @param element 対象要素
   * @param className 追加するクラス名
   */
  static addClass(element: HTMLElement, className: string): void {
    if (element && className) {
      element.classList.add(className);
    }
  }
  
  /**
   * 要素からクラスを削除
   * @param element 対象要素
   * @param className 削除するクラス名
   */
  static removeClass(element: HTMLElement, className: string): void {
    if (element && className) {
      element.classList.remove(className);
    }
  }
  
  /**
   * 要素のクラスをトグル
   * @param element 対象要素
   * @param className トグルするクラス名
   * @param force 強制的に追加(true)または削除(false)
   */
  static toggleClass(element: HTMLElement, className: string, force?: boolean): void {
    if (element && className) {
      element.classList.toggle(className, force);
    }
  }
  
  /**
   * 複数のクラスを一括で追加
   * @param element 対象要素
   * @param classNames 追加するクラス名の配列
   */
  static addClasses(element: HTMLElement, ...classNames: string[]): void {
    if (element && classNames.length > 0) {
      element.classList.add(...classNames);
    }
  }
  
  /**
   * 複数のクラスを一括で削除
   * @param element 対象要素
   * @param classNames 削除するクラス名の配列
   */
  static removeClasses(element: HTMLElement, ...classNames: string[]): void {
    if (element && classNames.length > 0) {
      element.classList.remove(...classNames);
    }
  }
  
  /**
   * 複数の属性を一括設定
   * @param element 対象要素
   * @param attributes 属性のキーバリューペア
   */
  static setAttributes(element: HTMLElement, attributes: Record<string, string>): void {
    if (element && attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
  }
}