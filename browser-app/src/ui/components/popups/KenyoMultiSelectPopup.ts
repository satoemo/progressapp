/**
 * 兼用フィールド複数選択ポップアップ
 * カット番号を複数選択できるチェックボックス形式のポップアップ
 */
import { BasePopup } from '../BasePopup';
import { CutReadModel } from '@/data/models/CutReadModel';
import { ApplicationFacade } from '@/core/ApplicationFacade';
import { EventPriority } from '@/core/events/EventPriority';
import { CutNumber } from '@/models/values/CutNumber';
import { ErrorHandler } from '@/ui/shared/utils/ErrorHandler';
import { DOMBuilder } from '@/ui/shared/utils/DOMBuilder';

export class KenyoMultiSelectPopup extends BasePopup {
  private currentCutId: string;
  private currentCutNumber: string;
  private currentValue: string;
  private allCuts: CutReadModel[];
  private selectedCutNumbers: Set<string>;
  private appFacade: ApplicationFacade;
  private onUpdate: (cutId: string, value: string) => void;
  
  // UI要素
  private checkboxContainer!: HTMLDivElement;
  private confirmButton!: HTMLButtonElement;
  
  constructor(
    targetCell: HTMLElement,
    currentCutId: string,
    currentCutNumber: string,
    currentValue: string,
    allCuts: CutReadModel[],
    appFacade: ApplicationFacade,
    onUpdate: (cutId: string, value: string) => void
  ) {
    super(targetCell);
    
    this.currentCutId = currentCutId;
    this.currentCutNumber = currentCutNumber;
    this.currentValue = currentValue;
    this.allCuts = allCuts;
    this.appFacade = appFacade;
    this.onUpdate = onUpdate;
    
    // 現在の選択状態を初期化（自身を常に含める）
    this.selectedCutNumbers = new Set(
      currentValue ? currentValue.split('/').filter(Boolean) : []
    );
    // 自身を必ず含める
    this.selectedCutNumbers.add(this.currentCutNumber);
    
    // コンテナとポップアップのクラス名を設定
    this.container.className = 'kenyo-popup-container';
    this.popup.className = 'kenyo-multi-select-popup';
    
    this.showPopup();
  }
  
  /**
   * ポップアップの内容を作成
   */
  protected createContent(): void {
    // ヘッダー
    const header = this.createHeader();

    // チェックボックスリスト
    this.checkboxContainer = this.createCheckboxList();

    // ボタンエリア
    const buttonArea = this.createButtonArea();

    DOMBuilder.append(this.popup, header, this.checkboxContainer, buttonArea);
    
    // Enterキーで適用
    const enterHandler = (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
        keyEvent.preventDefault();
        this.handleApply();
      }
    };
    
    const enterId = this.tableEventManager.addEventListener(
      this.popup,
      'keydown',
      enterHandler,
      false,
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(enterId);
    
    // ポップアップをコンテナに追加
    DOMBuilder.append(this.container, this.popup);
  }
  
  /**
   * ヘッダーを作成
   */
  private createHeader(): HTMLDivElement {
    const header = DOMBuilder.create('div');
    header.className = 'filter-dropdown-header';
    
    const title = DOMBuilder.create('span');
    title.className = 'filter-dropdown-title';
    title.textContent = '兼用カットを選択';

    const count = DOMBuilder.create('span');
    count.className = 'filter-dropdown-count';
    count.textContent = this.getCountText();

    DOMBuilder.append(header, title, count);
    
    return header;
  }
  
  /**
   * 選択数のテキストを取得
   */
  private getCountText(): string {
    const totalCount = this.allCuts.length - 1; // 自分自身を除く
    const checkedCount = this.selectedCutNumbers.size;
    return `${checkedCount}/${totalCount}`;
  }
  
  /**
   * 選択数を更新
   */
  private updateCheckedCount(): void {
    const countElement = this.popup.querySelector('.filter-dropdown-count');
    if (countElement) {
      countElement.textContent = this.getCountText();
    }
  }
  
  /**
   * チェックボックスリストを作成
   */
  private createCheckboxList(): HTMLDivElement {
    const container = DOMBuilder.create('div');
    container.className = 'filter-dropdown-body';
    
    // カット番号を昇順でソート
    const sortedCuts = [...this.allCuts]
      .filter(cut => cut.cutNumber && cut.cutNumber.trim() !== '') // 空のカット番号を除外
      .sort((a, b) => {
        try {
          const cutA = new CutNumber(a.cutNumber);
          const cutB = new CutNumber(b.cutNumber);
          return cutA.compare(cutB);
        } catch (error) {
          // CutNumberの作成に失敗した場合は文字列として比較
          ErrorHandler.handle(error, 'KenyoMultiSelectPopup.sortCuts', {
            logLevel: 'warn',
            customMessage: `Invalid cut number in KenyoMultiSelectPopup: "${a.cutNumber}" vs "${b.cutNumber}"`
          });
          return a.cutNumber.localeCompare(b.cutNumber);
        }
      });
    
    sortedCuts.forEach(cut => {
      const checkboxItem = this.createCheckboxItem(cut);
      DOMBuilder.append(container, checkboxItem);
    });
    
    return container;
  }
  
