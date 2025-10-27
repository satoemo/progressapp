/**
 * タブの種類を定義
 */
export type TabType = 'progress' | 'simulation' | 'staff' | 'retake' | 'schedule' | 'order' | 'cutBag';

/**
 * タブの設定情報
 */
export interface TabConfig {
  type: TabType;
  label: string;
  icon?: string;
  description?: string;
}

/**
 * タブの定義
 */
export const TAB_CONFIGS: Record<TabType, TabConfig> = {
  progress: {
    type: 'progress',
    label: '進捗管理',
    description: 'カットの進捗状況を管理'
  },
  simulation: {
    type: 'simulation',
    label: 'シミュレーション',
    description: '進捗予測とリソース分析'
  },
  staff: {
    type: 'staff',
    label: '担当者別',
    description: '担当者別の作業状況'
  },
  retake: {
    type: 'retake',
    label: 'リテイク表',
    description: 'リテイクの管理'
  },
  schedule: {
    type: 'schedule',
    label: '香盤表',
    description: '未実装'
  },
  order: {
    type: 'order',
    label: '発注伝票',
    description: '未実装'
  },
  cutBag: {
    type: 'cutBag',
    label: 'カット袋出力',
    description: '未実装'
  }
};

/**
 * タブの表示順序
 */
export const TAB_ORDER: TabType[] = ['progress', 'staff', 'simulation', 'retake', 'schedule', 'order', 'cutBag'];

/**
 * タブ切り替えイベントのペイロード
 */
export interface TabSwitchedPayload extends Record<string, unknown> {
  previousTab: TabType;
  currentTab: TabType;
  timestamp: Date;
}