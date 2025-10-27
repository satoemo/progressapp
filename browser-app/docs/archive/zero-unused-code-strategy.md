# 未使用コード0件達成戦略

## 現状: 81件の未使用コード

### パターン別分類

| パターン | 件数 | 対処法 | リスク |
|----------|------|--------|--------|
| 未使用インポート | 約25件 | 削除 | なし |
| 未使用プロパティ | 約20件 | プレフィックス追加 | なし |
| 未使用変数 | 約20件 | プレフィックス追加/削除 | 低 |
| 未使用パラメータ | 約16件 | プレフィックス追加 | なし |

## 対処方法

### 方法1: 完全削除アプローチ（推奨）
**所要時間: 20分**

#### メリット
- コードが最もクリーン
- バンドルサイズ最小化
- 保守性向上

#### デメリット
- 将来の拡張時に再実装が必要な場合がある
- 一部のインターフェース準拠が崩れる可能性

### 方法2: プレフィックスアプローチ
**所要時間: 15分**

TypeScriptでは`_`プレフィックスで未使用を明示できます：

```typescript
// Before
private retakeView: RetakeView | null = null;  // エラー

// After
private _retakeView: RetakeView | null = null;  // OK（意図的に未使用）
```

#### メリット
- 将来の使用に備えて保持
- インターフェース準拠を維持
- リスクなし

#### デメリット
- コードに残る（わずかにバンドルサイズ増）

### 方法3: ハイブリッドアプローチ（最適）
**所要時間: 20分**

| 対象 | 処理 |
|------|------|
| 未使用インポート | **削除** |
| 未使用プロパティ（将来使用予定） | **プレフィックス追加** |
| 未使用変数（デバッグ用） | **プレフィックス追加** |
| 未使用変数（不要） | **削除** |
| 未使用パラメータ | **プレフィックス追加** |

## 具体的な修正例

### 1. 未使用インポートの削除
```typescript
// src/services/core/BaseService.ts
- import { ValidationError } from '@/errors';  // 削除

// src/ui/components/DeletionConfirmDialog.ts
- import { DynamicStyleManager } from '@/styles/DynamicStyleManager';  // 削除
- import { EventPriority } from '@/core/events';  // 削除
```

### 2. 未使用プロパティのプレフィックス追加
```typescript
// src/main-browser.ts
- private retakeView: RetakeView | null = null;
+ private _retakeView: RetakeView | null = null;

- private syncIndicator: SyncIndicator | null = null;
+ private _syncIndicator: SyncIndicator | null = null;
```

### 3. 未使用パラメータのプレフィックス追加
```typescript
// src/application/ServiceContainer.ts
- constructor(config: ServiceContainerConfig = {}) {
+ constructor(_config: ServiceContainerConfig = {}) {
```

### 4. 未使用変数の処理
```typescript
// src/services/core/CutUpdateService.ts
- const merged = { ...existing, ...updates };  // 削除（不要）

// src/ui/components/editor/CellEditor.ts
- const originalContent = this.content;  // プレフィックス追加（デバッグ用）
+ const _originalContent = this.content;
```

## 実装手順

### Step 1: 未使用インポート一括削除（5分）
```bash
# ESLintの自動修正を使用
npx eslint src --fix --ext .ts,.tsx
```

### Step 2: プレフィックス追加スクリプト（10分）
```bash
# 自動化スクリプトを作成・実行
./fix-all-unused.sh
```

### Step 3: 手動確認と調整（5分）
- ビルド確認
- テスト実行
- 動作確認

## 期待される結果

| 指標 | 現在 | 達成後 |
|------|------|--------|
| 未使用コードエラー | 81件 | **0件** ✅ |
| TypeScriptエラー | 0件 | **0件** ✅ |
| ビルド成功 | ✅ | ✅ |
| テスト | - | ✅ |

## 推奨事項

**ハイブリッドアプローチを推奨**
- 不要なものは削除してクリーンに
- 将来必要なものはプレフィックスで保持
- リスクを最小限に抑えつつ0件達成

## 結論

**未使用コード0件は20分で達成可能です。**

最もリスクが低く、将来の拡張性も保てる「ハイブリッドアプローチ」で実装することで、コード品質を最大化できます。