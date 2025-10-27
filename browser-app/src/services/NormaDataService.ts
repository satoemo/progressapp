import { CutReadModel } from '../data/models/CutReadModel';
import { ApplicationFacade } from '../core/ApplicationFacade';
import { ErrorHandler } from '../ui/shared/utils/ErrorHandler';
import { DataProcessor, DATE_FORMATS } from '../ui/shared/utils/DataProcessor';
import { StorageHelper } from '../ui/shared/utils/StorageHelper';
import { ValidationHelper } from '../ui/shared/utils/ValidationHelper';
import { DateHelper } from '../ui/shared/utils/DateHelper';

/**
 * ノルマデータのインターフェース
 */
export interface NormaData {
  [sectionName: string]: {
    [managerName: string]: {
      [dateString: string]: {
        target: number;
        actual: number;
      };
    };
  };
}

/**
 * セクションごとのアップフィールド定義
 */
const SECTION_UP_FIELDS: Record<string, string[]> = {
  'LO': ['loUp'],
  '原画': ['genUp'],
  '動画': ['dougaUp'],
  '動検': ['doukenUp'],
  '仕上げ': ['shiageUp']
};

/**
 * ノルマデータサービス
 * 目標値の保存・読み込みと実績値の計算を管理
 */
export class NormaDataService {
  private localStorageKey: string;

  constructor(projectId: string) {
    this.localStorageKey = `normaTable_${projectId}`;
  }
  
  /**
   * 実績値を計算
   * 指定された日付範囲内でアップされたカットをカウント
   */
  async calculateActuals(
    appFacade: ApplicationFacade,
    startDate: Date,
    endDate: Date
  ): Promise<NormaData> {
    const cuts = appFacade.getAllReadModels();
    const normaData: NormaData = {};
    
    console.log(`[NormaDataService] calculateActuals開始: カット数=${cuts.length}`);
    
    // サンプルとして最初のカットのデータを確認
    if (cuts.length > 0) {
      const sampleCut = cuts[0];
      console.log(`[NormaDataService] サンプルカット: cutNumber=${sampleCut.cutNumber}, loUp=${sampleCut.loUp}, genUp=${sampleCut.genUp}, dougaUp=${sampleCut.dougaUp}`);
    }
    
    // パフォーマンス改善: 日付範囲を事前に計算
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    // セクションごとに処理
    Object.entries(SECTION_UP_FIELDS).forEach(([sectionName, upFields]) => {
      normaData[sectionName] = {};
      const managerFieldName = this.getManagerFieldName(sectionName);
      
      // 各カットを処理
      cuts.forEach(cut => {
        const manager = cut[managerFieldName as keyof CutReadModel] as string;
        
        if (!manager || !manager.trim()) return;
        
        const managerName = manager.trim();
        
        // 遅延初期化
        let managerData = normaData[sectionName][managerName];
        if (!managerData) {
          managerData = normaData[sectionName][managerName] = {};
        }
        
        // 各アップフィールドをチェック
        upFields.forEach(upField => {
          const upDate = cut[upField as keyof CutReadModel] as string;
          
          // デバッグログ：フィールドの値を確認
          if (upDate && cut.cutNumber && managerName) {
            console.log(`[NormaDataService] フィールド確認: カット=${cut.cutNumber}, セクション=${sectionName}, 担当者=${managerName}, フィールド=${upField}, 値=${upDate}`);
          }
          
          if (!upDate || !this.isValidDate(upDate)) return;
          
          const dateObj = this.parseDate(upDate);
          const dateTime = dateObj.getTime();
          
          // 有効な日付かチェック（事前計算した値を使用）
          if (ValidationHelper.isValidNumber(dateTime) && dateTime >= startTime && dateTime <= endTime) {
            const dateString = this.formatDateString(dateObj);
            
            if (!managerData[dateString]) {
              managerData[dateString] = {
                target: 0,
                actual: 0
              };
            }
            
            // 実績値をインクリメント
            managerData[dateString].actual += 1;

            // デバッグログ（開発時のみ）
            if (import.meta.env.DEV) {
              console.log(`[NormaDataService] 実績カウント: セクション=${sectionName}, 担当者=${managerName}, 日付=${dateString}, フィールド=${upField}, カット=${cut.cutNumber}`);
            }
          }
        });
      });
    });
    
    return normaData;
  }
  
