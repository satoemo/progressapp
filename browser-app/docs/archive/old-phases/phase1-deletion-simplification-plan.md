# Phase 1: 削除機能簡素化 - 詳細実装計画

## 概要
削除機能を10個のコンポーネント経由から3個に削減。各タスクを独立してテスト可能な最小単位（約30分-1時間で実装・テスト可能）に分解。

## 現状の削除フロー（問題）
```
DeleteCommand → CommandBus → CommandHandler → CutAggregate 
→ CutDeletedEvent → EventDispatcher → UnifiedEventCoordinator 
→ ReadModelUpdateService → ReadModelStore → GetAllCutsQuery → UI
```

## 目標の削除フロー（簡素化後）
```
UI → CutDeletionService → Repository → UI通知
```

## タスク分解（独立してテスト可能な最小単位）

### ステップ 1: 削除サービスの基盤作成（Day 1）

#### 1.1 削除サービスインターフェース定義（30分）
**ファイル**: `src/services/deletion/ICutDeletionService.ts`
```typescript
interface ICutDeletionService {
  canDelete(cutId: string): Promise<boolean>;
  delete(cutId: string): Promise<void>;
  isDeleted(cutId: string): Promise<boolean>;
}
```
**テスト**: `test-deletion-interface.html`
- インターフェースの型チェック
- モック実装での動作確認

#### 1.2 削除状態管理クラス作成（30分）
**ファイル**: `src/services/deletion/DeletionState.ts`
```typescript
class DeletionState {
  private deletedIds: Set<string> = new Set();
  
  markAsDeleted(id: string): void;
  isDeleted(id: string): boolean;
  getDeletedIds(): string[];
}
```
**テスト**: `test-deletion-state.html`
- 削除状態の追加・確認
- 複数削除の管理
- メモリ内での状態管理

#### 1.3 削除検証ロジック作成（30分）
**ファイル**: `src/services/deletion/DeletionValidator.ts`
```typescript
class DeletionValidator {
  canDelete(cut: CutData): ValidationResult;
  validateDeletion(cutId: string, currentState: any): ValidationResult;
}
```
**テスト**: `test-deletion-validator.html`
- 削除可能条件のチェック
- 既に削除済みのチェック
- エラーメッセージの確認

### ステップ 2: 永続化層の準備（Day 2）

#### 2.1 削除フラグ付きデータ型定義（30分）
**ファイル**: `src/types/DeletableCutData.ts`
```typescript
interface DeletableCutData extends CutData {
  deletedAt?: string;
  deletedBy?: string;
}
```
**テスト**: `test-deletable-data.html`
- 型の互換性チェック
- 既存データとの変換

#### 2.2 Repository削除メソッド追加（45分）
**ファイル**: 既存Repositoryに追加
```typescript
interface IRepository {
  // 既存メソッド...
  softDelete(id: string): Promise<void>;
  findIncludingDeleted(id: string): Promise<CutData | null>;
}
```
**テスト**: `test-repository-delete.html`
- softDelete動作確認
- 削除済みデータの取得
- 通常のfindとの違い

#### 2.3 ローカルストレージ永続化（45分）
**ファイル**: `src/services/deletion/DeletionPersistence.ts`
```typescript
class DeletionPersistence {
  save(deletedIds: string[]): void;
  load(): string[];
  clear(): void;
}
```
**テスト**: `test-deletion-persistence.html`
- localStorage保存・読込
- ブラウザリロード後の状態維持
- データクリア機能

### ステップ 3: サービス本体の実装（Day 3）

#### 3.1 基本削除サービス実装（1時間）
**ファイル**: `src/services/deletion/CutDeletionService.ts`
```typescript
class CutDeletionService implements ICutDeletionService {
  constructor(
    private repository: IRepository,
    private validator: DeletionValidator,
    private state: DeletionState
  ) {}
  
  async delete(cutId: string): Promise<void> {
    // 1. 検証
    // 2. Repository更新
    // 3. 状態更新
    // 4. 永続化
  }
}
```
**テスト**: `test-deletion-service.html`
- 正常削除フロー
- エラーケース処理
- 状態の一貫性

#### 3.2 UI通知機能追加（45分）
**ファイル**: `src/services/deletion/DeletionNotifier.ts`
```typescript
class DeletionNotifier {
  notifyDeleted(cutId: string): void;
  notifyDeletionError(cutId: string, error: Error): void;
  subscribeToDelete(callback: (cutId: string) => void): void;
}
```
**テスト**: `test-deletion-notifier.html`
- 通知の発行
- 購読者への配信
- エラー通知

#### 3.3 バッチ削除対応（45分）
**ファイル**: 既存サービスに追加
```typescript
class CutDeletionService {
  // 既存メソッド...
  async deleteMultiple(cutIds: string[]): Promise<DeleteResult[]>;
}
```
**テスト**: `test-batch-deletion.html`
- 複数同時削除
- 部分的失敗の処理
- トランザクション的動作

### ステップ 4: 既存システムとの統合（Day 4）

