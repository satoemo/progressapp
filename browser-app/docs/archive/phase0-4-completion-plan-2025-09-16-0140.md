# Phase 0.4 実施計画

## 実施日時: 2025-09-16

## 目的
Phase 0の残り15%を完了させ、技術的負債を完全に解消する

## 実施項目

### 1. IRepository重複の解決（優先度：高）
**問題**: 同じインターフェース名で異なる定義が2箇所に存在
- `/src/types/infrastructure.ts:15-20` - 削除対象
- `/src/types/repository.ts:6-11` - 維持

**作業内容**:
1. infrastructure.tsのIRepositoryを削除
2. ICutRepository, IMemoRepositoryのインポートパスを修正
3. 影響ファイルのインポートを更新

### 2. レガシーコメントの削除（優先度：高）
**11箇所のコメントを削除**:

#### Phase関連（5箇所）
1. `/src/infrastructure/UnifiedDataStore.ts:777`
2. `/src/application/ServiceContainer.ts:138`
3. `/src/ui/shared/utils/DataProcessor.ts:4-6`

#### その他（6箇所）
4. `/src/models/UnifiedCutModel.ts:97`
5. `/src/domain/events/CutEvents.ts:88`
6. `/src/core/events/TableEventManager.ts:188`
7. `/src/ui/components/table/base/BaseProgressTable.ts:280`
8. `/src/ui/shared/utils/StorageHelper.ts:322`

### 3. 未使用変数の削除（優先度：中）
**重点削除対象（約30個）**:
- main-browser.ts: `_retakeView`, `_syncIndicator`, `_currentView`
- NormaDataService.ts: `_projectId`
- CellEditor.ts: `_originalContent`
- その他プライベート変数（`_`で始まるもの）

## 実施順序
1. IRepository重複の解決（型の整合性確保）
2. レガシーコメントの削除（可読性向上）
3. 未使用変数の削除（コード簡潔化）

## 完了基準
- ビルドエラーなし
- TypeScriptコンパイルで新規エラーなし
- IRepositoryが1箇所のみに定義
- Phase関連コメントが0件

## 影響範囲
- 型定義の変更：最小限（インポートパスのみ）
- 機能への影響：なし
- UIへの影響：なし