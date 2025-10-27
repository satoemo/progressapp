# Phase 2.5 グループヘッダー表示問題の分析

## 調査日時
2025-08-20

## 問題の概要
カット情報グループヘッダーが他のグループヘッダーと異なる表示になっている

## 原因分析

### ProgressTable.ts（既存実装）vs TableRenderService（新実装）の違い

#### 1. groupFieldsByLayout メソッドの実装差異

**ProgressTable.ts（既存実装）**
```typescript
// フィールドのcategoryプロパティを使って動的にグループ化
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

**TableRenderService（新実装）**
```typescript
// 固定的なグループ順序リストを使用（不完全）
const groupOrder = [
  'basic',
  'cutInfo', 
  'loInfo',
  'loProgress',
  'genInfo',
  'genProgress'
  // 他のグループが欠けている！
];

groupOrder.forEach(groupId => {
  const group = FIELD_GROUPS.find(g => g.id === groupId);
  // ...
});
```

#### 2. createGroupHeaderRow メソッドの実装差異

**ProgressTable.ts（既存実装）**
```typescript
// group.classNameを使用し、操作グループを個別に追加
groupedFields.forEach((group) => {
  const th = document.createElement('th');
  th.setAttribute('colspan', String(group.colspan));
  th.textContent = group.title;
  th.className = `group-header ${group.className}`;  // ← classNameを使用
  tr.appendChild(th);
});

// 操作グループのヘッダーを追加
const operationTh = document.createElement('th');
operationTh.setAttribute('colspan', '1');
operationTh.textContent = '操作';
operationTh.className = 'group-header operation-group';
tr.appendChild(operationTh);
```

**TableRenderService（新実装）**
```typescript
// classNameを使わず、操作グループもない
groupedFields.forEach((group) => {
  const th = document.createElement('th');
  th.setAttribute('colspan', String(group.colspan));
  th.textContent = group.title;
  th.className = 'group-header';  // ← classNameが固定
  tr.appendChild(th);
});
// 操作グループがない！
```

## 具体的な問題

### フィールドメタデータ（FieldMetadataRegistry）
```typescript
// カット情報グループのフィールド
{ field: 'special', category: 'cutInfo', groupId: 'cutInfo', ... },
{ field: 'kenyo', category: 'cutInfo', groupId: 'cutInfo', ... },
{ field: 'maisu', category: 'cutInfo', groupId: 'cutInfo', ... },
{ field: 'manager', category: 'cutInfo', groupId: 'cutInfo', ... },
{ field: 'ensyutsu', category: 'cutInfo', groupId: 'cutInfo', ... },
{ field: 'sousakkan', category: 'cutInfo', groupId: 'cutInfo', ... },
```

### FIELD_GROUPS定義（groups.ts）
```typescript
{
  id: 'cutInfo',
  title: 'カット情報',
  className: 'info-group',  // ← このクラス名が適用されていない
  section: 'basic',
  fields: ['special', 'kenyo', 'maisu', 'manager', 'ensyutsu', 'sousakkan']
}
```

## 影響

1. **カット情報グループ**: `info-group`クラスが適用されない
2. **他のグループ**: 固定リストに含まれていないグループが表示されない可能性
3. **操作グループ**: 削除列のヘッダーが表示されない
4. **スタイル**: グループ固有のスタイルが適用されない

## 修正方針

### Option 1: TableRenderServiceを修正（推奨）
1. groupFieldsByLayoutをProgressTable.tsと同じロジックに変更
2. createGroupHeaderRowでclassNameを使用
3. 操作グループの追加処理を実装

### Option 2: 既存実装を使用
TableRenderServiceの使用を一時的に停止し、既存のProgressTable.tsのメソッドを使用

## 修正すべきコード

### TableRenderService.ts
1. groupFieldsByLayoutメソッドを既存実装と同じロジックに変更
2. createGroupHeaderRowでgroup.classNameを適用
3. 削除列（操作グループ）のヘッダーを追加

---
作成: 2025-08-20
Phase: 2.5 グループヘッダー問題