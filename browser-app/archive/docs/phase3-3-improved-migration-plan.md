# Phase 3.3 改善版移行計画

## 作成日時
2025-08-21

## 目的
phase3.3の失敗を踏まえ、より安全で段階的な移行計画を策定する

## phase3.3で発生した問題の分析

### 1. 実装上の問題
- **シングルトンパターンの早期導入**: CutService/MemoServiceをシングルトンに変更したが、初期化タイミングの問題が発生
- **LocalStorage自動保存の複雑化**: debounce処理やバッチモードなど、不要な複雑さを追加
- **minify対策の不適切な実装**: プロパティ存在チェックによる判定が複雑で脆弱

### 2. 移行プロセスの問題
- **一度に多くの変更**: 23ファイルを一度に変更し、問題の切り分けが困難
- **サービス層の同時改変**: UI層の移行と同時にサービス層も変更
- **動作確認の不足**: 各ステップでの動作確認が不十分

### 3. 根本原因
- **互換性維持の複雑さ**: Event Sourcing/CQRSパターンとの互換性維持が複雑
- **minifyの考慮不足**: ビルド環境での動作を十分に検証していない

## 改善された移行戦略

### 基本方針
1. **最小限の変更**: 一度に変更するファイルを最小限に抑える
2. **段階的な移行**: 小さなステップで確実に進める
3. **互換性優先**: 既存コードとの互換性を最優先
4. **動作確認重視**: 各ステップで必ず動作確認

## 段階的実装計画

### Phase 3.3a: minify対策のみ実装（30分）
**目的**: minify問題を解決し、安定動作を確保

#### 実装内容
1. AppService.tsのCommandBus/QueryBus判定ロジックを改善
   - constructor.nameを使用しない
   - プロパティベースの判定を実装
   - ただし、fieldKeyとfieldNameの両方に対応

2. 変更ファイル（1ファイルのみ）
   - `/src/services/AppService.ts`

#### 判定ロジック（シンプル版）
```javascript
// CommandBusの判定（fieldKey/fieldName両対応）
getCommandBus(): any {
  return {
    execute: async (command: any) => {
      // UpdateProgressCommandのfieldKey/fieldName対応
      if (('fieldKey' in command || 'fieldName' in command) && 'value' in command && !('content' in command)) {
        const field = command.fieldKey || command.fieldName;
        return this.updateProgress(command.cutId, field, command.value);
      }
      // UpdateCellMemoCommandのfieldKey/fieldName対応
      if ('content' in command) {
        const field = command.fieldKey || command.fieldName;
        return this.updateCellMemo(command.cutNumber, field, command.content);
      }
      // その他のコマンドは従来通り
      const commandType = command.constructor.name;
      switch (commandType) {
        case 'CreateCutCommand':
          return this.createCut(command.cutNumber);
        // ...
      }
    }
  };
}
```

#### 動作確認
- [ ] ダミーデータ生成が動作
- [ ] 進捗データの編集が動作
- [ ] メモの編集が動作

### Phase 3.3b: UI層の段階的移行（各10分×5回）
**目的**: UIコンポーネントを少しずつ新AppServiceに移行

#### Step 1: 最小限のコンポーネント（10分）
1. `/src/ui/generateDummyData.ts`のみ移行
2. 動作確認：ダミーデータ生成

#### Step 2: 基本サービス（10分）
1. `/src/ui/services/ProgressDataService.ts`のみ移行
2. 動作確認：データ取得

#### Step 3: コアテーブル（10分）
1. `/src/ui/ProgressTable.ts`のみ移行
2. `/src/ui/base/BaseProgressTable.ts`のみ移行
3. 動作確認：進捗表表示

#### Step 4: セルエディター（10分）
1. `/src/ui/cell-editor/CellEditor.ts`のみ移行
2. `/src/ui/cell-editor/CellEditorFactory.ts`のみ移行
3. 動作確認：セル編集

#### Step 5: 残りのサービス（10分）
1. `/src/ui/services/TableEventService.ts`
2. `/src/ui/services/TableRenderService.ts`
3. `/src/ui/services/ProgressTableIntegrated.ts`
4. 動作確認：全機能

### Phase 3.3c: ビューコンポーネントの移行（各5分×6回）
**目的**: 各ビューを個別に移行

1. StaffView.ts → 動作確認
2. ScheduleView.ts → 動作確認
3. SimulationView.ts → 動作確認
4. RetakeView.ts → 動作確認
5. OrderView.ts → 動作確認
6. CutBagView.ts → 動作確認

### Phase 3.3d: 最終統合（15分）
1. 残りのコンポーネント移行
   - KenyoMultiSelectPopup.ts
   - SpecialMultiSelectPopup.ts
   - AutoFillManager.ts
2. 初期化ファイルの更新
   - AppInitializer.ts
   - main-browser.ts
3. 統合テスト

## リスク軽減策

### 1. バックアップ戦略
- 各Phaseの前にバックアップを作成
- 問題発生時は即座にロールバック

### 2. 動作確認チェックリスト
各ステップで以下を確認：
- [ ] TypeScriptエラーが0件
- [ ] ビルドが成功
- [ ] コンソールエラーなし
- [ ] 基本機能が動作

### 3. 段階的コミット
- 各Phaseごとにコミット（ローカル）
- 問題があれば個別にrevert可能

### 4. シングルトン化の延期
- CutService/MemoServiceのシングルトン化は延期
- LocalStorage自動保存も延期
- まずは移行を完了させることを優先

## 成功基準

### Phase 3.3a（minify対策）
- minifyされたビルドでも正常動作
- ダミーデータ生成が成功

### Phase 3.3b（UI層移行）
- ApplicationServiceへの参照が段階的に減少
- 各ステップで機能が維持される

### Phase 3.3c（ビュー移行）
- すべてのタブが正常に表示
- 各ビューの固有機能が動作

### Phase 3.3d（最終統合）
- ApplicationServiceへの参照が0件
- すべての機能が新AppServiceで動作

## 推定所要時間
- Phase 3.3a: 30分
- Phase 3.3b: 50分（10分×5）
- Phase 3.3c: 30分（5分×6）
- Phase 3.3d: 15分
- **合計**: 約2時間5分

## 実装順序の根拠

1. **minify対策を最優先**
   - 現在の最大の問題を解決
   - 1ファイルのみの変更でリスク最小

2. **データ生成から開始**
   - テストデータがないと動作確認できない
   - 最も独立性が高いコンポーネント

3. **コアから周辺へ**
   - ProgressTable → 各ビュー
   - 依存関係に従った順序

4. **シングルトン化は後回し**
   - 複雑な変更は安定後に実施
   - まずは移行完了を優先

## 次のステップ

1. Phase 3.3aから開始（minify対策）
2. 各Phaseで動作確認
3. 問題があれば即座に停止・修正
4. 全Phase完了後、Phase 3.4（旧コード削除）へ

## 備考

- この計画は「失敗から学んだ」改善版
- 急がば回れの精神で、小さく確実に進める
- 各ステップでの動作確認を最重視