/**
 * セルオートフィル機能を管理するクラス（安全な最小実装版）
 */

import { TableEventManager } from '@/core/events/TableEventManager';
import { EventPriority } from '@/core/events/EventPriority';
import { ApplicationFacade } from '@/core/ApplicationFacade';
import { DOMHelper } from '@/ui/shared/utils/DOMHelper';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { DOMBuilder } from '@/ui/shared/utils/DOMBuilder';

/**
 * バッチ更新用のデータ構造
 */
interface BatchUpdateData {
  row: number;
  column: string;
  value: any;
  cutId: string;
}

/**
 * バッチ更新コールバック関数の型定義
 */
type BatchUpdateCallback = (updates: BatchUpdateData[]) => Promise<void>;

/**
 * ドラッグ状態管理用の構造
 */
interface DragState {
  isDragging: boolean;
  sourceCell: HTMLElement | null;
  sourceRow: number;
  sourceColumn: string;
  currentRow: number;
  targetCells: HTMLElement[];
}

/**
 * AutoFillManager - セルオートフィル機能の管理クラス（最小実装）
 */
export class AutoFillManager {
  private tableEventManager: TableEventManager;
  private appFacade: ApplicationFacade;
  private onBatchUpdate: BatchUpdateCallback;
  private isInitialized = false;
  private fillHandles: Map<HTMLElement, HTMLElement> = new Map();
  
  // ドラッグ状態管理
  private dragState: DragState = {
    isDragging: false,
    sourceCell: null,
    sourceRow: -1,
    sourceColumn: '',
    currentRow: -1,
    targetCells: []
  };

  constructor(
    tableEventManager: TableEventManager,
    appFacade: ApplicationFacade,
    onBatchUpdate: BatchUpdateCallback
  ) {
    this.tableEventManager = tableEventManager;
    this.appFacade = appFacade;
    this.onBatchUpdate = onBatchUpdate;
  }

  /**
   * オートフィル機能を初期化
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    // 現在はイベント設定のみ、後でグローバルイベントを追加予定
  }

  /**
   * セルにフィルハンドルを作成・配置
   */
  createFillHandle(cell: HTMLElement): HTMLElement {
    // 既存のフィルハンドルがあれば削除
    if (this.fillHandles.has(cell)) {
      const existingHandle = this.fillHandles.get(cell);
      if (existingHandle && existingHandle.parentNode) {
        existingHandle.parentNode.removeChild(existingHandle);
      }
    }

    const fillHandle = DOMBuilder.create('div', {
      className: 'fill-handle',
      attributes: {
        'data-autofill-handle': 'true'
      }
    });

    // セルの位置を相対位置に設定
    if (cell.style.position !== 'relative' && cell.style.position !== 'absolute') {
      cell.style.position = 'relative';
    }

    // フィルハンドルをセルに追加
    DOMBuilder.append(cell, fillHandle);

    // マッピングを更新
    this.fillHandles.set(cell, fillHandle);

    // 基本的なイベント処理を追加（問題箇所の最終確認）
    this.setupFillHandleEvents(fillHandle, cell);
    
    return fillHandle;
  }

  /**
   * フィルハンドルの基本イベント設定（ドラッグ機能付き）
   */
  private setupFillHandleEvents(fillHandle: HTMLElement, cell: HTMLElement): void {
    // mousedownイベント - ドラッグ開始
    fillHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      this.startDrag(cell);
      
      // グローバルmousemoveとmouseupイベントを設定
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const targetElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const targetCell = targetElement?.closest('td[data-row][data-column]') as HTMLElement;
        
        if (targetCell) {
          const position = this.getCellPosition(targetCell);
          // 同じ列のセルのみ選択可能
          if (position.column === this.dragState.sourceColumn) {
            // DOM上の表示位置を取得して範囲更新
            const visibleRowIndex = DOMHelper.getVisibleRowIndex(targetCell);
            if (visibleRowIndex >= 0) {
              this.updateDragRange(visibleRowIndex);
            }
          }
        }
      };
      
