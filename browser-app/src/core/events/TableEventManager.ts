/**
 * テーブルのイベント管理を統一的に行うクラス
 */
import { EventPriority, getEventPriority } from './EventPriority';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';

interface EventHandler {
  id: string;
  element: HTMLElement | Document | Window;
  eventType: string;
  handler: EventListener;
  priority: EventPriority;
  options?: boolean | AddEventListenerOptions;
  originalHandler: EventListener;
}

interface EventLog {
  timestamp: number;
  eventType: string;
  elementTag: string;
  elementClass: string;
  handlerId: string;
  priority: EventPriority;
  executionOrder: number;
}

export class TableEventManager {
  private handlers: Map<string, EventHandler> = new Map();
  private eventLogs: EventLog[] = [];
  private executionCounter = 0;
  private handlerIdCounter = 0;
  private isDestroyed = false;
  private debugMode = false; // デバッグモードフラグを追加
  private performanceWarningThreshold = 100; // パフォーマンス警告閾値（ハンドラー数）

  /**
   * イベントハンドラーを登録
   * @param element - HTMLElement、Document、Window、または文字列（'document:click'、'window:resize'など）
   */
  addEventListener(
    element: HTMLElement | Document | Window | string,
    eventType: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions,
    customPriority?: EventPriority
  ): string {
    if (this.isDestroyed) {
      console.warn('TableEventManager: Cannot add event listener after destruction');
      return '';
    }

    let targetElement: HTMLElement | Document | Window;
    let actualEventType: string;
    
    // グローバルイベントの処理
    if (typeof element === 'string') {
      if (element.startsWith('document:')) {
        targetElement = document;
        actualEventType = element.substring(9);
      } else if (element.startsWith('window:')) {
        targetElement = window;
        actualEventType = element.substring(7);
      } else {
        ErrorHandler.handle(new Error(`Invalid global event target: ${element}`), 'TableEventManager.getGlobalEventKey', {
          logLevel: 'error'
        });
        return '';
      }
    } else {
      targetElement = element;
      actualEventType = eventType;
    }
    
    const handlerId = `handler_${++this.handlerIdCounter}`;
    const priority = customPriority ?? getEventPriority(actualEventType);
    
    // ラップされたハンドラーを作成（ログとエラーハンドリング付き）
    const wrappedHandler: EventListener = (event) => {
      this.logEvent(actualEventType, targetElement, handlerId, priority);
      
      try {
        handler(event);
      } catch (error) {
        ErrorHandler.handle(error, 'TableEventManager.executeHandler', {
          logLevel: 'error',
          customMessage: `Error in event handler ${handlerId}`
        });
        // エラーが発生しても他のハンドラーは継続実行
      }
    };
    
    // ハンドラー情報を保存
    const eventHandler: EventHandler = {
      id: handlerId,
      element: targetElement,
      eventType: actualEventType,
      handler: wrappedHandler,
      priority,
      options,
      originalHandler: handler
    };
    
    this.handlers.set(handlerId, eventHandler);
    
    // 実際のイベントリスナーを登録
    targetElement.addEventListener(actualEventType, wrappedHandler, options);
    
    // 優先度順にハンドラーを並び替え
    this.sortHandlersByPriority();
    
    // パフォーマンス警告とデバッグ情報
    if (this.handlers.size > this.performanceWarningThreshold) {
      console.warn(
        `[TableEventManager] Warning: ${this.handlers.size} event handlers registered. ` +
        `This may impact performance. Consider cleanup.`
      );
    }
    
    // デバッグ用：現在のハンドラー数とイベントタイプ別の内訳を表示
    const eventTypeCounts = new Map<string, number>();
    this.handlers.forEach(handler => {
      const count = eventTypeCounts.get(handler.eventType) || 0;
      eventTypeCounts.set(handler.eventType, count + 1);
    });
    
    
    return handlerId;
  }
  
  /**
   * イベントハンドラーを削除
   */
  removeEventListener(handlerId: string): boolean {
    const handler = this.handlers.get(handlerId);
    if (!handler) {
      return false;
    }
    
    handler.element.removeEventListener(
      handler.eventType,
      handler.handler,
      handler.options
    );
    
    this.handlers.delete(handlerId);
    return true;
  }
  
  /**
   * 要素に関連するすべてのイベントハンドラーを削除
   */
  removeAllEventListeners(element: HTMLElement | Document | Window): void {
    const handlersToRemove: string[] = [];
    
    this.handlers.forEach((handler, id) => {
      if (handler.element === element) {
        handlersToRemove.push(id);
      }
    });
    
    handlersToRemove.forEach(id => this.removeEventListener(id));
  }
  
  /**
   * 指定された要素とその子要素のすべてのイベントハンドラーを削除
   */
  removeAllEventListenersFromTree(rootElement: HTMLElement): void {
    const handlersToRemove: string[] = [];
    
    this.handlers.forEach((handler, id) => {
      // Document や Window の場合はスキップ
      if (handler.element === document || handler.element === window) {
        return;
      }
      
      const element = handler.element as HTMLElement;
      
      // 要素自体か、その祖先に rootElement が含まれているかチェック
      if (element === rootElement || rootElement.contains(element)) {
        handlersToRemove.push(id);
      }
    });
    
    handlersToRemove.forEach(id => this.removeEventListener(id));
  }
  
