import { ViewStateManager, AppState, ProgressTableState, StaffViewState } from '../../ui/shared/state/ViewStateManager';
import { TabType } from '../../ui/features/tabs/TabTypes';
import { ErrorHandler } from '../../ui/shared/utils/ErrorHandler';
import { DataProcessor } from '../../ui/shared/utils/DataProcessor';
import { StorageHelper } from '../../ui/shared/utils/StorageHelper';

/**
 * 統一状態管理サービス
 * 
 * ViewStateManagerとlocalStorage直接アクセスを統一し、以下の問題を解決：
 * - 状態管理の分散（ViewStateManager vs localStorage）
 * - エラーハンドリングの重複
 * - タブ状態保存の不整合
 */
export class StateManagerService {
  private viewStateManager: ViewStateManager;
  private useLocalStorage: boolean;

  constructor(useLocalStorage: boolean = true) {
    this.useLocalStorage = useLocalStorage;
    this.viewStateManager = ViewStateManager.getInstance(useLocalStorage);
  }

  /**
   * アクティブタブの状態を保存
   */
  saveActiveTab(tab: TabType): void {
    try {
      if (this.useLocalStorage) {
        // 直接localStorage使用（互換性のため）
        StorageHelper.saveRaw('kintone-progress-active-tab', tab, '');
        
        // ViewStateManagerにも保存（統一のため）
        const appState: AppState = { activeTab: tab };
        this.viewStateManager.saveAppState(appState);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.saveTabState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: タブ状態保存失敗'
      });
    }
  }

  /**
   * アクティブタブの状態を取得
   */
  getActiveTab(): TabType | null {
    try {
      if (this.useLocalStorage) {
        // 直接localStorage使用（互換性のため）
        const savedTabState = StorageHelper.loadRaw('kintone-progress-active-tab', '');
        if (savedTabState) {
          return savedTabState as TabType;
        }
        
        // フォールバック: ViewStateManagerから取得
        const appState = this.viewStateManager.getAppState();
        if (appState && appState.activeTab) {
          return appState.activeTab as TabType;
        }
      }
      return null;
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.getTabState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: タブ状態取得失敗'
      });
      return null;
    }
  }

  /**
   * 進捗管理表の状態を保存
   */
  saveProgressTableState(state: ProgressTableState): void {
    try {
      this.viewStateManager.saveProgressTableState(state);
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.saveProgressTableState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: 進捗管理表状態保存失敗'
      });
    }
  }

  /**
   * 進捗管理表の状態を取得
   */
  getProgressTableState(): ProgressTableState | null {
    try {
      return this.viewStateManager.getProgressTableState();
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.getProgressTableState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: 進捗管理表状態取得失敗'
      });
      return null;
    }
  }

  /**
   * 担当者別表示の状態を保存
   */
  saveStaffViewState(state: StaffViewState): void {
    try {
      this.viewStateManager.saveStaffViewState(state);
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.saveStaffViewState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: 担当者別表示状態保存失敗'
      });
    }
  }

  /**
   * 担当者別表示の状態を取得
   */
  getStaffViewState(): StaffViewState | null {
    try {
      return this.viewStateManager.getStaffViewState();
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.getStaffViewState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: 担当者別表示状態取得失敗'
      });
      return null;
    }
  }

  /**
   * シミュレーションビューの状態を保存
   */
  saveSimulationViewState(state: { scroll: { scrollLeft: number; scrollTop: number } }): void {
    try {
      this.viewStateManager.saveSimulationViewState(state);
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.saveSimulationViewState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: シミュレーションビュー状態保存失敗'
      });
    }
  }

  /**
   * シミュレーションビューの状態を取得
   */
  getSimulationViewState(): { scroll: { scrollLeft: number; scrollTop: number } } | null {
    try {
      return this.viewStateManager.getSimulationViewState();
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.getSimulationViewState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: シミュレーションビュー状態取得失敗'
      });
      return null;
    }
  }

  /**
   * リテイクビューの状態を保存
   */
  saveRetakeViewState(state: { scroll: { scrollLeft: number; scrollTop: number } }): void {
    try {
      this.viewStateManager.saveRetakeViewState(state);
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.saveRetakeViewState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: リテイクビュー状態保存失敗'
      });
    }
  }

  /**
   * リテイクビューの状態を取得
   */
  getRetakeViewState(): { scroll: { scrollLeft: number; scrollTop: number } } | null {
    try {
      return this.viewStateManager.getRetakeViewState();
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.getRetakeViewState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: リテイクビュー状態取得失敗'
      });
      return null;
    }
  }

  /**
   * 特定のビューの状態をクリア
   */
  clearViewState(viewType: 'app' | 'progress' | 'staff' | 'simulation' | 'retake'): void {
    try {
      this.viewStateManager.clearViewState(viewType);
      
      // アプリ状態の場合は直接localStorageもクリア
      if (viewType === 'app') {
        StorageHelper.remove('kintone-progress-active-tab', { prefix: '' });
      }
      
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.clearViewState', {
        logLevel: 'warn',
        customMessage: `StateManagerService: ${viewType}ビュー状態クリア失敗`
      });
    }
  }

  /**
   * 全ての状態をクリア
   */
  clearAllStates(): void {
    try {
      this.viewStateManager.clearAllStates();
      
      // 直接localStorageのタブ状態もクリア
      StorageHelper.remove('kintone-progress-active-tab', { prefix: '' });
      
    } catch (error) {
      ErrorHandler.handle(error, 'StateManagerService.clearAllState', {
        logLevel: 'warn',
        customMessage: 'StateManagerService: 全状態クリア失敗'
      });
    }
  }

  /**
   * localStorage利用可能性をチェック
   */
  isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      StorageHelper.saveRaw(test, test, '');
      StorageHelper.remove(test, { prefix: '' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 状態管理の健全性チェック
   */
  validateStateIntegrity(): {
    isHealthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    try {
      // localStorage利用可能性チェック
      if (this.useLocalStorage && !this.isLocalStorageAvailable()) {
        issues.push('LocalStorage is not available');
      }

      // タブ状態の整合性チェック
      const directTabState = StorageHelper.loadRaw('kintone-progress-active-tab', '');
      const appState = this.viewStateManager.getAppState();
      
      if (directTabState && appState && appState.activeTab !== directTabState) {
        issues.push('Tab state inconsistency between localStorage and ViewStateManager');
      }

      // ViewStateManagerの健全性チェック
      const allStates = this.viewStateManager.getAllStates();
      if (!allStates) {
        issues.push('ViewStateManager states are null');
      }

    } catch (error) {
      issues.push(`State validation error: ${error}`);
    }

    return {
      isHealthy: DataProcessor.isEmpty(issues),
      issues
    };
  }

  /**
   * デバッグ情報の出力
   */
  logDebugInfo(): void {
    console.group('StateManagerService Debug Info');
    console.log('useLocalStorage:', this.useLocalStorage);
    console.log('localStorage available:', this.isLocalStorageAvailable());
    console.log('Active tab (direct):', StorageHelper.loadRaw('kintone-progress-active-tab', ''));
    console.log('Active tab (ViewStateManager):', this.viewStateManager.getAppState()?.activeTab);
    console.log('All states:', this.viewStateManager.getAllStates());
    
    const integrity = this.validateStateIntegrity();
    console.log('State integrity:', integrity);
    console.groupEnd();
  }

  /**
   * 統計情報の取得
   */
  getStateStatistics(): {
    totalStates: number;
    hasProgressState: boolean;
    hasStaffState: boolean;
    hasSimulationState: boolean;
    hasRetakeState: boolean;
    hasAppState: boolean;
  } {
    const allStates = this.viewStateManager.getAllStates();
    
    return {
      totalStates: Object.keys(allStates).length,
      hasProgressState: !!allStates.progress,
      hasStaffState: !!allStates.staff,
      hasSimulationState: !!allStates.simulation,
      hasRetakeState: !!allStates.retake,
      hasAppState: !!allStates.app
    };
  }
}