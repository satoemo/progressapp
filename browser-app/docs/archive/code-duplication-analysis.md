# コード重複分析レポート

作成日: 2025年9月11日
分析対象: v10.3.3全体

## 発見された重複パターン

### 1. 日付フォーマット処理（最優先）

#### 重複箇所（同一ロジックが5箇所以上）
```typescript
// パターン1: YYYY-MM-DD形式
private formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

**重複ファイル**:
- `/services/NormaDataService.ts` - formatDateString()
- `/ui/components/popups/CalendarPopup.ts` - formatDate()
- `/ui/shared/formatters/FieldFormatter.ts` - formatDate()
- `/ui/shared/utils/TableUtils.ts` - formatDate()
- `/ui/views/simulation/SimulationView.ts` - formatDate()

#### 影響
- 重複行数: 約25行（5箇所 × 5行）
- バグリスク: 日付処理の不整合
- 保守コスト: 同じ修正を5箇所に適用必要

#### 解決策: DateHelperクラス
```typescript
// src/ui/shared/utils/DateHelper.ts
export class DateHelper {
  /**
   * 日付をYYYY-MM-DD形式でフォーマット
   */
  static formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }
  
  /**
   * 日付をYYYY/MM/DD形式でフォーマット
   */
  static formatDateSlash(date: Date | string | null | undefined): string {
    const formatted = this.formatDate(date);
    return formatted.replace(/-/g, '/');
  }
  
  /**
   * 日付を月/日形式でフォーマット
   */
  static formatMonthDay(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
  
  /**
   * ISO文字列から日付部分のみ取得
   */
  static getDateFromISO(isoString: string): string {
    return isoString.split('T')[0];
  }
  
  /**
   * 日付の妥当性チェック
   */
  static isValidDate(dateString: string): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}
```

### 2. データ検証処理

#### 重複パターン
```typescript
// 日付の妥当性チェック
if (!value || value === '' || value === 'undefined') return false;
const date = new Date(value);
return !isNaN(date.getTime());
```

**重複箇所**:
- CalendarPopup.ts - isValidDate()
- NormaDataService.ts - isValidDate()
- 各種フィールドバリデーション

### 3. エラーハンドリング

#### 重複パターン
```typescript
try {
  // 処理
} catch (error) {
  console.error('[ComponentName] エラーメッセージ:', error);
  // 同じようなエラー処理
}
```

**重複箇所**: 50箇所以上

#### 解決策: ErrorHandlerクラス
```typescript
export class ErrorHandler {
  static handle(error: unknown, context: string, showAlert = false): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${context}]`, message, error);
    
    if (showAlert) {
      alert(`エラーが発生しました: ${message}`);
    }
  }
  
  static async handleAsync<T>(
    fn: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }
}
```

### 4. ローカルストレージ操作

#### 重複パターン
```typescript
// 保存
localStorage.setItem(key, JSON.stringify(data));

// 読み込み
const stored = localStorage.getItem(key);
if (stored) {
  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}
```

**重複箇所**: 15箇所以上

#### 解決策: StorageHelper
```typescript
export class StorageHelper {
  static save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Storage save failed:', error);
    }
  }
  
  static load<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  
  static remove(key: string): void {
    localStorage.removeItem(key);
  }
  
  static clear(prefix?: string): void {
    if (!prefix) {
      localStorage.clear();
      return;
    }
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}
```

## 重複削減効果の予測

| ヘルパークラス | 重複箇所 | 削減行数 | 優先度 |
|--------------|---------|----------|--------|
| DateHelper | 5箇所以上 | 約100行 | **高** |
| ErrorHandler | 50箇所以上 | 約200行 | 中 |
| StorageHelper | 15箇所以上 | 約150行 | 中 |
| ValidationHelper | 10箇所以上 | 約80行 | 低 |

## 実装優先順位

### Phase 1: DateHelper（推奨）
- **工数**: 1時間
- **効果**: 即座に100行削減
- **リスク**: 極小（純粋な関数）
- **ROI**: ★★★★★

### Phase 2: StorageHelper
- **工数**: 1時間
- **効果**: 150行削減
- **リスク**: 小（既存動作に影響なし）
- **ROI**: ★★★★☆

### Phase 3: ErrorHandler
- **工数**: 2時間
- **効果**: 200行削減、エラー処理統一
- **リスク**: 中（全体的な変更）
- **ROI**: ★★★☆☆

## アーキテクチャへの影響

これらのヘルパークラスは：
- **UI層内のユーティリティ**として実装
- 既存のレイヤー構造に影響なし
- ApplicationFacadeパターンと独立
- 単一責任の原則を強化

## まとめ

DOMHelper成功後、次の優先順位：
1. **DateHelper** - 最も効果的で実装が簡単
2. **StorageHelper** - localStorage操作の一元化
3. **ErrorHandler** - エラー処理の標準化

合計削減可能コード: **約530行**（全体の約5%）