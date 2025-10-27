# Phase 3: ファイル構造再編成 - 詳細実装計画

## 概要
複雑な6層構造を3層のシンプルな構造に再編成。130ファイルを約90ファイルに削減。各タスクを独立してテスト可能な最小単位（約30分-1時間）に分解。

## 現状のファイル構造（問題）
```
src/
  application/     # 20+ ファイル
    commands/      # 10+ ファイル
    queries/       # 10+ ファイル
    services/      # 5+ ファイル
    state/         # 5+ ファイル
  domain/          # 15+ ファイル
    aggregates/    
    entities/
    events/
    value-objects/
  infrastructure/  # 20+ ファイル
    api/
  ui/              # 50+ ファイル
    （10+ サブディレクトリ）
```

## 目標のファイル構造（簡素化後）
```
src/
  components/      # UIコンポーネント（30ファイル）
  services/        # ビジネスロジック（20ファイル）
  data/            # データアクセス（10ファイル）
  utils/           # ユーティリティ（15ファイル）
  types/           # 型定義（15ファイル）
```

## タスク分解（独立してテスト可能な最小単位）

### ステップ 1: 新構造の基盤作成（Week 1 - Day 1）

#### 1.1 新ディレクトリ構造の作成（30分）
**作業内容**:
```bash
src/
  components/      # UI関連
    tables/        # テーブルコンポーネント
    popups/        # ポップアップ
    forms/         # フォーム
  services/        # ビジネスロジック
    core/          # 基本サービス
    features/      # 機能別サービス
  data/            # データ層
    repositories/  # リポジトリ
    models/        # データモデル
  utils/           # ユーティリティ
  types/           # TypeScript型定義
```
**テスト**: `test-new-structure.html`
- ディレクトリ存在確認
- インポートパス解決
- ビルド成功確認

#### 1.2 移行マッピング表の作成（30分）
**ファイル**: `docs/file-migration-map.md`
```markdown
| 旧パス | 新パス | 優先度 |
|--------|--------|---------|
| application/commands/* | services/core/ | 高 |
| domain/entities/* | data/models/ | 高 |
| ui/components/* | components/ | 中 |
```
**テスト**: `test-migration-map.html`
- マッピングの完全性
- 重複チェック
- 依存関係確認

#### 1.3 インポートエイリアスの設定（30分）
**ファイル**: `tsconfig.json`の paths設定
```json
{
  "compilerOptions": {
    "paths": {
      "@/components/*": ["src/components/*"],
      "@/services/*": ["src/services/*"],
      "@/data/*": ["src/data/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}
```
**テスト**: `test-import-alias.html`
- エイリアス解決
- TypeScript認識
- ビルド確認

### ステップ 2: コンポーネント層の移行（Week 1 - Day 2）

#### 2.1 テーブルコンポーネントの移行（45分）
**移行対象**:
- `ui/ProgressTable.ts` → `components/tables/ProgressTable.ts`
- `ui/base/BaseProgressTable.ts` → `components/tables/BaseTable.ts`
- 関連ファイル群
**作業**:
```typescript
// 新ファイル: components/tables/index.ts
export { ProgressTable } from './ProgressTable';
export { BaseTable } from './BaseTable';
// インポートパスの統一
```
**テスト**: `test-table-migration.html`
- テーブル表示確認
- イベント動作
- スタイル適用

#### 2.2 ポップアップコンポーネントの移行（45分）
**移行対象**:
- `ui/components/BasePopup.ts` → `components/popups/BasePopup.ts`
- `ui/CalendarPopup.ts` → `components/popups/CalendarPopup.ts`
- その他ポップアップ
**作業**:
```typescript
// 統一インターフェース
interface IPopup {
  show(): void;
  hide(): void;
  destroy(): void;
}
```
**テスト**: `test-popup-migration.html`
- ポップアップ表示
- 閉じる動作
- 複数ポップアップ管理

#### 2.3 フォームコンポーネントの移行（30分）
**移行対象**:
- `ui/cell-editor/*` → `components/forms/editors/`
- バリデーション関連
**作業**:
```typescript
// components/forms/index.ts
export * from './editors';
export * from './validators';
```
**テスト**: `test-form-migration.html`
- 入力フィールド動作
- バリデーション
- サブミット処理

### ステップ 3: サービス層の統合（Week 1 - Day 3）

