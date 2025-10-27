import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';

/**
 * 金額値オブジェクト
 */
export class Money {
  private readonly amount: number;
  private readonly currency: string = 'JPY';

  constructor(amount: number | string) {
    const numAmount = ValidationHelper.ensureNumber(amount, 0);
    
    if (!ValidationHelper.isValidNumber(numAmount) || numAmount < 0) {
      throw new Error(`Invalid money amount: ${amount}`);
    }
    
    this.amount = numAmount;
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return new Money(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    return new Money(this.amount - other.amount);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `¥${this.amount.toLocaleString()}`;
  }

  static zero(): Money {
    return new Money(0);
  }
}