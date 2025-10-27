/**
 * サービスレジストリ
 * DIパターンの型安全性向上
 */

import { UnifiedDataStore } from '@/data/UnifiedDataStore';
import { EventDispatcher } from '@/core/EventDispatcher';
import { CutData } from './cut';
import { IRepository } from './repository';

/**
 * サービスレジストリインターフェース
 * 登録可能なすべてのサービスの型定義
 */
export interface ServiceRegistry {
  // Core Services
  Store: UnifiedDataStore;
  EventDispatcher: EventDispatcher;
  
  // Repository Adapters
  Repository: IRepository<CutData>;
  
  // Additional services can be added here
  [key: string]: any; // 拡張可能性のため
}

/**
 * サービス名の型
 */
export type ServiceName = keyof ServiceRegistry;

/**
 * サービスファクトリ型
 */
export type ServiceFactory<T> = () => T;

/**
 * サービス設定
 */
export interface ServiceConfig {
  singleton?: boolean;
  lazy?: boolean;
  dependencies?: ServiceName[];
}