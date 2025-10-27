# オートフィル機能のソート/フィルタ対応修正計画

## 問題の概要
ソートやフィルタを適用した後にオートフィル機能を使用すると、表示されていないセルや間違った位置のセルが選択される。

## 原因分析
1. **現在の実装**
   - `data-row`属性（元データのインデックス）を使用してセルを特定
   - ソート/フィルタ後もこの値は変わらない
   - DOM上の表示順序と`data-row`値が不一致

2. **具体例**
   - 元データ: row=0,1,2,3,4
   - ソート後表示: row=4,2,0,3,1
   - オートフィルがrow=0から1を選択すると、表示上は離れたセルを選択

## 解決方針
DOM上の実際の位置関係を使用してセルを選択する

## 実装計画

### ステップ1: DOM位置ベースのセル取得メソッド追加
```typescript
// 表示されている行のインデックスを取得
private getVisibleRowIndex(cell: HTMLElement): number
// 表示されている同じ列のセルを取得
private getVisibleCellsInColumn(column: string): HTMLElement[]
```

### ステップ2: ドラッグ範囲選択の修正
```typescript
// DOM上の連続したセルを選択
private updateDragRangeByVisiblePosition(targetCell: HTMLElement): void
```

### ステップ3: セル選択ロジックの更新
- `getCellByPosition`の代替メソッド実装
- 表示されているセルのみを対象にする

## 影響範囲
- AutoFillManager.ts のみ
- ProgressTable.ts への影響なし

## テスト項目
1. 通常表示でのオートフィル動作
2. ソート適用後のオートフィル動作
3. フィルタ適用後のオートフィル動作
4. ソート＋フィルタ適用後のオートフィル動作

## 推定作業時間
30分（中規模の独立した機能修正）