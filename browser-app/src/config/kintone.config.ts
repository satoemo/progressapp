/**
 * kintone APIの設定
 */
export interface KintoneConfig {
  appId: number;
  recordId?: number;
  apiToken?: string;
}

/**
 * デフォルトのkintone設定
 * 実際の環境では、環境変数や設定ファイルから読み込む
 */
export const defaultKintoneConfig: KintoneConfig = {
  appId: typeof window !== 'undefined' && window.kintone ? 
    window.kintone.app.getId() : 1,
  recordId: undefined, // 未指定の場合は新規作成
};

/**
 * 共有設定インスタンス（実行時に更新される）
 */
export const sharedKintoneConfig: KintoneConfig = { ...defaultKintoneConfig };

/**
 * kintoneフィールドコード定義
 */
export const KINTONE_FIELD_CODES = {
  CUT_DATA_JSON: 'cutDataJson',
  EVENTS_JSON: 'eventsJson',
  MEMO_JSON: 'memoJson',
  LAST_MODIFIED: 'lastModified',
  VERSION: 'version',
  CUT_NUMBER: 'cutNumber',
  STATUS: 'status',
} as const;

export type KintoneFieldCode = typeof KINTONE_FIELD_CODES[keyof typeof KINTONE_FIELD_CODES];

/**
 * UI カスタマイズ設定
 */
export interface UICustomizationSettings {
  /** UI カスタマイズを有効にするか */
  enabled: boolean;
  /** グローバルナビゲーションを非表示にするか */
  hideGlobalNavigation: boolean;
  /** アクションメニューを非表示にするか */
  hideActionMenu: boolean;
  /** カスタムCSS */
  customStyles?: string;
}

/**
 * デフォルトのUI カスタマイズ設定
 */
export const defaultUICustomizationSettings: UICustomizationSettings = {
  enabled: true, // デフォルトで有効
  hideGlobalNavigation: true, // グローバルナビゲーション非表示
  hideActionMenu: true, // アクションメニュー非表示
  customStyles: ''
};

/**
 * 共有UI カスタマイズ設定インスタンス（実行時に更新される）
 */
export const sharedUICustomizationSettings: UICustomizationSettings = { ...defaultUICustomizationSettings };