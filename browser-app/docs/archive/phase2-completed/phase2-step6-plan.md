# Phase 2 Step 6: 既存システムとの互換性確保 - 実装計画

実施日: 2025-09-01

## 概要
Phase 2の最終ステップとして、既存システムとの完全な互換性を確保し、旧システムから新システムへの移行を完了します。

## 現状分析

### 旧システムへの依存状況

#### 1. ApplicationFacade (中核)
- CommandBus/QueryBusに依存
- ReadModelStoreに依存
- EventStore/HybridEventStoreに依存
- ServiceContainerから各サービスを取得

#### 2. HandlerRegistry
- CommandBus/QueryBusにハンドラーを登録
- CommandHandler/QueryHandlerを使用

#### 3. UIコンポーネント (10ファイル)
- ProgressTable系: CommandBus/QueryBusを直接使用
- StaffView、SimulationView等: 同様に依存

## 実装計画

### Step 6.1: Migration Adapterの拡張
**目的**: CommandBus/QueryBusを新サービスへの透過的なプロキシに変更

1. CommandBusの更新
   - executeメソッドをUnifiedCutServiceへのプロキシに変更
   - 既存のハンドラー登録メソッドは維持（ダミー化）

2. QueryBusの更新
   - executeメソッドをCutReadServiceへのプロキシに変更
   - 既存のハンドラー登録メソッドは維持（ダミー化）

3. ReadModelStoreの更新
   - SimplifiedReadModelへのプロキシとして動作
   - 既存APIを完全に維持

### Step 6.2: ServiceContainerの新システム対応
**目的**: ServiceContainerが新システムを返すように更新

1. getCommandBus(): 新システム対応のCommandBusを返す
2. getQueryBus(): 新システム対応のQueryBusを返す
3. getReadModelStore(): SimplifiedReadModel対応のStoreを返す

### Step 6.3: ApplicationFacadeの簡素化
**目的**: 不要な初期化処理を削除

1. HandlerRegistryの無効化
   - registerAllメソッドを空実装に
   - ハンドラー登録が不要に

2. EventStore関連の簡素化
   - HybridEventStoreの処理を新システムに委譲

### Step 6.4: UIコンポーネントの確認
**目的**: UIが新システムで正常動作することを確認

1. 動作確認のみ（修正不要の想定）
   - CommandBus/QueryBusの透過的プロキシにより自動的に新システムを使用

### Step 6.5: 旧システムファイルのアーカイブ
**目的**: 不要となったファイルを整理

1. アーカイブ対象（33ファイル）
   - Command/Queryパターン関連（22ファイル）
   - Aggregateパターン関連（3ファイル）
   - EventStore関連（5ファイル）
   - 既にアーカイブ済み（3ファイル）

2. アーカイブ先
   - `src/archive/phase2-legacy/`に移動

### Step 6.6: 統合テスト
**目的**: 移行完了後の動作確認

1. 基本機能テスト
   - カットの作成/更新/削除
   - メモの作成/更新
   - 完了率/コストの計算

2. UIテスト
   - ProgressTableの動作
   - StaffViewの動作
   - SimulationViewの動作

## 実装順序と時間見積もり

| ステップ | 内容 | 見積時間 | 優先度 |
|---------|------|----------|---------|
| 6.1 | Migration Adapterの拡張 | 30分 | 高 |
| 6.2 | ServiceContainerの更新 | 20分 | 高 |
| 6.3 | ApplicationFacadeの簡素化 | 20分 | 中 |
| 6.4 | UIコンポーネントの確認 | 15分 | 高 |
| 6.5 | 旧システムのアーカイブ | 30分 | 低 |
| 6.6 | 統合テスト | 30分 | 高 |

## リスクと対策

### リスク
1. UIコンポーネントが予期しない動作をする可能性
2. 既存のテストコードが失敗する可能性
3. kintone環境での動作に問題が発生する可能性

### 対策
1. 透過的プロキシにより既存APIを完全維持
2. 段階的な移行とロールバック可能な実装
3. 包括的なテストによる動作確認

## 成功基準

1. 全UIコンポーネントが新システムで動作すること
2. 既存のテストが全て成功すること
3. 旧システムファイルが安全にアーカイブされること
4. パフォーマンスが向上または維持されること

## 次のフェーズへの準備

Phase 2完了後、Phase 3では以下を実施予定：
- アーキテクチャの再編成
- ファイル構造の最適化
- 状態管理の更なる簡素化