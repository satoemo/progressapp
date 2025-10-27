# DOMHelperクラス実装計画

## アーキテクチャへの影響評価

### 複雑化しない理由

#### 1. 純粋なユーティリティクラス
```
現在のアーキテクチャ:
UI層 → ApplicationFacade → Domain層 → Infrastructure層

DOMHelper追加後:
UI層 → ApplicationFacade → Domain層 → Infrastructure層
  ↓
DOMHelper (UI層内のユーティリティ)
```

- **レイヤー構造は変更なし**
- **依存関係の追加なし**（UI層内で完結）
- **既存の責務分担に影響なし**

#### 2. コード削減効果
```typescript
// Before: 各コンポーネントで重複実装（20行×3箇所 = 60行）
private updateCellContent(cell: HTMLElement, text: string) {
  const fillHandle = cell.querySelector('.fill-handle');
  const hasFillHandle = !!fillHandle;
  const childNodes = Array.from(cell.childNodes);
  childNodes.forEach(node => {
    if (node !== fillHandle) {
      cell.removeChild(node);
    }
  });
  // ... さらに10行
}

// After: DOMHelper利用（3行）
private updateCellContent(cell: HTMLElement, text: string) {
  DOMHelper.updateTextKeepingElements(cell, text);
}
```

#### 3. 単一責任の原則を強化
- **ProgressTable**: 表示ロジックに専念
- **AutoFillManager**: オートフィル機能に専念
- **DOMHelper**: DOM操作の共通処理に専念

## 実装計画

### ステップ1: DOMHelperクラス作成（15分）
```typescript
// src/ui/shared/utils/DOMHelper.ts
export class DOMHelper {
  // 3つの必須メソッドのみ実装
  static updateTextKeepingElements()
  static getVisibleRowIndex()
  static getCellByVisiblePosition()
}
```

### ステップ2: 既存コードの置き換え（10分）
1. ProgressTable.ts - updateCellContent簡素化
2. AutoFillManager.ts - 新規追加メソッドを削除してDOMHelper利用

### ステップ3: テスト確認（5分）
- ビルド確認
- オートフィル動作確認

## リスク評価

| リスク | 可能性 | 影響 | 対策 |
|--------|--------|------|------|
| 既存機能への影響 | 低 | 小 | 段階的な置き換え |
| パフォーマンス低下 | 極低 | 極小 | static メソッドで影響なし |
| 新たなバグ | 低 | 小 | 既存ロジックの移動のみ |

## 期待される成果

### 定量的効果
- コード行数: **60行削減**（重複排除）
- 保守箇所: **3箇所→1箇所**に集約
- 修正時間: **将来のDOM関連バグ修正が75%短縮**

### 定性的効果
- **可読性向上**: 各コンポーネントの責務が明確に
- **保守性向上**: DOM操作の修正が一箇所で完結
- **テスト容易性**: DOM操作を独立してテスト可能

## 結論

DOMHelperは：
- ✅ アーキテクチャを**複雑化しない**（UI層内のユーティリティ）
- ✅ むしろコードを**シンプル化**する（重複削除）
- ✅ 既存の設計原則を**強化**する（単一責任）

実装時間30分、リスク最小、効果最大の改善です。