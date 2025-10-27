/**
 * 日付処理の統一ユーティリティ
 * 5箇所以上に散在する日付処理を統一化
 */


export type DateInput = Date | string | number | null | undefined;
export type DateFormat = 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'MM/DD' | 'M月D日' | 'ISO' | 'JP_DATE' | 'JP_DATETIME' | 'JP_DATE_SHORT';

export class DateHelper {
  private static readonly DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  private static readonly DATE_SLASH_REGEX = /^\d{4}\/\d{2}\/\d{2}$/;
  
  /**
   * 日付をYYYY-MM-DD形式でフォーマット（最頻出）
   */
  static formatDate(date: DateInput): string {
    if (!date) return '';
    
    try {
      const d = this.toDate(date);
      if (!d || isNaN(d.getTime())) return '';
      
      return this.format(d, 'YYYY-MM-DD');
    } catch {
      return '';
    }
  }
  
  /**
   * 汎用フォーマット
   */
  static format(date: DateInput, format: DateFormat): string {
    const d = this.toDate(date);
    if (!d || isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    
    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      case 'YYYY/MM/DD':
        return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
      case 'MM/DD':
        return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
      case 'M月D日':
        return `${month}月${day}日`;
      case 'ISO':
        return d.toISOString();
      case 'JP_DATE':
        return d.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      case 'JP_DATETIME':
        return d.toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      case 'JP_DATE_SHORT':
        return d.toLocaleDateString('ja-JP', {
          month: 'numeric',
          day: 'numeric'
        });
      default:
        return this.formatDate(d);
    }
  }
  
  /**
   * 日付をYYYY/MM/DD形式でフォーマット
   */
  static formatDateSlash(date: DateInput): string {
    return this.format(date, 'YYYY/MM/DD');
  }
  
  /**
   * 月/日形式でフォーマット
   */
  static formatMonthDay(date: DateInput): string {
    return this.format(date, 'M月D日');
  }
  
  /**
   * 日付の妥当性チェック
   */
  static isValid(date: DateInput): boolean {
    if (!date) return false;
    
    if (typeof date === 'string') {
      // 特殊な値のチェック
      if (date === '不要' || date === 'リテイク' || date === '') {
        return false;
      }
      // 日付形式のチェック
      if (!this.DATE_REGEX.test(date) && !this.DATE_SLASH_REGEX.test(date)) {
        // ISO形式など他の形式も試す
        const d = new Date(date);
        return !isNaN(d.getTime());
      }
    }
    
    const d = this.toDate(date);
    return d !== null && !isNaN(d.getTime());
  }
  
  /**
   * 日付の比較
   */
  static compare(date1: DateInput, date2: DateInput): number {
    const d1 = this.toDate(date1);
    const d2 = this.toDate(date2);
    
    if (!d1 && !d2) return 0;
    if (!d1) return -1;
    if (!d2) return 1;
    
    return d1.getTime() - d2.getTime();
  }
  
  /**
   * 日付が等しいかチェック
   */
  static equals(date1: DateInput, date2: DateInput): boolean {
    return this.compare(date1, date2) === 0;
  }
  
  /**
   * 日付の加算
   */
  static addDays(date: DateInput, days: number): Date | null {
    const d = this.toDate(date);
    if (!d) return null;
    
    const result = new Date(d);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  /**
   * 日付の減算
   */
  static subtractDays(date: DateInput, days: number): Date | null {
    return this.addDays(date, -days);
  }
  
  /**
   * 今日の日付
   */
  static today(): Date {
    const now = new Date();
    // 時刻をリセット
    now.setHours(0, 0, 0, 0);
    return now;
  }
  
  /**
   * 今日の日付（フォーマット済み）
   */
  static todayFormatted(format: DateFormat = 'YYYY-MM-DD'): string {
    return this.format(this.today(), format);
  }
  
  /**
   * 営業日計算（土日を除く）
   */
  static addBusinessDays(date: DateInput, days: number): Date | null {
    const d = this.toDate(date);
    if (!d) return null;
    
    const result = new Date(d);
    let addedDays = 0;
    const increment = days > 0 ? 1 : -1;
    const targetDays = Math.abs(days);
    
    while (addedDays < targetDays) {
      result.setDate(result.getDate() + increment);
      const dayOfWeek = result.getDay();
      // 土日以外をカウント
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        addedDays++;
      }
    }
    
    return result;
  }
  
