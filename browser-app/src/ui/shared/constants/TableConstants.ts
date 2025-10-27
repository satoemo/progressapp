/**
 * テーブル関連の定数定義
 * マジックナンバーを排除し、保守性を向上
 */

// 列幅の定数
export const COLUMN_WIDTHS = {
  CHECKBOX: 40,
  CUT_NUMBER: 80,
  STATUS: 100,
  COST: 100,
  MEMO: 120,
  PROGRESS: 80,
  DELETE: 60,
  DEFAULT: 100
} as const;

// テーブルの高さ設定
export const TABLE_HEIGHTS = {
  DEFAULT: 720,
  MAX_HEIGHT_RATIO: 0.8 // 80vh
} as const;

// スクロールバーの設定
export const SCROLLBAR = {
  WIDTH: 12,
  HEIGHT: 12,
  BORDER_RADIUS: 6,
  BORDER_WIDTH: 2
} as const;

// z-indexの階層
export const Z_INDEX = {
  TABLE_HEADER: 200,
  FIXED_COLUMN_HEADER: 201,
  FIXED_COLUMN_DATA: 100
} as const;

// 進捗状態の定義
export const PROGRESS_STATUS = {
  NOT_REQUIRED: ['不要', 'fuyou'] as readonly string[],
  RETAKE: ['リテイク', 'retake'] as readonly string[]
} as const;

// 特殊フィールドの値
export const SPECIAL_VALUES = {
  SPECIAL: ['特効', 'special'] as readonly string[],
  THREE_D: ['3d'] as readonly string[]
} as const;

// フィールドタイプ
export const FIELD_TYPES = {
  TEXT: 'text',
  CURRENCY: 'currency',
  DATE: 'date',
  PROGRESS: 'progress',
  SPECIAL: 'special'
} as const;

// フィールドカテゴリ
export const FIELD_CATEGORIES = {
  BASIC: 'basic',
  INFO: 'info',
  PROGRESS: 'progress',
  SPECIAL: 'special'
} as const;

// 計算タイプ
export const CALC_TYPES = {
  PROGRESS: 'progress',
  CURRENCY: 'currency',
  MAISU: 'maisu',
  SPECIAL: 'special',
  COUNT: 'count'
} as const;

// UI表示タイミング
export const UI_TIMING = {
  TOOLTIP_DELAY: 100,           // ツールチップ表示遅延（ms）
  ERROR_DISPLAY_DURATION: 3000, // エラー表示時間（ms）
  SUCCESS_DISPLAY_DURATION: 2000 // 成功表示時間（ms）
} as const;

// 達成率の閾値
export const ACHIEVEMENT_THRESHOLDS = {
  HIGH: 100,    // 高達成率（%）
  MEDIUM: 80    // 中達成率（%）
} as const;