// ドメイン型定義
// Phase 3: 型定義は /src/types/ に移動しました

// 後方互換性のため、新しい場所から再エクスポート
export type { 
  CutData,
  FieldKey,
  ProgressFieldKey,
  InfoFieldKey
} from '@/types/cut';

export { 
  FIELD_GROUPS,
  PROGRESS_FIELDS,
  INFO_FIELDS
} from '@/types/cut';


// フィールドのグループ定義（内部用、エクスポートしない）
const _FIELD_GROUPS = {
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


// フィールドタイプ（これらは@/types/cutからエクスポートされている）