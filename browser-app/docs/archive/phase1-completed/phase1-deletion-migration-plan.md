# Phase 1: 削除機能の新システム移行とアーカイブ戦略 - 詳細実装計画
最終更新: 2025年9月1日

## 概要
削除機能を既存の複雑な10コンポーネント経由から、シンプルな3コンポーネント構成に移行。
旧システムは即座に削除せず、archiveフォルダに移動して安全に保管。必要に応じて復元可能な状態を維持。

## 前提条件
- **Phase 0完了**: コンソールエラー2件の修正済み
- クリーンな開発環境で作業開始

## 目標

### 主目標
1. 削除処理を`CutDeletionService`中心の新システムに完全移行
2. 旧システムコンポーネントをarchiveフォルダに安全に移動
3. コンポーネント数を実質3個に削減

### 現状のフロー（問題）
```
UI → DeleteCommand → CommandBus → CommandHandler → CutAggregate 
→ CutDeletedEvent → EventDispatcher → UnifiedEventCoordinator 
→ ReadModelUpdateService → ReadModelStore → GetAllCutsQuery → UI
（10個のコンポーネント経由）
```

### 目標のフロー（簡素化後）
```
UI → CutDeletionService → Repository → UI通知
（3個のコンポーネントのみ）
```

## アーカイブ戦略

### アーカイブフォルダ構造
```
/src/archive/
├── phase1-deletion-legacy/     # Phase1で移動する削除関連
│   ├── commands/
│   │   ├── DeleteCutCommand.ts
│   │   └── handlers/
│   │       └── DeleteCutCommandHandler.old.ts
│   ├── events/
│   │   └── CutDeletedEvent.ts
│   └── README.md               # 移動日時と理由を記録
│
├── phase2-cqrs-legacy/         # Phase2で移動予定
├── phase3-structure-legacy/    # Phase3で移動予定
└── phase4-state-legacy/        # Phase4で移動予定
```

### アーカイブルール
1. **即座に削除しない**: 動作確認後にアーカイブ
2. **復元可能な状態維持**: import文の記録を含む
3. **段階的移動**: 機能単位で移動
4. **ドキュメント化**: 各移動の理由と日時を記録

## 実装計画

### Step 1: 新システムへの完全移行（2時間）

#### 1.1 削除フローの一本化（45分）
**対象ファイル**
- `src/ui/ProgressTable.ts`
- `src/application/ApplicationFacade.ts`

**作業内容**
```typescript
// ProgressTable.tsに直接CutDeletionServiceを注入
class ProgressTable {
  private deletionService: CutDeletionService;
  
  constructor(...) {
    // CutDeletionServiceを初期化
    this.deletionService = new CutDeletionService(...);
  }
  
  // 削除処理を新サービス経由に
  async handleDelete(cutId: string) {
    await this.deletionService.delete(cutId);
  }
}
```

#### 1.2 CommandBusのバイパス（30分）
**対象ファイル**
- `src/application/HandlerRegistry.ts`

**作業内容**
```typescript
// DeleteCutCommandHandlerの登録をコメントアウト
// this.commandBus.register('DeleteCut', ...); // Phase1: 無効化
```

#### 1.3 イベント発行の簡素化（30分）
**対象ファイル**
- `src/services/deletion/CutDeletionService.ts`

**作業内容**
- 複雑なCutDeletedEventの代わりにシンプルな通知を使用
- EventDispatcher経由を避けて直接UIを更新

#### 1.4 動作確認（15分）
- test-api-mock.htmlで削除機能をテスト
- 正常動作を確認

### Step 2: 旧システムのアーカイブ（1時間）

#### 2.1 アーカイブフォルダ作成（10分）
```bash
# アーカイブディレクトリ作成
mkdir -p src/archive/phase1-deletion-legacy/commands/handlers
mkdir -p src/archive/phase1-deletion-legacy/events
```

#### 2.2 ファイル移動スクリプト作成（20分）
```javascript
// scripts/archive-phase1.js
const filesToArchive = [
  {
    from: 'src/application/commands/DeleteCutCommand.ts',
    to: 'src/archive/phase1-deletion-legacy/commands/DeleteCutCommand.ts'
  },
  {
    from: 'src/domain/events/CutDeletedEvent.ts',
    to: 'src/archive/phase1-deletion-legacy/events/CutDeletedEvent.ts'
  },
  // ... その他のファイル
];

// 移動処理
filesToArchive.forEach(file => {
  // 1. ファイルをコピー
  // 2. import文を記録
  // 3. 元ファイルを削除
});
```

