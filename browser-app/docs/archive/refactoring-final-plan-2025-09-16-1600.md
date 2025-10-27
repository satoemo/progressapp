# リファクタリング最終計画書
作成日: 2025年9月16日 16:00

## 1. リファクタリングの意図と現状

### 最終目標
**6層アーキテクチャから真の3層アーキテクチャへ**
```
目標: UI → Service → DataStore
```

### 現在の状態
```
現状: UI → ApplicationFacade → UnifiedDataStore
        ↓
    旧ディレクトリ構造が混在（domain/, application/, infrastructure/）
```

### これまでの成果
- ✅ ServiceContainer統合（ApplicationFacadeに吸収）
- ✅ CUT操作の直接実装
- ✅ DIContainer、StoreRepositoryAdapter削除
- ⚠️ ディレクトリ構造は旧来のまま

## 2. 新リファクタリング計画

### Phase A: 技術的負債の完全解消（1-2時間）
**目的**: 残っている型定義と不要インポートを整理

#### A.1 型定義の統一（30分）
- CutData型の一元化（@/types/cut.tsに統一）
- IRepository型の整理
- 重複型定義の削除

#### A.2 不要インポートの削除（30分）
```bash
# 全ファイルの不要インポートを検出・削除
find src -name "*.ts" -exec ...
```

### Phase B: ディレクトリ構造の再編成（2-3時間）
**目的**: 論理的で理解しやすい3層構造の実現

#### B.1 新しいディレクトリ構造
```
src/
  ├── core/                 # コア機能（旧application）
  │   ├── ApplicationFacade.ts
  │   ├── EventDispatcher.ts
  │   └── coordinators/     # イベント調整
  │
  ├── services/             # ビジネスロジック
  │   ├── state/            # 状態管理
  │   ├── sync/             # 同期サービス
  │   ├── export/           # エクスポート機能
  │   └── kintone/          # Kintone連携
  │
  ├── data/                 # データ層（旧infrastructure）
  │   ├── UnifiedDataStore.ts
  │   ├── models/           # データモデル
  │   ├── adapters/         # ストレージアダプタ
  │   └── api/              # API連携
  │
  ├── models/               # ドメインモデル（旧domain）
  │   ├── entities/         # エンティティ
  │   ├── events/           # イベント定義
  │   ├── values/           # 値オブジェクト
  │   └── metadata/         # メタデータ
  │
  ├── ui/                   # UI層（現状維持）
  │   └── ...
  │
  ├── utils/                # ユーティリティ（統合）
  │   ├── Logger.ts
  │   ├── PerformanceMonitor.ts
  │   └── helpers/
  │
  └── types/                # 型定義（統一）
      ├── cut.ts
      ├── repository.ts
      └── common.ts
```

#### B.2 移動計画
1. **core/への移動**（30分）
   - application/ApplicationFacade.ts → core/ApplicationFacade.ts
   - application/EventDispatcher.ts → core/EventDispatcher.ts
   - application/UnifiedEventCoordinator.ts → core/coordinators/

