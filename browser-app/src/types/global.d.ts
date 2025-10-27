/**
 * グローバル型定義
 */

// kintone JavaScript API の型定義
interface KintoneAPI {
  app: {
    getId(): number;
    getFieldElements(): Record<string, HTMLElement>;
    record: {
      get(): Promise<any>;
      set(record: any): void;
    };
  };
  events: {
    on(events: string | string[], handler: (event: any) => any): void;
    off(events: string | string[], handler?: (event: any) => any): void;
  };
  api: {
    url(path: string, detectGuestSpace?: boolean): string;
    urlForGet(path: string, params: any, detectGuestSpace?: boolean): string;
  };
}

// Window オブジェクトの拡張
declare global {
  interface Window {
    kintone?: KintoneAPI;
    app?: any; // アプリケーションインスタンス用
  }
  
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export {};