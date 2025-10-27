# アーキテクチャ改善提案書

作成日: 2025年9月11日
優先度: Medium
推定工数: 各1-2時間

## 1. DOM操作ヘルパークラスの導入

### 現状の問題
- DOM操作ロジックが各コンポーネントに散在
- 同様の処理が複数箇所で重複
- フィルハンドル保持処理などが複雑

### 提案する解決策

#### DOMHelperクラスの実装
```typescript
// src/ui/shared/utils/DOMHelper.ts
export class DOMHelper {
  /**
   * テキスト更新時に特定の要素を保持
   */
  static updateTextKeepingElements(
    cell: HTMLElement, 
    text: string, 
    keepSelector: string = '.fill-handle, .memo-indicator'
  ): void {
    // 保持する要素を退避
    const elementsToKeep = Array.from(cell.querySelectorAll(keepSelector));
    
    // テキストノードのみ更新
    const textNodes = Array.from(cell.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE);
    
    if (textNodes.length > 0) {
      textNodes[0].textContent = text;
    } else {
      const textNode = document.createTextNode(text);
      cell.insertBefore(textNode, cell.firstChild);
    }
  }
  
  /**
   * セルのDOM上の表示位置を取得
   */
  static getVisibleRowIndex(cell: HTMLElement): number {
    const tr = cell.closest('tr');
    if (!tr) return -1;
    
    const tbody = tr.closest('tbody');
    if (!tbody) return -1;
    
    const visibleRows = Array.from(tbody.querySelectorAll('tr:not([style*="display: none"])'));
    return visibleRows.indexOf(tr as HTMLTableRowElement);
  }
  
  /**
   * 表示されている行のみ取得
   */
  static getVisibleRows(tbody: HTMLElement): HTMLTableRowElement[] {
    return Array.from(tbody.querySelectorAll('tr'))
      .filter(row => {
        const style = window.getComputedStyle(row);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }) as HTMLTableRowElement[];
  }
  
  /**
   * セルの実際の表示座標を取得
   */
  static getCellCoordinates(cell: HTMLElement): { row: number; column: number } {
    const tr = cell.closest('tr');
    const tbody = tr?.closest('tbody');
    
    if (!tr || !tbody) return { row: -1, column: -1 };
    
    const rows = this.getVisibleRows(tbody);
    const row = rows.indexOf(tr as HTMLTableRowElement);
    
    const cells = Array.from(tr.querySelectorAll('td'));
    const column = cells.indexOf(cell as HTMLTableCellElement);
    
    return { row, column };
  }
}
```

### 使用例
```typescript
// ProgressTable.tsでの使用
private updateCellContent(cell: HTMLTableCellElement, content: string): void {
  DOMHelper.updateTextKeepingElements(cell, content);
  this.updateCellMemoIndicator(cell, cutNumber, fieldKey);
}

// AutoFillManager.tsでの使用
private getVisibleRowIndex(cell: HTMLElement): number {
  return DOMHelper.getVisibleRowIndex(cell);
}
```

### 期待される効果
- コード重複の削減: 30-40%
- 保守性向上: DOM操作の一元管理
- バグ削減: 統一された処理で一貫性確保

## 2. イベント処理の標準化

### 現状の問題
- mousemove/mouseupイベントの管理が個別実装
- イベントリスナーのクリーンアップが不統一
- ドラッグ処理のパターンが複数存在

### 提案する解決策

#### DragManagerクラスの実装
```typescript
// src/ui/shared/utils/DragManager.ts
export interface DragConfig {
  onStart?: (startElement: HTMLElement) => void;
  onMove?: (currentElement: HTMLElement) => void;
  onEnd?: (endElement: HTMLElement | null) => void;
  validateTarget?: (element: HTMLElement) => boolean;
}

export class DragManager {
  private isDragging = false;
  private startElement: HTMLElement | null = null;
  private currentElement: HTMLElement | null = null;
  private config: DragConfig;
  private cleanupFunctions: Array<() => void> = [];
  
  constructor(config: DragConfig) {
    this.config = config;
  }
  
  /**
   * ドラッグ操作を開始
   */
  startDrag(element: HTMLElement, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isDragging = true;
    this.startElement = element;
    this.currentElement = element;
    
    // コールバック実行
    this.config.onStart?.(element);
    
    // グローバルイベントを設定
    const handleMouseMove = this.handleMouseMove.bind(this);
    const handleMouseUp = this.handleMouseUp.bind(this);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // クリーンアップ関数を保存
    this.cleanupFunctions.push(() => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    });
  }
  
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const targetElement = element?.closest('[data-draggable]') as HTMLElement;
    
    if (targetElement && this.config.validateTarget?.(targetElement)) {
      this.currentElement = targetElement;
      this.config.onMove?.(targetElement);
    }
  }
  
  private handleMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    this.config.onEnd?.(this.currentElement);
    this.cleanup();
  }
  
  /**
   * ドラッグ操作を中止
   */
  abort(): void {
    this.cleanup();
  }
  
  private cleanup(): void {
    this.isDragging = false;
    this.startElement = null;
    this.currentElement = null;
    
    // すべてのイベントリスナーを削除
    this.cleanupFunctions.forEach(fn => fn());
    this.cleanupFunctions = [];
  }
}
```

