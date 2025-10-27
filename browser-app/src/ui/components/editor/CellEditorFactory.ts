/**
 * セルエディターファクトリー
 * フィールドタイプに応じたエディターを生成
 */
import { CellEditor } from './CellEditor';
import { ApplicationFacade } from '@/core/ApplicationFacade';
import { FieldKey } from '@/models/types';
import { CutReadModel } from '@/data/models/CutReadModel';
import { FieldDefinition } from '../../shared/types/FieldDefinition';
import { TableEventManager } from '@/core/events/TableEventManager';

// 数値フィールドのリスト
const NUMERIC_FIELDS: readonly FieldKey[] = [
  'maisu',
  'loCost',
  'genCost',
  'dougaCost',
  'doukenCost',
  'shiageCost'
] as const;

export class CellEditorFactory {
  constructor(
    private appFacade: ApplicationFacade,
    private formatFieldValue: (value: string, field: FieldDefinition) => string,
    private eventManager?: TableEventManager,
    private onCellValueSaved?: (cell: HTMLTableCellElement, value: string, cut: CutReadModel, fieldKey: FieldKey) => void
  ) {}
  
  /**
   * セルエディターを作成
   */
  createEditor(
    cell: HTMLTableCellElement,
    cut: CutReadModel,
    fieldKey: FieldKey,
    field: FieldDefinition
  ): CellEditor {
    const isNumericField = this.isNumericField(fieldKey);
    
    return new CellEditor({
      cell,
      cut,
      fieldKey,
      appFacade: this.appFacade,
      formatValue: (value: string) => this.formatFieldValue(value, field),
      isNumericField,
      eventManager: this.eventManager,
      onValueSaved: this.onCellValueSaved ? 
        (value: string) => {
          const formattedValue = this.formatFieldValue(value, field);
          this.onCellValueSaved!(cell, formattedValue, cut, fieldKey);
        } : undefined
    });
  }
  
  /**
   * 数値フィールドかどうかを判定
   */
  private isNumericField(fieldKey: FieldKey): boolean {
    return NUMERIC_FIELDS.includes(fieldKey);
  }
}