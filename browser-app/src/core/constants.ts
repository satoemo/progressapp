/**
 * コア層の定数定義
 * ApplicationFacadeとCoreServiceで使用する定数を一元管理
 */

export const CORE_CONSTANTS = {
  // ID生成
  ID_PREFIX: {
    CUT: 'cut_',
    MEMO: 'memo_',
    SESSION: 'session_'
  },
  
  // デフォルト値
  DEFAULT_VALUES: {
    STATUS: '',
    SPECIAL: '',
    KENYO: '',
    MAISU: '',
    MANAGER: '',
    ENSYUTSU: '',
    SOUSAKKAN: ''
  },
  
  // 制限値
  LIMITS: {
    MAX_CUTS: 10000,
    MAX_MEMO_LENGTH: 5000,
    CACHE_SIZE: 200
  },
  
  // タイムアウト
  TIMEOUTS: {
    SAVE: 5000,
    LOAD: 3000,
    SYNC: 10000
  },
  
  // イベントタイプ
  EVENTS: {
    CUT_CREATED: 'CutCreated',
    CUT_UPDATED: 'CutUpdated',
    CUT_DELETED: 'CutDeleted',
    MEMO_UPDATED: 'CellMemoUpdated',
    SYNC_STARTED: 'SyncStarted',
    SYNC_COMPLETED: 'SyncCompleted'
  },
  
  // ページネーション
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 1000
  }
} as const;

/**
 * コア設定型
 */
export interface CoreConfig {
  useLocalStorage: boolean;
  enableCache: boolean;
  cacheSize: number;
  enableBackup: boolean;
  maxBackups: number;
  enableIntegrityCheck: boolean;
}

/**
 * デフォルトのコア設定
 */
export const DEFAULT_CORE_CONFIG: CoreConfig = {
  useLocalStorage: true,
  enableCache: true,
  cacheSize: 200,
  maxBackups: 3,
  enableBackup: true,
  enableIntegrityCheck: true
};