#### 4.1 CommandHandlerのリダイレクト（30分）
**ファイル**: 既存のDeleteCutCommandHandlerを修正
```typescript
class DeleteCutCommandHandler {
  constructor(private deletionService: CutDeletionService) {}
  
  async handle(command: DeleteCutCommand): Promise<void> {
    // 新サービスへリダイレクト
    return this.deletionService.delete(command.cutId);
  }
}
```
**テスト**: `test-handler-redirect.html`
- 既存コマンドの動作維持
- 新サービス呼び出し確認

#### 4.2 ReadModelの即時更新（45分）
**ファイル**: `src/services/deletion/ReadModelUpdater.ts`
```typescript
class ReadModelUpdater {
  updateForDeletion(cutId: string): void;
  removeFromView(cutId: string): void;
}
```
**テスト**: `test-readmodel-update.html`
- ReadModel即時反映
- UIテーブルからの削除

#### 4.3 イベント発行の簡素化（30分）
**ファイル**: DeletionNotifierに統合
```typescript
class DeletionNotifier {
  // シンプルなイベント発行に変更
  emitSimpleDeleteEvent(cutId: string): void;
}
```
**テスト**: `test-simple-events.html`
- 簡素化されたイベント
- 既存リスナーとの互換性

### ステップ 5: UIとの統合（Day 5）

#### 5.1 削除ボタンハンドラー更新（30分）
**ファイル**: UIコンポーネントの削除ボタン処理
```typescript
async handleDelete(cutId: string) {
  const service = new CutDeletionService();
  await service.delete(cutId);
  // UI即座更新
}
```
**テスト**: `test-ui-delete-button.html`
- ボタンクリック処理
- 即座のUI反映

#### 5.2 削除確認ダイアログ（30分）
**ファイル**: `src/ui/components/DeletionConfirmDialog.ts`
```typescript
class DeletionConfirmDialog {
  show(cutId: string): Promise<boolean>;
}
```
**テスト**: `test-delete-confirm.html`
- ダイアログ表示
- ユーザー選択処理

#### 5.3 削除後のフィードバック（30分）
**ファイル**: `src/ui/components/DeletionFeedback.ts`
```typescript
class DeletionFeedback {
  showSuccess(cutId: string): void;
  showError(error: Error): void;
}
```
**テスト**: `test-deletion-feedback.html`
- 成功メッセージ表示
- エラー表示

### ステップ 6: テストと最適化（Day 6）

#### 6.1 統合テスト作成（1時間）
**ファイル**: `test-deletion-integration.html`
- 全削除フローのE2Eテスト
- リロード後の状態確認
- パフォーマンス測定

#### 6.2 旧コンポーネントの無効化（30分）
**作業内容**:
- 不要なイベントクラスのコメントアウト
- 使用されないハンドラーの無効化
- デッドコードの識別

#### 6.3 パフォーマンス最適化（30分）
**作業内容**:
- 削除処理時間の計測
- ボトルネックの特定
- 最適化の実施

### ステップ 7: ドキュメントと移行（Day 7）

#### 7.1 移行ガイド作成（30分）
**ファイル**: `docs/deletion-migration-guide.md`
- 新旧の違い
- 移行手順
- 注意事項

#### 7.2 最終動作確認（30分）
- 全機能の動作テスト
- 既存機能への影響確認
- バグ修正

## テスト戦略

### 各ステップのテスト方法
1. **単体テスト**: 各クラス・関数を独立してテスト
2. **HTMLテストファイル**: ブラウザで直接開いて実行
3. **コンソールログ**: 動作確認用のログ出力

### テストHTMLの構造
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test: [機能名]</title>
    <script type="module">
        import { [テスト対象] } from './dist/[ファイル].js';
        
        // テストケース実行
        console.log('Test 1: 基本動作');
        // ...
        
        console.log('All tests passed!');
    </script>
</head>
<body>
    <h1>削除機能テスト: [機能名]</h1>
    <div id="test-result"></div>
</body>
</html>
```

## 成功基準

### 各ステップの完了条件
- テストHTMLが全て正常動作
- コンソールエラーなし
- 既存機能への影響なし

### Phase 1全体の成功基準
- [ ] 削除処理時間: 現在の50%以下
- [ ] 経由コンポーネント数: 10個→3個
- [ ] コード行数: 30%削減
- [ ] テストカバレッジ: 80%以上
- [ ] リロード後も削除状態維持: 100%

## リスク管理

### 各ステップのロールバック
- Gitで各ステップをコミット
- 問題発生時は前のステップに戻る
- 機能フラグで新旧切り替え

## スケジュール

| ステップ | 作業時間 | 依存関係 |
|---------|---------|---------|
| 1.1-1.3 | 1.5時間 | なし |
| 2.1-2.3 | 2時間 | ステップ1完了 |
| 3.1-3.3 | 2.5時間 | ステップ2完了 |
| 4.1-4.3 | 1.5時間 | ステップ3完了 |
| 5.1-5.3 | 1.5時間 | ステップ4完了 |
| 6.1-6.3 | 2時間 | ステップ5完了 |
| 7.1-7.2 | 1時間 | ステップ6完了 |

**合計**: 約12時間（7日間で分散実施）

## 次のアクション
1. ステップ1.1から順次実施
2. 各ステップ完了後にテスト実行
3. 問題があれば即座に修正

---

**注意**: 各タスクは30分-1時間で完了可能な最小単位。独立してテスト可能で、他の部分に影響を与えない設計。