#### 3.1 コアサービスの移行（45分）
**移行対象**:
- `application/ApplicationFacade.ts` → `services/core/AppCore.ts`
- `application/ServiceContainer.ts` → `services/core/ServiceRegistry.ts`
**作業**:
```typescript
// シンプル化
class AppCore {
  private services: Map<string, any>;
  
  register(name: string, service: any): void;
  get<T>(name: string): T;
}
```
**テスト**: `test-core-services.html`
- サービス登録
- 依存性注入
- 初期化フロー

#### 3.2 機能別サービスの整理（45分）
**移行対象**:
- Command/QueryHandlers → 機能別サービス
**新構造**:
```typescript
services/
  features/
    cut/
      CutService.ts        // CRUD統合
      CutValidator.ts      
    progress/
      ProgressService.ts
    export/
      PDFExportService.ts
```
**テスト**: `test-feature-services.html`
- 各機能の動作
- サービス間連携
- エラーハンドリング

#### 3.3 イベント管理の簡素化（30分）
**移行対象**:
- `application/EventDispatcher.ts` → `services/core/EventBus.ts`
- 複雑なイベント階層をフラット化
**作業**:
```typescript
class EventBus {
  emit(event: string, data: any): void;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}
```
**テスト**: `test-event-bus.html`
- イベント発行
- リスナー登録
- メモリリーク確認

### ステップ 4: データ層の再構築（Week 1 - Day 4）

#### 4.1 リポジトリパターンの簡素化（45分）
**移行対象**:
- `infrastructure/EventSourcedCutRepository.ts` → `data/repositories/CutRepository.ts`
- Event Sourcing削除
**作業**:
```typescript
class CutRepository {
  async findById(id: string): Promise<Cut>;
  async findAll(filter?: Filter): Promise<Cut[]>;
  async save(cut: Cut): Promise<void>;
  async delete(id: string): Promise<void>;
}
```
**テスト**: `test-repository.html`
- CRUD操作
- フィルタリング
- トランザクション

#### 4.2 モデル定義の統一（30分）
**移行対象**:
- `domain/entities/*` → `data/models/`
- `domain/value-objects/*` → `data/models/`
**作業**:
```typescript
// data/models/Cut.ts
export interface Cut {
  id: string;
  cutNumber: string;
  // フラットな構造
}
```
**テスト**: `test-models.html`
- モデル生成
- バリデーション
- シリアライズ

#### 4.3 ストレージ層の簡素化（30分）
**移行対象**:
- 複数のEventStore → 単一のDataStore
**作業**:
```typescript
class DataStore {
  private storage: Storage;
  
  async get(key: string): Promise<any>;
  async set(key: string, value: any): Promise<void>;
  async remove(key: string): Promise<void>;
}
```
**テスト**: `test-datastore.html`
- 保存・読込
- localStorage確認
- データ永続性

### ステップ 5: ユーティリティの整理（Week 2 - Day 1）

#### 5.1 共通ユーティリティの統合（30分）
**移行対象**:
- 散在するユーティリティ関数
**新構造**:
```typescript
utils/
  date.ts          // 日付関連
  format.ts        // フォーマット
  validation.ts    // 汎用バリデーション
  dom.ts          // DOM操作
```
**テスト**: `test-utils.html`
- 各ユーティリティ関数
- エッジケース
- パフォーマンス

#### 5.2 定数の集約（30分）
**移行対象**:
- `constants/*` → `utils/constants.ts`
**作業**:
```typescript
// utils/constants.ts
export const APP_CONSTANTS = {
  MAX_CUTS: 1000,
  DEFAULT_PAGE_SIZE: 50,
  // 全定数を集約
};
```
**テスト**: `test-constants.html`
- 定数アクセス
- 不変性確認
- 使用箇所確認

#### 5.3 ヘルパー関数の整理（30分）
**作業**:
```typescript
// utils/helpers.ts
export const helpers = {
  generateId(): string,
  deepClone<T>(obj: T): T,
  debounce(fn: Function, delay: number): Function
};
```
**テスト**: `test-helpers.html`
- ヘルパー動作
- 型安全性
- エラー処理

### ステップ 6: 型定義の最適化（Week 2 - Day 2）

#### 6.1 型定義の集約（30分）
**移行対象**:
- 散在する型定義 → `types/`
**新構造**:
```typescript
types/
  models.ts      // データモデル型
  services.ts    // サービス層型
  components.ts  // UI型
  common.ts      // 共通型
```
**テスト**: `test-types.html`
- 型チェック
- インポート確認
- コンパイル成功

#### 6.2 インターフェースの簡素化（30分）
**作業**:
- 過度に分割されたインターフェースを統合
- ジェネリクスの適切な使用
```typescript
// types/common.ts
export interface Entity<T = any> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  data: T;
}
```
**テスト**: `test-interfaces.html`
- 型の互換性
- 継承関係
- 使用箇所確認

