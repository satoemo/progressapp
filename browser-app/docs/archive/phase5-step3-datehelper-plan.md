# Phase 5 Step 5.3: DateHelper全面活用計画

## 現状分析

### DateHelper使用状況
- **現在の使用箇所**: 4箇所（DataProcessor.ts内のみ）
- **目標**: 20箇所以上に拡大

### 独自実装の日付処理
1. **DataProcessor.formatDate** - 30箇所以上で使用
2. **TableUtils.formatDate** - 複数箇所で使用
3. **FieldFormatter.formatDate** - フィールドフォーマットで使用
4. **NormaDataService.formatDateString** - ノルマデータ処理で使用

## 実装計画

### Step 1: DataProcessor.formatDateをDateHelperに置き換え（優先度：高）
**影響範囲**: 最も多く使用されている
**対象**:
- DataProcessor.formatDate() → DateHelper.format()に変更
- 各ファイルでDataProcessor.formatDateを使用している箇所を修正

### Step 2: TableUtils.formatDateをDateHelperに置き換え（優先度：中）
**対象**:
- TableUtils.formatDate() → DateHelper.formatDateSlash()
- TableUtils.formatMonthDay() → DateHelper.format(date, 'M月D日')

### Step 3: FieldFormatter.formatDateをDateHelperに置き換え（優先度：中）
**対象**:
- FieldFormatter.formatDate() → DateHelper.formatDate()

### Step 4: NormaDataService.formatDateStringをDateHelperに置き換え（優先度：低）
**対象**:
- NormaDataService.formatDateString() → DateHelper.formatDate()

### Step 5: 日付検証処理の統一（優先度：中）
**対象**:
- 各所の日付バリデーション → DateHelper.isValid()

## 実装順序

1. DataProcessor内のformatDateメソッドをDateHelperを使うように変更
2. 各ファイルのimport文を修正（DataProcessorからDateHelperへ）
3. 使用箇所の修正

## 期待される効果

- コード重複の削減: 約100行
- 日付処理の一元化
- バグリスクの低減
- 保守性の向上

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| フォーマット形式の違い | 低 | 事前に形式を確認 |
| ビルドエラー | 低 | 段階的に実装 |
| 実行時エラー | 低 | 各ステップでビルド確認 |

## 成功基準

- DateHelper使用箇所: 20箇所以上
- ビルドエラー: 0件
- 機能への影響: なし