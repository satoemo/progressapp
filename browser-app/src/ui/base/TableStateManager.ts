import { CutReadModel } from '@/data/models/CutReadModel';

/**
 * テーブル状態インターフェース
 */
export interface TableState {
  isLoading: boolean;
  data: CutReadModel[];
  error: Error | null;
  lastUpdated: Date | null;
}

/**
 * テーブル状態管理クラス
 * 非同期処理と状態管理を一元化し、競合状態を防ぐ
 * Kent Beckの「State」パターンの実装
 */
export class TableStateManager {
  private state: TableState = {
    isLoading: false,
    data: [],
    error: null,
    lastUpdated: null
  };
  
  private subscribers: Set<(state: TableState) => void> = new Set();

  /**
   * データを読み込み
   */
  async loadData(loader: () => Promise<CutReadModel[]>): Promise<void> {
    this.updateState({ isLoading: true, error: null });
    
    try {
      const data = await loader();
      this.updateState({ 
        data, 
        isLoading: false,
        lastUpdated: new Date()
      });
    } catch (error) {
      this.updateState({ 
        error: error as Error, 
        isLoading: false 
      });
    }
  }

  /**
   * 状態を更新
   */
  private updateState(partial: Partial<TableState>): void {
    this.state = { ...this.state, ...partial };
    this.notifySubscribers();
  }

  /**
   * 購読者に通知
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.state));
  }

  /**
   * 状態変更を購読
   */
  subscribe(callback: (state: TableState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.state); // 初期状態を通知
    return () => this.subscribers.delete(callback);
  }

  /**
   * 現在の状態を取得
   */
  getState(): Readonly<TableState> {
    return { ...this.state };
  }

  /**
   * エラーをクリア
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * データを更新（再読み込みなし）
   */
  updateData(data: CutReadModel[]): void {
    this.updateState({ 
      data, 
      lastUpdated: new Date() 
    });
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.state = {
      isLoading: false,
      data: [],
      error: null,
      lastUpdated: null
    };
    this.notifySubscribers();
  }
}