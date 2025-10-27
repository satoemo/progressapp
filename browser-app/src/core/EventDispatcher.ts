import { DomainEvent } from '@/models/events/DomainEvent';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';

export type EventHandler = (event: DomainEvent) => void | Promise<void>;

/**
 * イベントディスパッチャー
 * ドメインイベントを購読者に配信する
 */
export class EventDispatcher {
  private static instance: EventDispatcher;
  private handlers: Map<string, EventHandler[]> = new Map();

  private constructor() {}

  static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  /**
   * イベントハンドラーを登録
   */
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * 全イベントに対するハンドラーを登録
   */
  subscribeToAll(handler: EventHandler): void {
    this.subscribe('*', handler);
  }

  /**
   * イベントハンドラーを解除
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * イベントを配信
   */
  async dispatch(event: DomainEvent): Promise<void> {
    // 特定のイベントタイプのハンドラー
    const specificHandlers = this.handlers.get(event.eventType) || [];
    // 全イベント対応のハンドラー
    const globalHandlers = this.handlers.get('*') || [];
    
    const allHandlers = [...specificHandlers, ...globalHandlers];
    
    // 全ハンドラーを並列実行
    await Promise.all(
      allHandlers.map(handler => 
        Promise.resolve(handler(event)).catch(error => {
          ErrorHandler.handle(error, 'EventDispatcher.dispatch', {
            logLevel: 'error',
            customMessage: `Event handler error for ${event.eventType}`
          });
        })
      )
    );
  }

  /**
   * 複数のイベントを配信
   */
  async dispatchMultiple(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event);
    }
  }

  /**
   * 全ハンドラーをクリア
   */
  clear(): void {
    this.handlers.clear();
  }
}