#### 6.3 型ガードの実装（30分）
**作業**:
```typescript
// types/guards.ts
export function isCut(obj: any): obj is Cut {
  return obj && typeof obj.cutNumber === 'string';
}
```
**テスト**: `test-type-guards.html`
- 型判定
- ランタイムチェック
- エラー防止

### ステップ 7: 依存関係の整理（Week 2 - Day 3）

#### 7.1 循環依存の解消（45分）
**作業**:
- 依存関係グラフの作成
- 循環参照の特定と解消
```typescript
// 依存性注入で解決
interface IDependencies {
  getService<T>(name: string): T;
}
```
**テスト**: `test-dependencies.html`
- ビルド成功
- 循環参照なし
- 依存関係明確化

#### 7.2 バレルエクスポートの最適化（30分）
**作業**:
```typescript
// 各ディレクトリのindex.ts
// 明示的なエクスポート
export { ProgressTable } from './ProgressTable';
// 不要な再エクスポート削除
```
**テスト**: `test-exports.html`
- インポート最適化
- ツリーシェイキング
- バンドルサイズ

#### 7.3 動的インポートの活用（30分）
**作業**:
```typescript
// 遅延読み込み
async function loadPDFExporter() {
  const { PDFExporter } = await import('./exporters/PDFExporter');
  return new PDFExporter();
}
```
**テスト**: `test-dynamic-import.html`
- 遅延読み込み
- パフォーマンス
- エラー処理

### ステップ 8: 移行とクリーンアップ（Week 2 - Day 4）

#### 8.1 旧ファイルのアーカイブ（30分）
**作業**:
```bash
# 旧構造をarchive/に移動
archive/
  old-structure/
    application/
    domain/
    infrastructure/
```
**テスト**: `test-archive.html`
- 参照確認
- ビルド影響なし
- バックアップ確認

#### 8.2 インポートパスの一括更新（45分）
**スクリプト**: `scripts/update-imports.js`
```javascript
// 全ファイルのインポートパスを新構造に更新
function updateImports(file) {
  // 正規表現でインポート文を置換
}
```
**テスト**: `test-import-update.html`
- 全インポート解決
- TypeScriptエラーなし
- 実行時エラーなし

#### 8.3 統合テストと最終確認（45分）
**ファイル**: `test-phase3-integration.html`
- 全機能動作確認
- パフォーマンス測定
- メモリ使用量
- ビルドサイズ

## 成功基準

### 各ステップの完了条件
- [ ] ファイル移行完了
- [ ] インポートエラーなし
- [ ] 既存機能維持

### Phase 3全体の成功基準
- [ ] ファイル数: 130→90（30%削減）
- [ ] ディレクトリ階層: 最大3階層
- [ ] 平均ファイルサイズ: 200行以下
- [ ] 循環依存: 0
- [ ] ビルド時間: 30%短縮
- [ ] バンドルサイズ: 20%削減

## リスク管理

### 移行戦略
1. **段階的移行**: 機能単位で順次移行
2. **並行運用**: 新旧構造の共存期間
3. **自動テスト**: 各段階でregression test

## スケジュール

| ステップ | 作業時間 | 期間 | 依存関係 |
|---------|---------|------|---------|
| 1.1-1.3 | 1.5時間 | Day 1 | Phase 2完了 |
| 2.1-2.3 | 2時間 | Day 2 | ステップ1完了 |
| 3.1-3.3 | 2時間 | Day 3 | ステップ2完了 |
| 4.1-4.3 | 1.5時間 | Day 4 | ステップ3完了 |
| 5.1-5.3 | 1.5時間 | Week 2 Day 1 | ステップ4完了 |
| 6.1-6.3 | 1.5時間 | Day 2 | ステップ5完了 |
| 7.1-7.3 | 1.5時間 | Day 3 | ステップ6完了 |
| 8.1-8.3 | 2時間 | Day 4 | ステップ7完了 |

**合計**: 約13.5時間（2週間で分散実施）

## 移行チェックリスト

### 移行前の準備
- [ ] 完全バックアップ
- [ ] 依存関係マップ作成
- [ ] テストスイート準備

### 移行中の確認
- [ ] 各ステップでビルド確認
- [ ] 機能テスト実施
- [ ] パフォーマンス計測

### 移行後の検証
- [ ] 全機能動作確認
- [ ] コードレビュー
- [ ] ドキュメント更新

---

**注意**: 各タスクは30分-1時間で完了可能。独立してテスト可能で、既存機能を維持しながら段階的に新構造へ移行。