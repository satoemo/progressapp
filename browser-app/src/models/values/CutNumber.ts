import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { DataProcessor } from '@/ui/shared/utils/DataProcessor';
import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';

/**
 * カット番号値オブジェクト
 */
export class CutNumber {
  private readonly value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid cut number: ${value}`);
    }
    this.value = value;
  }

  private isValid(value: string): boolean {
    // カット番号の形式: 数字のみ、数字+英字、数字-英字など
    // 例: 1, 2, 3-a, 3-b, 7a, 7b, A01, etc
    return /^[A-Za-z0-9]+(-[A-Za-z0-9]+)?$/.test(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: CutNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  /**
   * カット番号を自然な順序で比較
   * 例: 1 < 2 < 3-a < 3-b < 4 < 7a < 7b < 8
   */
  compare(other: CutNumber): number {
    const parseNumber = (value: string): { num: number; suffix: string } => {
      // 数字部分を抽出
      const match = value.match(/^(\d+)(.*)$/);
      if (!match) {
        // 数字で始まらない場合は文字列全体をsuffixとして扱う
        return { num: 0, suffix: value };
      }
      return { 
        num: ValidationHelper.ensureNumber(match[1], 0), 
        suffix: DataProcessor.safeString(match[2])
      };
    };

    const a = parseNumber(this.value);
    const b = parseNumber(other.value);

    // まず数字部分で比較
    if (a.num !== b.num) {
      return a.num - b.num;
    }

    // 数字が同じ場合はサフィックスで比較
    // 空のサフィックスは最初に来る（例: 3 < 3-a）
    if (!a.suffix && b.suffix) return -1;
    if (a.suffix && !b.suffix) return 1;
    
    // 両方にサフィックスがある場合は文字列として比較
    return a.suffix.localeCompare(b.suffix);
  }

  /**
   * ソート用の静的メソッド
   */
  static sort(cutNumbers: string[]): string[] {
    return cutNumbers
      .filter(cn => cn && cn.trim() !== '') // 空の値を除外
      .sort((a, b) => {
        try {
          const cutA = new CutNumber(a);
          const cutB = new CutNumber(b);
          return cutA.compare(cutB);
        } catch (error) {
          // CutNumberの作成に失敗した場合は文字列として比較
          ErrorHandler.handle(error, 'CutNumber.sortArray', {
            logLevel: 'warn',
            customMessage: `Invalid cut number in sort: "${a}" or "${b}"`
          });
          return a.localeCompare(b);
        }
      });
  }
}