  /**
   * 特定のイベントタイプのハンドラーを一時的に無効化
   */
  disableEventType(eventType: string): void {
    this.handlers.forEach(handler => {
      if (handler.eventType === eventType) {
        handler.element.removeEventListener(
          handler.eventType,
          handler.handler,
          handler.options
        );
      }
    });
  }
  
  /**
   * 特定のイベントタイプのハンドラーを再度有効化
   */
  enableEventType(eventType: string): void {
    this.handlers.forEach(handler => {
      if (handler.eventType === eventType) {
        handler.element.addEventListener(
          handler.eventType,
          handler.handler,
          handler.options
        );
      }
    });
  }
  
  /**
   * イベントの実行をログに記録
   */
  private logEvent(
    eventType: string,
    element: HTMLElement | Document | Window,
    handlerId: string,
    priority: EventPriority
  ): void {
    let elementTag: string;
    let elementClass: string;
    
    if (element === document) {
      elementTag = 'document';
      elementClass = '';
    } else if (element === window) {
      elementTag = 'window';
      elementClass = '';
    } else {
      const htmlElement = element as HTMLElement;
      elementTag = htmlElement.tagName.toLowerCase();
      elementClass = htmlElement.className || '(no class)';
    }
    
    const log: EventLog = {
      timestamp: Date.now(),
      eventType,
      elementTag,
      elementClass,
      handlerId,
      priority,
      executionOrder: ++this.executionCounter
    };
    
    this.eventLogs.push(log);
    
    // ログ出力（デバッグモード時のみ）
    if (this.debugMode) {
      const classInfo = elementClass ? `.${elementClass}` : '';
      console.log(
        `[TableEvent] ${eventType} on ${elementTag}${classInfo} ` +
        `(${handlerId}, priority: ${priority}, order: ${log.executionOrder})`
      );
    }
    
    // メモリ管理: ログが1000件を超えたら古いものから削除
    if (this.eventLogs.length > 1000) {
      this.eventLogs = this.eventLogs.slice(-500);
    }
  }
  
  /**
   * ハンドラーを優先度順にソート
   */
  private sortHandlersByPriority(): void {
    // Mapは挿入順を保持するため、優先度順に再構築
    const sortedHandlers = Array.from(this.handlers.entries())
      .sort(([, a], [, b]) => b.priority - a.priority);
    
    this.handlers.clear();
    sortedHandlers.forEach(([id, handler]) => {
      this.handlers.set(id, handler);
    });
  }
  
  /**
   * イベントログを取得
   */
  getEventLogs(): EventLog[] {
    return [...this.eventLogs];
  }
  
  /**
   * イベントログをクリア
   */
  clearEventLogs(): void {
    this.eventLogs = [];
    this.executionCounter = 0;
  }
  
  /**
   * 登録されているハンドラーの情報を取得
   */
  getHandlerInfo(): Array<{
    id: string;
    eventType: string;
    element: string;
    priority: EventPriority;
  }> {
    return Array.from(this.handlers.values()).map(handler => {
      let elementInfo: string;
      if (handler.element === document) {
        elementInfo = 'document';
      } else if (handler.element === window) {
        elementInfo = 'window';
      } else {
        const htmlElement = handler.element as HTMLElement;
        elementInfo = `${htmlElement.tagName.toLowerCase()}.${htmlElement.className}`;
      }
      
      return {
        id: handler.id,
        eventType: handler.eventType,
        element: elementInfo,
        priority: handler.priority
      };
    });
  }
  
  /**
   * 簡潔なAPIを提供（グローバルイベント対応）
   */
  on(
    targetOrElement: HTMLElement | string,
    eventType: string,
    handler: EventListener,
    priority?: EventPriority
  ): string {
    if (typeof targetOrElement === 'string') {
      // グローバルイベントの場合
      return this.addEventListener(targetOrElement, '', handler, false, priority);
    }
    // 通常のイベントの場合
    return this.addEventListener(targetOrElement, eventType, handler, false, priority);
  }
  
  /**
   * 登録されているハンドラー数を取得
   */
  getHandlerCount(): number {
    return this.handlers.size;
  }
  
  /**
   * イベントタイプごとのハンドラー数を取得
   */
  getHandlerCountByType(): Map<string, number> {
    const countByType = new Map<string, number>();
    
    this.handlers.forEach(handler => {
      const count = countByType.get(handler.eventType) || 0;
      countByType.set(handler.eventType, count + 1);
    });
    
    return countByType;
  }
  
  /**
   * デバッグモードを設定
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    // すべてのイベントリスナーを削除
    this.handlers.forEach((handler, id) => {
      this.removeEventListener(id);
    });
    
    this.handlers.clear();
    this.eventLogs = [];
    this.isDestroyed = true;
  }
}