# Phase 3 Step 5: UIコンポーネント整理計画

## 現状分析

### ディレクトリ構造（現在）
```
src/ui/
├── autofill/      # オートフィル機能
├── base/          # 基底クラス
├── builders/      # ビルダーパターン
├── cell-editor/   # セルエディタ
├── components/    # 汎用コンポーネント（現在1ファイル）
├── constants/     # 定数定義
├── cutbag/        # カットバッグビュー
├── export/        # エクスポート機能
├── filter/        # フィルタ機能
├── formatters/    # フォーマッター
├── order/         # オーダービュー
├── retake/        # リテイクビュー
├── schedule/      # スケジュールビュー
├── simulation/    # シミュレーションビュー
├── staff/         # スタッフビュー
├── state/         # 状態管理
├── styles/        # スタイル管理
├── tabs/          # タブ管理
├── types/         # 型定義
└── utils/         # ユーティリティ
```

総ファイル数：42ファイル

### ルートレベルの散在ファイル
以下のファイルがui/直下に配置されている：
- ProgressTable.ts（メインテーブル）
- FieldLabels.ts（フィールドラベル定義）
- DropdownPopup.ts（ドロップダウン）
- KenyoMultiSelectPopup.ts（兼用選択）
- SpecialMultiSelectPopup.ts（特殊作業選択）
- CalendarPopup.ts（カレンダー）
- ViewMode.ts（ビューモード定義）
- generateDummyData.ts（ダミーデータ生成）

## 整理方針

### 1. ディレクトリ再構成案

```
src/ui/
├── components/           # 汎用UIコンポーネント
│   ├── popups/          # ポップアップ系
│   │   ├── CalendarPopup.ts
│   │   ├── DropdownPopup.ts
│   │   ├── KenyoMultiSelectPopup.ts
│   │   ├── SpecialMultiSelectPopup.ts
│   │   └── DeletionConfirmDialog.ts
│   ├── table/           # テーブル関連
│   │   ├── ProgressTable.ts
│   │   └── base/
│   │       └── BaseProgressTable.ts
│   ├── editor/          # エディタ関連（cell-editorから移動）
│   │   ├── CellEditor.ts
│   │   └── CellEditorFactory.ts
│   └── filter/          # フィルタ関連（既存）
│       ├── FilterDropdown.ts
│       └── FilterManager.ts
├── views/               # 各ビュー
│   ├── staff/          # スタッフビュー（既存）
│   ├── simulation/     # シミュレーション（既存）
│   ├── cutbag/        # カットバッグ（既存）
│   ├── order/         # オーダー（既存）
│   ├── retake/        # リテイク（既存）
│   └── schedule/      # スケジュール（既存）
├── features/           # 機能別モジュール
│   ├── autofill/      # オートフィル（既存）
│   ├── export/        # エクスポート（既存）
│   └── tabs/          # タブ管理（既存）
├── shared/            # 共有リソース
│   ├── constants/     # 定数（既存）
│   ├── types/        # 型定義（既存）
│   ├── utils/        # ユーティリティ（既存）
│   ├── formatters/   # フォーマッター（既存）
│   ├── builders/     # ビルダー（既存）
│   ├── styles/       # スタイル（既存）
│   └── state/        # 状態管理（既存）
└── config/           # 設定関連
    ├── FieldLabels.ts
    └── ViewMode.ts
```

### 2. 削除・統合候補

#### 削除候補
- 未使用のコンポーネント
- 重複した機能
- デッドコード

#### 統合候補
- 類似のポップアップコンポーネント
- 共通のユーティリティ関数

### 3. 実装手順

#### Step 1: ディレクトリ作成（10分）
```bash
mkdir -p src/ui/components/{popups,table/base,editor}
mkdir -p src/ui/views
mkdir -p src/ui/features
mkdir -p src/ui/shared
mkdir -p src/ui/config
```

#### Step 2: ファイル移動（20分）
1. ポップアップ系 → components/popups/
2. テーブル系 → components/table/
3. エディタ系 → components/editor/
4. 設定系 → config/

#### Step 3: import文の更新（30分）
- 移動したファイルのパスを全て更新
- VSCodeの「Move/Rename」機能を活用

#### Step 4: 不要ファイルの削除（20分）
- 未使用コンポーネントの特定と削除
- generateDummyData.tsは開発用なのでtest/に移動

#### Step 5: インデックスファイル作成（10分）
- 各ディレクトリにindex.tsを作成
- 再エクスポートによるimportの簡素化

## 期待される効果

### 構造の明確化
- **Before**: フラットな構造で役割が不明確
- **After**: 階層的な構造で責務が明確

### 保守性の向上
- 関連ファイルがグループ化される
- 新規コンポーネントの配置場所が明確

### import文の簡素化
```typescript
// Before
import { CalendarPopup } from '../../../ui/CalendarPopup';
import { DropdownPopup } from '../../../ui/DropdownPopup';

// After
import { CalendarPopup, DropdownPopup } from '@/ui/components/popups';
```

## リスクと対策

### リスク
1. ビルドエラーの発生
2. 実行時エラーの発生
3. 機能の破損

### 対策
1. 段階的な移行
2. 各ステップでのビルド確認
3. 動作テストの実施

## 実施スケジュール

1. **準備（10分）**
   - バックアップ作成
   - 現在の動作確認

2. **実装（90分）**
   - Step 1-5の実施

3. **検証（20分）**
   - ビルドテスト
   - 動作確認
   - import最適化

## この計画で進めてよろしいですか？

「はい」で実装を開始します。
別の方針をご希望の場合はお知らせください。