2. **services/への移動**（30分）
   - application/services/* → services/
   - application/state/* → services/state/
   - domain/services/* → services/domain/

3. **data/への移動**（30分）
   - infrastructure/UnifiedDataStore.ts → data/UnifiedDataStore.ts
   - infrastructure/adapters/* → data/adapters/
   - infrastructure/api/* → data/api/

4. **models/への移動**（30分）
   - domain/entities/* → models/entities/
   - domain/events/* → models/events/
   - domain/value-objects/* → models/values/

5. **utils/への移動**（30分）
   - infrastructure/Logger.ts → utils/Logger.ts
   - infrastructure/PerformanceMonitor.ts → utils/PerformanceMonitor.ts

### Phase C: インポートパスの更新（1-2時間）
**目的**: 新しいディレクトリ構造に合わせてインポートを修正

#### C.1 自動更新スクリプトの作成と実行
```typescript
// インポートパス自動更新スクリプト
const pathMappings = {
  '@/application/ApplicationFacade': '@/core/ApplicationFacade',
  '@/infrastructure/UnifiedDataStore': '@/data/UnifiedDataStore',
  '@/domain/events/': '@/models/events/',
  // ... 他のマッピング
};
```

#### C.2 tsconfig.jsonのパス更新
```json
{
  "paths": {
    "@/core/*": ["src/core/*"],
    "@/services/*": ["src/services/*"],
    "@/data/*": ["src/data/*"],
    "@/models/*": ["src/models/*"],
    "@/utils/*": ["src/utils/*"]
  }
}
```

### Phase D: サービス層の最適化（2-3時間）
**目的**: ApplicationFacadeの肥大化を適度に解消

#### D.1 CoreService の作成（オプション）
ApplicationFacadeが800行を超える場合のみ：
```typescript
// src/services/CoreService.ts
class CoreService {
  // CUT操作の基本機能
  // メモ管理機能
}
```

#### D.2 責務の整理
- ApplicationFacade: 外部インターフェース、調整役
- CoreService: ビジネスロジックの実行（必要な場合のみ）
- UnifiedDataStore: データ永続化

### Phase E: 最終クリーンアップ（1時間）
**目的**: 不要ファイルの削除と最適化

#### E.1 旧ディレクトリの削除
```bash
rm -rf src/application/
rm -rf src/domain/
rm -rf src/infrastructure/
```

#### E.2 不要ファイルの削除
- 使用されていないインターフェース
- 空のディレクトリ
- レガシーコメント

#### E.3 ドキュメント更新
- README.mdの構造説明を更新
- アーキテクチャ図の更新

## 3. 実装順序とタイムライン

| Phase | 内容 | 予定時間 | 優先度 |
|-------|------|----------|--------|
| A | 技術的負債の解消 | 1-2時間 | 必須 |
| B | ディレクトリ構造の再編成 | 2-3時間 | 必須 |
| C | インポートパスの更新 | 1-2時間 | 必須 |
| D | サービス層の最適化 | 2-3時間 | オプション |
| E | 最終クリーンアップ | 1時間 | 必須 |

**合計所要時間**: 7-11時間（Phase Dを含む場合）

## 4. 成功指標

### 定量的指標
- ディレクトリ数: 20個 → 10個以下
- ファイル移動: 100%完了
- インポートエラー: 0件
- ビルドエラー: 0件
- ApplicationFacade: 800行以下（理想）

### 定性的指標
- 3層構造が明確に可視化される
- 新規開発者が30分でプロジェクト構造を理解できる
- ファイルの配置が直感的

## 5. リスクと対策

### リスク1: 大規模なファイル移動によるビルド破壊
**対策**: 
- 各Phaseごとにビルド確認
- gitでバックアップを取る
- 段階的に移動（一度に全部移動しない）

### リスク2: インポートパスの修正漏れ
**対策**:
- 自動スクリプトを使用
- TypeScriptコンパイラでエラーチェック
- grepで漏れを確認

### リスク3: 既存機能への影響
**対策**:
- ファイル移動のみ（ロジック変更なし）
- test-api-mock.htmlで動作確認

## 6. 実装アプローチ

### 基本原則
1. **段階的実装**: 小さな単位で確実に進める
2. **ビルド優先**: 各ステップでビルド確認
3. **シンプル優先**: 迷ったらシンプルな方を選択

### 実装の流れ
1. Phase A: 型定義とインポートの整理
2. Phase B-C: ディレクトリ移動とパス更新（セットで実施）
3. Phase D: 必要に応じてサービス層を最適化
4. Phase E: クリーンアップ

## 7. 期待される成果

### 最終的なアーキテクチャ
```
UI層
  ↓
Core層（ApplicationFacade）
  ↓
Data層（UnifiedDataStore）
```

### プロジェクト構造
- **明確な3層構造**
- **直感的なディレクトリ配置**
- **保守しやすいコードベース**

---

## 8. Phase A 詳細実装計画

### Phase A: 技術的負債の完全解消（詳細版）
**予定時間**: 1-2時間
**目的**: コードベースのクリーン化と型定義の整理

#### A.1 型定義の統一と整理（30分）

##### A.1.1 現状調査（10分）
```bash
# 型定義ファイルの確認
find src -name "*.ts" -exec grep -l "export (interface|type)" {} \; | sort

# 重複型定義の検出
grep -r "export interface" src --include="*.ts" | cut -d: -f2 | sort | uniq -d
```

##### A.1.2 型定義の整理（15分）
**対象ファイル**:
- `src/types/repository.ts` - IRepository, ICutRepositoryの確認
- `src/types/cut.ts` - CutData型の一元化確認
- `src/domain/types.ts` - 他の型定義との整合性確認

**実装内容**:
```typescript
// src/types/index.ts を作成して一元管理
export * from './cut';
export * from './repository';
export * from './common';

// 各ファイルから型定義をインポート
import type { CutData } from '@/types';
```

##### A.1.3 レガシー型定義の削除（5分）
- CutAggregateData への参照（既に削除済み確認）
- MemoAggregateData への参照（既に削除済み確認）
- 使用されていない型定義の削除

#### A.2 不要インポートとコメントの削除（30分）

##### A.2.1 不要インポートの検出（10分）
```bash
# TypeScriptコンパイラで未使用インポートを検出
npx tsc --noEmit --noUnusedLocals --noUnusedParameters

# ESLintで未使用変数を検出（設定がある場合）
npx eslint src --ext .ts --no-eslintrc --rule 'no-unused-vars: error'
```

##### A.2.2 自動削除スクリプトの実行（15分）
```javascript
// scripts/clean-imports.js
const fs = require('fs');
const path = require('path');

function cleanImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 削除パターン
  const patterns = [
    /import\s+.*from\s+['"].*\/archive.*['"]/g,  // archiveへの参照
    /import\s+.*from\s+['"].*deleted.*['"]/g,     // 削除済みファイル
    /\/\/\s*@ts-ignore.*\n/g,                     // @ts-ignore
    /\/\/\s*@ts-nocheck.*\n/g,                    // @ts-nocheck
    /\/\/\s*eslint-disable.*\n/g,                 // eslint-disable
    /\/\/\s*TODO:.*削除予定.*\n/g,                // 削除予定TODO
  ];
  
  patterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });
  
  fs.writeFileSync(filePath, content);
}

// 全TSファイルに適用
const files = glob.sync('src/**/*.ts');
files.forEach(cleanImports);
```

##### A.2.3 レガシーコメントの削除（5分）
**対象**:
- `// Phase 1で削除予定` のようなコメント
- `// @deprecated` で不要になったメソッド
- `// 後方互換` で不要になった処理

#### A.3 検証とビルド確認（30分）

##### A.3.1 TypeScript型チェック（10分）
```bash
npm run typecheck
# エラーがあれば修正
```

##### A.3.2 ビルド確認（10分）
```bash
npm run build
# ビルド成功を確認
```

##### A.3.3 テスト環境での動作確認（10分）
```bash
npm run build:test
# test-api-mock.htmlで基本動作を確認
```

### Phase A 完了条件
- [ ] 型定義が`src/types/`に一元化されている
- [ ] 不要インポートが0件
- [ ] レガシーコメントが削除されている
- [ ] TypeScriptエラーが0件
- [ ] ビルドが成功する
- [ ] test-api-mock.htmlが正常動作する

### Phase A のリスクと対策
| リスク | 対策 |
|--------|------|
| 必要なインポートを誤って削除 | gitで差分を確認、TypeScriptエラーで検出 |
| 型定義の変更による影響 | 段階的に変更、各ステップでビルド確認 |
| レガシーコードへの依存 | 削除前に使用箇所を確認 |

---

## 9. Phase B 詳細実装計画

### Phase B: ディレクトリ構造の再編成（詳細版）
**予定時間**: 2-3時間
**目的**: 論理的で理解しやすい3層構造の実現

#### B.0 事前準備（15分）

##### B.0.1 バックアップ作成
```bash
# 現在の状態をgitでコミット
git add -A
git commit -m "Before directory restructuring"

# ブランチ作成
git checkout -b refactoring-phase-b
```

##### B.0.2 新ディレクトリ構造の作成
```bash
# 新しいディレクトリを作成
mkdir -p src/{core,services,data,models,utils}/
mkdir -p src/core/coordinators
mkdir -p src/services/{state,sync,export,kintone,domain}
mkdir -p src/data/{models,adapters,api}
mkdir -p src/models/{entities,events,values,metadata}
mkdir -p src/utils/helpers
mkdir -p src/types
```

#### B.1 core/への移動（30分）

