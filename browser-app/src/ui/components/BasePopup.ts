/**
 * ポップアップコンポーネントの基底クラス
 * CalendarPopup、DropdownPopup、FilterDropdownの共通処理を抽出
 */
import { TableEventManager } from '@/core/events/TableEventManager';
import { EventPriority } from '@/core/events/EventPriority';
import { DynamicStyleManager } from '@/utils/DynamicStyleManager';
import { DOMBuilder } from '../shared/utils/DOMBuilder';
import { DOMHelper } from '../shared/utils/DOMHelper';

export abstract class BasePopup {
  // 共通プロパティ
  protected container: HTMLDivElement;
  protected popup: HTMLDivElement;
  protected targetCell!: HTMLElement;
  protected tableEventManager: TableEventManager;
  protected eventHandlerIds: string[] = [];

  // 統一されたマージン値
  private static readonly POPUP_MARGIN = 5;
  private static readonly WINDOW_EDGE_MARGIN = 10;

  // アクティブなポップアップの統一管理
  private static activePopup: BasePopup | null = null;

  /**
   * コンストラクタ
   */
  protected constructor(targetCell?: HTMLElement) {
    if (targetCell) {
      this.targetCell = targetCell;
      // セルに編集中スタイルを追加
      if (this.targetCell.tagName === 'TD') {
        DOMHelper.addClass(this.targetCell, 'cell-editing');
      }
    }
    this.tableEventManager = new TableEventManager();

    // 既存のアクティブポップアップを閉じる
    if (BasePopup.activePopup) {
      BasePopup.activePopup.close();
    }

    // コンテナとポップアップ要素を作成
    this.container = DOMBuilder.create('div');
    this.popup = DOMBuilder.create('div');
    
    // アクティブポップアップとして登録
    BasePopup.activePopup = this;
  }

  /**
   * ポップアップを表示
   */
  protected showPopup(): void {
    // 派生クラスでコンテンツを作成
    this.createContent();
    
    // 共通のイベントリスナーを設定
    this.setupCommonEventListeners();
    
    // DOMに追加
    DOMBuilder.append(document.body as HTMLElement, this.container);
    
    // 位置を調整
    this.positionPopup();
  }
  
  /**
   * 手動でのポップアップ表示（FilterDropdown用）
   */
  protected showManually(targetElement: HTMLElement): void {
    this.targetCell = targetElement;
    
    // 共通のイベントリスナーを設定
    this.setupCommonEventListeners();
    
    // DOMに追加（派生クラスで既に追加済みの場合はスキップ）
    if (!this.container.parentNode) {
      DOMBuilder.append(document.body as HTMLElement, this.container);
    }
    
    // 位置を調整
    this.positionPopup();
  }

  /**
   * ポップアップの位置を調整
   */
  protected positionPopup(): void {
    const cellRect = this.targetCell.getBoundingClientRect();
    const popupRect = this.popup.getBoundingClientRect();
    
    // 基本位置（セルの下）
    let top = cellRect.bottom + BasePopup.POPUP_MARGIN;
    let left = cellRect.left;
    
    // 画面右端を超える場合は左にずらす
    if (left + popupRect.width > window.innerWidth - BasePopup.WINDOW_EDGE_MARGIN) {
      left = window.innerWidth - popupRect.width - BasePopup.WINDOW_EDGE_MARGIN;
    }
    
    // 画面下端を超える場合は上に表示
    if (top + popupRect.height > window.innerHeight - BasePopup.WINDOW_EDGE_MARGIN) {
      top = cellRect.top - popupRect.height - BasePopup.POPUP_MARGIN;
    }
    
    // 最小値の設定
    top = Math.max(BasePopup.WINDOW_EDGE_MARGIN, top);
    left = Math.max(BasePopup.WINDOW_EDGE_MARGIN, left);
    
    // CSS変数を使用して位置を設定
    DynamicStyleManager.setDynamicStyles(this.popup, {
      top: top,
      left: left
    });
  }

  /**
   * 共通のイベントリスナーを設定
   */
  protected setupCommonEventListeners(): void {
    // ESCキーで閉じる（最優先）
    const escKeyId = this.tableEventManager.on(
      'document:keydown',
      '',
      this.handleEscKey,
      EventPriority.CRITICAL
    );
    this.eventHandlerIds.push(escKeyId);

    // 外部クリックで閉じる（次優先）
    setTimeout(() => {
      const outsideClickId = this.tableEventManager.on(
        'document:click',
        '',
        this.handleOutsideClick,
        EventPriority.HIGHEST
      );
      this.eventHandlerIds.push(outsideClickId);
    }, 10);

    // ウィンドウリサイズ時に位置を再調整（通常優先度）
    const resizeId = this.tableEventManager.on(
      'window:resize',
      '',
      () => this.positionPopup(),
      EventPriority.MEDIUM
    );
    this.eventHandlerIds.push(resizeId);
  }

  /**
   * ESCキー押下時の処理
   */
  private handleEscKey = (e: Event): void => {
    const keyboardEvent = e as KeyboardEvent;
    if (keyboardEvent.key === 'Escape') {
      this.close();
    }
  };

  /**
   * 外部クリック時の処理
   */
  private handleOutsideClick = (e: Event): void => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as Node;
    
    if (!this.container.contains(target) && !this.targetCell.contains(target)) {
      this.handleOutsideClickAction();
    }
  };

  /**
   * 外部クリック時のアクション（派生クラスでオーバーライド可能）
   */
  protected handleOutsideClickAction(): void {
    this.close();
  }

  /**
   * ポップアップを閉じる
   */
  public close(): void {
    // セルから編集中スタイルを削除
    if (this.targetCell && this.targetCell.tagName === 'TD') {
      DOMHelper.removeClass(this.targetCell, 'cell-editing');
    }
    
    // TableEventManagerをクリーンアップ
    this.tableEventManager.destroy();
    
    // DOMから削除
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // アクティブポップアップをクリア
    if (BasePopup.activePopup === this) {
      BasePopup.activePopup = null;
    }
  }

  /**
   * ポップアップの内容を作成（派生クラスで実装）
   */
  protected abstract createContent(): void;
  
  /**
   * BasePopupの共通機能のみ使用するフラグ
   */
  protected isManualMode = false;

  /**
   * 現在のアクティブポップアップを取得
   */
  public static getActivePopup(): BasePopup | null {
    return BasePopup.activePopup;
  }

  /**
   * すべてのポップアップを閉じる
   */
  public static closeAll(): void {
    if (BasePopup.activePopup) {
      BasePopup.activePopup.close();
    }
  }
}