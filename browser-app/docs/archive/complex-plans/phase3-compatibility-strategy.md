# Phase 3 互換性維持戦略

## 概要
UIコンポーネントの段階的移行における互換性維持の詳細戦略

## 現在の依存関係

### UIコンポーネントが使用しているCommand/Query

1. **ProgressTable.ts**
   - UpdateBasicInfoCommand（行26）
   - UpdateProgressCommand（行27）
   - GetCellMemoQuery（行31）
   - UpdateCellMemoCommand（行32）
   - CreateCutCommand（行36）
   - GetAllCutsQuery（行37）

2. **CellEditor.ts**
   - UpdateBasicInfoCommand（行5）

3. **StaffView.ts**
   - QueryBus経由でのデータ取得
   - CommandBus経由での更新

## 3段階の互換性維持戦略

### 第1段階：完全互換性維持（現在）
**目的**: 既存UIコンポーネントを一切変更せずに新システムを動作させる

```typescript
// 現在の実装
UI → Command → CommandBus → MigrationAdapter → UnifiedCutService
```

**維持するAPI:**
- `CommandBus.execute(command): Promise<void>`
- `QueryBus.execute(query): Promise<T>`
- すべてのCommand/Queryクラス

**利点:**
- UIコンポーネントの変更不要
- リスク最小
- ロールバック容易

**欠点:**
- 中間層のオーバーヘッド
- コードの冗長性

### 第2段階：ファサードパターンによる段階的移行

**目的**: 内部では新システムを使用しつつ、外部APIを維持

```typescript
// ApplicationFacadeを拡張
class ApplicationFacade {
  // 既存API（互換性のため維持）
  async executeCommand(command: Command): Promise<void> {
    // 内部では直接サービスを呼び出し
    const service = this.getServiceForCommand(command);
    return service.execute(command.getData());
  }
  
  // 新API（段階的に導入）
  getCutService(): UnifiedCutService {
    return this.serviceLocator.getCutService();
  }
}
```

**移行手順:**
1. ApplicationFacadeに新APIを追加
2. 新規機能は新APIを使用
3. 既存機能を段階的に新APIへ移行
4. 旧APIを非推奨化

**利点:**
- 段階的移行が可能
- 新旧システムの共存
- 移行の進捗管理が容易

### 第3段階：直接サービス呼び出し

**目的**: Command/Queryパターンを完全に排除

```typescript
// 最終形
class ProgressTable {
  constructor(private cutService: UnifiedCutService) {}
  
  async updateField(cutId: string, field: string, value: any) {
    // 直接サービスを呼び出し
    await this.cutService.update(cutId, { [field]: value });
  }
}
```

**移行手順:**
1. UIコンポーネントをリファクタリング
2. Command/Queryの削除
3. CommandBus/QueryBusの削除
4. 不要なファイルのアーカイブ

## UIコンポーネント別の移行計画

### 優先度1：新規作成コンポーネント
- 新しく作成するコンポーネントは最初から新APIを使用

### 優先度2：シンプルなコンポーネント
- CellEditor.ts - 1つのCommandのみ使用
- FilterManager.ts - Queryのみ使用

### 優先度3：複雑なコンポーネント
- ProgressTable.ts - 6つのCommand/Query使用
- StaffView.ts - 複数のCommand/Query使用

## 互換性テスト戦略

### レベル1：API互換性テスト
```javascript
// test-all-phase3.js
async function testAPICompatibility() {
  // 既存API
  const command = new UpdateBasicInfoCommand(id, data);
  await commandBus.execute(command);
  
  // 新API
  const service = getServiceLocator().getCutService();
  await service.update(id, data);
  
  // 結果が同じであることを確認
  assert(oldResult === newResult);
}
```

### レベル2：動作互換性テスト
- UIコンポーネントの動作確認
- イベント発火の確認
- エラーハンドリングの確認

### レベル3：パフォーマンステスト
- 応答時間の測定
- メモリ使用量の測定
- 並行処理の確認

## リスクと対策

### リスク1：移行中の不整合
**対策**: フィーチャーフラグによる切り替え
```typescript
if (useNewAPI) {
  return this.cutService.update(id, data);
} else {
  return this.commandBus.execute(new UpdateCommand(id, data));
}
```

### リスク2：パフォーマンス劣化
**対策**: 段階的な最適化
- 第1段階: 機能維持優先
- 第2段階: ボトルネック特定
- 第3段階: 最適化実施

### リスク3：ロールバックの困難性
**対策**: 各段階でのチェックポイント
- git tagによるバージョン管理
- 環境変数による切り替え
- A/Bテストの実施

## 成功指標

### 第1段階（1週間）
- [ ] すべての既存テストがパス
- [ ] エラー発生率0%
- [ ] パフォーマンス劣化10%以内

### 第2段階（2週間）
- [ ] 50%のUIコンポーネントが新API使用
- [ ] コード行数20%削減
- [ ] パフォーマンス改善10%

### 第3段階（1週間）
- [ ] Command/Query完全削除
- [ ] コード行数40%削減
- [ ] パフォーマンス改善30%

## 次のアクション

1. **第1段階の完了確認**
   - 現在のMigrationAdapterの動作確認
   - 既存テストの実行

2. **第2段階の準備**
   - ApplicationFacadeの拡張設計
   - 移行優先順位の決定
   - テストケースの作成

3. **段階的実装**
   - CellEditorから開始（最もシンプル）
   - 成功後、他のコンポーネントへ展開