##### B.1.1 コアファイルの移動
```bash
# ApplicationFacadeと関連ファイル
mv src/application/ApplicationFacade.ts src/core/
mv src/application/AppInitializer.ts src/core/
mv src/application/EventDispatcher.ts src/core/

# イベント調整
mkdir -p src/core/coordinators
mv src/application/UnifiedEventCoordinator.ts src/core/coordinators/

# インターフェースと型定義
mkdir -p src/core/interfaces
mv src/application/interfaces/IDataAccessFacade.ts src/core/interfaces/

mkdir -p src/core/types
mv src/application/types/notifications.ts src/core/types/
```

##### B.1.2 移動後の構造確認
```
src/core/
  ├── ApplicationFacade.ts (734行)
  ├── AppInitializer.ts
  ├── EventDispatcher.ts
  ├── coordinators/
  │   └── UnifiedEventCoordinator.ts
  ├── interfaces/
  │   └── IDataAccessFacade.ts
  └── types/
      └── notifications.ts
```

#### B.2 services/への移動（30分）

##### B.2.1 アプリケーションサービスの移動
```bash
# 状態管理サービス
mv src/application/state/* src/services/state/

# その他のサービス
mv src/application/services/RealtimeSyncService.ts src/services/sync/
mv src/application/services/StateManagerService.ts src/services/state/
mv src/application/services/ReadModelUpdateService.ts src/services/sync/
mv src/application/services/PDFExportService.ts src/services/export/
mv src/application/services/KintoneUICustomizationService.ts src/services/kintone/

# ドメインサービス
mv src/domain/services/* src/services/domain/
```

##### B.2.2 移動後の構造確認
```
src/services/
  ├── state/
  │   ├── DebouncedSyncManager.ts
  │   ├── UnifiedStateManager.ts
  │   └── StateManagerService.ts
  ├── sync/
  │   ├── RealtimeSyncService.ts
  │   └── ReadModelUpdateService.ts
  ├── export/
  │   └── PDFExportService.ts
  ├── kintone/
  │   └── KintoneUICustomizationService.ts
  └── domain/
      ├── CutStatusCalculator.ts
      └── ProgressFieldService.ts
```

#### B.3 data/への移動（30分）

##### B.3.1 データストアと関連ファイルの移動
```bash
# メインのデータストア
mv src/infrastructure/UnifiedDataStore.ts src/data/

# モデル
mv src/infrastructure/CutReadModel.ts src/data/models/
mv src/infrastructure/MemoReadModel.ts src/data/models/

# API関連
mv src/infrastructure/api/* src/data/api/

# リポジトリインターフェース
mv src/infrastructure/IMemoRepository.ts src/data/
```

##### B.3.2 アダプタの整理
```bash
# LocalStorageAdapterとMemoryStorageAdapterの場所を確認
# UnifiedDataStore.ts内で定義されている場合は、後でPhase Cで分離
```

##### B.3.3 移動後の構造確認
```
src/data/
  ├── UnifiedDataStore.ts (約800行)
  ├── IMemoRepository.ts
  ├── models/
  │   ├── CutReadModel.ts
  │   └── MemoReadModel.ts
  ├── adapters/
  │   └── (Phase Cで分離予定)
  └── api/
      ├── IKintoneApiClient.ts
      ├── KintoneApiClient.ts
      ├── KintoneJsonMapper.ts
      └── MockKintoneApiClient.ts
```

#### B.4 models/への移動（30分）

##### B.4.1 ドメインモデルの移動
```bash
# エンティティ
mv src/domain/entities/* src/models/entities/

# イベント
mv src/domain/events/* src/models/events/

# 値オブジェクト
mv src/domain/value-objects/* src/models/values/

# メタデータ
mv src/domain/field-metadata/* src/models/metadata/

# 型定義
mv src/domain/types.ts src/models/
```

##### B.4.2 移動後の構造確認
```
src/models/
  ├── types.ts
  ├── entities/
  │   └── CellMemoCollection.ts
  ├── events/
  │   ├── DomainEvent.ts
  │   ├── CutEvents.ts
  │   ├── CellMemoEvents.ts
  │   └── SimulationEvents.ts
  ├── values/
  │   ├── Money.ts
  │   ├── CutNumber.ts
  │   ├── CellMemo.ts
  │   └── ProgressStatus.ts
  └── metadata/
      └── FieldMetadataRegistry.ts
```

#### B.5 utils/への移動（15分）

##### B.5.1 ユーティリティファイルの移動
```bash
# インフラストラクチャユーティリティ
mv src/infrastructure/Logger.ts src/utils/
mv src/infrastructure/PerformanceMonitor.ts src/utils/

# 既存のutilsファイルを確認
# src/utils/Environment.ts は既に存在
```

##### B.5.2 移動後の構造確認
```
src/utils/
  ├── Logger.ts
  ├── PerformanceMonitor.ts
  ├── Environment.ts (既存)
  └── helpers/ (必要に応じて追加)
```

#### B.6 旧ディレクトリの確認と削除（15分）

##### B.6.1 移動漏れの確認
```bash
# 残っているファイルを確認
find src/application src/domain src/infrastructure -type f -name "*.ts" 2>/dev/null

# 空ディレクトリを確認
find src/application src/domain src/infrastructure -type d -empty 2>/dev/null
```

##### B.6.2 旧ディレクトリの削除
```bash
# 全ファイルが移動済みであることを確認後
rm -rf src/application
rm -rf src/domain  
rm -rf src/infrastructure
```

#### B.7 検証（15分）

##### B.7.1 ファイル数の確認
```bash
# 移動前後のファイル数を比較
find src -name "*.ts" | wc -l
```

##### B.7.2 構造の確認
```bash
# 新しい構造をツリー表示
tree src -d -L 2
```

### Phase B 完了条件
- [ ] 全ファイルが新しいディレクトリ構造に移動されている
- [ ] 旧ディレクトリ（application/, domain/, infrastructure/）が削除されている
- [ ] ファイルの総数が変わっていない
- [ ] 論理的な3層構造が実現されている
- [ ] gitで変更が追跡されている

### Phase B のリスクと対策
| リスク | 対策 |
|--------|------|
| ファイルの移動漏れ | 移動前後でファイル数を確認、findコマンドで検証 |
| git履歴の喪失 | git mvコマンドを使用、または移動後に明示的にコミット |
| 大量のインポートエラー | Phase Cで一括修正、TypeScriptコンパイラで検証 |
| ビルド設定の不整合 | vite.config.tsとtsconfig.jsonの更新（Phase Cで対応） |

