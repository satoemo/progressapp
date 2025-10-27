/**
 * アプリケーション全体で使用する定数の一元管理
 */

/**
 * タイミング関連の定数
 */
export const TIMING = {
  DEBOUNCE: {
    UI_UPDATE: 50,          // UI更新用（高優先度）
    API_SYNC: 500,          // API同期用（中優先度）
    CALCULATION: 1000,      // 計算処理用
    BACKGROUND: 2000        // バックグラウンド処理用（低優先度）
  },
  NOTIFICATION: {
    ERROR_DISPLAY: 3000,    // エラー通知の表示時間
    SUCCESS_DISPLAY: 2000   // 成功通知の表示時間
  },
  CACHE: {
    ACTUALS: 60000,         // 実績値のキャッシュ時間（1分）
    CALCULATION: 300000     // 計算結果のキャッシュ時間（5分）
  }
} as const;

/**
 * UI関連の定数
 */
export const UI = {
  MARGIN: {
    POPUP: 5,               // ポップアップのマージン
    WINDOW_EDGE: 10,        // ウィンドウ端からのマージン
    CELL: 2,                // セル間のマージン
    SECTION: 20             // セクション間のマージン
  },
  SIZE: {
    CELL: {
      WIDTH: 100,           // セルの標準幅
      HEIGHT: 30,           // セルの標準高さ
      MIN_WIDTH: 50,        // セルの最小幅
      MAX_WIDTH: 200        // セルの最大幅
    },
    POPUP: {
      MIN_WIDTH: 200,       // ポップアップの最小幅
      MAX_WIDTH: 600,       // ポップアップの最大幅
      MAX_HEIGHT: 400       // ポップアップの最大高さ
    }
  },
  ANIMATION: {
    DURATION: 300,          // アニメーション時間（ms）
    EASING: 'ease-in-out'   // イージング関数
  }
} as const;

/**
 * ID生成関連の定数
 */
export const ID_PATTERNS = {
  AGGREGATE: {
    CUT: 'cut-',            // カット集約のプレフィックス（ハイフン使用）
    MEMO: 'memo-',          // メモのプレフィックス（ハイフン使用）
    SIMULATION: 'sim-'      // シミュレーションのプレフィックス（ハイフン使用）
  },
  SEPARATOR: '-',           // ID区切り文字（ハイフン使用）
  FIELD_KEY_SEPARATOR: '_'  // フィールドキーの区切り文字
} as const;

/**
 * イベント関連の定数
 */
export const EVENTS = {
  PRIORITY: {
    HIGH: 0,                // 高優先度
    MEDIUM: 1,              // 中優先度
    LOW: 2                  // 低優先度
  },
  BATCH_SIZE: {
    DEFAULT: 10,            // デフォルトのバッチサイズ
    LARGE: 50               // 大量処理時のバッチサイズ
  }
} as const;

/**
 * 性能関連の定数
 */
export const PERFORMANCE = {
  WARNING_THRESHOLD: {
    EVENT_PROCESSING: 100,  // イベント処理の警告閾値（ms）
    API_CALL: 1000,         // API呼び出しの警告閾値（ms）
    RENDER: 16              // レンダリングの警告閾値（ms）
  },
  MONITORING: {
    ENABLED: true,          // 性能監視の有効化
    SAMPLE_RATE: 0.1        // サンプリングレート（10%）
  }
} as const;

/**
 * ストレージ関連の定数
 */
export const STORAGE = {
  KEYS: {
    NORMA_TARGETS: 'norma_targets_',
    USER_PREFERENCES: 'user_prefs_',
    CACHE_PREFIX: 'cache_'
  },
  LIMITS: {
    LOCAL_STORAGE: 5 * 1024 * 1024,  // 5MB
    SESSION_STORAGE: 10 * 1024 * 1024 // 10MB
  }
} as const;

/**
 * API関連の定数
 */
export const API = {
  RETRY: {
    MAX_ATTEMPTS: 3,        // 最大リトライ回数
    INITIAL_DELAY: 1000,    // 初回リトライ遅延（ms）
    BACKOFF_FACTOR: 2       // バックオフ係数
  },
  TIMEOUT: {
    DEFAULT: 30000,         // デフォルトタイムアウト（30秒）
    LONG: 60000             // 長時間処理のタイムアウト（60秒）
  }
} as const;