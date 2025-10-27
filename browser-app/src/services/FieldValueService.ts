import { CutReadModel } from '@/data/models/CutReadModel';
import { FieldKey } from '@/models/types';
import { DataProcessor } from '@/ui/shared/utils/DataProcessor';

/**
 * フィールド値収集サービス
 * フィールドの候補値を収集・整形するサービス
 */
export class FieldValueService {
  private static readonly MAX_ITEMS = 20;
  
  /**
   * 特殊フィールドのデフォルト値
   */
  private static readonly SPECIAL_DEFAULT_VALUES = [
    '欠番',
    'BANK',
    '一部BANK',
    'BG-Only',
    '2D-Only',
    '3D-Only',
    '2D',
    '3D',
    '2D3D',
    '特効',
    'PV',
    '予告',
    'ハーモニー',
    '擬斗',
    'プロップ'
  ];

  /**
   * 指定フィールドの候補値を収集
   * @param cuts 全カットデータ
   * @param fieldKey 対象フィールドキー
   * @returns ソート済みの候補値配列
   */
  public collectFieldValues(cuts: CutReadModel[], fieldKey: FieldKey): string[] {
    // 特殊フィールドの場合は特別な処理
    if (fieldKey === 'special') {
      return this.collectSpecialFieldValues(cuts);
    }
    
    // 1. 全カットから値を収集
    const values = cuts
      .map(cut => (cut as any)[fieldKey])
      .filter(value => value && value.trim() !== '');
    
    // 2. 重複除去
    const uniqueValues = DataProcessor.unique(values);
    
    // 3. ソート（英数字→日本語）
    return this.sortValues(uniqueValues).slice(0, FieldValueService.MAX_ITEMS);
  }

  /**
   * 特殊フィールドの候補値を収集
   * デフォルト値を先頭に固定表示し、既存値と統合
   * @param cuts 全カットデータ
   * @returns デフォルト値を先頭に配置した候補値配列
   */
  private collectSpecialFieldValues(cuts: CutReadModel[]): string[] {
    // 1. 既存値を収集
    const existingValues = cuts
      .map(cut => (cut as any)['special'])
      .filter(value => value && value.trim() !== '');
    
    // 2. 既存値の重複除去
    const uniqueExistingValues = DataProcessor.unique(existingValues);
    
    // 3. デフォルト値に含まれない既存値のみを抽出
    const additionalValues = uniqueExistingValues.filter(
      value => !FieldValueService.SPECIAL_DEFAULT_VALUES.includes(value)
    );
    
    // 4. 既存値をソート
    const sortedAdditionalValues = this.sortValues(additionalValues);
    
    // 5. デフォルト値を先頭に、既存値を後ろに配置
    return [...FieldValueService.SPECIAL_DEFAULT_VALUES, ...sortedAdditionalValues];
  }

  /**
   * 値をソート（英数字→日本語）
   * @param values ソート対象の値配列
   * @returns ソート済みの値配列
   */
  private sortValues(values: string[]): string[] {
    return values.sort((a, b) => {
      const isAAlphanumeric = /^[A-Za-z0-9]/.test(a);
      const isBAlphanumeric = /^[A-Za-z0-9]/.test(b);
      
      // 英数字が先、日本語が後
      if (isAAlphanumeric && !isBAlphanumeric) return -1;
      if (!isAAlphanumeric && isBAlphanumeric) return 1;
      
      // 同じカテゴリ内での比較
      return a.localeCompare(b, 'ja');
    });
  }
}