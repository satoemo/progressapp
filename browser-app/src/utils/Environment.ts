/**
 * 環境判定ユーティリティ
 * 環境依存の判定ロジックを一元管理
 */

/**
 * kintone環境かどうかを判定
 */
export const isKintoneEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.kintone !== 'undefined';
};

/**
 * ブラウザ環境かどうかを判定
 */
export const isBrowserEnvironment = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * 開発環境かどうかを判定
 * Viteビルド時に import.meta.env.MODE が置換される
 */
export const isDevelopmentEnvironment = (): boolean => {
  // Viteビルド時に文字列に置換されるため、実行時エラーは発生しない
  // @ts-ignore - Viteが置換する
  return import.meta.env?.MODE === 'development';
};

/**
 * 本番環境かどうかを判定
 * Viteビルド時に import.meta.env.MODE が置換される
 */
export const isProductionEnvironment = (): boolean => {
  // Viteビルド時に文字列に置換されるため、実行時エラーは発生しない
  // @ts-ignore - Viteが置換する
  return import.meta.env?.MODE === 'production';
};

/**
 * モック環境かどうかを判定
 * (kintone環境ではない場合はモック環境とみなす)
 */
export const isMockEnvironment = (): boolean => {
  return isBrowserEnvironment() && !isKintoneEnvironment();
};

/**
 * 環境に応じた設定を取得
 */
export const getEnvironmentConfig = () => {
  return {
    isKintone: isKintoneEnvironment(),
    isBrowser: isBrowserEnvironment(),
    isDevelopment: isDevelopmentEnvironment(),
    isProduction: isProductionEnvironment(),
    isMock: isMockEnvironment(),
    // デバッグログを出力するかどうか
    enableDebugLog: isDevelopmentEnvironment() || !isProductionEnvironment()
  };
};

/**
 * 環境に応じたログ出力
 * 開発環境でのみ出力される
 * 本番ビルドでは terser の drop_console 設定により削除される
 */
export const debugLog = (message: string, ...args: any[]): void => {
  if (getEnvironmentConfig().enableDebugLog) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};