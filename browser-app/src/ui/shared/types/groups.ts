/**
 * フィールドグループ定義
 * v8のグループ構成に基づいた定義
 */

import { CutData } from '../../../models/types';

/**
 * フィールドグループ定義インターフェース
 */
export interface FieldGroup {
  id: string;
  title: string;
  className: string;
  fields: (keyof CutData)[];
  section: 'basic' | 'preproduction' | 'animation' | 'finishing' | 'postproduction';
}

/**
 * グループ定義配列
 * 表示順序もこの配列の順序に従う
 */
export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'basic',
    title: '基本情報',
    className: 'basic-group',
    section: 'basic',
    fields: ['cutNumber', 'status']
  },
  {
    id: 'cutInfo',
    title: 'カット情報',
    className: 'info-group',
    section: 'basic',
    fields: ['special', 'kenyo', 'maisu', 'manager', 'ensyutsu', 'sousakkan']
  },
  {
    id: 'loInfo',
    title: 'LO情報',
    className: 'info-group',
    section: 'preproduction',
    fields: ['loManager', 'loOffice', 'loCost', 'loSakkan']
  },
  {
    id: 'loProgress',
    title: 'LO進捗',
    className: 'progress-group',
    section: 'preproduction',
    fields: ['_3dLoCheck', '_3dLoRender', 'sakuuchi', 'loIn', 'loUp', 'ensyutsuUp', 'sakkanUp', 'losakkanUp', 'sosakkanUp', 'genzuUp']
  },
  {
    id: 'genInfo',
    title: '原画情報',
    className: 'info-group',
    section: 'animation',
    fields: ['genManager', 'genOffice', 'genCost', 'genSakkan']
  },
  {
    id: 'genProgress',
    title: '原画進捗',
    className: 'progress-group',
    section: 'animation',
    fields: ['genIn', 'genUp', 'genEnsyutsuUp', 'genSakkanUp']
  },
  {
    id: 'dougaInfo',
    title: '動画情報',
    className: 'info-group',
    section: 'animation',
    fields: ['dougaManager', 'dougaOffice', 'dougaMaki', 'dougaCost']
  },
  {
    id: 'dougaProgress',
    title: '動画進捗',
    className: 'progress-group',
    section: 'animation',
    fields: ['dougaIn', 'dougaUp']
  },
  {
    id: 'doukenInfo',
    title: '動検情報',
    className: 'info-group',
    section: 'animation',
    fields: ['doukenManager', 'doukenOffice', 'doukenCost']
  },
  {
    id: 'doukenProgress',
    title: '動検進捗',
    className: 'progress-group',
    section: 'animation',
    fields: ['doukenIn', 'doukenUp']
  },
  {
    id: 'iroProgress',
    title: '色指定進捗',
    className: 'progress-group',
    section: 'finishing',
    fields: ['iroIn', 'iroUp']
  },
  {
    id: 'shiageInfo',
    title: '仕上げ情報',
    className: 'info-group',
    section: 'finishing',
    fields: ['shiageManager', 'shiageOffice', 'shiageCost']
  },
  {
    id: 'shiageProgress',
    title: '仕上げ進捗',
    className: 'progress-group',
    section: 'finishing',
    fields: ['shiageIn', 'shiageUp']
  },
  {
    id: 'shikenOthersProgress',
    title: '仕検その他進捗',
    className: 'progress-group',
    section: 'finishing',
    fields: ['shikenIn', 'shikenUp', 'tokkouIn', 'tokkouUp', 'haikeiIn', 'haikeiUp', 'bikanIn', 'bikanUp', '_2dIn', '_2dUp', '_3dIn', '_3dUp']
  },
  {
    id: 'satsuProgress',
    title: '撮影進捗',
    className: 'progress-group',
    section: 'postproduction',
    fields: ['satsuBg', 'satsu2d', 'satsu3d', 'satsuToku', 'satsuHon', 'satsuIre', 'satsuTimingRoll', 'satsuTimingIn', 'satsuHonRoll', 'satsuHonUp']
  },
  {
    id: 'operation',
    title: '操作',
    className: 'operation-group',
    section: 'postproduction',
    fields: []  // 削除列は実際のフィールドではないため空配列
  }
];

/**
 * ViewModeに基づいて表示するグループを取得
 */
export function getGroupsForViewMode(viewMode: string): FieldGroup[] {
  const basicGroups = FIELD_GROUPS.filter(g => g.section === 'basic');
  const operationGroup = FIELD_GROUPS.find(g => g.id === 'operation')!;
  
  switch (viewMode) {
    case 'detail':
      // 全グループを表示
      return FIELD_GROUPS;
      
    case 'progress':
      // 基本情報＋進捗グループ＋操作
      return [
        ...basicGroups,
        ...FIELD_GROUPS.filter(g => g.className === 'progress-group'),
        operationGroup
      ];
      
    case 'info':
      // 基本情報＋情報グループ＋操作
      return [
        ...basicGroups,
        ...FIELD_GROUPS.filter(g => g.className === 'info-group' && g.section !== 'basic'),
        operationGroup
      ];
      
    case 'layout':
      // 基本情報＋LO関連＋操作
      return [
        ...basicGroups,
        ...FIELD_GROUPS.filter(g => g.id === 'loInfo' || g.id === 'loProgress'),
        operationGroup
      ];
      
    case 'genga':
      // 基本情報＋原画関連＋操作
      return [
        ...basicGroups,
        ...FIELD_GROUPS.filter(g => g.id === 'genInfo' || g.id === 'genProgress'),
        operationGroup
      ];
      
    case 'douga':
      // 基本情報＋動画関連＋操作
      return [
        ...basicGroups,
        ...FIELD_GROUPS.filter(g => g.id === 'dougaInfo' || g.id === 'dougaProgress'),
        operationGroup
      ];
      
    case 'douken_color':
      // 基本情報＋動検・色指定＋操作
      return [
        ...basicGroups,
        ...FIELD_GROUPS.filter(g => g.id === 'doukenInfo' || g.id === 'doukenProgress' || g.id === 'iroProgress'),
        operationGroup
      ];
      
    case 'finishing':
      // 基本情報＋仕上げ関連＋操作
      return [
        ...basicGroups,
        ...FIELD_GROUPS.filter(g => g.section === 'finishing'),
        operationGroup
      ];
      
    case 'shooting':
      // 基本情報＋撮影関連＋操作
      return [
        ...basicGroups,
        ...FIELD_GROUPS.filter(g => g.id === 'satsuProgress'),
        operationGroup
      ];
      
    default:
      // デフォルト：基本情報＋操作
      return [...basicGroups, operationGroup];
  }
}

/**
 * フィールドIDからグループを取得
 */
export function getGroupByFieldId(fieldId: keyof CutData): FieldGroup | undefined {
  return FIELD_GROUPS.find(group => group.fields.includes(fieldId));
}

/**
 * グループに含まれるフィールド数を計算（ViewMode考慮）
 */
export function getGroupColspan(groupId: string, viewMode: string, visibleFields: (keyof CutData)[]): number {
  const group = FIELD_GROUPS.find(g => g.id === groupId);
  if (!group) return 0;
  
  return group.fields.filter(fieldId => visibleFields.includes(fieldId)).length;
}