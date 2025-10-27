/**
 * 担当者役割の設定
 */

import { ProgressFieldService } from '@/services/domain/ProgressFieldService';

export type StaffRole = 'loManager' | 'genManager' | 'dougaManager' | 'doukenManager' | 'shiageManager' | 'loSakkan' | 'genSakkan';

export interface RoleConfig {
  role: StaffRole;
  label: string;
  fieldName: keyof import('../../../models/types').CutData;
  progressFields: Array<keyof import('../../../models/types').CutData>;
  isCompositeRole?: boolean; // 複合的な役割（複数フィールドの組み合わせ）
  secondaryFieldName?: keyof import('../../../models/types').CutData; // 第二フィールド（組み合わせ用）
}

/**
 * 役割別の設定を動的に生成
 */
function generateRoleConfigs(): Record<StaffRole, RoleConfig> {
  const fieldService = ProgressFieldService.getInstance();
  const progressGroups = fieldService.getProgressGroups();
  
  // 各グループの進捗フィールドを取得
  const loProgressFields = progressGroups.find(g => g.id === 'lo')?.fields || [];
  const genProgressFields = progressGroups.find(g => g.id === 'genga')?.fields || [];
  const dougaProgressFields = progressGroups.find(g => g.id === 'douga')?.fields || [];
  const doukenProgressFields = progressGroups.find(g => g.id === 'douken')?.fields || [];
  const iroProgressFields = progressGroups.find(g => g.id === 'iro')?.fields || [];
  const shiageProgressFields = progressGroups.find(g => g.id === 'shiage')?.fields || [];
  const shikenOthersProgressFields = progressGroups.find(g => g.id === 'shikenOthers')?.fields || [];
  
  return {
    loManager: {
      role: 'loManager',
      label: 'LO',
      fieldName: 'loManager',
      progressFields: loProgressFields // 元の全10列に戻す
    },
    genManager: {
      role: 'genManager',
      label: '原画',
      fieldName: 'genManager',
      progressFields: genProgressFields
    },
    dougaManager: {
      role: 'dougaManager',
      label: '動画',
      fieldName: 'dougaManager',
      progressFields: dougaProgressFields
    },
    doukenManager: {
      role: 'doukenManager',
      label: '動検',
      fieldName: 'doukenManager',
      progressFields: [...doukenProgressFields, ...iroProgressFields]
    },
    shiageManager: {
      role: 'shiageManager',
      label: '仕上げ',
      fieldName: 'shiageManager',
      progressFields: [...shiageProgressFields, 'shikenIn', 'shikenUp']
    },
    loSakkan: {
      role: 'loSakkan',
      label: 'LO作監',
      fieldName: 'loSakkan',
      progressFields: loProgressFields, // 元の全10列に戻す
      isCompositeRole: true,
      secondaryFieldName: 'loManager'
    },
    genSakkan: {
      role: 'genSakkan',
      label: '原画作監',
      fieldName: 'genSakkan',
      progressFields: genProgressFields,
      isCompositeRole: true,
      secondaryFieldName: 'genManager'
    }
  };
}

/**
 * 役割別の設定
 */
export const ROLE_CONFIGS: Record<StaffRole, RoleConfig> = generateRoleConfigs();

/**
 * 役割のリスト（表示順）
 */
export const ROLE_LIST: StaffRole[] = [
  'loManager',
  'genManager',
  'dougaManager',
  'doukenManager',
  'shiageManager'
];