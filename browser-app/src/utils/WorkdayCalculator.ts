import { JapaneseHolidayCalculator } from './JapaneseHolidayCalculator';

/**
 * 稼働日計算クラス
 */
export class WorkdayCalculator {
  /**
   * 期間内の稼働日数を計算
   */
  static getWorkdaysCount(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (this.isWorkday(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * 開始日から指定稼働日数後の日付を計算
   */
  static addWorkdays(startDate: Date, workdays: number): Date {
    const result = new Date(startDate);
    let remainingDays = workdays;
    
    while (remainingDays > 0) {
      result.setDate(result.getDate() + 1);
      if (this.isWorkday(result)) {
        remainingDays--;
      }
    }
    
    return result;
  }

  /**
   * 指定日が稼働日かどうか判定
   */
  static isWorkday(date: Date): boolean {
    // 土日チェック
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // 祝日チェック
    if (JapaneseHolidayCalculator.isHoliday(date)) {
      return false;
    }
    
    return true;
  }

  /**
   * 期間内の稼働日リストを取得
   */
  static getWorkdaysInRange(startDate: Date, endDate: Date): Date[] {
    const workdays: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (this.isWorkday(current)) {
        workdays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workdays;
  }

  /**
   * プロジェクト期間情報を計算
   */
  static getProjectInfo(startDate: Date, endDate: Date): {
    totalDays: number;
    workdays: number;
    weekends: number;
    holidays: number;
    workdaysPercentage: number;
  } {
    let totalDays = 0;
    let workdays = 0;
    let weekends = 0;
    let holidays = 0;
    
    const current = new Date(startDate);
    const holidayList = JapaneseHolidayCalculator.getHolidaysInRange(startDate, endDate);
    
    while (current <= endDate) {
      totalDays++;
      const dayOfWeek = current.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekends++;
      } else if (holidayList.some(h => 
        h.getDate() === current.getDate() && 
        h.getMonth() === current.getMonth() &&
        h.getFullYear() === current.getFullYear()
      )) {
        holidays++;
      } else {
        workdays++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return {
      totalDays,
      workdays,
      weekends,
      holidays,
      workdaysPercentage: totalDays > 0 ? (workdays / totalDays) * 100 : 0
    };
  }
}