  /**
   * ISO文字列から日付部分のみ取得
   */
  static getDateFromISO(isoString: string): string {
    if (!isoString) return '';
    return isoString.split('T')[0];
  }
  
  /**
   * 月初の日付
   */
  static getMonthStart(date: DateInput): Date | null {
    const d = this.toDate(date);
    if (!d) return null;
    
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  
  /**
   * 月末の日付
   */
  static getMonthEnd(date: DateInput): Date | null {
    const d = this.toDate(date);
    if (!d) return null;
    
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }
  
  /**
   * 週の開始日（月曜日）
   */
  static getWeekStart(date: DateInput): Date | null {
    const d = this.toDate(date);
    if (!d) return null;
    
    const result = new Date(d);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 日曜日の場合は前週の月曜日
    result.setDate(result.getDate() + diff);
    return result;
  }
  
  /**
   * 週の終了日（日曜日）
   */
  static getWeekEnd(date: DateInput): Date | null {
    const d = this.toDate(date);
    if (!d) return null;
    
    const result = new Date(d);
    const day = result.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    result.setDate(result.getDate() + diff);
    return result;
  }
  
  /**
   * 日付の差分（日数）
   */
  static diffDays(date1: DateInput, date2: DateInput): number | null {
    const d1 = this.toDate(date1);
    const d2 = this.toDate(date2);

    if (!d1 || !d2) return null;

    const ms = d1.getTime() - d2.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }
  
  /**
   * 過去の日付かチェック
   */
  static isPast(date: DateInput): boolean {
    const d = this.toDate(date);
    if (!d) return false;
    
    const today = this.today();
    return d.getTime() < today.getTime();
  }
  
  /**
   * 未来の日付かチェック
   */
  static isFuture(date: DateInput): boolean {
    const d = this.toDate(date);
    if (!d) return false;
    
    const today = this.today();
    return d.getTime() > today.getTime();
  }
  
  /**
   * 今日の日付かチェック
   */
  static isToday(date: DateInput): boolean {
    const d = this.toDate(date);
    if (!d) return false;
    
    const today = this.today();
    return this.formatDate(d) === this.formatDate(today);
  }
  
  /**
   * 範囲内の日付かチェック
   */
  static isInRange(date: DateInput, start: DateInput, end: DateInput): boolean {
    const d = this.toDate(date);
    const s = this.toDate(start);
    const e = this.toDate(end);
    
    if (!d || !s || !e) return false;
    
    return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
  }
  
  /**
   * 文字列から日付への変換（プロジェクト特有）
   * "不要"、"リテイク"などの特殊値も処理
   */
  static parseProgressDate(value: string | null | undefined): Date | string | null {
    if (!value) return null;
    
    // 特殊な値をそのまま返す
    if (value === '不要' || value === 'リテイク') {
      return value;
    }
    
    // 日付として解析
    const date = this.toDate(value);
    return date;
  }
  
  /**
   * 任意の入力を日付オブジェクトに変換（内部用）
   */
  private static toDate(input: DateInput): Date | null {
    if (!input) return null;
    
    if (input instanceof Date) {
      return new Date(input);
    }
    
    if (typeof input === 'string') {
      // 空文字列や特殊な値をチェック
      if (!input || input === '不要' || input === 'リテイク') {
        return null;
      }
      
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }
    
    if (typeof input === 'number') {
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }
    
    return null;
  }
}