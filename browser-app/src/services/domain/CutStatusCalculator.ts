import { CutReadModel } from '@/data/models/CutReadModel';
import { ProgressFieldService } from './ProgressFieldService';
import { FieldMetadataRegistry } from '../../models/metadata/FieldMetadataRegistry';
import { ProgressStatus } from '../../models/values/ProgressStatus';
import { ProgressFieldKey } from '../types';

/**
 * カットステータス計算結果
 */
export interface CutStatusResult {
  fieldName: string;
  status: string;
  isRetake: boolean;
}

/**
 * カットステータス計算サービス
 * カットの現在の進捗状態を計算する
 */
export class CutStatusCalculator {
  private progressFieldService: ProgressFieldService;
  private metadataRegistry: FieldMetadataRegistry;

  constructor() {
    this.progressFieldService = ProgressFieldService.getInstance();
    this.metadataRegistry = FieldMetadataRegistry.getInstance();
  }

  /**
   * カットの進捗状態を計算
   */
  public calculateCutStatus(cut: CutReadModel): CutStatusResult {
    const progressFields = this.progressFieldService.getAllProgressFields();
    
    // 進捗フィールドを右から左にチェック（最後の工程から最初の工程へ）
    for (let i = progressFields.length - 1; i >= 0; i--) {
      const field = progressFields[i];
      const value = cut[field];
      
      if (value) {
        const progressStatus = new ProgressStatus(value);
        
        // リテイクの場合
        if (progressStatus.isRetake()) {
          const fieldLabel = this.getFieldLabel(field);
          return {
            fieldName: fieldLabel,
            status: `${fieldLabel}リテイク`,
            isRetake: true
          };
        }
        
        // 日付が入力されている、または「不要」の場合
        if (progressStatus.isCompleted() || progressStatus.isNotRequired()) {
          // 次のフィールドを探す
          if (i < progressFields.length - 1) {
            const nextField = progressFields[i + 1];
            const nextFieldLabel = this.getFieldLabel(nextField);
            return {
              fieldName: nextFieldLabel,
              status: `${nextFieldLabel}まち`,
              isRetake: false
            };
          } else {
            // 最後のフィールドまで完了
            return {
              fieldName: '',
              status: '完了',
              isRetake: false
            };
          }
        }
      }
    }
    
    // どのフィールドも入力されていない場合
    const firstField = progressFields[0];
    const firstFieldLabel = this.getFieldLabel(firstField);
    return {
      fieldName: firstFieldLabel,
      status: `${firstFieldLabel}まち`,
      isRetake: false
    };
  }

  /**
   * フィールドのラベルを取得
   */
  private getFieldLabel(field: ProgressFieldKey): string {
    const metadata = this.metadataRegistry.getFieldMetadata(field);
    return metadata?.title || field;
  }

  /**
   * 進捗率を計算（0.0〜1.0）
   */
  public calculateProgressRate(cut: CutReadModel): number {
    const progressFields = this.progressFieldService.getAllProgressFields();
    let completedCount = 0;
    
    for (const field of progressFields) {
      const value = cut[field];
      if (value) {
        const progressStatus = new ProgressStatus(value);
        if (progressStatus.isCompleted() || progressStatus.isNotRequired()) {
          completedCount++;
        }
      }
    }
    
    return progressFields.length > 0 ? completedCount / progressFields.length : 0;
  }

  /**
   * 次の必要なアクションを取得
   */
  public getNextRequiredAction(cut: CutReadModel): { field: ProgressFieldKey; label: string } | null {
    const progressFields = this.progressFieldService.getAllProgressFields();
    
    // 最初の未完了フィールドを探す
    for (const field of progressFields) {
      const value = cut[field];
      if (!value) {
        return {
          field,
          label: this.getFieldLabel(field)
        };
      }
      
      const progressStatus = new ProgressStatus(value);
      if (!progressStatus.isCompleted() && !progressStatus.isNotRequired()) {
        return {
          field,
          label: this.getFieldLabel(field)
        };
      }
    }
    
    return null;
  }
}