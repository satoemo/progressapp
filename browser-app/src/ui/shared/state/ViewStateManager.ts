/**
 * ビューの状態管理クラス
 * タブ切り替え時やデータ更新時に状態を保持する
 */

import { ErrorHandler } from '../utils/ErrorHandler';
import { StorageHelper } from '../utils/StorageHelper';

/**
 * ソート状態
 */
export interface SortState {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * フィルタ状態
 */
export interface FilterState {
  [fieldKey: string]: {
    values: string[];
    isEnabled: boolean;
  };
}

/**
 * スクロール状態
 */
export interface ScrollState {
  scrollLeft: number;
  scrollTop: number;
}

/**
 * 進捗テーブルの状態
 */
export interface ProgressTableState {
  viewMode: string;
  sort: SortState | null;
  filters: FilterState;
  scroll: ScrollState;
}

/**
 * スタッフビューの状態
 */
export interface StaffViewState {
  currentRole: string;
  scroll: ScrollState;
}

/**
 * メインアプリケーションの状態
 */
export interface AppState {
  activeTab: string;
}

/**
 * 全ビューの状態
 */
export interface ViewStates {
  app?: AppState;
  progress?: ProgressTableState;
  staff?: StaffViewState;
  simulation?: {
    scroll: ScrollState;
  };
  retake?: {
    scroll: ScrollState;
  };
}

/**
 * ビュー状態管理クラス
 */
export class ViewStateManager {
  private static instance: ViewStateManager | null = null;
  private states: ViewStates = {};
  private storageKey = 'kintone-progress-view-states';
  private useLocalStorage: boolean;

  private constructor(useLocalStorage: boolean = true) {
    this.useLocalStorage = useLocalStorage;
    this.loadStates();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(useLocalStorage: boolean = true): ViewStateManager {
    if (!ViewStateManager.instance) {
      ViewStateManager.instance = new ViewStateManager(useLocalStorage);
    }
    return ViewStateManager.instance;
  }

  /**
   * ローカルストレージから状態を読み込み
   */
  private loadStates(): void {
    if (!this.useLocalStorage) return;

    try {
      const stored = StorageHelper.loadRaw(this.storageKey, '');
      if (stored) {
        this.states = JSON.parse(stored);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'ViewStateManager.loadFromLocalStorage', {
        logLevel: 'warn',
        customMessage: 'Failed to load view states from localStorage'
      });
      this.states = {};
    }
  }

  /**
   * 状態をローカルストレージに保存
   */
  private saveStates(): void {
    if (!this.useLocalStorage) return;

    try {
      StorageHelper.saveRaw(this.storageKey, JSON.stringify(this.states), '');
    } catch (error) {
      ErrorHandler.handle(error, 'ViewStateManager.saveToLocalStorage', {
        logLevel: 'warn',
        customMessage: 'Failed to save view states to localStorage'
      });
    }
  }

  /**
   * 進捗テーブルの状態を保存
   */
  saveProgressTableState(state: ProgressTableState): void {
    this.states.progress = state;
    this.saveStates();
  }

  /**
   * 進捗テーブルの状態を取得
   */
  getProgressTableState(): ProgressTableState | null {
    return this.states.progress || null;
  }

  /**
   * スタッフビューの状態を保存
   */
  saveStaffViewState(state: StaffViewState): void {
    this.states.staff = state;
    this.saveStates();
  }

  /**
   * スタッフビューの状態を取得
   */
  getStaffViewState(): StaffViewState | null {
    return this.states.staff || null;
  }

  /**
   * アプリケーション状態を保存
   */
  saveAppState(state: AppState): void {
    this.states.app = state;
    this.saveStates();
  }

  /**
   * アプリケーション状態を取得
   */
  getAppState(): AppState | null {
    return this.states.app || null;
  }

  /**
   * シミュレーションビューの状態を保存
   */
  saveSimulationViewState(state: { scroll: ScrollState }): void {
    this.states.simulation = state;
    this.saveStates();
  }

  /**
   * シミュレーションビューの状態を取得
   */
  getSimulationViewState(): { scroll: ScrollState } | null {
    return this.states.simulation || null;
  }

  /**
   * リテイクビューの状態を保存
   */
  saveRetakeViewState(state: { scroll: ScrollState }): void {
    this.states.retake = state;
    this.saveStates();
  }

  /**
   * リテイクビューの状態を取得
   */
  getRetakeViewState(): { scroll: ScrollState } | null {
    return this.states.retake || null;
  }

  /**
   * 特定のビューの状態をクリア
   */
  clearViewState(viewType: keyof ViewStates): void {
    delete this.states[viewType];
    this.saveStates();
  }

  /**
   * 全ての状態をクリア
   */
  clearAllStates(): void {
    this.states = {};
    this.saveStates();
  }

  /**
   * 現在の全状態を取得（デバッグ用）
   */
  getAllStates(): ViewStates {
    return { ...this.states };
  }

  /**
   * インスタンスをリセット（主にテスト用）
   */
  static reset(): void {
    ViewStateManager.instance = null;
  }
}