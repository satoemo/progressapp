/**
 * 日本の祝日計算クラス
 */
export class JapaneseHolidayCalculator {
  /**
   * 指定された年の日本の祝日を取得
   */
  static getHolidays(year: number): Date[] {
    const holidays: Date[] = [];

    // 元日
    holidays.push(new Date(year, 0, 1));

    // 成人の日（1月第2月曜日）
    holidays.push(this.getNthWeekday(year, 0, 1, 2));

    // 建国記念の日
    holidays.push(new Date(year, 1, 11));

    // 天皇誕生日
    holidays.push(new Date(year, 1, 23));

    // 春分の日（3月20日または21日）
    holidays.push(new Date(year, 2, this.getVernalEquinoxDay(year)));

    // 昭和の日
    holidays.push(new Date(year, 3, 29));

    // 憲法記念日
    holidays.push(new Date(year, 4, 3));

    // みどりの日
    holidays.push(new Date(year, 4, 4));

    // こどもの日
    holidays.push(new Date(year, 4, 5));

    // 海の日（7月第3月曜日）
    holidays.push(this.getNthWeekday(year, 6, 1, 3));

    // 山の日
    holidays.push(new Date(year, 7, 11));

    // 敬老の日（9月第3月曜日）
    holidays.push(this.getNthWeekday(year, 8, 1, 3));

    // 秋分の日（9月22日または23日）
    holidays.push(new Date(year, 8, this.getAutumnalEquinoxDay(year)));

    // スポーツの日（10月第2月曜日）
    holidays.push(this.getNthWeekday(year, 9, 1, 2));

    // 文化の日
    holidays.push(new Date(year, 10, 3));

    // 勤労感謝の日
    holidays.push(new Date(year, 10, 23));

    // 振替休日の計算
    const substituteHolidays = this.getSubstituteHolidays(holidays);
    holidays.push(...substituteHolidays);

    return holidays.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * 期間内の祝日を取得
   */
  static getHolidaysInRange(startDate: Date, endDate: Date): Date[] {
    const holidays: Date[] = [];
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = this.getHolidays(year);
      holidays.push(...yearHolidays.filter(
        holiday => holiday >= startDate && holiday <= endDate
      ));
    }

    return holidays;
  }

  /**
   * 指定日が祝日かどうか判定
   */
  static isHoliday(date: Date): boolean {
    const holidays = this.getHolidays(date.getFullYear());
    return holidays.some(holiday => 
      holiday.getDate() === date.getDate() &&
      holiday.getMonth() === date.getMonth()
    );
  }

  /**
   * N番目の曜日を取得
   */
  private static getNthWeekday(year: number, month: number, dayOfWeek: number, n: number): Date {
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const offset = (dayOfWeek - firstDayOfWeek + 7) % 7;
    return new Date(year, month, 1 + offset + (n - 1) * 7);
  }

  /**
   * 春分の日を計算
   */
  private static getVernalEquinoxDay(year: number): number {
    if (year < 1900 || year > 2099) return 20;
    if (year < 1980) return Math.floor(20.8357 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    if (year < 2100) return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    return 20;
  }

  /**
   * 秋分の日を計算
   */
  private static getAutumnalEquinoxDay(year: number): number {
    if (year < 1900 || year > 2099) return 23;
    if (year < 1980) return Math.floor(23.2588 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    if (year < 2100) return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    return 23;
  }

  /**
   * 振替休日を計算
   */
  private static getSubstituteHolidays(holidays: Date[]): Date[] {
    const substitutes: Date[] = [];

    for (const holiday of holidays) {
      if (holiday.getDay() === 0) { // 日曜日
        let substitute = new Date(holiday);
        substitute.setDate(substitute.getDate() + 1);
        
        // 振替休日が他の祝日と重なる場合は次の日へ
        while (holidays.some(h => h.getTime() === substitute.getTime()) ||
               substitutes.some(s => s.getTime() === substitute.getTime())) {
          substitute.setDate(substitute.getDate() + 1);
        }
        
        substitutes.push(substitute);
      }
    }

    return substitutes;
  }
}