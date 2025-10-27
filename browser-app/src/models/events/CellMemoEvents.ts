import { DomainEvent } from './DomainEvent';

export class CellMemoUpdatedEvent extends DomainEvent {
  constructor(
    public readonly cutNumber: string,
    public readonly fieldKey: string,
    public readonly content: string,
    public readonly previousContent: string | undefined,
    aggregateId: string
  ) {
    super(aggregateId, 'CellMemoUpdated');
  }

  getEventData() {
    return {
      cutNumber: this.cutNumber,
      fieldKey: this.fieldKey,
      content: this.content,
      previousContent: this.previousContent
    };
  }
}

export class CellMemoRemovedEvent extends DomainEvent {
  constructor(
    public readonly cutNumber: string,
    public readonly fieldKey: string,
    public readonly previousContent: string,
    aggregateId: string
  ) {
    super(aggregateId, 'CellMemoRemoved');
  }

  getEventData() {
    return {
      cutNumber: this.cutNumber,
      fieldKey: this.fieldKey,
      previousContent: this.previousContent
    };
  }
}

export class AllMemosLoadedEvent extends DomainEvent {
  constructor(
    public readonly memos: Record<string, string>,
    aggregateId: string
  ) {
    super(aggregateId, 'AllMemosLoaded');
  }

  getEventData() {
    return {
      memos: this.memos
    };
  }
}