### 使用例
```typescript
// AutoFillManager.tsでの使用
private setupFillHandleEvents(fillHandle: HTMLElement, cell: HTMLElement): void {
  fillHandle.addEventListener('mousedown', (e) => {
    const dragManager = new DragManager({
      onStart: (element) => {
        this.startDrag(cell);
      },
      onMove: (element) => {
        const rowIndex = DOMHelper.getVisibleRowIndex(element);
        this.updateDragRange(rowIndex);
      },
      onEnd: async (element) => {
        await this.endDrag();
      },
      validateTarget: (element) => {
        const column = element.dataset.column;
        return column === this.dragState.sourceColumn;
      }
    });
    
    dragManager.startDrag(cell, e);
  });
}
```

## 3. オートフィルテストの自動化

### 現状の問題
- 手動テストに依存
- ソート/フィルタ状態のテストが不足
- エッジケースの検証が困難

### 提案する解決策

#### AutoFillTestHelper実装
```typescript
// test/helpers/AutoFillTestHelper.ts
export class AutoFillTestHelper {
  /**
   * オートフィル操作をシミュレート
   */
  static async simulateAutoFill(
    sourceCell: HTMLElement,
    targetCell: HTMLElement
  ): Promise<void> {
    const fillHandle = sourceCell.querySelector('.fill-handle') as HTMLElement;
    
    // mousedownイベント
    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: fillHandle.getBoundingClientRect().left,
      clientY: fillHandle.getBoundingClientRect().top
    });
    fillHandle.dispatchEvent(mouseDown);
    
    // mousemoveイベント
    const targetRect = targetCell.getBoundingClientRect();
    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.top + targetRect.height / 2
    });
    document.dispatchEvent(mouseMove);
    
    // mouseupイベント
    const mouseUp = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(mouseUp);
    
    // 非同期処理を待つ
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  /**
   * ソート状態でのテスト
   */
  static async testWithSort(
    table: HTMLElement,
    sortColumn: string,
    sortOrder: 'asc' | 'desc'
  ): Promise<TestResult> {
    // ソートを適用
    const sortHeader = table.querySelector(`th[data-field="${sortColumn}"]`);
    sortHeader?.click();
    if (sortOrder === 'desc') sortHeader?.click();
    
    // オートフィルテスト実行
    const cells = table.querySelectorAll('td[data-column="status"]');
    const sourceCell = cells[0] as HTMLElement;
    const targetCell = cells[2] as HTMLElement;
    
    await this.simulateAutoFill(sourceCell, targetCell);
    
    // 結果を検証
    return this.validateAutoFillResult(sourceCell, targetCell);
  }
}
```

#### Jestテストケース
```typescript
// test/autofill.test.ts
describe('AutoFill機能', () => {
  let progressTable: ProgressTable;
  let autoFillManager: AutoFillManager;
  
  beforeEach(() => {
    // テーブルセットアップ
  });
  
  test('通常表示でのオートフィル', async () => {
    const sourceCell = document.querySelector('td[data-row="0"]');
    const targetCell = document.querySelector('td[data-row="3"]');
    
    await AutoFillTestHelper.simulateAutoFill(sourceCell, targetCell);
    
    expect(targetCell.textContent).toBe(sourceCell.textContent);
  });
  
  test('ソート適用後のオートフィル', async () => {
    const result = await AutoFillTestHelper.testWithSort(
      table, 
      'cutNumber', 
      'desc'
    );
    
    expect(result.success).toBe(true);
    expect(result.affectedCells).toBe(3);
  });
  
  test('フィルハンドルの保持', async () => {
    const sourceCell = document.querySelector('td[data-row="0"]');
    const targetCell = document.querySelector('td[data-row="1"]');
    
    await AutoFillTestHelper.simulateAutoFill(sourceCell, targetCell);
    
    expect(sourceCell.querySelector('.fill-handle')).toBeTruthy();
    expect(targetCell.querySelector('.fill-handle')).toBeTruthy();
  });
});
```

## 4. 実装優先順位と工数見積もり

| 改善項目 | 優先度 | 推定工数 | 効果 | ROI |
|---------|--------|----------|------|-----|
| DOMHelper | High | 1時間 | コード削減30% | ★★★★★ |
| DragManager | Medium | 2時間 | バグ削減50% | ★★★★☆ |
| AutoFillTest | Medium | 2時間 | テスト自動化 | ★★★☆☆ |

## 5. 段階的実装計画

### Phase 1: DOMHelper導入（1時間）
1. DOMHelper.tsの作成
2. ProgressTable.tsでの適用
3. AutoFillManager.tsでの適用

### Phase 2: DragManager導入（2時間）
1. DragManager.tsの作成
2. AutoFillManagerでの適用
3. 他のドラッグ機能への適用

### Phase 3: テスト自動化（2時間）
1. AutoFillTestHelperの作成
2. 基本テストケースの実装
3. エッジケースの追加

## まとめ

これらの改善により：
- **保守性**: 共通処理の一元化で30%向上
- **品質**: 自動テストで回帰バグを90%削減
- **開発効率**: 新機能追加時の工数を40%削減

投資工数5時間で、長期的に月20時間の削減効果が期待できます。