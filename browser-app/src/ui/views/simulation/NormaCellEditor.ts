/**
 * ノルマ表用セルエディター
 * 進捗管理表のCellEditorを参考にした安定版
 */
import { TableEventManager } from '../../../core/events/TableEventManager';
import { EventPriority } from '../../../core/events/EventPriority';

export interface NormaCellEditorOptions {
  cell: HTMLElement;
  currentValue: number;
  onSave: (newValue: number) => void;
  onCancel: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  eventManager?: TableEventManager;
}

export class NormaCellEditor {
  private originalContent: string;
  private originalHTML: string;
  private isActive: boolean = false;
  private isCancelled: boolean = false;
  private eventManager: TableEventManager;
  private eventHandlerIds: string[] = [];
  
  constructor(private options: NormaCellEditorOptions) {
    this.originalContent = options.cell.textContent || '';
    this.originalHTML = options.cell.innerHTML;
    this.eventManager = options.eventManager || new TableEventManager();
  }
  
  /**
   * 編集を開始
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    const { cell, currentValue } = this.options;
    
    // 編集中クラスを追加（CellEditorと統一）
    cell.classList.add('cell-editing');
    
    // contenteditable を有効化
    cell.contentEditable = 'true';
    cell.textContent = currentValue === 0 ? '' : String(currentValue);
    
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
   * イベントハンドラーを設定（CellEditorパターンに統一）
   */
  private setupEventHandlers(): void {
    const { cell } = this.options;
    
    // キーボード操作（高優先度）
    const keydownId = this.eventManager.addEventListener(
      cell,
      'keydown',
      (e) => this.handleKeyDown(e as KeyboardEvent),
      false,
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(keydownId);
    
    // 数値入力制限（高優先度）
    const inputId = this.eventManager.addEventListener(
      cell,
      'input',
      (e) => this.handleInput(e),
      false,
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(inputId);
    
    // フォーカスアウト時の保存（低優先度）
    const blurId = this.eventManager.addEventListener(
      cell,
      'blur',
      () => this.handleBlur(),
      false,
      EventPriority.LOW
    );
    this.eventHandlerIds.push(blurId);
  }
  
  /**
   * 入力処理（数値のみ許可）
   */
  private handleInput(e: Event): void {
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
   * キーボードイベント処理
   */
  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.save();
        this.options.onNext?.();
        break;
        
      case 'Tab':
        e.preventDefault();
        this.save();
        if (e.shiftKey) {
          this.options.onPrevious?.();
        } else {
          this.options.onNext?.();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        this.cancel();
        break;
    }
  }
  
  /**
   * blurイベントを処理（CellEditorパターンに統一）
   */
  private handleBlur(): void {
    if (!this.isCancelled) {
      this.save();
    }
  }
  
  /**
   * 編集を保存
   */
  private save(): void {
    if (!this.isActive) return;
    
    const { cell } = this.options;
    const value = cell.textContent?.trim() || '';
    const newValue = value === '' ? 0 : parseInt(value, 10);
    
    // 編集を終了
    this.cleanup();
    
    // コールバックを実行
    this.options.onSave(newValue);
  }
  
  /**
   * 編集をキャンセル
   */
  private cancel(): void {
    if (!this.isActive) return;
    
    this.isCancelled = true;
    const { cell } = this.options;
    
    // 元の内容に戻す
    cell.innerHTML = this.originalHTML;
    
    // 編集を終了
    this.cleanup();
    
    // コールバックを実行
    this.options.onCancel();
  }
  
  /**
   * クリーンアップ（CellEditorパターンに統一）
   */
  private cleanup(): void {
    const { cell } = this.options;
    
    // contenteditable を無効化
    cell.contentEditable = 'false';
    
    // 編集中クラスを削除（CellEditorと統一）
    cell.classList.remove('cell-editing');
    
    // 登録したすべてのイベントハンドラーを削除
    this.eventHandlerIds.forEach(id => {
      this.eventManager.removeEventListener(id);
    });
    this.eventHandlerIds = [];
    
    this.isActive = false;
  }
  
  /**
   * 破棄
   */
  destroy(): void {
    if (this.isActive) {
      this.cancel();
    }
    this.eventManager.destroy();
  }
}