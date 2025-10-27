/**
 * 型定義のエントリーポイント
 * Phase 3: 型定義の統一
 * 
 * このファイルからすべての型定義をインポートできます
 * 例: import { CutData, ICutService, TableProps } from '@/types';
 */

// カット関連の型定義
export * from './cut';

// サービス層の型定義
export * from './services';

// UIコンポーネントの型定義
export * from './ui';

// アプリケーション層の型定義
export * from './application';

// インフラストラクチャ層の型定義
export * from './infrastructure';

// リポジトリの型定義
export * from './repository';

// サービスレジストリの型定義
export * from './service-registry';

// 共通の型定義
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ValueOf<T> = T[keyof T];

// ユーティリティ型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// 非同期処理の型
export type AsyncFunction<T = void> = () => Promise<T>;
export type AsyncCallback<T = void> = (data: T) => Promise<void>;

// エラー型
export interface AppError extends Error {
  code?: string;
  details?: unknown;
}

// ページネーション
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ソート
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// 検索
export interface SearchParams {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
}

// レスポンス型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: number;
    requestId?: string;
    [key: string]: unknown;
  };
}