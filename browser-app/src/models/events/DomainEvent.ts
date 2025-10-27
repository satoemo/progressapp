/**
 * ドメインイベント基底クラス
 */
export abstract class DomainEvent {
  public readonly aggregateId: string;
  public readonly eventType: string;
  public readonly eventVersion?: number;
  public readonly aggregateVersion?: number;
  public readonly occurredAt: Date;
  public readonly metadata: Record<string, unknown>;

  constructor(
    aggregateId: string,
    eventType: string,
    metadata: Record<string, unknown> = {}
  ) {
    this.aggregateId = aggregateId;
    this.eventType = eventType;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }

  abstract getEventData(): Record<string, unknown>;
}