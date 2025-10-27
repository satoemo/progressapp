/**
 * セルエディター
 * セルの編集機能を提供するクラス
 */
import { ApplicationFacade } from '@/core/ApplicationFacade';
import { FieldKey } from '@/models/types';
import { CutReadModel } from '@/data/models/CutReadModel';
import { TableEventManager } from '@/core/events/TableEventManager';
import { EventPriority } from '@/core/events/EventPriority';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';

export interface CellEditorOptions {
  cell: HTMLTableCellElement;
  cut: CutReadModel;
  fieldKey: FieldKey;
  appFacade: ApplicationFacade;
  formatValue: (value: string) => string;
  isNumericField?: boolean;
  eventManager?: TableEventManager;
  onValueSaved?: (value: string) => void;
}

export class CellEditor {
  private currentValue: string;
  private originalHTML: string;
  private isCancelled: boolean = false;
  private eventManager: TableEventManager;
  private eventHandlerIds: string[] = [];
  
  constructor(private options: CellEditorOptions) {
    this.currentValue = options.cut[options.fieldKey as keyof CutReadModel] as string || '';
    this.originalHTML = options.cell.innerHTML;
    
    // イベントマネージャーを使用（提供されない場合は新規作成）
    this.eventManager = options.eventManager || new TableEventManager();
  }
  
  /**
   * 編集を開始
   */
  start(): void {
    // 編集中クラスを追加
    this.options.cell.classList.add('cell-editing');
    
    // contenteditable を有効化
    this.options.cell.contentEditable = 'true';
    this.options.cell.textContent = this.currentValue;
    
    // セル内容を選択
    this.selectCellContent();
    
    // イベントハンドラーを設定
    this.setupEventHandlers();
  }
  
  /**
   * セル内容を選択
   */
  private selectCellContent(): void {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(this.options.cell);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  
  /**
   * 数値フィールドの入力制限
   */
  private handleNumericInput(e: Event): void {
    if (!this.options.isNumericField) return;
    
    const cell = e.target as HTMLElement;
    const text = cell.textContent || '';
    const numericOnly = text.replace(/[^0-9]/g, '');
    
    if (text !== numericOnly) {
      // カーソル位置を保存
      const selection = window.getSelection();
      const position = selection?.getRangeAt(0).startOffset || 0;
      
      // 数値のみに置換
      cell.textContent = numericOnly;
      
      // カーソル位置を復元
      if (selection && cell.firstChild) {
        const range = document.createRange();
        const adjustedPosition = Math.min(position, numericOnly.length);
        range.setStart(cell.firstChild, adjustedPosition);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
  
  /**
   * イベントハンドラーを設定
   */
  private setupEventHandlers(): void {
    // キーボード操作（高優先度）
    const keydownId = this.eventManager.addEventListener(
      this.options.cell,
      'keydown',
      (e) => this.handleKeyDown(e as KeyboardEvent),
      false,
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(keydownId);
    
    // 数値フィールドの入力制限
    if (this.options.isNumericField) {
      const inputId = this.eventManager.addEventListener(
        this.options.cell,
        'input',
        (e) => this.handleNumericInput(e),
        false,
        EventPriority.HIGH
      );
      this.eventHandlerIds.push(inputId);
    }
    
    // フォーカスアウト時の保存（低優先度）
    const blurId = this.eventManager.addEventListener(
      this.options.cell,
      'blur',
      () => this.handleBlur(),
      false,
      EventPriority.LOW
    );
    this.eventHandlerIds.push(blurId);
  }
  
  /**
   * blurイベントを処理
   */
  private handleBlur(): void {
    if (!this.isCancelled) {
      this.saveAndClose();
    }
  }
  
  /**
   * keydownイベントを処理
   */
  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.saveAndClose();
        break;
      case 'Escape':
        e.preventDefault();
        this.cancel();
        break;
    }
  }
  
  /**
   * 保存して編集を終了
   */
  private async saveAndClose(): Promise<void> {
    await this.saveValue();
    this.close();
  }
  
  /**
   * 値を保存
   */
  private async saveValue(): Promise<void> {
    const newValue = (this.options.cell.textContent || '').trim();
    
    // 値が変更されていない場合はスキップ
    if (newValue === this.currentValue) {
      return;
    }
    
    try {
      await this.options.appFacade.updateCut(
        this.options.cut.id,
        { [this.options.fieldKey]: newValue }
      );
      this.currentValue = newValue;
    } catch (error) {
      ErrorHandler.handle(error, 'CellEditor.applyValue', {
        logLevel: 'error',
        customMessage: 'Failed to update field'
      });
      // エラー時は元の値に戻す
      this.restoreOriginalContent();
      throw error;
    }
  }
  
  /**
   * 編集をキャンセル
   */
  private cancel(): void {
    this.isCancelled = true;
    this.cleanup();
    this.restoreOriginalContent();
  }
  
  /**
   * 編集を終了
   */
  private close(): void {
    const value = (this.options.cell.textContent || '').trim();
    this.cleanup();
    
    // onValueSavedコールバックがあればそれを使用、なければ通常の更新
    if (this.options.onValueSaved) {
      this.options.onValueSaved(value);
    } else {
      this.options.cell.textContent = this.options.formatValue(value);
    }
  }
  
  /**
   * 元の内容に戻す
   */
  private restoreOriginalContent(): void {
    this.options.cell.innerHTML = this.originalHTML;
  }
  
  /**
   * イベントハンドラーをクリーンアップ
   */
  private cleanup(): void {
    // contenteditable を無効化
    this.options.cell.contentEditable = 'false';
    
    // 編集中クラスを削除
    this.options.cell.classList.remove('cell-editing');
    
    // 登録したすべてのイベントハンドラーを削除
    this.eventHandlerIds.forEach(id => {
      this.eventManager.removeEventListener(id);
    });
    this.eventHandlerIds = [];
    
    // 外部から提供されたEventManagerでない場合は破棄
    if (!this.options.eventManager) {
      this.eventManager.destroy();
    }
  }
}