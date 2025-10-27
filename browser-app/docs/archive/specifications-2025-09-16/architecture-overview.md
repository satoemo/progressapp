# アーキテクチャ概要書
作成日: 2025-09-16

## プロジェクト構造

```
src/
├── core/           # コア層 - アプリケーションのファサード
│   ├── ApplicationFacade.ts      # アプリケーションのエントリーポイント
│   ├── EventDispatcher.ts        # イベント管理
│   ├── AppInitializer.ts         # 初期化処理
│   ├── constants.ts              # 定数定義
│   └── coordinators/             # イベント調整
│       └── UnifiedEventCoordinator.ts
├── services/       # サービス層 - ビジネスロジック
│   ├── core/                     # コアビジネスロジック
│   │   └── CoreService.ts
│   ├── state/                    # 状態管理
│   ├── sync/                     # 同期処理
│   ├── export/                   # エクスポート機能
│   ├── kintone/                  # kintone連携
│   └── domain/                   # ドメインサービス
├── data/          # データ層 - データストレージ
│   ├── UnifiedDataStore.ts       # 統一データストア
│   ├── models/                   # データモデル
│   └── api/                      # API連携
├── models/        # ドメインモデル
│   ├── entities/                 # エンティティ
│   ├── events/                   # ドメインイベント
│   ├── values/                   # 値オブジェクト
│   └── metadata/                 # メタデータ
├── ui/            # UI層 - ユーザーインターフェース
│   ├── components/               # UIコンポーネント
│   ├── views/                    # ビュー
│   ├── features/                 # 機能別コンポーネント
│   └── shared/                   # 共有ユーティリティ
├── types/         # 型定義
├── utils/         # ユーティリティ
└── config/        # 設定ファイル
```

## 3層アーキテクチャ

### 1. UI層 (Presentation Layer)
- ユーザーインターフェースの実装
- イベントハンドリング
- 表示ロジック

### 2. Core層 (Application Layer)
- ApplicationFacade: 統一されたAPIを提供
- CoreService: ビジネスロジックの実装
- EventDispatcher: イベント駆動アーキテクチャの実現

### 3. Data層 (Infrastructure Layer)
- UnifiedDataStore: データの永続化
- APIクライアント: 外部システムとの連携
- StorageAdapter: ストレージ戦略の抽象化

## 主要コンポーネント

### ApplicationFacade
- **責務**: アプリケーション全体の統一インターフェース
- **主要メソッド**:
  - サービス管理（getService, registerService）
  - データアクセス（createCut, updateCut, deleteCut, getAllCuts）
  - イベント管理（subscribe）

### CoreService
- **責務**: カット（Cut）データのCRUD操作とビジネスロジック
- **主要メソッド**:
  - カット操作（createCut, updateCut, deleteCut）
  - メモ管理（getCellMemo, updateCellMemo）

### UnifiedDataStore
- **責務**: データの永続化と管理
- **特徴**:
  - LocalStorage/Memoryの切り替え可能
  - LRUキャッシュによる高速アクセス
  - バックアップ機能

## 設計原則

### 1. シンプルさの優先
- 過度な抽象化を避ける
- 必要最小限の層構造

### 2. 関心の分離
- 各層は明確な責務を持つ
- 依存関係は単一方向

### 3. テスタビリティ
- 各コンポーネントは独立してテスト可能
- モック実装の提供

## 拡張ポイント

### 新機能の追加
1. サービス層に新しいサービスクラスを追加
2. ApplicationFacadeからサービスを呼び出し
3. 必要に応じてUIコンポーネントを更新

### 新しいデータソースの追加
1. IStorageAdapterインターフェースを実装
2. UnifiedDataStoreに新しいアダプターを設定

## パフォーマンス最適化

### キャッシュ戦略
- LRUキャッシュ（200エントリ）
- メモリとLocalStorageの2層キャッシュ

### 非同期処理
- Promise/asyncを活用した非同期データアクセス
- デバウンス処理による同期の最適化

## ビルドとデプロイ

### ビルドコマンド
```bash
npm run build        # 本番ビルド
npm run build:test   # テストビルド
npm run typecheck    # 型チェック
```

### 出力ファイル
- `dist/browser/kintone-progress-app.iife.js` - 本番用
- `test/dist/kintone-progress-app.test.iife.js` - テスト用

## 今後の改善案

### 短期的改善
1. より詳細なエラーハンドリング
2. ログ出力の最適化
3. テストカバレッジの向上

### 長期的改善
1. WebWorkerを使用した並列処理
2. IndexedDBへの対応
3. リアルタイム同期の強化