  /**
   * 目標値を読み込む
   */
  loadTargets(): Record<string, number> {
    try {
      return StorageHelper.load(this.localStorageKey, {}) || {};
    } catch (error) {
      return ErrorHandler.handle(error, 'NormaDataService.loadTargets', {
        fallback: {},
        logLevel: 'error'
      });
    }
  }
  
  /**
   * 目標値を保存
   */
  saveTargets(targets: Record<string, number>): void {
    try {
      StorageHelper.save(this.localStorageKey, targets);
    } catch (error) {
      ErrorHandler.handle(error, 'NormaDataService.saveTargets', {
        logLevel: 'error'
      });
    }
  }
  
  /**
   * 特定のセル用のキーを生成
   */
  generateCellKey(section: string, manager: string, date: Date): string {
    const dateString = this.formatDateString(date);
    return `${section}_${manager}_${dateString}`;
  }
  
  /**
   * セクション名から担当者フィールド名を取得
   */
  private getManagerFieldName(sectionName: string): string {
    const mapping: Record<string, string> = {
      'LO': 'loManager',
      '原画': 'genManager',
      '動画': 'dougaManager',
      '動検': 'doukenManager',
      '仕上げ': 'shiageManager'
    };
    return mapping[sectionName] || '';
  }
  
  /**
   * 日付文字列が有効かチェック
   */
  private isValidDate(dateStr: string): boolean {
    if (!dateStr || dateStr === '-') return false;
    
    // YYYY-MM-DD形式かチェック
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return true;
    }
    
    // MM/DD形式かチェック
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!match) return false;
    
    const month = ValidationHelper.ensureNumber(match[1], 0);
    const day = ValidationHelper.ensureNumber(match[2], 0);
    
    return month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }
  
  /**
   * 日付文字列をDateオブジェクトに変換（MM/DD形式とYYYY-MM-DD形式の両方に対応）
   */
  private parseDate(dateStr: string): Date {
    try {
      // YYYY-MM-DD形式の場合
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr);
        // 有効な日付かチェック
        if (ValidationHelper.isValidDate(date)) {
          return date;
        }
      }
      
      // MM/DD形式の場合
      const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (!match) throw new Error('Invalid date format');
      
      const month = ValidationHelper.ensureNumber(match[1], 1) - 1;
      const day = ValidationHelper.ensureNumber(match[2], 1);
      const year = new Date().getFullYear();
      
      const date = new Date(year, month, day);
      
      // 有効な日付かチェック
      if (!ValidationHelper.isValidDate(date)) {
        throw new Error('Invalid date');
      }
      
      return date;
    } catch (error) {
      ErrorHandler.handle(error, 'NormaDataService.parseDate', {
        logLevel: 'warn',
        customMessage: `Date parse error: ${dateStr}`
      });
      // エラーの場合は無効な日付を返す（実績値計算でスキップされる）
      return new Date('invalid');
    }
  }
  
  /**
   * 日付を文字列形式に変換（YYYY-MM-DD）
   */
  private formatDateString(date: Date): string {
    return DateHelper.formatDate(date); // YYYY-MM-DD形式
  }
  
  /**
   * プロジェクト期間が変更された場合の古いデータ削除
   */
  clearTargets(): void {
    try {
      StorageHelper.remove(this.localStorageKey, { prefix: '' });
    } catch (error) {
      ErrorHandler.handle(error, 'NormaDataService.clearTargets', {
        logLevel: 'error'
      });
    }
  }
}