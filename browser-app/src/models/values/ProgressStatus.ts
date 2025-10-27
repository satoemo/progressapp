/**
 * 進捗状態の定数
 */
export const PROGRESS_STATUS_CONSTANTS = {
  NOT_REQUIRED: '不要',
  RETAKE: 'リテイク',
  EMPTY: ''
} as const;

/**
 * 進捗状態値オブジェクト
 */
export class ProgressStatus {
  private readonly value: string;
  private readonly date?: Date;

  // リテイクの別表記
  private static readonly RETAKE_VARIANTS = ['リテイク', 'retake', 'Retake', 'RETAKE'];

  constructor(value: string) {
    this.value = value;
    
    // 日付形式（YYYY-MM-DD）の場合
    if (this.isDateFormat(value)) {
      this.date = new Date(value);
    }
  }

  private isDateFormat(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  getValue(): string {
    return this.value;
  }

  isCompleted(): boolean {
    return this.isDateFormat(this.value);
  }

  isNotRequired(): boolean {
    return this.value === PROGRESS_STATUS_CONSTANTS.NOT_REQUIRED;
  }

  isRetake(): boolean {
    return ProgressStatus.RETAKE_VARIANTS.includes(this.value);
  }

  isEmpty(): boolean {
    return this.value === PROGRESS_STATUS_CONSTANTS.EMPTY;
  }

  getDate(): Date | undefined {
    return this.date;
  }

  equals(other: ProgressStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}