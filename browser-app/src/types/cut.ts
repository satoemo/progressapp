/**
 * カット関連の型定義
 * Phase 3: 型定義の統一
 */

// 78フィールドのカット情報
export interface CutData {
  // 基本情報（9フィールド）
  id: string;
  cutNumber: string;
  status: string;
  special: string;
  kenyo: string;
  maisu: string;
  manager: string;
  ensyutsu: string;
  sousakkan: string;
  
  // 削除フラグ（論理削除用）
  isDeleted?: string | boolean;
  
  // 拡張フィールド（オプショナル）
  scene?: string;
  completionRate?: number;
  totalCost?: number;
  
  // LO情報（4フィールド）
  loManager: string;
  loSakkan: string;
  loOffice: string;
  loCost: string;
  
  // LO進捗（10フィールド）
  _3dLoCheck: string;
  _3dLoRender: string;
  sakuuchi: string;
  loIn: string;
  loUp: string;
  ensyutsuUp: string;
  sakkanUp: string;
  losakkanUp: string;
  sosakkanUp: string;
  genzuUp: string;
  
  // 原画情報（4フィールド）
  genManager: string;
  genSakkan: string;
  genOffice: string;
  genCost: string;
  
  // 原画進捗（4フィールド）
  genIn: string;
  genUp: string;
  genEnsyutsuUp: string;
  genSakkanUp: string;
  
  // 動画情報（4フィールド）
  dougaManager: string;
  dougaOffice: string;
  dougaMaki: string;
  dougaCost: string;
  
  // 動画進捗（2フィールド）
  dougaIn: string;
  dougaUp: string;
  
  // 動検情報（3フィールド）
  doukenManager: string;
  doukenOffice: string;
  doukenCost: string;
  
  // 動検進捗（2フィールド）
  doukenIn: string;
  doukenUp: string;
  
  // 色指定進捗（2フィールド）
  iroIn: string;
  iroUp: string;
  
  // 仕上げ情報（3フィールド）
  shiageManager: string;
  shiageOffice: string;
  shiageCost: string;
  
  // 仕上げ進捗（2フィールド）
  shiageIn: string;
  shiageUp: string;
  
  // 仕検その他進捗（12フィールド）
  shikenIn: string;
  shikenUp: string;
  tokkouIn: string;
  tokkouUp: string;
  haikeiIn: string;
  haikeiUp: string;
  bikanIn: string;
  bikanUp: string;
  _2dIn: string;
  _2dUp: string;
  _3dIn: string;
  _3dUp: string;
  
  // 撮影進捗（10フィールド）
  satsuBg: string;
  satsu2d: string;
  satsu3d: string;
  satsuToku: string;
  satsuHon: string;
  satsuIre: string;
  satsuTimingRoll: string;
  satsuTimingIn: string;
  satsuHonRoll: string;
  satsuHonUp: string;
}

// フィールドのグループ定義
export const FIELD_GROUPS = {
  basic: ['cutNumber', 'status'] as const,
  cutInfo: ['special', 'kenyo', 'maisu', 'manager', 'ensyutsu', 'sousakkan'] as const,
  loInfo: ['loManager', 'loSakkan', 'loOffice', 'loCost'] as const,
  loProgress: [
    '_3dLoCheck', '_3dLoRender', 'sakuuchi', 'loIn', 'loUp',
    'ensyutsuUp', 'sakkanUp', 'losakkanUp', 'sosakkanUp', 'genzuUp'
  ] as const,
  genInfo: ['genManager', 'genSakkan', 'genOffice', 'genCost'] as const,
  genProgress: ['genIn', 'genUp', 'genEnsyutsuUp', 'genSakkanUp'] as const,
  dougaInfo: ['dougaManager', 'dougaOffice', 'dougaMaki', 'dougaCost'] as const,
  dougaProgress: ['dougaIn', 'dougaUp'] as const,
  doukenInfo: ['doukenManager', 'doukenOffice', 'doukenCost'] as const,
  doukenProgress: ['doukenIn', 'doukenUp'] as const,
  iroProgress: ['iroIn', 'iroUp'] as const,
  shiageInfo: ['shiageManager', 'shiageOffice', 'shiageCost'] as const,
  shiageProgress: ['shiageIn', 'shiageUp'] as const,
  shikenOthersProgress: [
    'shikenIn', 'shikenUp', 'tokkouIn', 'tokkouUp',
    'haikeiIn', 'haikeiUp', 'bikanIn', 'bikanUp',
    '_2dIn', '_2dUp', '_3dIn', '_3dUp'
  ] as const,
  satsuProgress: [
    'satsuBg', 'satsu2d', 'satsu3d', 'satsuToku', 'satsuHon',
    'satsuIre', 'satsuTimingRoll', 'satsuTimingIn', 'satsuHonRoll', 'satsuHonUp'
  ] as const
} as const;

// 進捗フィールドの定義
export const PROGRESS_FIELDS = [
  ...FIELD_GROUPS.loProgress,
  ...FIELD_GROUPS.genProgress,
  ...FIELD_GROUPS.dougaProgress,
  ...FIELD_GROUPS.doukenProgress,
  ...FIELD_GROUPS.iroProgress,
  ...FIELD_GROUPS.shiageProgress,
  ...FIELD_GROUPS.shikenOthersProgress,
  ...FIELD_GROUPS.satsuProgress
] as const;

// 情報フィールドの定義
export const INFO_FIELDS = [
  ...FIELD_GROUPS.basic,
  ...FIELD_GROUPS.cutInfo,
  ...FIELD_GROUPS.loInfo,
  ...FIELD_GROUPS.genInfo,
  ...FIELD_GROUPS.dougaInfo,
  ...FIELD_GROUPS.shiageInfo
] as const;

// フィールドタイプ
export type FieldKey = keyof CutData;
export type ProgressFieldKey = typeof PROGRESS_FIELDS[number];
export type InfoFieldKey = typeof INFO_FIELDS[number];

// カット作成用データ型
export interface CutCreateData {
  cutNumber: string;
  special?: string;
  kenyo?: string;
  maisu?: string;
  manager?: string;
  ensyutsu?: string;
  sousakkan?: string;
  [key: string]: string | undefined;
}

// カット更新用データ型
export type CutUpdateData = Partial<CutData>;

// カットステータス
export type CutStatus = 'pending' | 'in_progress' | 'completed' | 'hold' | 'deleted';