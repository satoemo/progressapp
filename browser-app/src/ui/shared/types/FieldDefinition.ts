import { CutReadModel } from '@/data/models/CutReadModel';

/**
 * フィールド定義インターフェース
 */
export interface FieldDefinition {
  id: string;
  field: keyof CutReadModel;
  title: string;
  width: number;
  type?: 'text' | 'currency' | 'date' | 'progress' | 'special';
  category?: string; // FIELD_GROUPSのidを含む任意の文字列を許可
  editable?: boolean;
  fixed?: boolean;
  calcType?: 'progress' | 'currency' | 'maisu' | 'special' | 'count';
}