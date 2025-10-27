import { DomainEvent } from './DomainEvent';
import { CutData } from '../types';

/**
 * カット作成イベント
 */
export class CutCreatedEvent extends DomainEvent {
  constructor(
    public readonly cutId: string,
    public readonly initialData: Partial<CutData>
  ) {
    super(cutId, 'CutCreated');
  }

  getEventData() {
    return {
      cutId: this.cutId,
      initialData: this.initialData
    };
  }
}

/**
 * 進捗更新イベント
 */
export class ProgressUpdatedEvent extends DomainEvent {
  constructor(
    public readonly cutId: string,
    public readonly fieldName: string,
    public readonly oldValue: string,
    public readonly newValue: string
  ) {
    super(cutId, 'ProgressUpdated');
  }

  getEventData() {
    return {
      cutId: this.cutId,
      fieldName: this.fieldName,
      oldValue: this.oldValue,
      newValue: this.newValue
    };
  }
}

/**
 * コスト更新イベント
 */
export class CostUpdatedEvent extends DomainEvent {
  constructor(
    public readonly cutId: string,
    public readonly costType: string,
    public readonly oldAmount: number,
    public readonly newAmount: number
  ) {
    super(cutId, 'CostUpdated');
  }

  getEventData() {
    return {
      cutId: this.cutId,
      costType: this.costType,
      oldAmount: this.oldAmount,
      newAmount: this.newAmount
    };
  }
}

/**
 * 基本情報更新イベント
 */
export class BasicInfoUpdatedEvent extends DomainEvent {
  constructor(
    public readonly cutId: string,
    public readonly updates: Partial<CutData>
  ) {
    super(cutId, 'BasicInfoUpdated');
  }

  getEventData() {
    return {
      cutId: this.cutId,
      updates: this.updates
    };
  }
}