  /**
   * チェックボックスアイテムを作成
   */
  private createCheckboxItem(cut: CutReadModel): HTMLLabelElement {
    const label = DOMBuilder.create('label');
    label.className = 'filter-option';
    
    const checkbox = DOMBuilder.create('input');
    checkbox.type = 'checkbox';
    checkbox.value = cut.cutNumber;
    
    // 自分自身は選択不可だが常に選択済み
    if (cut.cutNumber === this.currentCutNumber) {
      checkbox.disabled = true;
      checkbox.checked = true;
      label.classList.add('disabled');
    } else {
      // 既に選択されている場合はチェック
      checkbox.checked = this.selectedCutNumbers.has(cut.cutNumber);
      
      // チェックボックスの変更イベント
      const eventId = this.tableEventManager.addEventListener(
        checkbox,
        'change',
        () => this.handleCheckboxChange(cut.cutNumber, checkbox.checked),
        false,
        EventPriority.MEDIUM
      );
      this.eventHandlerIds.push(eventId);
    }
    
    const valueSpan = DOMBuilder.create('span');
    valueSpan.className = 'filter-option-value';
    valueSpan.textContent = cut.cutNumber;
    
    DOMBuilder.append(label, checkbox, valueSpan);
    
    return label;
  }
  
  /**
   * チェックボックスの変更処理
   */
  private handleCheckboxChange(cutNumber: string, checked: boolean): void {
    if (checked) {
      this.selectedCutNumbers.add(cutNumber);
    } else {
      this.selectedCutNumbers.delete(cutNumber);
    }
    // 選択数を更新
    this.updateCheckedCount();
  }
  
  /**
   * ボタンエリアを作成
   */
  private createButtonArea(): HTMLDivElement {
    const footer = DOMBuilder.create('div');
    footer.className = 'filter-dropdown-footer';
    
    // すべて解除ボタン
    const clearButton = DOMBuilder.create('button');
    clearButton.className = 'filter-btn filter-btn-clear';
    clearButton.textContent = 'すべて解除';
    
    const clearEventId = this.tableEventManager.addEventListener(
      clearButton,
      'click',
      () => this.handleClearAll(),
      false,
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(clearEventId);
    
    // 適用ボタン
    this.confirmButton = DOMBuilder.create('button');
    this.confirmButton.className = 'filter-btn filter-btn-apply';
    this.confirmButton.textContent = '適用';
    
    const applyEventId = this.tableEventManager.addEventListener(
      this.confirmButton,
      'click',
      () => this.handleApply(),
      false,
      EventPriority.HIGH
    );
    this.eventHandlerIds.push(applyEventId);
    
    DOMBuilder.append(footer, clearButton, this.confirmButton);
    
    return footer;
  }
  
  /**
   * すべて解除
   */
  private handleClearAll(): void {
    // すべてのチェックボックスを解除（自身は除く）
    this.selectedCutNumbers.clear();
    this.selectedCutNumbers.add(this.currentCutNumber);
    
    // UIを更新
    const checkboxes = this.popup.querySelectorAll('input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach((checkbox: Element) => {
      (checkbox as HTMLInputElement).checked = false;
    });
    
    // 選択数を更新
    this.updateCheckedCount();
  }
  
  /**
   * 適用処理
   */
  private async handleApply(): Promise<void> {
    const newValue = CutNumber.sort(Array.from(this.selectedCutNumbers)).join('/');
    
    try {
      // 兼用フィールドの同期処理: 選択されたすべてのカットを相互更新
      const updatePromises: Promise<void>[] = [];
      
      // 選択されたカットのIDを取得
      const selectedCutIds = new Map<string, string>(); // cutNumber -> cutId
      this.allCuts.forEach(cut => {
        if (this.selectedCutNumbers.has(cut.cutNumber)) {
          selectedCutIds.set(cut.cutNumber, cut.id);
        }
      });
      
      // 各選択されたカットに対して、その他の選択されたカットを兼用として設定
      for (const [cutNumber, cutId] of selectedCutIds) {
        // 自分以外の選択されたカット番号を取得
        const otherCutNumbers = Array.from(this.selectedCutNumbers)
          .filter(num => num !== cutNumber);
        
        const kenyoValue = CutNumber.sort(otherCutNumbers).join('/');
        
        // ApplicationFacadeを使用して更新
        updatePromises.push(
          this.appFacade.updateCut(cutId, { kenyo: kenyoValue })
            .then(() => {
              // UIを更新
              this.onUpdate(cutId, kenyoValue);
            })
        );
      }
      
      // すべての更新を並列実行
      await Promise.all(updatePromises);
      
      // ポップアップを閉じる
      this.close();
    } catch (error) {
      ErrorHandler.handle(error, 'KenyoMultiSelectPopup.onConfirm', {
        showAlert: true,
        logLevel: 'error',
        customMessage: '更新に失敗しました。もう一度お試しください。'
      });
    }
  }
  
  /**
   * ポップアップを閉じる（オーバーライド）
   */
  public close(): void {
    // イベントハンドラーを個別にクリーンアップ
    this.eventHandlerIds.forEach(id => {
      this.tableEventManager.removeEventListener(id);
    });
    this.eventHandlerIds = [];
    
    // 親クラスのclose処理を実行
    super.close();
  }
}