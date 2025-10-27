import { DataProcessor } from '@/ui/shared/utils/DataProcessor';

export class CellMemo {
  private constructor(
    private readonly _cutNumber: string,
    private readonly _fieldKey: string,
    private readonly _content: string,
    private readonly _updatedAt: Date
  ) {}

  static create(
    cutNumber: string,
    fieldKey: string,
    content: string,
    updatedAt?: Date
  ): CellMemo {
    if (!cutNumber || !fieldKey) {
      throw new Error('カット番号とフィールドキーは必須です');
    }
    
    return new CellMemo(
      cutNumber,
      fieldKey,
      content || '',
      updatedAt || new Date()
    );
  }

  get cutNumber(): string {
    return this._cutNumber;
  }

  get fieldKey(): string {
    return this._fieldKey;
  }

  get content(): string {
    return this._content;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get cellKey(): string {
    return `${this._cutNumber}_${this._fieldKey}`;
  }

  updateContent(newContent: string): CellMemo {
    return new CellMemo(
      this._cutNumber,
      this._fieldKey,
      newContent,
      new Date()
    );
  }

  isEmpty(): boolean {
    return DataProcessor.isEmpty(this._content);
  }

  equals(other: CellMemo): boolean {
    return (
      this._cutNumber === other._cutNumber &&
      this._fieldKey === other._fieldKey &&
      this._content === other._content
    );
  }
}