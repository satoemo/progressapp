import { CellMemo } from '@/models/values/CellMemo';
import { DataProcessor } from '@/ui/shared/utils/DataProcessor';

/**
 * メモ読み取りモデル
 * クエリ用に最適化されたデータ構造
 */
export interface MemoReadModel {
  // 基本データ
  memos: Record<string, string>; // cellKey -> content のマッピング
  
  // 計算済みフィールド
  memoCount: number;
  cutMemoCount: Record<string, number>; // cutNumber -> memo count
  fieldMemoCount: Record<string, number>; // fieldKey -> memo count
  lastUpdated: Date | null;
}

/**
 * メモデータからReadModelを作成
 */
export function createMemoReadModel(memos: Record<string, string>): MemoReadModel {
  const cutMemoCount: Record<string, number> = {};
  const fieldMemoCount: Record<string, number> = {};
  let memoCount = 0;

  // メモデータを解析
  Object.entries(memos).forEach(([cellKey, content]) => {
    if (DataProcessor.isEmpty(content)) {
      return;
    }

    memoCount++;
    
    // cellKeyから cutNumber と fieldKey を抽出
    const [cutNumber, ...fieldParts] = cellKey.split('_');
    const fieldKey = fieldParts.join('_');
    
    if (cutNumber) {
      cutMemoCount[cutNumber] = (cutMemoCount[cutNumber] || 0) + 1;
    }
    
    if (fieldKey) {
      fieldMemoCount[fieldKey] = (fieldMemoCount[fieldKey] || 0) + 1;
    }
  });

  return {
    memos,
    memoCount,
    cutMemoCount,
    fieldMemoCount,
    lastUpdated: memoCount > 0 ? new Date() : null
  };
}

/**
 * CellMemoコレクションからReadModelを作成
 */
export function createMemoReadModelFromCollection(memos: CellMemo[]): MemoReadModel {
  const memoMap: Record<string, string> = {};
  
  memos.forEach(memo => {
    if (!memo.isEmpty()) {
      memoMap[memo.cellKey] = memo.content;
    }
  });
  
  return createMemoReadModel(memoMap);
}