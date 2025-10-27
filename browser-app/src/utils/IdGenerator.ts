import { ID_PATTERNS } from '../constants';
import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';

/**
 * ID生成ユーティリティ
 * アプリケーション全体で一貫したID生成を行う
 */
export class IdGenerator {
  /**
   * カットIDを生成
   */
  static generateCutId(cutNumber: number | string): string {
    // 文字列の場合はそのまま使用、数値の場合は文字列に変換
    const cutNumberStr = typeof cutNumber === 'string' ? cutNumber : String(cutNumber);
    return `${ID_PATTERNS.AGGREGATE.CUT}${cutNumberStr}`;
  }

  /**
   * メモキーを生成
   */
  static generateMemoKey(cutNumber: number, fieldKey: string): string {
    return `${cutNumber}${ID_PATTERNS.FIELD_KEY_SEPARATOR}${fieldKey}`;
  }

  /**
   * パーソナルキーを生成（セクション名と担当者名から）
   */
  static generatePersonalKey(sectionName: string, managerName: string): string {
    return `${sectionName}${ID_PATTERNS.SEPARATOR}${managerName}`;
  }

  /**
   * シミュレーションIDを生成
   */
  static generateSimulationId(projectId: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    return `${ID_PATTERNS.AGGREGATE.SIMULATION}${projectId}${ID_PATTERNS.SEPARATOR}${ts}`;
  }

  /**
   * ストレージキーを生成
   */
  static generateStorageKey(prefix: string, identifier: string): string {
    return `${prefix}${identifier}`;
  }

  /**
   * IDからコンポーネントを抽出
   */
  static extractComponents(id: string): { type: string; parts: string[] } {
    // カットIDの場合
    if (id.startsWith(ID_PATTERNS.AGGREGATE.CUT)) {
      return {
        type: 'cut',
        parts: [id.substring(ID_PATTERNS.AGGREGATE.CUT.length)]
      };
    }
    
    // シミュレーションIDの場合
    if (id.startsWith(ID_PATTERNS.AGGREGATE.SIMULATION)) {
      const remaining = id.substring(ID_PATTERNS.AGGREGATE.SIMULATION.length);
      return {
        type: 'simulation',
        parts: remaining.split(ID_PATTERNS.SEPARATOR)
      };
    }
    
    // その他の場合
    return {
      type: 'unknown',
      parts: id.split(ID_PATTERNS.SEPARATOR)
    };
  }

  /**
   * メモキーからカット番号とフィールドキーを抽出
   */
  static extractFromMemoKey(memoKey: string): { cutNumber: number; fieldKey: string } | null {
    const parts = memoKey.split(ID_PATTERNS.FIELD_KEY_SEPARATOR);
    if (parts.length !== 2) {
      return null;
    }
    
    const cutNumber = ValidationHelper.ensureNumber(parts[0], 0);
    if (!ValidationHelper.isValidNumber(cutNumber)) {
      return null;
    }
    
    return {
      cutNumber,
      fieldKey: parts[1]
    };
  }
}