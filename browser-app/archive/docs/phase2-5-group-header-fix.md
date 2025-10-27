# Phase 2.5 グループヘッダー問題の修正

## 実施日時
2025-08-20

## 問題の詳細
カット情報グループヘッダーだけでなく、すべてのグループヘッダーが正しく表示されていなかった

## 修正内容

### TableRenderService.tsの変更

#### 1. GroupedFieldインターフェースの拡張
```typescript
interface GroupedField {
  title: string;
  colspan: number;
  className: string;  // 追加
  fields?: FieldDefinition[];
  isFixed?: boolean;  // 追加
  totalWidth?: number;  // 追加
}
```

#### 2. groupFieldsByLayoutメソッドの完全書き換え
**変更前**: 固定的なグループ順序リストを使用（不完全）
```typescript
const groupOrder = ['basic', 'cutInfo', 'loInfo', 'loProgress', 'genInfo', 'genProgress'];
```

**変更後**: フィールドのcategoryプロパティを使用した動的グループ化
```typescript
// 各フィールドをcategoryでグループ化
for (let i = 0; i < this.visibleFields.length; i++) {
  const field = this.visibleFields[i];
  
  // categoryが変わった場合
  if (field.category !== currentCategory) {
    // 前のグループを追加
    if (currentCategory !== null && currentColspan > 0) {
      groups.push({
        title: currentGroup?.title || currentCategory,
        colspan: currentColspan,
        className: currentGroup?.className || `${currentCategory}-group`,
        isFixed: currentIsFixed,
        totalWidth: currentTotalWidth
      });
    }
    // 新しいグループを開始
    currentCategory = field.category || 'other';
    currentGroup = FIELD_GROUPS.find(g => g.id === currentCategory) || null;
    currentColspan = 1;
    currentTotalWidth = field.width;
    currentIsFixed = field.fixed || false;
  } else {
    // 同じカテゴリーの場合は列数を増やす
    currentColspan++;
    currentTotalWidth += field.width;
  }
}
```

#### 3. createGroupHeaderRowメソッドの改良
- group.classNameを適用
- 操作グループ（削除列）のヘッダーを追加

```typescript
// 各グループのヘッダーを作成
groupedFields.forEach((group) => {
  const th = document.createElement('th');
  th.setAttribute('colspan', String(group.colspan));
  th.textContent = group.title;
  th.className = `group-header ${group.className}`;  // classNameを適用
  tr.appendChild(th);
});

// 操作グループのヘッダーを追加
const operationTh = document.createElement('th');
operationTh.setAttribute('colspan', '1');
operationTh.textContent = '操作';
operationTh.className = 'group-header operation-group';
tr.appendChild(operationTh);
```

#### 4. その他の修正
- createColGroup: 削除列のcol要素を追加
- createEmptyRow: colSpanを調整（+1 for delete column）
- createDataRow: 削除ボタンにdata-cutId属性を追加

### ProgressTable.tsの変更

#### 削除ボタンのイベントハンドラー設定
```typescript
// Phase 2.5: TableRenderServiceを使った場合、削除ボタンのイベントを設定
if (this.renderService) {
  const deleteButtons = this.table.querySelectorAll('.delete-link');
  deleteButtons.forEach(button => {
    const spanButton = button as HTMLElement;
    const cutId = spanButton.dataset.cutId;
    if (cutId) {
      spanButton.onclick = (e) => {
        e.stopPropagation();
        this.handleDeleteClick(cutId);
      };
      // キーボードアクセシビリティも追加
    }
  });
}
```

## 修正結果

### Before
- カット情報グループ: `group-header`クラスのみ
- 他のグループ: 表示されない場合がある
- 操作列: ヘッダーなし

### After
- カット情報グループ: `group-header info-group`クラス
- すべてのグループ: 正しく表示される
- 操作列: ヘッダー「操作」が表示される

## グループヘッダーのクラス名対応

| グループID | title | className |
|-----------|-------|-----------|
| basic | 基本情報 | basic-group |
| cutInfo | カット情報 | info-group |
| loInfo | LO情報 | info-group |
| loProgress | LO進捗 | progress-group |
| genInfo | 原画情報 | info-group |
| genProgress | 原画進捗 | progress-group |
| operation | 操作 | operation-group |

## テスト項目

1. **グループヘッダーの表示**
   - [ ] すべてのグループヘッダーが表示される
   - [ ] 各グループに正しいクラス名が適用される
   - [ ] 操作グループのヘッダーが表示される

2. **カット情報グループ**
   - [ ] `info-group`クラスが適用される
   - [ ] colspanが正しく設定される
   - [ ] 他のinfo-groupと同じスタイルで表示される

3. **削除機能**
   - [ ] 削除ボタンが表示される
   - [ ] クリックで削除機能が動作する

## 影響範囲
- TableRenderService: グループヘッダー生成ロジックを完全に変更
- ProgressTable: 削除ボタンのイベントハンドラー追加

---
作成: 2025-08-20
Phase: 2.5 グループヘッダー修正完了