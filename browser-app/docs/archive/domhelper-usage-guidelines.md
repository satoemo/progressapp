# DOMHelper使用ガイドライン

## 概要
DOMHelperは、DOM操作を統一化し、安全性と保守性を向上させるためのユーティリティクラスです。

## 主要メソッド一覧

### 1. テキスト更新
#### `updateTextKeepingElements(element, text, keepSelector?)`
セルのテキストを更新しながら、特定の子要素（.fill-handle、.memo-indicatorなど）を保持します。

```typescript
// 使用例
DOMHelper.updateTextKeepingElements(td, '新しいテキスト');

// カスタムセレクタを指定
DOMHelper.updateTextKeepingElements(td, 'テキスト', '.custom-element');
```

**使用推奨場面**:
- テーブルセルのテキスト更新
- メモインジケーターやフィルハンドルを持つセルの更新

### 2. クラス操作

#### 単一クラス操作
```typescript
// クラスの追加
DOMHelper.addClass(element, 'active');

// クラスの削除
DOMHelper.removeClass(element, 'disabled');

// クラスのトグル
DOMHelper.toggleClass(element, 'expanded');
DOMHelper.toggleClass(element, 'visible', true);  // 強制的に追加
```

#### 複数クラス操作
```typescript
// 複数クラスの一括追加
DOMHelper.addClasses(element, 'class1', 'class2', 'class3');

// 複数クラスの一括削除
DOMHelper.removeClasses(element, 'old-class1', 'old-class2');
```

**使用推奨場面**:
- 動的なスタイル変更
- 状態変化に伴うクラスの切り替え
- アニメーション制御

### 3. 属性設定

#### `setAttributes(element, attributes)`
複数の属性を一括で設定します。

```typescript
// 使用例
DOMHelper.setAttributes(element, {
  'data-id': '123',
  'data-type': 'progress',
  'role': 'button',
  'aria-label': 'クリックして編集'
});
```

**使用推奨場面**:
- data属性の複数設定
- アクセシビリティ属性の設定
- フォーム要素の属性設定

### 4. セル位置関連

#### `getVisibleRowIndex(cell)`
セルのDOM上の表示位置（行インデックス）を取得します。

#### `getCellByVisiblePosition(rowIndex, column)`
表示位置からセル要素を取得します。

#### `getVisibleRows(tbody)`
表示されている行のみを取得します（非表示行を除外）。

#### `getVisibleCellsInColumn(column)`
指定列の表示されているセルをすべて取得します。

**使用推奨場面**:
- オートフィル機能
- セルナビゲーション
- フィルタリング後の要素取得

## ベストプラクティス

### 1. 直接DOM操作を避ける

❌ **避けるべきコード**:
```typescript
element.classList.add('active');
element.classList.remove('disabled');
element.textContent = 'テキスト';
element.dataset.id = '123';
element.dataset.type = 'test';
```

✅ **推奨コード**:
```typescript
DOMHelper.addClass(element, 'active');
DOMHelper.removeClass(element, 'disabled');
DOMHelper.updateTextKeepingElements(element, 'テキスト');
DOMHelper.setAttributes(element, {
  'data-id': '123',
  'data-type': 'test'
});
```

### 2. null安全性の活用

DOMHelperのメソッドは内部でnullチェックを行うため、安全に使用できます。

```typescript
// nullチェックが不要
const element = document.querySelector('.optional-element');
DOMHelper.addClass(element, 'active');  // elementがnullでも安全
```

### 3. 複数操作の最適化

複数の属性やクラスを設定する場合は、一括操作メソッドを使用します。

❌ **非効率なコード**:
```typescript
DOMHelper.addClass(element, 'class1');
DOMHelper.addClass(element, 'class2');
DOMHelper.addClass(element, 'class3');
```

✅ **効率的なコード**:
```typescript
DOMHelper.addClasses(element, 'class1', 'class2', 'class3');
```

### 4. セマンティックな使い分け

- **DOMBuilder.create()**: 新規要素の作成
- **DOMHelper**: 既存要素の操作

```typescript
// 要素の作成はDOMBuilder
const button = DOMBuilder.create('button', {
  className: 'primary-button',
  textContent: 'クリック'
});

// 既存要素の操作はDOMHelper
DOMHelper.addClass(button, 'active');
DOMHelper.setAttributes(button, {
  'aria-pressed': 'true'
});
```

## 移行ガイド

### 段階的移行戦略

1. **Phase 1**: クリティカルな箇所から移行
   - セルのテキスト更新（updateTextKeepingElements）
   - 動的なクラス変更

2. **Phase 2**: 一般的なDOM操作の移行
   - クラス操作全般
   - 属性設定

3. **Phase 3**: 特殊なケースの移行
   - カスタムセレクタを使用した操作
   - パフォーマンスクリティカルな処理

### コードレビューチェックリスト

- [ ] 直接のclassList操作をDOMHelperメソッドに置き換えたか
- [ ] textContent更新時に子要素の保持が必要か確認したか
- [ ] 複数の属性設定をsetAttributesで一括化したか
- [ ] null安全性を活用してnullチェックを削減したか
- [ ] DOMBuilderとDOMHelperを適切に使い分けているか

## パフォーマンス考慮事項

### メリット
- DOM操作の最適化（バッチ処理）
- 不要な再レンダリングの削減
- メモリ効率の向上

### 注意点
- 大量の要素操作時は、適切にバッチ化する
- アニメーション中の操作は最小限に抑える

## 今後の拡張予定

- イベントリスナー管理機能
- アニメーション制御機能
- カスタムデータ属性の型安全な管理
- パフォーマンス計測機能

## 参考資料

- [Phase 5.4 実装計画書](./phase5-step4-domhelper-plan.md)
- [Phase 5.4.1 完了報告](./phase5-step4.1-completion-report.md)
- [Phase 5.4.2 完了報告](./phase5-step4.2-completion-report.md)