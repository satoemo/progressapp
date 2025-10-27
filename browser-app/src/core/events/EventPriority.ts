/**
 * イベント優先度の定義
 */
export enum EventPriority {
  /** 最高優先度 - ESCキーなど */
  CRITICAL = 200,
  
  /** 最高優先度 - 重要なマウスイベント */
  HIGHEST = 100,
  
  /** 高優先度 - 通常のマウスイベント */
  HIGH = 80,
  
  /** 中優先度 - キーボードイベント */
  MEDIUM = 50,
  
  /** 低優先度 - フォーカスイベント */
  LOW = 20,
  
  /** 最低優先度 - その他のイベント */
  LOWEST = 0
}

/**
 * イベントタイプと優先度のマッピング
 */
export const EVENT_PRIORITY_MAP: Record<string, EventPriority> = {
  // マウスイベント（高優先度）
  'click': EventPriority.HIGH,
  'dblclick': EventPriority.HIGHEST,
  'mousedown': EventPriority.HIGH,
  'mouseup': EventPriority.HIGH,
  'mousemove': EventPriority.MEDIUM,
  
  // キーボードイベント（中優先度）
  'keydown': EventPriority.MEDIUM,
  'keyup': EventPriority.MEDIUM,
  'keypress': EventPriority.MEDIUM,
  
  // フォーカスイベント（低優先度）
  'focus': EventPriority.LOW,
  'blur': EventPriority.LOW,
  'focusin': EventPriority.LOW,
  'focusout': EventPriority.LOW,
  
  // その他
  'change': EventPriority.MEDIUM,
  'input': EventPriority.MEDIUM,
  'submit': EventPriority.HIGH
};

/**
 * イベントタイプから優先度を取得
 */
export function getEventPriority(eventType: string): EventPriority {
  return EVENT_PRIORITY_MAP[eventType] || EventPriority.LOWEST;
}