### Phase B 実装メモ
- **重要**: この段階ではインポートパスは修正しない（Phase Cで一括対応）
- **注意**: ビルドは一時的に失敗する状態になる
- **推奨**: 各ステップごとにgit commitで進捗を保存

---

## 10. Phase C 詳細実装計画

### Phase C: インポートパスの更新（詳細版）
**予定時間**: 1-2時間
**目的**: 新しいディレクトリ構造に合わせて全インポートパスを修正

#### C.0 事前準備とマッピング作成（15分）

##### C.0.1 インポートパスのマッピング定義
```javascript
// scripts/path-mappings.js
const pathMappings = {
  // コア層
  '@/application/ApplicationFacade': '@/core/ApplicationFacade',
  '@/application/AppInitializer': '@/core/AppInitializer',
  '@/application/EventDispatcher': '@/core/EventDispatcher',
  '@/application/UnifiedEventCoordinator': '@/core/coordinators/UnifiedEventCoordinator',
  '@/application/interfaces/IDataAccessFacade': '@/core/interfaces/IDataAccessFacade',
  '@/application/types/notifications': '@/core/types/notifications',
  
  // サービス層
  '@/application/state/DebouncedSyncManager': '@/services/state/DebouncedSyncManager',
  '@/application/state/UnifiedStateManager': '@/services/state/UnifiedStateManager',
  '@/application/services/StateManagerService': '@/services/state/StateManagerService',
  '@/application/services/RealtimeSyncService': '@/services/sync/RealtimeSyncService',
  '@/application/services/ReadModelUpdateService': '@/services/sync/ReadModelUpdateService',
  '@/application/services/PDFExportService': '@/services/export/PDFExportService',
  '@/application/services/KintoneUICustomizationService': '@/services/kintone/KintoneUICustomizationService',
  '@/domain/services/CutStatusCalculator': '@/services/domain/CutStatusCalculator',
  '@/domain/services/ProgressFieldService': '@/services/domain/ProgressFieldService',
  
  // データ層
  '@/infrastructure/UnifiedDataStore': '@/data/UnifiedDataStore',
  '@/infrastructure/CutReadModel': '@/data/models/CutReadModel',
  '@/infrastructure/MemoReadModel': '@/data/models/MemoReadModel',
  '@/infrastructure/IMemoRepository': '@/data/IMemoRepository',
  '@/infrastructure/api/': '@/data/api/',
  '@/infrastructure/Logger': '@/utils/Logger',
  '@/infrastructure/PerformanceMonitor': '@/utils/PerformanceMonitor',
  
  // モデル層
  '@/domain/types': '@/models/types',
  '@/domain/entities/': '@/models/entities/',
  '@/domain/events/': '@/models/events/',
  '@/domain/value-objects/': '@/models/values/',
  '@/domain/field-metadata/': '@/models/metadata/',
  
  // 相対パスの修正も必要
  '../application/': '../core/',
  '../infrastructure/': '../data/',
  '../domain/': '../models/',
  '../../application/': '../../core/',
  '../../infrastructure/': '../../data/',
  '../../domain/': '../../models/',
};
```

##### C.0.2 影響範囲の調査
```bash
# インポート文の総数を確認
grep -r "from ['\"]" src --include="*.ts" | wc -l

# 変更が必要なインポートを確認
grep -r "from ['\"].*\(application\|infrastructure\|domain\)" src --include="*.ts" | wc -l

# ファイル別の影響度を確認
for dir in application infrastructure domain; do
  echo "=== Files importing from $dir ==="
  grep -l "from ['\"].*$dir" src/**/*.ts | wc -l
done
```

#### C.1 tsconfig.jsonの更新（10分）

##### C.1.1 パスマッピングの更新
```json
// config/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@/core/*": ["src/core/*"],
      "@/services/*": ["src/services/*"],
      "@/data/*": ["src/data/*"],
      "@/models/*": ["src/models/*"],
      "@/utils/*": ["src/utils/*"],
      "@/ui/*": ["src/ui/*"],
      "@/types/*": ["src/types/*"],
      "@/config/*": ["src/config/*"]
    }
  }
}
```

##### C.1.2 vite設定の更新（必要な場合）
```javascript
// config/vite.config.browser.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, '../src'),
    '@/core': path.resolve(__dirname, '../src/core'),
    '@/services': path.resolve(__dirname, '../src/services'),
    '@/data': path.resolve(__dirname, '../src/data'),
    '@/models': path.resolve(__dirname, '../src/models'),
    '@/utils': path.resolve(__dirname, '../src/utils'),
  }
}
```

#### C.2 自動置換スクリプトの実行（30分）

