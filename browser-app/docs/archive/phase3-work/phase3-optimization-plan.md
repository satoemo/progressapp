# Phase 3: 長期的最適化計画

## エグゼクティブサマリー
Phase 2の完了により、CommandBus/QueryBusパターンが削除され、システムは大幅に簡素化されました。
統合テストは100%成功を達成しています。
Phase 3では、残されたアーキテクチャの課題を解決し、保守性と拡張性を向上させます。

## 現状分析

### 達成済み事項
- ✅ Event Sourcing削除（25ファイル）
- ✅ CommandBus/QueryBus削除（17ファイル）  
- ✅ 新サービス層構築
- ✅ 削除ファイル数: 50ファイル
- ✅ コード削減率: 約45%

### 残存課題
1. **ファイル構造の混在**
   - UIコンポーネントが`ui/`に散在
   - サービス層が複数ディレクトリに分散
   - 型定義が各ファイルに散在

2. **データアクセス層の重複**
   - ReadModelStore
   - SimplifiedStore
   - LocalStorageAdapter
   - 複数のデータアクセスパターンが混在

3. **型定義の不整合**
   - CutData型の重複定義
   - インターフェースの不統一
   - any型の多用

4. **パフォーマンスボトルネック**
   - 大規模データセット（1000件以上）での描画遅延
   - メモリ使用量の最適化余地

## Phase 3の目標

### 主要目標
1. **アーキテクチャの最終統一**
2. **型安全性の強化**
3. **パフォーマンスの最適化**
4. **開発者体験の向上**

### 成功指標
- ファイル数: さらに20%削減
- TypeScript strictモード対応: 100%
- パフォーマンス: 2000件のデータで1秒以内の初期表示
- テストカバレッジ: 80%以上

## 実装計画

### Step 1: ファイル構造再編成（3日間）

#### 新しいディレクトリ構造
```
src/
├── components/           # UIコンポーネント（旧ui/）
│   ├── table/           # テーブル関連
│   │   ├── ProgressTable.tsx
│   │   ├── StaffTable.tsx
│   │   └── SimulationTable.tsx
│   ├── popup/           # ポップアップ関連
│   │   ├── CalendarPopup.tsx
│   │   ├── MemoPopup.tsx
│   │   └── MultiSelectPopup.tsx
│   ├── cell/            # セルエディター
│   │   ├── CellEditor.tsx
│   │   └── CellEditorFactory.tsx
│   └── common/          # 共通コンポーネント
│       ├── SyncIndicator.tsx
│       └── DeletionConfirmDialog.tsx
│
├── services/            # ビジネスロジック層
│   ├── cut/            # カット管理サービス
│   │   ├── CutService.ts
│   │   ├── CutDeletionService.ts
│   │   └── CutStatusCalculator.ts
│   ├── sync/           # 同期サービス
│   │   ├── RealtimeSyncService.ts
│   │   └── DebouncedSyncManager.ts
│   └── state/          # 状態管理
│       ├── StateManager.ts
│       └── EventDispatcher.ts
│
├── data/               # データアクセス層
│   ├── store/          # ストレージ実装
│   │   ├── DataStore.ts
│   │   └── LocalStorageAdapter.ts
│   ├── models/         # データモデル
│   │   ├── CutModel.ts
│   │   └── MemoModel.ts
│   └── repository/     # リポジトリパターン
│       └── CutRepository.ts
│
├── types/              # 型定義
│   ├── models.ts       # ドメインモデル型
│   ├── services.ts     # サービス層型
│   ├── components.ts   # コンポーネント型
│   └── index.ts        # 型エクスポート
│
├── utils/              # ユーティリティ
│   ├── date.ts         # 日付処理
│   ├── validation.ts   # バリデーション
│   └── performance.ts  # パフォーマンス計測
│
├── config/             # 設定
│   ├── app.config.ts
│   └── kintone.config.ts
│
└── main.tsx            # エントリーポイント
```

#### 移行作業
1. [ ] ディレクトリ作成スクリプトの実行
2. [ ] ファイル移動スクリプトの作成と実行
3. [ ] インポートパスの自動更新
4. [ ] 動作確認テスト

### Step 2: データアクセス層の統一（2日間）

#### 2.1 統一DataStoreの実装
```typescript
// data/store/DataStore.ts
export class DataStore {
  private adapter: IStorageAdapter;
  
  constructor(adapter: IStorageAdapter) {
    this.adapter = adapter;
  }
  
  async get<T>(key: string): Promise<T | null>
  async set<T>(key: string, value: T): Promise<void>
  async delete(key: string): Promise<void>
  async list<T>(prefix: string): Promise<T[]>
  async clear(prefix?: string): Promise<void>
}
```

#### 2.2 既存ストアの統合
- [ ] ReadModelStoreをDataStoreに移行
- [ ] SimplifiedStoreをDataStoreに移行
- [ ] LocalStorageAdapterの統合
- [ ] インメモリキャッシュの実装

