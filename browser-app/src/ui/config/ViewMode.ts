import { FieldKey } from '@/models/types';
import { FieldMetadataRegistry } from '@/models/metadata/FieldMetadataRegistry';

/**
 * 表示モード
 */
export type ViewModeType = 
  | 'detail'       // 全フィールド表示
  | 'progress'     // 進捗フィールドのみ
  | 'info'         // 情報フィールドのみ
  | 'layout'       // レイアウト関連
  | 'genga'        // 原画関連
  | 'douga'        // 動画関連
  | 'douken_color' // 動検・色指定関連
  | 'finishing'    // 仕上げ関連
  | 'shooting';    // 撮影関連

/**
 * 表示モード定義
 */
export interface ViewMode {
  type: ViewModeType;
  label: string;
  fields: readonly FieldKey[];
}

/**
 * フィールドメタデータから表示モード設定を生成
 */
function generateViewModes(): Record<ViewModeType, ViewMode> {
  const registry = FieldMetadataRegistry.getInstance();
  
  // 各グループのフィールドを取得
  const basicFields = registry.getFieldsByGroupId('basic').map(m => m.field);
  const cutInfoFields = registry.getFieldsByGroupId('cutInfo').map(m => m.field);
  const loInfoFields = registry.getFieldsByGroupId('loInfo').map(m => m.field);
  const loProgressFields = registry.getFieldsByGroupId('loProgress').map(m => m.field);
  const genInfoFields = registry.getFieldsByGroupId('genInfo').map(m => m.field);
  const genProgressFields = registry.getFieldsByGroupId('genProgress').map(m => m.field);
  const dougaInfoFields = registry.getFieldsByGroupId('dougaInfo').map(m => m.field);
  const dougaProgressFields = registry.getFieldsByGroupId('dougaProgress').map(m => m.field);
  const doukenInfoFields = registry.getFieldsByGroupId('doukenInfo').map(m => m.field);
  const doukenProgressFields = registry.getFieldsByGroupId('doukenProgress').map(m => m.field);
  const iroProgressFields = registry.getFieldsByGroupId('iroProgress').map(m => m.field);
  const shiageInfoFields = registry.getFieldsByGroupId('shiageInfo').map(m => m.field);
  const shiageProgressFields = registry.getFieldsByGroupId('shiageProgress').map(m => m.field);
  const shikenOthersProgressFields = registry.getFieldsByGroupId('shikenOthersProgress').map(m => m.field);
  const satsuProgressFields = registry.getFieldsByGroupId('satsuProgress').map(m => m.field);
  
  // 進捗フィールドと情報フィールドを取得
  const progressFields = registry.getProgressFields().map(m => m.field);
  const infoFields = [
    ...basicFields,
    ...cutInfoFields,
    ...loInfoFields,
    ...genInfoFields,
    ...dougaInfoFields,
    ...doukenInfoFields,
    ...shiageInfoFields
  ];
  
  return {
    detail: {
      type: 'detail',
      label: '詳細表示',
      fields: registry.getAllFieldMetadata().map(m => m.field).filter(f => f !== 'id')
    },
    progress: {
      type: 'progress',
      label: '進捗表示',
      fields: [
        ...basicFields,
        ...progressFields
      ] as FieldKey[]
    },
    info: {
      type: 'info',
      label: '情報表示',
      fields: infoFields as FieldKey[]
    },
    layout: {
      type: 'layout',
      label: 'レイアウト',
      fields: [
        ...basicFields,
        'special',
        ...loInfoFields,
        ...loProgressFields
      ] as FieldKey[]
    },
    genga: {
      type: 'genga',
      label: '原画',
      fields: [
        ...basicFields,
        'special',
        ...genInfoFields,
        ...genProgressFields
      ] as FieldKey[]
    },
    douga: {
      type: 'douga',
      label: '動画',
      fields: [
        ...basicFields,
        'special',
        ...dougaInfoFields,
        ...dougaProgressFields
      ] as FieldKey[]
    },
    douken_color: {
      type: 'douken_color',
      label: '動検・色指定',
      fields: [
        ...basicFields,
        'special',
        ...doukenInfoFields,
        ...doukenProgressFields,
        ...iroProgressFields
      ] as FieldKey[]
    },
    finishing: {
      type: 'finishing',
      label: '仕上げ',
      fields: [
        ...basicFields,
        'special',
        ...shiageInfoFields,
        ...shiageProgressFields,
        ...shikenOthersProgressFields
      ] as FieldKey[]
    },
    shooting: {
      type: 'shooting',
      label: '撮影',
      fields: [
        ...basicFields,
        'special',
        ...satsuProgressFields
      ] as FieldKey[]
    }
  };
}

/**
 * 表示モード設定
 */
export const VIEW_MODES: Record<ViewModeType, ViewMode> = generateViewModes();