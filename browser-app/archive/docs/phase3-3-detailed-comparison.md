# Phase 3.3 詳細比較分析

## 実施日時
2025-08-22

## 比較分析結果

### 1. ダミーデータ生成

#### アーカイブ版（正常動作）
```typescript
- ApplicationServiceを使用
- IdGenerator.generateCutAggregateId(cutNumber)でID生成
- UpdateProgressCommandが正しく処理される
```

#### 現在版（問題あり）
```typescript
- AppServiceを使用
- CreateCutCommandの戻り値からIDを取得（修正済み）
- しかし、生成されるデータが不完全
```

**問題点**: CreateCutCommandとUpdateProgressCommandの処理が、元のCommandHandlerと異なる可能性

### 2. ヘッダー合計計算

#### NormaTable（シミュレーション画面）
- 小計、週計、総合計の計算機能が実装されている
- updateTotalCells()メソッドで各種合計を更新

#### ProgressTable（進捗管理表）
- グループヘッダーは存在するが、合計計算機能が見当たらない
- TableRenderServiceにも合計計算がない

**問題点**: ProgressTableの合計計算機能が実装されていない、または動作していない

### 3. パフォーマンス問題

#### 考えられる原因
1. **getAllCuts()の頻繁な呼び出し**
   - addProgress()で毎回全カットを取得している
   - バッチ処理中に何度も実行される

2. **イベント通知の過剰な発火**
   - 各更新でsubscribeToChangesが発火
   - UIの再レンダリングが頻発

3. **同期処理の問題**
   - syncReadModels()やflush()の処理が重い可能性

## 根本的な問題

### AppServiceの簡易実装の限界

#### CommandBusの処理
```typescript
// 現在の実装（AppService）
if ('fieldKey' in command || 'fieldName' in command) && 'value' in command && !('content' in command)) {
  const field = command.fieldKey || command.fieldName;
  return this.updateProgress(command.cutId, field, command.value);
}
```

**問題**: 
- プロパティベースの判定は脆弱
- 元のCommandHandlerの詳細な処理が失われている
- バリデーションやビジネスロジックが不足

#### 元のUpdateProgressCommandHandler
```typescript
// アーカイブ版
export class UpdateProgressCommandHandler {
  async handle(command: UpdateProgressCommand): Promise<void> {
    // 1. アグリゲートの取得
    const aggregate = await this.repository.getById(command.cutId);
    
    // 2. ビジネスロジックの実行
    aggregate.updateProgress(command.fieldKey, command.value);
    
    // 3. イベントの保存
    await this.repository.save(aggregate);
    
    // 4. ReadModelの更新
    await this.readModelUpdateService.updateFromAggregate(aggregate);
    
    // 5. UI通知
    this.eventCoordinator.notifyUIUpdate();
  }
}
```

### データ整合性の問題

#### CutModelの不完全な初期化
```typescript
// 現在の実装
export function createCut(cutNumber: CutNumber): CutModel {
  return {
    id: generateId(),
    cutNumber,
    isDeleted: false,
    // その他のフィールドはundefined <- 問題！
  };
}
```

**問題**: 必要なフィールドが初期化されていない

## 推奨される修正方針

### Phase 1: 緊急修正（即座に実施）

1. **ダミーデータ生成の修正**
   - CreateCutCommandで初期データを正しく設定
   - UpdateBasicInfoCommandを使用して不足データを補完

2. **パフォーマンス改善**
   - getAllCuts()の呼び出しを最小化
   - バッチ処理の最適化

### Phase 2: 重要機能の復旧

1. **CommandHandlerの部分的復活**
   - UpdateProgressCommandHandlerの詳細な処理を復元
   - CreateCutCommandHandlerのビジネスロジックを復元

2. **ヘッダー合計計算の実装**
   - ProgressTableに合計計算機能を追加
   - または元の実装を確認して復元

### Phase 3: アーキテクチャの再検討

1. **ハイブリッドアプローチ**
   - ApplicationServiceとAppServiceを共存
   - 段階的に機能を移行

2. **テストの追加**
   - 各機能の動作確認テスト
   - パフォーマンステスト

## 次のアクション

1. アーカイブのCommandHandlerの実装を確認
2. CreateCutCommandHandlerの処理内容を分析
3. ProgressTableの合計計算機能の有無を確認
4. 修正計画の詳細化