#### 2.3 移動実行とドキュメント作成（20分）
```markdown
# src/archive/phase1-deletion-legacy/README.md

## アーカイブ情報
- 移動日: 2025-09-01
- Phase: 1 (削除機能簡素化)
- 理由: CutDeletionServiceへの移行完了

## 移動したファイル
1. DeleteCutCommand.ts - コマンドパターンを廃止
2. DeleteCutCommandHandler.ts - 新サービスで代替
3. CutDeletedEvent.ts - イベントソーシング簡素化

## 復元方法
必要に応じて以下のコマンドで復元：
`npm run restore:phase1-legacy`
```

#### 2.4 import文の更新（10分）
- 移動したファイルへの参照を削除または更新
- TypeScriptコンパイルエラーの解消

### Step 3: 統合テスト（30分）

#### テストケース
1. **基本削除**
   - 単一カットの削除
   - UI表示の更新確認
   - LocalStorage永続化確認

2. **バッチ削除**
   - 複数カット同時削除
   - パフォーマンス測定

3. **エラーケース**
   - 存在しないカットの削除
   - 削除済みカットの再削除

4. **旧システムの非活性確認**
   - CommandBus経由の削除が動作しないこと
   - EventDispatcherにCutDeletedEventが流れないこと

### Step 4: パフォーマンス測定（30分）

#### 測定項目
| 項目 | 旧システム | 新システム | 改善率 |
|------|-----------|-----------|--------|
| 削除処理時間 | 測定予定 | 測定予定 | 目標50%削減 |
| 経由コンポーネント数 | 10個 | 3個 | 70%削減 |
| コード行数 | 測定予定 | 測定予定 | 目標30%削減 |
| メモリ使用量 | 測定予定 | 測定予定 | 目標20%削減 |

## ロールバック計画

### 即座のロールバック（5分）
```bash
# アーカイブから復元
npm run restore:phase1-legacy

# または手動で復元
cp -r src/archive/phase1-deletion-legacy/commands/* src/application/commands/
cp -r src/archive/phase1-deletion-legacy/events/* src/domain/events/

# HandlerRegistryの再有効化
# コメントアウトを解除
```

### 段階的ロールバック
1. CutDeletionServiceを無効化
2. CommandBus経由を再有効化
3. 動作確認後、新システムを削除

## リスク管理

| リスク | 影響度 | 可能性 | 対策 |
|--------|--------|--------|------|
| 削除機能の完全停止 | 高 | 低 | アーカイブからの即座復元 |
| 他機能への波及 | 中 | 低 | 削除機能のみに限定 |
| パフォーマンス劣化 | 低 | 低 | 事前測定と比較 |
| データ不整合 | 中 | 低 | トランザクション的処理 |

## 成功基準

### 必須条件
- [ ] 削除機能が正常動作
- [ ] コンソールエラーなし
- [ ] 旧システムファイルがarchiveに移動済み
- [ ] TypeScriptコンパイル成功

### 望ましい条件
- [ ] 削除処理時間50%削減
- [ ] コード行数30%削減
- [ ] 全テストケース合格

## 実装後の状態

### ディレクトリ構造
```
/src/
├── services/deletion/        # 新削除システム（アクティブ）
│   ├── CutDeletionService.ts
│   ├── DeletionValidator.ts
│   └── ...
├── archive/                  # 旧システム（非アクティブ）
│   └── phase1-deletion-legacy/
│       ├── commands/
│       ├── events/
│       └── README.md
└── ui/
    └── ProgressTable.ts      # 新サービス直接利用
```

### 削除処理フロー
```
1. ユーザーが削除ボタンクリック
2. ProgressTable.handleDelete()
3. CutDeletionService.delete()
4. Repository更新
5. UI即座更新
```

## 次のステップ

Phase1完了後：
1. **Phase2**: CQRSパターンの完全撤廃（他のコマンドも簡素化）
2. **Phase3**: ファイル構造の再編成
3. **Phase4**: 状態管理の一元化

## チェックリスト

### 実装前
- [ ] Phase0完了確認
- [ ] ブランチ作成
- [ ] 現在の削除処理時間測定

### 実装中
- [ ] 新システムへの移行完了
- [ ] 旧システムのアーカイブ完了
- [ ] import文の更新完了
- [ ] TypeScriptコンパイル成功

### 実装後
- [ ] 全テストケース合格
- [ ] パフォーマンス測定完了
- [ ] ドキュメント更新
- [ ] コミット＆プッシュ

---
*このドキュメントはPhase1の実装ガイドです。アーカイブ戦略により、リスクを最小化しながら確実に移行を進められます。*