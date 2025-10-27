/**
 * CSSクラス名の生成を統一管理
 * 一貫性のあるクラス名生成と保守性の向上
 */

import { FIELD_CATEGORIES, PROGRESS_STATUS, SPECIAL_VALUES } from '../constants/TableConstants';
import { FieldDefinition } from '../types/FieldDefinition';
import { ProgressStatus } from '../../../models/values/ProgressStatus';

export class CSSClassBuilder {
  /**
   * フィールドのCSSクラス名を生成
   */
  static buildFieldClassName(field: FieldDefinition): string {
    const classes: string[] = [];
    
    // カテゴリベースのクラス
    if (field.category) {
      classes.push(`field-${field.category}`);
    }
    
    // タイプベースのクラス
    if (field.type) {
      classes.push(`field-${field.type}`);
    }
    
    // 固定列のクラス
    if (field.fixed) {
      classes.push('fixed-column');
    }
    
    // 編集可能フィールドのクラス
    if (field.editable && field.type === 'progress') {
      classes.push('clickable-progress');
    }
    
    return classes.join(' ');
  }

  /**
   * グループヘッダーのCSSクラス名を生成
   */
  static buildGroupClassName(category: string): string {
    switch (category) {
      case FIELD_CATEGORIES.BASIC:
        return 'basic-group';
      case FIELD_CATEGORIES.INFO:
        return 'info-group';
      case FIELD_CATEGORIES.PROGRESS:
        return 'progress-group';
      case FIELD_CATEGORIES.SPECIAL:
        return 'special-group';
      default:
        return 'default-group';
    }
  }

  /**
   * 進捗状態に基づくCSSクラス名を生成
   */
  static buildProgressClassName(value: any): string | null {
    if (!value || value === '') return null; // 空白の場合はストライプのまま
    
    const progressStatus = new ProgressStatus(value.toString());
    
    // 日付入力済みまたは「不要」の場合は緑色
    if (progressStatus.isCompleted() || progressStatus.isNotRequired()) {
      return 'completed';
    }
    
    // リテイクの場合は赤色
    if (progressStatus.isRetake()) {
      return 'retake';
    }
    
    // その他の場合もストライプのまま
    return null;
  }

  /**
   * サマリー表示のCSSクラス名を生成
   */
  static buildSummaryClassName(type: string): string {
    return `${type}-summary`;
  }

  /**
   * テーブル行のCSSクラス名を生成
   */
  static buildRowClassName(index: number, isSelected: boolean = false): string {
    const classes = ['data-row'];
    
    if (index % 2 === 0) {
      classes.push('even-row');
    }
    
    if (isSelected) {
      classes.push('selected');
    }
    
    return classes.join(' ');
  }

  /**
   * コンテナのCSSクラス名を生成
   */
  static buildContainerClassName(state: {
    isLoading?: boolean;
    hasError?: boolean;
    isEmpty?: boolean;
  }): string {
    const classes = ['progress-container-simple'];
    
    if (state.isLoading) {
      classes.push('loading');
    }
    
    if (state.hasError) {
      classes.push('error');
    }
    
    if (state.isEmpty) {
      classes.push('empty');
    }
    
    return classes.join(' ');
  }
}