##### C.2.1 置換スクリプトの作成
```javascript
// scripts/update-imports.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

function updateImports(filePath, mappings) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // ソート済みマッピング（長いパスから先に置換）
  const sortedMappings = Object.entries(mappings)
    .sort(([a], [b]) => b.length - a.length);
  
  sortedMappings.forEach(([oldPath, newPath]) => {
    // import文の置換
    const importRegex = new RegExp(
      `(from\\s+['"])${escapeRegex(oldPath)}(['"/])`,
      'g'
    );
    
    if (importRegex.test(content)) {
      content = content.replace(importRegex, `$1${newPath}$2`);
      modified = true;
      console.log(`  Updated: ${oldPath} → ${newPath}`);
    }
    
    // require文の置換（必要な場合）
    const requireRegex = new RegExp(
      `(require\\(['"])${escapeRegex(oldPath)}(['"]\\))`,
      'g'
    );
    
    if (requireRegex.test(content)) {
      content = content.replace(requireRegex, `$1${newPath}$2`);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 実行
const files = glob.sync('src/**/*.{ts,tsx,js,jsx}');
let updatedCount = 0;

files.forEach(file => {
  console.log(`Processing: ${file}`);
  if (updateImports(file, pathMappings)) {
    updatedCount++;
  }
});

console.log(`\n✅ Updated ${updatedCount} files`);
```

##### C.2.2 スクリプトの実行
```bash
# スクリプトの実行
node scripts/update-imports.js

# 結果の確認
git diff --stat
```

#### C.3 特殊ケースの手動修正（20分）

##### C.3.1 動的インポートの修正
```typescript
// Before
const module = await import('@/application/ApplicationFacade');

// After  
const module = await import('@/core/ApplicationFacade');
```

##### C.3.2 UnifiedDataStore内のアダプタ分離
```bash
# UnifiedDataStore.ts内のLocalStorageAdapterとMemoryStorageAdapterを分離
# 新規ファイル作成
touch src/data/adapters/LocalStorageAdapter.ts
touch src/data/adapters/MemoryStorageAdapter.ts

# エクスポートの追加
echo "export { LocalStorageAdapter } from './adapters/LocalStorageAdapter';" >> src/data/index.ts
echo "export { MemoryStorageAdapter } from './adapters/MemoryStorageAdapter';" >> src/data/index.ts
```

##### C.3.3 test-api-mock.htmlの更新
```html
<!-- Before -->
<script type="module">
  import { ApplicationFacade } from './src/application/ApplicationFacade.js';
</script>

<!-- After -->
<script type="module">
  import { ApplicationFacade } from './src/core/ApplicationFacade.js';
</script>
```

#### C.4 型チェックとエラー修正（20分）

##### C.4.1 TypeScriptコンパイルエラーの確認
```bash
# 型チェック実行
npx tsc -p config/tsconfig.json --noEmit

# エラーをファイルに出力
npx tsc -p config/tsconfig.json --noEmit 2> import-errors.log

# エラーの分類
grep "Cannot find module" import-errors.log | sort | uniq
grep "Module .* has no exported member" import-errors.log | sort | uniq
```

##### C.4.2 エラーパターンの一括修正
```javascript
// scripts/fix-remaining-imports.js
const remainingMappings = {
  // TypeScriptエラーから判明した追加マッピング
  './ApplicationFacade': './core/ApplicationFacade',
  '../UnifiedDataStore': '../data/UnifiedDataStore',
  // その他のパターン
};

// 再実行
updateImports(files, remainingMappings);
```

#### C.5 ビルド確認とテスト（15分）

##### C.5.1 開発ビルドの確認
```bash
# TypeScript型チェック
npm run typecheck

# 開発ビルド
npm run build:dev

# 本番ビルド
npm run build
```

##### C.5.2 テスト環境での動作確認
```bash
# テスト用ビルド
npm run build:test

# test-api-mock.htmlを開いて動作確認
# - データの表示
# - CRUD操作
# - タブ切り替え
```

##### C.5.3 インポートサイクルの確認
```bash
# 循環依存の検出
npx madge --circular src

# 結果を視覚化（オプション）
npx madge --circular --image circular-deps.svg src
```

### Phase C 完了条件
- [ ] 全インポートパスが新構造に対応している
- [ ] tsconfig.jsonのパスマッピングが更新されている
- [ ] TypeScriptエラーが0件
- [ ] ビルドが成功する
- [ ] test-api-mock.htmlが正常動作する
- [ ] 循環依存が存在しない（または既知のもののみ）

### Phase C のリスクと対策
| リスク | 対策 |
|--------|------|
| 置換ミスによるパス誤り | TypeScriptコンパイラで検出、段階的に修正 |
| 動的インポートの見落とし | grepで"import("パターンを検索 |
| 相対パスの修正漏れ | "../"や"./"を含むインポートを個別確認 |
| ビルド設定の不整合 | vite.config.tsとtsconfig.jsonを同時更新 |
| パフォーマンス劣化 | ビルド時間を計測、バンドルサイズを確認 |

### Phase C 実装メモ
- **順序重要**: 長いパスから短いパスの順に置換（部分一致を防ぐ）
- **バックアップ**: git commitで各ステップを記録
- **検証方法**: TypeScriptコンパイラが最も信頼できる検証ツール
- **最適化**: 必要に応じてbarrel export（index.ts）を追加

---

## 11. Phase D 詳細実装計画

### Phase D: サービス層の最適化（詳細版）【オプション】
**予定時間**: 2-3時間
**目的**: ApplicationFacadeの肥大化を適度に解消し、保守性を向上
**実施判断基準**: ApplicationFacadeが800行を超える、または責務が不明確になっている場合

#### D.0 現状分析と実施判断（15分）

##### D.0.1 ApplicationFacadeの現状分析
```bash
# 行数の確認
wc -l src/core/ApplicationFacade.ts

# メソッド数の確認
grep -E "^\s*(public|private|protected)\s+\w+\s*\(" src/core/ApplicationFacade.ts | wc -l

# 責務の分類
grep -E "^\s*(public|private|protected)\s+\w+\s*\(" src/core/ApplicationFacade.ts | \
  awk '{print $2}' | \
  sed 's/(.*//' | \
  sort | \
  awk '{
    if ($0 ~ /^(create|update|delete|get|find)/) print "CRUD操作: " $0
    else if ($0 ~ /^(register|get)Service/) print "サービス管理: " $0
    else if ($0 ~ /^sync/) print "同期処理: " $0
    else if ($0 ~ /Memo/) print "メモ管理: " $0
    else print "その他: " $0
  }'
```

##### D.0.2 実施判断チェックリスト
```
□ ApplicationFacadeが800行を超えている
□ 1つのメソッドが30行を超えている箇所が5つ以上ある
□ 同じパターンのコードが3箇所以上で重複している
□ 新機能追加時に既存メソッドの変更が必要になることが多い
□ メソッド名から機能が推測しづらい箇所がある

→ 2つ以上該当する場合はPhase Dを実施
```

#### D.1 CoreServiceの設計と実装（45分）

##### D.1.1 CoreServiceの責務定義
```typescript
// src/services/core/CoreService.ts

/**
 * コアビジネスロジックサービス
 * ApplicationFacadeから基本的なCRUD操作を移管
 */
export class CoreService {
  constructor(
    private unifiedStore: UnifiedDataStore,
    private eventDispatcher: EventDispatcher
  ) {}

  // ========== CUT操作 ==========
  async createCut(data: Partial<CutData>): Promise<CutData>
  async updateCut(id: string, data: Partial<CutData>): Promise<void>
  async deleteCut(cutId: string): Promise<void>
  async getCutById(id: string): Promise<CutData | null>
  getCut(id: string): CutData | null
  getAllCuts(options?: FilterOptions): CutData[]
  
  // ========== メモ管理 ==========
  async getCellMemo(cutNumber: string, fieldKey: string): Promise<string | undefined>
  async updateCellMemo(cutNumber: string, fieldKey: string, content: string): Promise<void>
  
  // ========== 内部ヘルパー ==========
  private buildDefaultCutData(data: Partial<CutData>): Partial<CutData>
  private validateCutData(data: Partial<CutData>): void
  private emitCutEvent(type: string, data: any): void
}
```

##### D.1.2 メソッドの移動
```javascript
// scripts/extract-core-service.js
const fs = require('fs');

// ApplicationFacadeから抽出するメソッド
const methodsToExtract = [
  'createCut',
  'updateCut', 
  'deleteCut',
  'getCutById',
  'getCut',
  'getAllCuts',
  'getCellMemo',
  'updateCellMemo',
  'buildDefaultCutData'
];

// 抽出処理
function extractMethods(sourceFile, targetFile, methods) {
  const source = fs.readFileSync(sourceFile, 'utf8');
  // メソッドの抽出ロジック
  // ...
}
```

##### D.1.3 ApplicationFacadeの更新
```typescript
// src/core/ApplicationFacade.ts

export class ApplicationFacade {
  private coreService: CoreService;
  
  constructor(config: ApplicationFacadeConfig = {}) {
    // ... 既存の初期化
    
    // CoreServiceの初期化
    this.coreService = new CoreService(
      this.unifiedStore,
      this.eventDispatcher
    );
  }
  
  // 委譲メソッド（公開インターフェースは維持）
  public async createCut(data: Partial<CutData>): Promise<CutData> {
    return this.coreService.createCut(data);
  }
  
  public async updateCut(id: string, data: Partial<CutData>): Promise<void> {
    return this.coreService.updateCut(id, data);
  }
  
  // ... 他の委譲メソッド
}
```

#### D.2 メソッドの分割と最適化（45分）

##### D.2.1 長いメソッドの分割
```typescript
// Before: 40行を超えるメソッド
public async complexMethod(params: ComplexParams): Promise<Result> {
  // 前処理（10行）
  // メイン処理（20行）
  // 後処理（10行）
}

// After: 20行前後に分割
public async complexMethod(params: ComplexParams): Promise<Result> {
  const prepared = await this.prepareComplexOperation(params);
  const result = await this.executeComplexOperation(prepared);
  return this.finalizeComplexOperation(result);
}

private async prepareComplexOperation(params: ComplexParams): Promise<PreparedData> {
  // 前処理（10行）
}

private async executeComplexOperation(data: PreparedData): Promise<IntermediateResult> {
  // メイン処理（20行）
}

private finalizeComplexOperation(result: IntermediateResult): Result {
  // 後処理（10行）
}
```

##### D.2.2 重複コードの抽出
```typescript
// 重複パターンの特定
const duplicatePatterns = [
  {
    pattern: 'ErrorHandler.wrap',
    count: 5,
    action: 'ヘルパーメソッド化'
  },
  {
    pattern: 'this.unifiedStore.save + this.eventDispatcher.dispatch',
    count: 3,
    action: 'saveAndEmitメソッド作成'
  }
];

// ヘルパーメソッドの作成
private async saveAndEmit(id: string, data: any, eventType: string): Promise<void> {
  await this.unifiedStore.save(id, data);
  const event = new DomainEvent(eventType, data);
  this.eventDispatcher.dispatch(event);
}
```

#### D.3 定数と設定の外部化（30分）

##### D.3.1 定数ファイルの作成
```typescript
// src/core/constants.ts

export const CORE_CONSTANTS = {
  // ID生成
  ID_PREFIX: {
    CUT: 'cut_',
    MEMO: 'memo_',
    SESSION: 'session_'
  },
  
  // デフォルト値
  DEFAULT_VALUES: {
    STATUS: '',
    SPECIAL: '',
    KENYO: '',
    MAISU: ''
  },
  
  // 制限値
  LIMITS: {
    MAX_CUTS: 10000,
    MAX_MEMO_LENGTH: 5000,
    CACHE_SIZE: 200
  },
  
  // タイムアウト
  TIMEOUTS: {
    SAVE: 5000,
    LOAD: 3000,
    SYNC: 10000
  }
} as const;
```

##### D.3.2 設定の外部化
```typescript
// src/core/config.ts

export interface CoreConfig {
  useLocalStorage: boolean;
  enableCache: boolean;
  cacheSize: number;
  enableBackup: boolean;
  maxBackups: number;
  enableIntegrityCheck: boolean;
}

export const DEFAULT_CORE_CONFIG: CoreConfig = {
  useLocalStorage: true,
  enableCache: true,
  cacheSize: 200,
  enableBackup: true,
  maxBackups: 3,
  enableIntegrityCheck: true
};
```

#### D.4 インターフェースの整理（30分）

##### D.4.1 インターフェースの分離
```typescript
// src/core/interfaces/ICutOperations.ts
export interface ICutOperations {
  createCut(data: Partial<CutData>): Promise<CutData>;
  updateCut(id: string, data: Partial<CutData>): Promise<void>;
  deleteCut(id: string): Promise<void>;
  getCutById(id: string): Promise<CutData | null>;
  getCut(id: string): CutData | null;
  getAllCuts(options?: FilterOptions): CutData[];
}

// src/core/interfaces/IMemoOperations.ts
export interface IMemoOperations {
  getCellMemo(cutNumber: string, fieldKey: string): Promise<string | undefined>;
  updateCellMemo(cutNumber: string, fieldKey: string, content: string): Promise<void>;
}

// src/core/interfaces/IServiceManager.ts
export interface IServiceManager {
  getService<T>(name: string): T;
  registerService<T>(name: string, service: T): void;
  registerFactory<T>(name: string, factory: () => T): void;
  registerSingleton<T>(name: string, factory: () => T): void;
}
```

##### D.4.2 ApplicationFacadeの実装宣言
```typescript
export class ApplicationFacade 
  implements IDataAccessFacade, ICutOperations, IMemoOperations, IServiceManager {
  // 実装は委譲パターンで簡潔に
}
```

#### D.5 テストとパフォーマンス測定（30分）

##### D.5.1 リファクタリング前後の比較
```bash
# 行数の比較
echo "=== Before ==="
wc -l src/core/ApplicationFacade.ts.backup

echo "=== After ==="
wc -l src/core/ApplicationFacade.ts
wc -l src/services/core/CoreService.ts

# メソッド数の比較
echo "=== Method Count ==="
grep -E "^\s*(public|private|protected)\s+\w+\s*\(" src/core/ApplicationFacade.ts | wc -l
```

##### D.5.2 パフォーマンステスト
```javascript
// test/performance-test.js
const iterations = 1000;

console.time('Create 1000 cuts - Before');
for (let i = 0; i < iterations; i++) {
  await facade.createCut({ cutNumber: `test_${i}` });
}
console.timeEnd('Create 1000 cuts - Before');

// リファクタリング後も同じテストを実行
```

##### D.5.3 結合テスト
```bash
# ビルド確認
npm run build

# テスト環境での動作確認
npm run build:test

# test-api-mock.htmlでの確認項目
- [ ] データのCRUD操作が正常に動作
- [ ] メモ機能が正常に動作
- [ ] タブ切り替えが正常に動作
- [ ] パフォーマンスの劣化がない
```

### Phase D 完了条件
- [ ] ApplicationFacadeが適切なサイズ（600行以下が理想）
- [ ] 各メソッドが20行前後に収まっている
- [ ] 重複コードが削除されている
- [ ] 定数が外部化されている
- [ ] インターフェースが整理されている
- [ ] パフォーマンスの劣化がない
- [ ] 全機能が正常動作する

### Phase D のスキップ条件
以下の場合はPhase Dをスキップ可能：
- ApplicationFacadeが既に800行以下
- 責務が明確で理解しやすい
- 新機能追加が容易
- パフォーマンスに問題がない

### Phase D のリスクと対策
| リスク | 対策 |
|--------|------|
| 過度な分割による複雑化 | 最小限の分離に留める、3層構造を維持 |
| 委譲による性能劣化 | パフォーマンステストで確認 |
| インターフェースの不整合 | 公開APIは変更しない |
| テスト不足による不具合 | test-api-mock.htmlで入念に確認 |

### Phase D 実装メモ
- **重要**: シンプルさを最優先（過度な抽象化を避ける）
- **判断基準**: 「分離することで理解しやすくなるか」を常に確認
- **最適化**: 必要最小限の変更に留める
- **互換性**: 外部インターフェースは絶対に変更しない

---

## 12. Phase E 詳細実装計画

### Phase E: 最終クリーンアップ（詳細版）
**予定時間**: 1時間
**目的**: 残った問題の解決とプロジェクト全体の最終整理

#### E.0 現状確認と作業リスト作成（10分）

##### E.0.1 プロジェクト構造の最終確認
```bash
# 新しいディレクトリ構造の確認
tree src -d -L 2

# ファイル数の確認
echo "=== File Count by Directory ==="
for dir in core services data models utils ui types config; do
  if [ -d "src/$dir" ]; then
    count=$(find src/$dir -name "*.ts" | wc -l)
    echo "$dir: $count files"
  fi
done

# 合計ファイル数
echo "Total: $(find src -name "*.ts" | wc -l) TypeScript files"
```

##### E.0.2 クリーンアップ対象の特定
```bash
# 空ディレクトリの検出
echo "=== Empty Directories ==="
find src -type d -empty

# 小さいファイル（1行のexportのみ等）の検出
echo "=== Small Files (<5 lines) ==="
find src -name "*.ts" -exec wc -l {} \; | awk '$1 < 5 {print $2}'

# TODOコメントの検出
echo "=== TODO Comments ==="
grep -r "TODO\|FIXME\|HACK\|XXX" src --include="*.ts" | wc -l

# @deprecatedの検出
echo "=== Deprecated Items ==="
grep -r "@deprecated" src --include="*.ts" | wc -l
```

#### E.1 不要ファイル・ディレクトリの削除（15分）

##### E.1.1 空ディレクトリの削除
```bash
# 空ディレクトリを検出して削除
find src -type d -empty -delete

# 旧ディレクトリが残っていれば削除
for dir in application domain infrastructure; do
  if [ -d "src/$dir" ]; then
    echo "Removing old directory: src/$dir"
    rm -rf "src/$dir"
  fi
done
```

##### E.1.2 不要ファイルの削除
```bash
# バックアップファイルの削除
find src -name "*.backup" -o -name "*.bak" -o -name "*~" | xargs rm -f

# .DS_Store（Mac）やThumbs.db（Windows）の削除
find . -name ".DS_Store" -o -name "Thumbs.db" | xargs rm -f

# 未使用のインデックスファイルの削除（内容が空または1行のみ）
for file in $(find src -name "index.ts"); do
  lines=$(wc -l < "$file")
  if [ "$lines" -lt 2 ]; then
    echo "Removing empty index: $file"
    rm "$file"
  fi
done
```

##### E.1.3 スクリプトディレクトリのクリーンアップ
```bash
# Phase A-Dで使用したスクリプトをアーカイブ
if [ -d "scripts" ]; then
  mkdir -p scripts/archive
  mv scripts/*.js scripts/archive/ 2>/dev/null
  echo "Archived refactoring scripts"
fi
```

#### E.2 コメントとTODOの整理（15分）

##### E.2.1 TODOコメントの処理
```javascript
// scripts/clean-todos.js
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // 削除対象のTODOパターン
  const patterns = [
    /\/\/\s*TODO:\s*Phase\s*[0-9].*\n/g,  // Phase関連のTODO
    /\/\/\s*TODO:\s*削除予定.*\n/g,        // 削除予定のTODO
    /\/\/\s*FIXME:\s*後で.*\n/g,           // 曖昧なFIXME
    /\/\/\s*HACK:\s*一時的.*\n/g,          // 一時的なHACK
  ];
  
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      modified = true;
    }
  });
  
  // 残すべきTODOは整形
  content = content.replace(
    /\/\/\s*TODO:\s*(.+)/g,
    '// TODO: $1'
  );
  
  if (modified) {
    fs.writeFileSync(file, content);
  }
});
```

##### E.2.2 @deprecatedの削除
```javascript
// scripts/remove-deprecated.js
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // @deprecatedメソッドの削除（使用されていないことを確認済みの場合）
  const deprecatedPattern = /\/\*\*[\s\S]*?@deprecated[\s\S]*?\*\/[\s\S]*?^\s*(public|private|protected).*?\{[\s\S]*?^\s*\}/gm;
  
  // より安全なアプローチ：@deprecatedコメントのみ削除
  const safePattern = /\s*\*\s*@deprecated.*\n/g;
  
  content = content.replace(safePattern, '');
  fs.writeFileSync(file, content);
});
```

#### E.3 barrel exportの最適化（10分）

##### E.3.1 index.tsファイルの作成
```typescript
// src/core/index.ts
export { ApplicationFacade } from './ApplicationFacade';
export { EventDispatcher } from './EventDispatcher';
export { AppInitializer } from './AppInitializer';
export * from './interfaces';
export * from './types';

// src/services/index.ts
export * from './state';
export * from './sync';
export * from './export';
export * from './kintone';
export * from './domain';

// src/data/index.ts
export { UnifiedDataStore } from './UnifiedDataStore';
export * from './models';
export * from './api';
export * from './adapters';

// src/models/index.ts
export * from './entities';
export * from './events';
export * from './values';
export * from './metadata';
export * from './types';
```

##### E.3.2 循環依存の最終チェック
```bash
# 循環依存の検出
npx madge --circular src

# 問題がある場合は視覚化
if [ $? -ne 0 ]; then
  npx madge --circular --image circular-deps.svg src
  echo "Circular dependencies found! See circular-deps.svg"
fi
```

#### E.4 ビルド最適化とバンドルサイズ削減（10分）

##### E.4.1 未使用エクスポートの削除
```bash
# 未使用エクスポートの検出
npx ts-prune src

# 結果をファイルに保存
npx ts-prune src > unused-exports.txt
```

##### E.4.2 バンドルサイズの分析
```bash
# ビルドとサイズ確認
npm run build

# バンドルサイズの確認
echo "=== Bundle Size Analysis ==="
ls -lh dist/*.js | awk '{print $5, $9}'

# サイズ分析（webpack-bundle-analyzerがある場合）
# npx webpack-bundle-analyzer dist/stats.json
```

##### E.4.3 tree-shakingの最適化
```javascript
// vite.config.tsの確認と更新
{
  build: {
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false
      }
    }
  }
}
```

#### E.5 ドキュメントとメタデータの更新（10分）

##### E.5.1 README.mdの更新
```markdown
# プロジェクト構造

## ディレクトリ構成
```
src/
├── core/          # アプリケーションのコア機能
├── services/      # ビジネスロジック層
├── data/          # データアクセス層
├── models/        # ドメインモデル
├── ui/            # ユーザーインターフェース
├── utils/         # ユーティリティ
├── types/         # 型定義
└── config/        # 設定ファイル
```

## アーキテクチャ
- 3層アーキテクチャ（UI → Core → Data）
- 依存性注入による疎結合
- イベント駆動型の状態管理
```

##### E.5.2 package.jsonの整理
```json
{
  "scripts": {
    // 不要なスクリプトを削除
    // 新しいスクリプトを追加
    "clean": "rm -rf dist",
    "clean:all": "rm -rf dist node_modules",
    "analyze": "npx madge --circular src",
    "size": "npm run build && ls -lh dist/*.js"
  }
}
```

##### E.5.3 .gitignoreの更新
```
# 追加
scripts/archive/
*.backup
*.bak
circular-deps.svg
unused-exports.txt

# 削除（もう存在しない）
src/application/
src/domain/
src/infrastructure/
```

#### E.6 最終検証（10分）

##### E.6.1 総合チェックリスト
```bash
echo "=== Final Checklist ==="
echo "[ ] No TypeScript errors: $(npx tsc --noEmit 2>&1 | grep -c error) errors"
echo "[ ] No ESLint errors: $(npx eslint src --ext .ts 2>&1 | grep -c error) errors"
echo "[ ] No circular deps: $(npx madge --circular src 2>&1 | grep -c "Circular" )"
echo "[ ] Build success: $(npm run build > /dev/null 2>&1 && echo "✓" || echo "✗")"
echo "[ ] Test success: $(npm run build:test > /dev/null 2>&1 && echo "✓" || echo "✗")"
echo "[ ] Bundle size: $(ls -lh dist/*.js 2>/dev/null | awk '{sum += $5} END {print sum}')"
```

##### E.6.2 パフォーマンス測定
```bash
# ビルド時間の測定
echo "=== Build Performance ==="
time npm run build

# 開発サーバー起動時間（該当する場合）
echo "=== Dev Server Startup ==="
time timeout 5 npm run dev
```

##### E.6.3 最終動作確認
```
test-api-mock.htmlでの確認項目：
□ データの一覧表示
□ データの作成
□ データの更新
□ データの削除
□ メモ機能
□ タブ切り替え
□ エラーハンドリング
□ パフォーマンス（体感速度）
```

### Phase E 完了条件
- [ ] 旧ディレクトリ（application/, domain/, infrastructure/）が完全に削除されている
- [ ] 空ディレクトリが存在しない
- [ ] 不要なTODOコメントが削除されている
- [ ] @deprecatedが削除されている（または明確な理由で残している）
- [ ] barrel export（index.ts）が整備されている
- [ ] 循環依存が解消されている（または許容範囲内）
- [ ] ドキュメントが最新状態
- [ ] ビルドが成功する
- [ ] 全機能が正常動作する

### Phase E のリスクと対策
| リスク | 対策 |
|--------|------|
| 必要なファイルの誤削除 | gitで管理、削除前にバックアップ |
| TODOの見落とし | grepで再確認、重要なTODOは残す |
| ドキュメントの不整合 | 実装と照らし合わせて確認 |
| パフォーマンス劣化 | ビルド時間とバンドルサイズを計測 |

### Phase E 実装メモ
- **最終確認**: すべての変更をgitでコミットしてから実施
- **段階的実施**: 削除は慎重に、1つずつ確認しながら
- **ドキュメント**: 将来の開発者のために明確に記載
- **完了基準**: チェックリストをすべて満たすこと

---

## 13. リファクタリング完了後の状態

### 最終的なプロジェクト構造
```
v10.3.3/
├── src/
│   ├── core/          # コア機能（3-5ファイル）
│   ├── services/      # サービス層（10-15ファイル）
│   ├── data/          # データ層（5-8ファイル）
│   ├── models/        # モデル（10-15ファイル）
│   ├── ui/            # UI層（既存）
│   ├── utils/         # ユーティリティ（3-5ファイル）
│   ├── types/         # 型定義（5-10ファイル）
│   └── config/        # 設定（既存）
├── test/
├── docs/
├── scripts/archive/   # 使用済みスクリプト
└── dist/              # ビルド成果物
```

### 成果指標
- **ファイル数**: 130 → 90以下
- **ディレクトリ階層**: 最大3階層
- **依存関係**: 明確な3層構造
- **ビルドエラー**: 0件
- **循環依存**: 0件（または既知の1-2件）
- **バンドルサイズ**: 変更前と同等以下

---

この詳細計画で進めてよろしいですか？