# Phase 5 Step 4: DOMHelper全面活用計画

## 現状分析

### DOM操作の実装状況
1. **DOMBuilder.create()の使用**: 218箇所（25ファイル）
2. **DOMHelperの使用**: 16箇所（5ファイル）
3. **document.createElement()の直接使用**: 1箇所（DOMBuilder内のみ）

### 問題点
- DOMHelperは特殊な機能（テキスト更新時の要素保持、セル位置取得）のみ提供
- 一般的なDOM操作はDOMBuilderが担当
- 2つのヘルパークラスの役割が不明確

### DOMHelperの現在の機能
1. `updateTextKeepingElements()` - テキスト更新時に特定要素を保持
2. `getCellDisplayIndex()` - セルの表示位置取得
3. `findCellByDisplayIndex()` - 表示位置からセル要素取得
4. `addClass()` / `removeClass()` / `toggleClass()` - クラス操作
5. `setAttributes()` - 複数属性の一括設定

### DOMBuilderの主要機能
1. `create()` - 要素作成（最も使用頻度が高い）
2. `createTableElements()` - テーブル要素の一括作成
3. `createFormElements()` - フォーム要素の作成

## 実装方針

### 方針1: DOMBuilderとDOMHelperの統合（推奨）
**メリット**:
- 1つの統一されたDOM操作インターフェース
- import文の簡略化
- 機能の重複排除

**デメリット**:
- 大規模な変更が必要
- 既存の218箇所の修正

### 方針2: 役割の明確化と使い分け
**メリット**:
- 既存コードへの影響最小
- 段階的な移行が可能

**デメリット**:
- 2つのヘルパーの使い分けが複雑
- 新規開発時の混乱

## 実装計画（方針2: 段階的移行）

### Step 1: クラス操作の統一（優先度：高）
**対象**: addClass, removeClass, toggleClassの使用促進
**影響範囲**: 約30箇所

#### 現在のコード例
```typescript
// Before
element.classList.add('active');
element.classList.remove('disabled');

// After
DOMHelper.addClass(element, 'active');
DOMHelper.removeClass(element, 'disabled');
```

### Step 2: 属性設定の統一（優先度：中）
**対象**: setAttributesメソッドの活用
**影響範囲**: 約20箇所

#### 現在のコード例
```typescript
// Before
element.setAttribute('data-id', id);
element.setAttribute('data-type', type);

// After
DOMHelper.setAttributes(element, {
  'data-id': id,
  'data-type': type
});
```

### Step 3: テキスト更新処理の統一（優先度：高）
**対象**: updateTextKeepingElementsの活用
**影響範囲**: 約15箇所（ProgressTable、NormaTable等）

#### 現在のコード例
```typescript
// Before（手動でのDOM操作）
const fillHandle = cell.querySelector('.fill-handle');
cell.textContent = newText;
if (fillHandle) {
  cell.appendChild(fillHandle);
}

// After
DOMHelper.updateTextKeepingElements(cell, newText);
```

### Step 4: 新規メソッドの追加（優先度：低）
**追加予定のメソッド**:
1. `createElement()` - DOMBuilder.create()のラッパー
2. `querySelector()` - null安全なクエリセレクター
3. `addEventListener()` - イベントリスナーの統一管理

## 実装順序

1. **Phase 5.4.1**: テキスト更新処理の統一（1時間）
   - ProgressTable.ts
   - NormaTable.ts
   - その他のテーブル関連ファイル

2. **Phase 5.4.2**: クラス操作の統一（1時間）
   - 動的なクラス変更を行っている箇所
   - アニメーション関連の処理

3. **Phase 5.4.3**: 属性設定の統一（30分）
   - data属性の設定箇所
   - 複数属性を設定している箇所

4. **Phase 5.4.4**: 検証とドキュメント化（30分）
   - 使用ガイドラインの作成
   - ベストプラクティスの文書化

## 期待される効果

### 定量的効果
- コード行数削減: 約100行
- DOM操作の統一率: 30%向上
- エラー発生リスク: 20%削減

### 定性的効果
- DOM操作の一貫性向上
- 保守性の向上
- 新規開発時の実装速度向上

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存機能の破壊 | 高 | 段階的実装と都度テスト |
| パフォーマンス低下 | 低 | ベンチマークによる検証 |
| 開発者の混乱 | 中 | ガイドライン文書の作成 |

## 成功基準

- DOMHelper使用箇所: 16箇所 → 50箇所以上
- DOM操作の統一率: 30%以上
- ビルドエラー: 0件
- 機能への影響: なし

## 注意事項

- DOMBuilderの既存使用箇所（218箇所）は当面維持
- 新規開発ではDOMHelperの使用を推奨
- 将来的にはDOMBuilderとDOMHelperの統合を検討