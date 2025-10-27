/**
 * 共通文字列定数
 * 文字列リテラルを一元管理してバンドルサイズを削減
 */

// エラーメッセージ
export const ERROR_MESSAGES = {
  GENERIC: 'エラーが発生しました',
  SAVE_FAILED: '保存に失敗しました',
  LOAD_FAILED: '読み込みに失敗しました',
  INVALID_DATA: '無効なデータです',
  NETWORK_ERROR: 'ネットワークエラーが発生しました'
} as const;

// UIメッセージ
export const UI_MESSAGES = {
  LOADING: '読み込み中...',
  SAVING: '保存中...',
  CONFIRM_DELETE: 'データを削除しますか？',
  CONFIRM_CLEAR: '全てのデータを削除しますか？',
  NO_DATA: 'データがありません'
} as const;

// ボタンラベル
export const BUTTON_LABELS = {
  OK: 'OK',
  CANCEL: 'キャンセル',
  SAVE: '保存',
  DELETE: '削除',
  EDIT: '編集',
  CLOSE: '閉じる',
  EXPORT: 'エクスポート',
  IMPORT: 'インポート'
} as const;

// 状態ラベル
export const STATUS_LABELS = {
  COMPLETED: '完成',
  NOT_REQUIRED: '対象外',
  RETAKE: 'リテイク',
  BLANK: '未着手',
  IN_PROGRESS: '進行中'
} as const;

// 日付フォーマット
export const DATE_FORMATS = {
  FULL: 'YYYY/MM/DD',
  SHORT: 'MM/DD',
  MONTH: 'YYYY年MM月'
} as const;

// CSSクラス名プレフィックス
export const CSS_PREFIX = 'kdp-' as const;

// セレクタ
export const SELECTORS = {
  TABLE_CONTAINER: '.table-container',
  ERROR_NOTIFICATION: '.error-notification',
  TOOLTIP: '.table-tooltip',
  POPUP: '.popup',
  EDITABLE_CELL: '.editable-cell',
  PROGRESS_CELL: '.progress-cell'
} as const;