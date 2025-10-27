# Phase 2: 削除機能の簡素化計画 - 2025年8月31日

## 概要
現在の複雑な削除ロジックを簡素化し、イベントソーシングとの整合性を改善する。

## 現状の問題点

### 1. 削除フローの複雑性
- 複数の削除サービスが存在
- CutDeletionServiceとDeleteCutCommandHandlerの責任が不明確
- イベントソーシングとの整合性が不完全

### 2. UIフィードバックの不統一
- 削除確認ダイアログのパターンが複数存在
- 削除後の表示更新タイミングが不一致
- エラーハンドリングが統一されていない

### 3. 状態管理の問題
- 削除状態の管理が分散
- ReadModelStoreとEventStoreの同期問題
- 削除済みアイテムの扱いが不明確

## 現在のアーキテクチャ分析

### 関連ファイル
```
/src/services/deletion/
├── CutDeletionService.ts
├── DeletionStateManager.ts
└── IDeletionService.ts

/src/ui/
├── components/DeletionConfirmDialog.ts
├── feedback/
│   └── DeletionFeedback.ts
└── handlers/
    └── DeleteButtonHandler.ts

/src/application/commands/
└── handlers/DeleteCutCommandHandler.ts

/src/domain/
├── aggregates/CutAggregate.ts
└── events/CutEvents.ts
```

## 改善計画

### フェーズ1: アーキテクチャの統一（2時間）

#### 実装単位1: 削除コマンドフローの統一（45分）
1. DeleteCutCommandをエントリーポイントとして確立
2. CutDeletionServiceをDeleteCutCommandHandler内に統合
3. 削除イベント（CutDeleted）の発行を一元化

#### 実装単位2: UIフィードバックの統一（45分）
1. DeletionConfirmDialogを単一の実装に統一
2. 削除成功/失敗の通知パターンを標準化
3. ProgressTableの更新タイミングを明確化

#### 実装単位3: 状態管理の簡素化（30分）
1. DeletionStateManagerの責任を明確化
2. 削除フラグの管理方法を統一
3. ReadModelStoreの削除処理を最適化

### フェーズ2: イベントソーシング統合（1.5時間）

#### 実装単位4: CutDeletedイベントの実装（30分）
```typescript
interface CutDeleted extends DomainEvent {
  eventType: 'CutDeleted';
  aggregateId: string;
  deletedBy?: string;
  deletedAt: Date;
  reason?: string;
}
```

#### 実装単位5: CutAggregateの削除処理（30分）
```typescript
class CutAggregate {
  delete(deletedBy?: string, reason?: string): void {
    if (this.isDeleted) {
      throw new Error('Cut is already deleted');
    }
    
    this.applyEvent({
      eventType: 'CutDeleted',
      aggregateId: this.id,
      deletedBy,
      deletedAt: new Date(),
      reason
    });
  }
  
  private applyCutDeleted(event: CutDeleted): void {
    this.isDeleted = true;
    this.deletedAt = event.deletedAt;
  }
}
```

#### 実装単位6: リポジトリの削除サポート（30分）
- EventSourcedCutRepositoryでの削除イベント処理
- 削除済みカットのフィルタリング
- ソフトデリート vs ハードデリート

### フェーズ3: UI/UXの改善（1時間）

#### 実装単位7: 削除確認ダイアログの改善（30分）
```typescript
interface DeletionConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  showDetails?: boolean;
}
```

#### 実装単位8: 削除アニメーションの実装（30分）
- フェードアウトアニメーション
- 取り消し可能期間（Undo機能）
- バッチ削除のサポート

## 簡素化後のアーキテクチャ

### 削除フロー
```
1. ユーザーアクション（削除ボタンクリック）
   ↓
2. 削除確認ダイアログ表示
   ↓
3. DeleteCutCommand発行
   ↓
4. DeleteCutCommandHandler処理
   - CutAggregateの削除
   - CutDeletedイベント発行
   ↓
5. イベントハンドラー
   - ReadModelStore更新
   - UI更新（ProgressTable再レンダリング）
   - 通知表示
```

### ディレクトリ構造（簡素化後）
```
/src/application/commands/
├── DeleteCutCommand.ts
└── handlers/
    └── DeleteCutCommandHandler.ts

/src/ui/components/
└── DeletionDialog.ts  // 統一された削除ダイアログ

/src/domain/events/
└── CutEvents.ts  // CutDeletedイベント含む
```

## テスト計画

### 単体テスト
1. CutAggregateの削除メソッド
2. DeleteCutCommandHandlerの処理
3. イベントハンドラーの動作

### 統合テスト
1. 削除フロー全体の動作確認
2. ReadModelStoreの更新確認
3. UIの更新確認

### E2Eテスト
1. 削除ボタンクリックから完了まで
2. 複数削除の動作
3. エラーケースの処理

## 移行計画

### ステップ1: 並行実装
- 新しい削除フローを実装
- 既存の削除機能と並行して動作

### ステップ2: 段階的切り替え
- フィーチャーフラグで新旧切り替え
- 問題がないことを確認

### ステップ3: 旧実装の削除
- 旧削除関連コードを削除
- ドキュメント更新

## リスクと対策

### リスク1: データ整合性
- **対策**: イベントソーシングにより履歴保持

### リスク2: パフォーマンス
- **対策**: 削除済みカットの効率的なフィルタリング

### リスク3: 後方互換性
- **対策**: 段階的移行とフィーチャーフラグ

## 期待される効果

1. **コードの簡素化**: 削除関連コードが50%削減
2. **保守性向上**: 単一責任原則の遵守
3. **バグ削減**: 状態管理の一元化
4. **UX向上**: 一貫性のある削除体験

## 成功指標

- 削除関連ファイル数: 10個 → 5個
- 削除処理のコード行数: 500行 → 250行
- 削除関連バグ: 月3件 → 月0件
- ユーザー満足度: 向上

## タイムライン

- Phase 1: 2時間（アーキテクチャ統一）
- Phase 2: 1.5時間（イベントソーシング統合）
- Phase 3: 1時間（UI/UX改善）
- テスト: 1時間
- 合計: 5.5時間