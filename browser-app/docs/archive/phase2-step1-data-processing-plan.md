# Phase 2 Step 1: データ処理ヘルパー実装計画書

## 1. 現状分析

### 統計情報
- **配列操作**: 212箇所
- **日付処理**: 143箇所
- **数値計算**: 97箇所
- **文字列処理**: 78箇所
- **オブジェクト操作**: 53箇所
- **合計**: 約583箇所の重複パターン

### 重複パターンの例

#### 1. 配列処理パターン
```typescript
// フィルタとマップの組み合わせ
.filter(item => item.valid).map(item => item.value)

// 重複除去
Array.from(new Set(array))

// null/undefined除去
.filter(item => item != null)
```

#### 2. 日付処理パターン
```typescript
// ISO文字列への変換
new Date().toISOString().split('T')[0]

// 日本語ロケール変換
date.toLocaleString('ja-JP')

// 日付差分計算
Math.floor((date2 - date1) / (1000 * 60 * 60 * 24))
```

#### 3. オブジェクト処理パターン
```typescript
// 深いコピー
JSON.parse(JSON.stringify(obj))

// マージ
Object.assign({}, obj1, obj2)

// キーごとの処理
Object.entries(obj).forEach(([key, value]) => ...)
```

#### 4. 数値処理パターン
```typescript
// パーセント計算
Math.round((value / total) * 100)

// 範囲制限
Math.max(min, Math.min(max, value))

// 数値フォーマット
value.toLocaleString('ja-JP')
```

#### 5. 文字列処理パターン
```typescript
// トリミング
str.trim()

// 複数区切り文字での分割
str.split(/[,、]/)

// null/undefinedの安全な変換
String(value || '')
```

## 2. 実装計画

### Step 1.1: DataProcessorクラスの作成
**場所**: `/src/ui/shared/utils/DataProcessor.ts`

**主要メソッド**:
```typescript
class DataProcessor {
  // 配列処理
  static unique<T>(array: T[]): T[]
  static compact<T>(array: T[]): NonNullable<T>[]
  static groupBy<T>(array: T[], key: keyof T): Record<string, T[]>
  static chunk<T>(array: T[], size: number): T[][]
  
  // 日付処理
  static formatDate(date: Date, format: string): string
  static parseDate(str: string): Date | null
  static getDaysBetween(date1: Date, date2: Date): number
  static isWeekend(date: Date): boolean
  static isHoliday(date: Date): boolean
  
  // オブジェクト処理
  static deepClone<T>(obj: T): T
  static deepMerge<T>(target: T, ...sources: Partial<T>[]): T
  static pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>
  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>
  
  // 数値処理
  static clamp(value: number, min: number, max: number): number
  static toPercentage(value: number, total: number, decimals?: number): string
  static formatNumber(value: number, locale?: string): string
  static sum(numbers: number[]): number
  static average(numbers: number[]): number
  
  // 文字列処理
  static capitalize(str: string): string
  static truncate(str: string, length: number, suffix?: string): string
  static splitByMultiple(str: string, delimiters: string[]): string[]
  static safeString(value: any): string
  static extractNumbers(str: string): number[]
}
```

### Step 1.2: 実装優先順位

1. **高優先度（最も使用頻度が高い）**
   - 配列の重複除去 (unique)
   - null/undefined除去 (compact)
   - 日付フォーマット (formatDate)
   - 深いコピー (deepClone)
   - 数値の範囲制限 (clamp)

2. **中優先度（定期的に使用）**
   - 配列のグループ化 (groupBy)
   - 日付差分計算 (getDaysBetween)
   - オブジェクトマージ (deepMerge)
   - パーセント計算 (toPercentage)
   - 文字列切り詰め (truncate)

3. **低優先度（特定箇所でのみ使用）**
   - 配列チャンク分割 (chunk)
   - 休日判定 (isHoliday)
   - オブジェクトのpick/omit
   - 平均計算 (average)
   - 数値抽出 (extractNumbers)

### Step 1.3: 置き換え戦略

1. **段階的な置き換え**
   - まず高使用頻度のパターンから置き換え
   - 各ファイルごとに完全に置き換えてテスト
   - ビルドエラーがないことを確認

2. **互換性の維持**
   - 既存コードの動作を完全に維持
   - 型安全性を向上
   - エラーハンドリングを統一

3. **テスト項目**
   - 配列処理：空配列、null値を含む配列
   - 日付処理：無効な日付、タイムゾーン
   - オブジェクト処理：循環参照、プロトタイプ
   - 数値処理：NaN、Infinity、負の数
   - 文字列処理：空文字、特殊文字

## 3. 期待される効果

### コード削減
- 約450-500行の重複コード削減見込み
- 全体のコード量を約8-10%削減

### 品質向上
- エラーハンドリングの統一
- 型安全性の向上
- テスタビリティの向上

### 保守性向上
- データ処理ロジックの一元化
- バグ修正が一箇所で完結
- 新機能追加が容易

## 4. 実装スケジュール

### 今回のリクエスト（Step 1.1）
1. DataProcessorクラスの作成
2. 高優先度メソッドの実装（5個）
3. テストとビルド確認

### 次回のリクエスト（Step 1.2）
1. 中優先度メソッドの実装（5個）
2. 既存コードの置き換え開始（50箇所）
3. テストとビルド確認

### 3回目のリクエスト（Step 1.3）
1. 低優先度メソッドの実装（5個）
2. 残りのコード置き換え（100箇所）
3. 完了レポート作成

## 5. リスクと対策

### リスク
- 既存コードの微妙な挙動の違い
- パフォーマンスへの影響
- テスト不足による不具合

### 対策
- 段階的な置き換えで影響範囲を限定
- パフォーマンステストの実施
- 各段階でのユーザー確認