      const handleMouseUp = async () => {
        await this.endDrag();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    // ドラッグを無効化
    fillHandle.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });
    
    // コンテキストメニューを無効化
    fillHandle.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  /**
   * 特定のセルのフィルハンドルを削除
   */
  removeFillHandle(cell: HTMLElement): void {
    const fillHandle = this.fillHandles.get(cell);
    if (fillHandle && fillHandle.parentNode) {
      fillHandle.parentNode.removeChild(fillHandle);
      this.fillHandles.delete(cell);
    }
  }

  /**
   * すべてのフィルハンドルを削除
   */
  removeAllFillHandles(): void {
    this.fillHandles.forEach((fillHandle, cell) => {
      if (fillHandle.parentNode) {
        fillHandle.parentNode.removeChild(fillHandle);
      }
    });
    this.fillHandles.clear();
  }

  /**
   * セルの位置情報（行・列）を取得
   */
  private getCellPosition(cell: HTMLElement): { row: number; column: string } {
    const rowAttr = cell.dataset.row;
    const columnAttr = cell.dataset.column;
    
    return {
      row: rowAttr ? parseInt(rowAttr, 10) : -1,
      column: columnAttr || ''
    };
  }
  
  /**
   * 指定された行・列のセルを取得（data-row属性ベース）
   */
  private getCellByDataRow(row: number, column: string): HTMLElement | null {
    const selector = `td[data-row="${row}"][data-column="${column}"]`;
    return document.querySelector(selector) as HTMLElement;
  }
  
  /**
   * ドラッグ開始処理
   */
  private startDrag(sourceCell: HTMLElement): void {
    const position = this.getCellPosition(sourceCell);
    const visibleRowIndex = DOMHelper.getVisibleRowIndex(sourceCell);
    
    console.log('[AutoFill] Starting drag:', {
      sourceRow: position.row,
      visibleRowIndex: visibleRowIndex,
      sourceColumn: position.column,
      sourceCutId: sourceCell.dataset.cutId
    });
    
    this.dragState = {
      isDragging: true,
      sourceCell,
      sourceRow: visibleRowIndex, // DOM上の表示位置を使用
      sourceColumn: position.column,
      currentRow: visibleRowIndex,
      targetCells: []
    };
    
    // ソースセルにクラスを追加
    sourceCell.classList.add('autofill-source');
  }
  
  /**
   * ドラッグ中の範囲更新処理（DOM位置ベース）
   */
  private updateDragRange(targetRowIndex: number): void {
    if (!this.dragState.isDragging || !this.dragState.sourceCell) return;
    
    // 既存のハイライトをクリア
    this.clearDragHighlight();
    
    const startRow = Math.min(this.dragState.sourceRow, targetRowIndex);
    const endRow = Math.max(this.dragState.sourceRow, targetRowIndex);
    
    this.dragState.targetCells = [];
    
    // DOM上の表示位置で範囲内のセルをハイライト
    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
      const cell = DOMHelper.getCellByVisiblePosition(rowIndex, this.dragState.sourceColumn);
      if (cell) {
        if (rowIndex === this.dragState.sourceRow) {
          cell.classList.add('autofill-source');
        } else {
          cell.classList.add('autofill-target');
        }
        this.dragState.targetCells.push(cell);
      }
    }
    
    this.dragState.currentRow = targetRowIndex;
  }
  
  /**
   * ドラッグハイライトをクリア
   */
  private clearDragHighlight(): void {
    document.querySelectorAll('.autofill-source, .autofill-target').forEach(cell => {
      cell.classList.remove('autofill-source', 'autofill-target');
    });
  }
  
  /**
   * セルの値を取得（DOMとApplicationFacadeを組み合わせ）
   */
  private getCellValue(cell: HTMLElement): any {
    console.log('[AutoFill] getCellValue for cell:', cell);
    
    const cutId = cell.dataset.cutId;
    const fieldKey = cell.dataset.column;
    
    if (!cutId || !fieldKey) {
      console.log('[AutoFill] Missing cutId or fieldKey:', { cutId, fieldKey });
      return '';
    }
    
    // まずDOM要素から値を取得を試みる（より信頼できる）
    const inputElement = cell.querySelector('input') as HTMLInputElement;
    if (inputElement) {
      console.log('[AutoFill] Found input element, value:', inputElement.value);
      return inputElement.value;
    }
    
    const selectElement = cell.querySelector('select') as HTMLSelectElement;
    if (selectElement) {
      console.log('[AutoFill] Found select element, value:', selectElement.value);
      return selectElement.value;
    }
    
    // テキストコンテンツを取得
    const textValue = cell.textContent?.trim() || '';
    console.log('[AutoFill] Using text content, value:', textValue);
    
    return textValue;
  }
  
  /**
   * ドラッグ終了処理（値コピー実行）
   */
  private async endDrag(): Promise<void> {
    console.log('[AutoFill] endDrag called', {
      isDragging: this.dragState.isDragging,
      hasSourceCell: !!this.dragState.sourceCell,
      sourceRow: this.dragState.sourceRow,
      currentRow: this.dragState.currentRow,
      targetCellsCount: this.dragState.targetCells.length
    });
    
    if (!this.dragState.isDragging || !this.dragState.sourceCell) {
      console.log('[AutoFill] Early return: not dragging or no source cell');
      this.resetDragState();
      return;
    }
    
    // ソースセルを保持（resetDragStateで消える前に）
    const sourceCell = this.dragState.sourceCell;
    
    // ソースセルと実際に選択されたターゲットセルがある場合のみ処理
    if (this.dragState.currentRow !== this.dragState.sourceRow && this.dragState.targetCells.length > 0) {
      console.log('[AutoFill] Executing copy operation...');
      await this.executeCopyOperation();
    } else {
      console.log('[AutoFill] No copy operation: same row or no targets');
    }
    
    this.resetDragState();
    
    // ソースセルのフィルハンドルを再作成（オートフィル後も維持）
    if (sourceCell) {
      console.log('[AutoFill] Recreating fill handle for source cell');
      this.createFillHandle(sourceCell);
    }
  }
  
  /**
   * 値コピー操作を実行
   */
  private async executeCopyOperation(): Promise<void> {
    if (!this.dragState.sourceCell) return;
    
    const sourceValue = this.getCellValue(this.dragState.sourceCell);
    const sourceCutId = this.dragState.sourceCell.dataset.cutId;
    const fieldKey = this.dragState.sourceColumn;
    
    console.log('[AutoFill] Copy operation data:', {
      sourceValue,
      sourceCutId,
      fieldKey,
      targetCellsCount: this.dragState.targetCells.length
    });
    
    if (!sourceCutId || !fieldKey) {
      console.log('[AutoFill] Missing required data:', { sourceCutId, fieldKey });
      return;
    }
    
    // 空の値でもコピーを実行（空の値も有効なデータ）
    console.log('[AutoFill] Source value:', sourceValue, '(including empty values)');
    
    const updates: BatchUpdateData[] = [];
    
    // ターゲットセルに対してバッチ更新データを作成
    for (const targetCell of this.dragState.targetCells) {
      const targetPosition = this.getCellPosition(targetCell);
      const targetCutId = targetCell.dataset.cutId;
      const targetVisibleRowIndex = DOMHelper.getVisibleRowIndex(targetCell);
      
      console.log('[AutoFill] Processing target cell:', {
        targetRow: targetPosition.row,
        targetVisibleRowIndex: targetVisibleRowIndex,
        targetColumn: targetPosition.column,
        targetCutId,
        sourceRow: this.dragState.sourceRow
      });
      
      // ソースセル自体は更新対象から除外（DOM位置で比較）
      if (targetVisibleRowIndex === this.dragState.sourceRow || !targetCutId) {
        console.log('[AutoFill] Skipping target:', { 
          reason: targetVisibleRowIndex === this.dragState.sourceRow ? 'same row' : 'no cutId' 
        });
        continue;
      }
      
      updates.push({
        row: targetPosition.row, // data-row属性は更新処理で必要
        column: fieldKey,
        value: sourceValue,
        cutId: targetCutId
      });
    }
    
    console.log('[AutoFill] Updates to execute:', updates);
    
    // バッチ更新を実行
    if (updates.length > 0) {
      console.log('[AutoFill] Executing batch update...');
      await ErrorHandler.handleAsync(
        () => this.onBatchUpdate(updates),
        'AutoFillManager.executeCopyOperation',
        undefined,
        { logLevel: 'error' }
      );
      console.log('[AutoFill] Batch update completed');
    } else {
      console.log('[AutoFill] No updates to execute');
    }
  }
  
  /**
   * ドラッグ状態をリセット
   */
  private resetDragState(): void {
    this.clearDragHighlight();
    
    this.dragState = {
      isDragging: false,
      sourceCell: null,
      sourceRow: -1,
      sourceColumn: '',
      currentRow: -1,
      targetCells: []
    };
  }

  /**
   * クリーンアップ処理
   */
  destroy(): void {
    this.removeAllFillHandles();
    this.clearDragHighlight();
    // イベントリスナーの解除はTableEventManagerが自動で行う
    this.isInitialized = false;
  }
}