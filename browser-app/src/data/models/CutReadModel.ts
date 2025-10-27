import { CutData, PROGRESS_FIELDS } from '@/models/types';
import { ProgressStatus } from '@/models/values/ProgressStatus';
import { Money } from '@/models/values/Money';

/**
 * カット読み取りモデル
 * クエリ用に最適化されたデータ構造
 */
export interface CutReadModel extends CutData {
  // 計算済みフィールド
  completionRate: number;
  totalCost: number;
  progressSummary: {
    completed: number;
    notRequired: number;
    inProgress: number;
    notStarted: number;
  };
}

/**
 * CutDataからReadModelを作成
 */
export function createCutReadModel(data: CutData): CutReadModel {
  const progressSummary = calculateProgressSummary(data);
  const completionRate = calculateCompletionRate(progressSummary);
  const totalCost = calculateTotalCost(data);

  return {
    ...data,
    completionRate,
    totalCost,
    progressSummary
  };
}

/**
 * 進捗サマリーを計算
 */
function calculateProgressSummary(data: CutData): CutReadModel['progressSummary'] {
  const summary = {
    completed: 0,
    notRequired: 0,
    inProgress: 0,
    notStarted: 0
  };

  for (const field of PROGRESS_FIELDS) {
    const value = data[field];
    const status = new ProgressStatus(value);

    if (status.isCompleted()) {
      summary.completed++;
    } else if (status.isNotRequired()) {
      summary.notRequired++;
    } else if (status.isRetake() || value) {
      summary.inProgress++;
    } else {
      summary.notStarted++;
    }
  }

  return summary;
}

/**
 * 完了率を計算
 */
function calculateCompletionRate(summary: CutReadModel['progressSummary']): number {
  const total = summary.completed + summary.notRequired + summary.inProgress + summary.notStarted;
  if (total === 0) return 0;
  
  const completed = summary.completed + summary.notRequired;
  return (completed / total) * 100;
}

/**
 * 総コストを計算
 */
function calculateTotalCost(data: CutData): number {
  const costFields = ['loCost', 'genCost', 'dougaCost', 'doukenCost', 'shiageCost'] as const;
  
  let total = Money.zero();
  
  for (const field of costFields) {
    const value = data[field];
    if (value) {
      try {
        total = total.add(new Money(value));
      } catch {
        // 無効な値は無視
      }
    }
  }
  
  return total.getAmount();
}