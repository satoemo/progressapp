# Phase 3 Step 2: 型定義の整理計画

## 現状分析

### any型の使用状況
- **使用箇所**: 81箇所
- **対象ファイル**: 20ファイル
- **主な使用場所**:
  - Logger.ts（17箇所）
  - SimpleEventLogger.ts（12箇所）
  - KintoneApiClient.ts（7箇所）
  - SimplifiedReadModel.ts（7箇所）
  - PerformanceMonitor.ts（6箇所）

### 型定義の分散状況
- **export interface**: 114個
- **export type**: 25個
- **合計**: 139個の型定義
- **分散場所**: 各モジュール内に散在
- **集約済み**: `/src/domain/types.ts`のみ

### 問題点
1. **型の重複**: 同じような型が複数箇所で定義されている可能性
2. **管理の困難性**: 型定義が分散しているため変更時の影響範囲が不明確
3. **any型の過度な使用**: 型安全性の低下
4. **インポートの複雑化**: 型を使用する際のインポート文が複雑

## 実装計画

### Phase A: 型定義ディレクトリの作成（15分）

#### 1. ディレクトリ構造の作成
```
/src/types/
├── index.ts          # 主要な型のエクスポート
├── domain.ts         # ドメイン関連の型（既存のtypes.tsから移動）
├── infrastructure.ts # インフラ層の型
├── application.ts    # アプリケーション層の型
├── ui.ts            # UI関連の型
└── utils.ts         # ユーティリティ型
```

#### 2. 既存の/src/domain/types.tsの移動
- `/src/domain/types.ts` → `/src/types/domain.ts`
- インポートパスの更新

### Phase B: any型の削減 - 第1弾（45分）

#### 優先対象（影響範囲が限定的なもの）

##### 1. CellEditor.ts（1箇所）
```typescript
// 現在
private value: any;

// 改善後
private value: string | number | Date | null;
```

##### 2. ProgressTable.ts（1箇所）
```typescript
// 現在
const cutData = (cut as any).getData ? (cut as any).getData() : cut;

// 改善後
const cutData = 'getData' in cut && typeof cut.getData === 'function' 
  ? cut.getData() 
  : cut as CutData;
```

##### 3. FilterManager.ts（2箇所）
```typescript
// 現在
applyFilter(data: any[]): any[]

// 改善後
applyFilter<T>(data: T[]): T[]
```

##### 4. UnifiedDataStore.ts（5箇所）
```typescript
// 現在
findAll(filter?: any): unknown[]

// 改善後
findAll(filter?: Partial<CutData>): CutData[]
```

##### 5. KintoneJsonMapper.ts（5箇所）
```typescript
// 現在
static mapFromKintone(record: any): CutData

// 改善後
interface KintoneRecord {
  [key: string]: { value: string | number | null };
}
static mapFromKintone(record: KintoneRecord): CutData
```

### Phase C: 型定義の集約（30分）

#### 1. インフラ層の型集約
対象ファイル:
- IRepository.ts
- IMemoRepository.ts
- CutReadModel.ts
- MemoReadModel.ts
- UnifiedDataStore.ts
- Logger.ts
- PerformanceMonitor.ts

作成する型ファイル: `/src/types/infrastructure.ts`

#### 2. アプリケーション層の型集約
対象ファイル:
- ApplicationService.ts
- ServiceContainer.ts
- notifications.ts
- DebouncedSyncManager.ts
- UnifiedStateManager.ts

作成する型ファイル: `/src/types/application.ts`

#### 3. UI層の型集約
対象ファイル:
- StaffRoleConfig.ts
- TableConstants.ts
- FilterTypes.ts

作成する型ファイル: `/src/types/ui.ts`

### Phase D: インポートパスの更新（15分）
- 集約した型を使用している全ファイルのインポート文を更新
- VSCodeの「すべての参照を検索」機能を活用

## 実装順序と時間配分

### 今回のリクエストで実施（1時間30分）
1. **Phase A**: ディレクトリ作成と既存types.ts移動（15分）
2. **Phase B**: any型削減 第1弾（45分）
   - 優先度高の5ファイル（約10箇所のany削減）
3. **Phase C**: 基本的な型集約（30分）
   - infrastructure.tsの作成
   - application.tsの作成

### 次回のリクエストで実施
1. **Phase E**: any型削減 第2弾（残り約70箇所）
2. **Phase F**: 重複型の統合
3. **Phase G**: 型ガードの実装

## 成功指標

### 短期目標（今回）
- [ ] `/src/types/`ディレクトリ構造の確立
- [ ] any型使用数: 81箇所 → 70箇所以下（約15%削減）
- [ ] 基本的な型定義の集約完了

### 長期目標（Phase 3 Step 2完了時）
- [ ] any型使用数: 81箇所 → 40箇所以下（50%削減）
- [ ] 型定義ファイル: 分散 → 6ファイルに集約
- [ ] TypeScript strictモードへの移行準備完了

## リスク管理

### リスク
1. **型変更による実行時エラー**: 段階的に変更し、各段階でテスト実施
2. **ビルド時間の増加**: 型の複雑化により若干増加する可能性
3. **既存コードへの影響**: インポートパスの変更ミス

### 対策
1. 影響範囲の小さい箇所から着手
2. 各フェーズごとにビルド確認
3. VSCodeの自動リファクタリング機能を活用

## 期待される効果

### 開発効率の向上
- 型補完による開発速度向上
- 型エラーの早期発見
- リファクタリングの安全性向上

### 保守性の向上
- 型定義の一元管理
- ドキュメント性の向上
- 新規開発者の理解促進

### バグの削減
- 型不整合によるバグの防止
- null/undefined関連のエラー削減
- APIレスポンスの型安全性確保

## チェックリスト

### 実装前
- [ ] 現在のビルドが成功することを確認
- [ ] test-api-mock.htmlが正常動作することを確認

### Phase A完了時
- [ ] `/src/types/`ディレクトリが作成されている
- [ ] domain.tsが正しく移動されている
- [ ] ビルドエラーがない

### Phase B完了時
- [ ] 対象5ファイルのany型が削減されている
- [ ] TypeScriptコンパイルエラーがない
- [ ] 実行時エラーがない

### Phase C完了時
- [ ] infrastructure.tsが作成されている
- [ ] application.tsが作成されている
- [ ] インポートパスが更新されている

### 実装後
- [ ] test-api-mock.htmlで全機能が正常動作
- [ ] ビルドサイズが大幅に増加していない（±5%以内）