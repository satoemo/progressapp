# Phase 3 Step 3: サービス層の簡略化計画

## 現状分析
1. **CommandBus/QueryBus**: 既に削除済み（archiveディレクトリに移動）
2. **サービス層の複雑性**:
   - ServiceContainer（DIコンテナ）
   - ServiceLocator（サービス取得用）
   - ApplicationFacade（統一インターフェース）
   - 3つの異なるパターンが混在

## 実装計画

### Step 3-1: ServiceContainerとServiceLocatorの統合（中：45分）
**目的**: 2つのサービス管理クラスを1つに統合

1. ServiceLocatorの機能をServiceContainerに統合
2. ServiceContainerをシングルトンパターンに変更
3. ApplicationFacadeからServiceLocatorへの依存を削除

**変更対象ファイル**:
- `/src/application/ServiceContainer.ts` - 機能統合
- `/src/services/ServiceLocator.ts` - 削除（機能はServiceContainerへ）
- `/src/application/ApplicationFacade.ts` - ServiceLocator参照を削除

### Step 3-2: サービス初期化の簡略化（中：30分）
**目的**: サービスの初期化処理を簡潔に

1. 遅延初期化パターンの導入
2. 不要な初期化コードの削除
3. サービス登録の自動化

**変更対象ファイル**:
- `/src/application/AppInitializer.ts` - 初期化処理の簡略化
- `/src/application/ServiceContainer.ts` - 遅延初期化の実装

### Step 3-3: 不要なインターフェースの削除（小：20分）
**目的**: 使用されていないインターフェースを削除

1. 旧Command/Query関連のインターフェース削除
2. 不要なサービスインターフェースの削除
3. 型定義の整理

**変更対象ファイル**:
- `/src/types/services.ts` - 不要なインターフェース削除
- 関連するimport文の整理

### Step 3-4: ApplicationFacadeの簡略化（中：30分）
**目的**: ファサードパターンをより簡潔に

1. 冗長なメソッドの削除
2. サービス呼び出しの直接化
3. デバッグ用メソッドの整理

**変更対象ファイル**:
- `/src/application/ApplicationFacade.ts` - メソッドの簡略化

## テスト項目
1. アプリケーションの起動確認
2. サービスの取得と実行
3. カットの作成・更新・削除
4. メモ機能の動作
5. 画面切り替えとデータ表示

## リスクと対策
- **リスク**: サービスの初期化順序の変更による不具合
  - **対策**: 既存の初期化順序を維持しながら簡略化

- **リスク**: ServiceLocatorに依存する外部コードの破損
  - **対策**: 後方互換性のためのエイリアスを提供

## 期待される効果
1. コードの複雑性を30%削減
2. 初期化時間の短縮
3. デバッグとメンテナンスの容易化
4. 新規開発者の理解しやすさ向上