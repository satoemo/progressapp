/**
 * UIコンポーネントの型定義
 * Phase 3: 型定義の統一
 */

import { CutData } from './cut';

/**
 * テーブルの状態
 */
export interface TableState {
  isLoading: boolean;
  data: CutData[];
  filteredData: CutData[];
  selectedRows: Set<string>;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
  error?: Error;
}

/**
 * フィルター条件
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | string[];
}

export type FilterOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'empty'
  | 'not_empty';

/**
 * テーブルのプロップス
 */
export interface TableProps {
  data: CutData[];
  columns?: ColumnDefinition[];
  onRowClick?: (row: CutData) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
}

/**
 * カラム定義
 */
export interface ColumnDefinition {
  field: string;
  header: string;
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  renderer?: (value: unknown, row: CutData) => string | HTMLElement;
  editor?: CellEditorType;
  visible?: boolean;
  frozen?: boolean;
}

/**
 * セルエディタタイプ
 */
export type CellEditorType = 
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'custom';

/**
 * ポップアップのプロップス
 */
export interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  width?: number | string;
  height?: number | string;
  position?: PopupPosition;
  modal?: boolean;
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
}

/**
 * ポップアップ位置
 */
export interface PopupPosition {
  x: number;
  y: number;
}

/**
 * ドロップダウンアイテム
 */
export interface DropdownItem {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: string;
  group?: string;
}

/**
 * タブ定義
 */
export interface TabDefinition {
  id: string;
  label: string;
  icon?: string;
  component: (() => HTMLElement) | string;
  visible?: boolean;
  disabled?: boolean;
}

/**
 * 通知
 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  closable?: boolean;
}

/**
 * ビューの状態
 */
export interface ViewState {
  activeTab?: string;
  filters: FilterCondition[];
  searchQuery: string;
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  expandedRows: Set<string>;
}

/**
 * セルの位置
 */
export interface CellPosition {
  rowId: string;
  columnId: string;
  rowIndex: number;
  columnIndex: number;
}

/**
 * セル編集イベント
 */
export interface CellEditEvent {
  position: CellPosition;
  oldValue: unknown;
  newValue: unknown;
  field: string;
  rowData: CutData;
  cancel?: boolean;
}

/**
 * メモデータ
 */
export interface MemoData {
  id: string;
  cutId: string;
  field: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

/**
 * コンテキストメニューアイテム
 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
}

/**
 * ドラッグ＆ドロップイベント
 */
export interface DragDropEvent {
  source: CellPosition;
  target: CellPosition;
  data: unknown;
  effect: 'copy' | 'move' | 'link';
}

/**
 * キーボードショートカット
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}