### Step 3: 型定義の強化（2日間）

#### 3.1 型定義の統一
```typescript
// types/models.ts
export interface Cut {
  id: string;
  cutNumber: string;
  scene?: string;
  status?: string;
  progress?: Progress;
  cost?: Cost;
  kenyo?: string[];
  memo?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
}

export interface Progress {
  [key: string]: ProgressValue;
}

export type ProgressValue = Date | '不要' | 'リテイク' | null;
```

#### 3.2 any型の排除
- [ ] any型の使用箇所を特定（約50箇所）
- [ ] 適切な型定義に置き換え
- [ ] strictモードの有効化
- [ ] 型チェックエラーの解消

### Step 4: コンポーネントのReact化（3日間）

#### 4.1 段階的なReact化
- [ ] 新しいコンポーネントからReact/TypeScriptで実装
- [ ] 既存コンポーネントのラッパー作成
- [ ] イベントハンドリングの統一
- [ ] 状態管理の移行（React Context or Zustand）

#### 4.2 対象コンポーネント（優先順位順）
1. SyncIndicator（小規模、独立性高）
2. DeletionConfirmDialog（独立性高）
3. MemoPopup（中規模）
4. CalendarPopup（中規模）
5. ProgressTable（大規模、最後に実施）

### Step 5: パフォーマンス最適化（2日間）

#### 5.1 仮想スクロールの実装
- [ ] react-windowの導入
- [ ] 大規模データセット対応
- [ ] レンダリング最適化

#### 5.2 メモリ最適化
- [ ] WeakMapを使用したキャッシュ
- [ ] 不要なデータの自動削除
- [ ] メモリプロファイリング

### Step 6: テスト基盤の構築（2日間）

#### 6.1 ユニットテスト
- [ ] Jestの設定
- [ ] サービス層のテスト（目標: 90%カバレッジ）
- [ ] ユーティリティのテスト（目標: 100%カバレッジ）

#### 6.2 統合テスト
- [ ] Playwrightの導入
- [ ] 主要フローのE2Eテスト
- [ ] パフォーマンステスト

### Step 7: ドキュメント整備（1日間）

#### 7.1 技術ドキュメント
- [ ] アーキテクチャ図の作成
- [ ] APIドキュメントの生成（TypeDoc）
- [ ] 開発者ガイドの作成

#### 7.2 運用ドキュメント
- [ ] デプロイメントガイド
- [ ] トラブルシューティングガイド
- [ ] パフォーマンスチューニングガイド

## リスクと対策

### リスク1: 大規模リファクタリングによる不具合
**対策**: 
- 段階的な移行（ファイル単位）
- 各ステップでの回帰テスト
- ロールバック計画の準備

### リスク2: パフォーマンス劣化
**対策**:
- ベンチマークの事前測定
- 段階的な最適化
- プロファイリングツールの活用

### リスク3: 開発期間の延長
**対策**:
- 優先順位の明確化
- 並行作業の最大化
- バッファ時間の確保（20%）

## タイムライン

### Week 1（9/9-9/13）
- **月**: Step 1開始 - ディレクトリ構造作成
- **火**: Step 1継続 - ファイル移動
- **水**: Step 1完了 - インポート更新、Step 2開始
- **木**: Step 2継続 - DataStore実装
- **金**: Step 2完了 - 既存ストア統合、Step 3開始

### Week 2（9/16-9/20）
- **月**: Step 3完了 - 型定義強化、Step 4開始
- **火**: Step 4継続 - React化（小規模コンポーネント）
- **水**: Step 4継続 - React化（中規模コンポーネント）
- **木**: Step 5 - パフォーマンス最適化
- **金**: Step 6&7 - テスト基盤構築、ドキュメント整備

## 成果物

### 技術的成果物
1. 統一されたディレクトリ構造
2. 型安全なコードベース（strict mode対応）
3. 統一DataStore実装
4. React化されたコンポーネント（部分的）
5. テストスイート（80%カバレッジ）

### ドキュメント成果物
1. アーキテクチャ図
2. APIドキュメント
3. 開発者ガイド
4. 運用ガイド

## 成功基準

### 必須要件
- [ ] ビルドエラー: 0件
- [ ] TypeScriptエラー: 0件（strict mode）
- [ ] 既存機能の完全維持
- [ ] パフォーマンス劣化なし

### 推奨要件
- [ ] ファイル数: 20%削減
- [ ] テストカバレッジ: 80%以上
- [ ] ドキュメント: 100%完備
- [ ] React化: 30%以上のコンポーネント

## 次のステップ（Phase 4予告）

Phase 3完了後、以下の追加最適化を検討：
1. 完全なReact/Next.js化
2. GraphQL APIの導入
3. マイクロフロントエンド化
4. CI/CDパイプラインの強化

## 承認

このPhase 3計画を実施してよろしいでしょうか？

実施優先順位の調整や、特定のステップの除外・追加についてご要望があればお知らせください。