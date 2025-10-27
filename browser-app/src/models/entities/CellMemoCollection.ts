import { CellMemo } from '../value-objects/CellMemo';

export class CellMemoCollection {
  private memos: Map<string, CellMemo>;

  constructor(memos: CellMemo[] = []) {
    this.memos = new Map();
    memos.forEach(memo => {
      this.memos.set(memo.cellKey, memo);
    });
  }

  add(memo: CellMemo): void {
    if (memo.isEmpty()) {
      this.remove(memo.cutNumber, memo.fieldKey);
      return;
    }
    this.memos.set(memo.cellKey, memo);
  }

  get(cutNumber: string, fieldKey: string): CellMemo | undefined {
    const key = `${cutNumber}_${fieldKey}`;
    return this.memos.get(key);
  }

  remove(cutNumber: string, fieldKey: string): void {
    const key = `${cutNumber}_${fieldKey}`;
    this.memos.delete(key);
  }

  has(cutNumber: string, fieldKey: string): boolean {
    const memo = this.get(cutNumber, fieldKey);
    return memo !== undefined && !memo.isEmpty();
  }

  update(cutNumber: string, fieldKey: string, content: string): void {
    const existingMemo = this.get(cutNumber, fieldKey);
    if (existingMemo) {
      const updatedMemo = existingMemo.updateContent(content);
      this.add(updatedMemo);
    } else {
      const newMemo = CellMemo.create(cutNumber, fieldKey, content);
      this.add(newMemo);
    }
  }

  getAllMemos(): CellMemo[] {
    return Array.from(this.memos.values()).filter(memo => !memo.isEmpty());
  }

  getMemosForCut(cutNumber: string): CellMemo[] {
    return this.getAllMemos().filter(memo => memo.cutNumber === cutNumber);
  }

  getMemosForField(fieldKey: string): CellMemo[] {
    return this.getAllMemos().filter(memo => memo.fieldKey === fieldKey);
  }

  count(): number {
    return this.getAllMemos().length;
  }

  toJSON(): Record<string, string> {
    const json: Record<string, string> = {};
    this.getAllMemos().forEach(memo => {
      json[memo.cellKey] = memo.content;
    });
    return json;
  }

  static fromJSON(json: Record<string, string>): CellMemoCollection {
    const memos: CellMemo[] = [];
    
    Object.entries(json).forEach(([key, content]) => {
      const [cutNumber, ...fieldParts] = key.split('_');
      const fieldKey = fieldParts.join('_');
      
      if (cutNumber && fieldKey && content) {
        memos.push(CellMemo.create(cutNumber, fieldKey, content));
      }
    });
    
    return new CellMemoCollection(memos);
  }
}