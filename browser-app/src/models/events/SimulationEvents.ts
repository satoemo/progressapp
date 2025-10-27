import { DomainEvent } from './DomainEvent';

/**
 * シミュレーションパラメータ変更イベント
 */
export class SimulationParametersChangedEvent extends DomainEvent {
  constructor(
    public readonly projectStartDate: Date,
    public readonly projectEndDate: Date,
    public readonly workHoursPerDay: number = 8,
    public readonly workDaysPerWeek: number = 5
  ) {
    super('simulation', 'SimulationParametersChanged');
  }

  getEventData() {
    return {
      projectStartDate: this.projectStartDate,
      projectEndDate: this.projectEndDate,
      workHoursPerDay: this.workHoursPerDay,
      workDaysPerWeek: this.workDaysPerWeek,
      timestamp: this.occurredAt
    };
  }
}