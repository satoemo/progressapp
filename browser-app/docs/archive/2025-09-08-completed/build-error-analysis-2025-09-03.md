# ビルドエラー分析レポート - 2025-09-03

## 概要
- **総エラー数**: 145件
- **主な原因**: 削除したファイルへの参照が残っている

## エラー分類

### 1. 削除済みモジュールへの参照（最優先）

#### EventStore関連（削除済み）
| ファイル | 参照先 | 対応 |
|---------|--------|------|
| ApplicationService.ts | @/infrastructure/IEventStore | import文削除、getEventStore()削除 |
| ServiceContainer.ts | IEventStore, InMemoryEventStore, LocalStorageEventStore, HybridEventStore | 全て削除、EventStore関連メソッド削除 |
| EventSourcedCutRepository.ts | IEventStore | ファイル自体を削除候補 |
| EventSourcedMemoRepository.ts | IEventStore | ファイル自体を削除候補 |

#### Handler関連（削除済み）
| ファイル | 参照先 | 対応 |
|---------|--------|------|
| HandlerRegistry.ts | commands/handlers/*, queries/handlers/* | registerAll()メソッド削除 or ファイル削除 |
| CommandBus.ts | CommandHandler関連 | ハンドラー登録処理を削除 |

#### Aggregate関連（削除済み）
| ファイル | 参照先 | 対応 |
|---------|--------|------|
| IRepository.ts | CutAggregate | CutDataに変更 |
| IMemoRepository.ts | MemoAggregate | 簡易型に変更 |
| EventSourcedCutRepository.ts | CutAggregate | ファイル削除候補 |
| api/KintoneJsonMapper.ts | CutAggregate | CutDataに変更 |

### 2. 型定義エラー

#### CutData型の不整合
| ファイル | 問題 | 対応 |
|---------|------|------|
| CutCreateService.ts:125 | scene存在しない | sceneフィールドを削除 |
| CutReadService.ts:179 | completionRate存在しない | 計算フィールドを削除 |
| CutReadService.ts:209 | scene存在しない | sceneフィールドを削除 |
| UnifiedCutModel.ts:120 | completionRate存在しない | 拡張型として定義 |

#### Command/Query型の不整合
| ファイル | 問題 | 対応 |
|---------|------|------|
| CreateCutCommand.ts | 宣言修飾子の不一致 | readonlyに統一 |
| DeleteCutCommand.ts | 宣言修飾子の不一致 | readonlyに統一 |
| UpdateBasicInfoCommand.ts | 宣言修飾子の不一致 | readonlyに統一 |

### 3. async/await関連
| ファイル | 問題 | 対応 |
|---------|------|------|
| ApplicationFacade.ts:321,335 | voidをCutDataに代入 | awaitを追加済み ✓ |
| CommandBus.ts:146,151 | 引数の不一致 | 型定義を修正 |

### 4. その他のエラー
| ファイル | 問題 | 対応 |
|---------|------|------|
| ServiceLocator.ts:80 | undefinedの可能性 | nullチェック追加 |
| ReadModelMigrationService.ts | CutDataプロパティ不足 | 必須フィールドを追加 |

## 修正優先順位

### Phase A: 即座に削除可能（30分）
1. **削除するファイル**
   - `src/infrastructure/EventSourcedCutRepository.ts`
   - `src/infrastructure/EventSourcedMemoRepository.ts`
   - `src/application/HandlerRegistry.ts`（または中身を空に）

### Phase B: import文の削除（1時間）
1. **ApplicationService.ts**
   - IEventStore関連のimport削除
   - getEventStore()メソッド削除

2. **ServiceContainer.ts**
   - EventStore関連のimport削除
   - EventStore関連メソッド削除

### Phase C: 型定義の修正（1時間）
1. **Command系ファイル**
   - readonlyに統一

2. **CutData関連**
   - sceneフィールドの参照を削除
   - completionRateの参照を削除

### Phase D: リファクタリング（2時間）
1. **IRepository.ts, IMemoRepository.ts**
   - Aggregate参照をData型に変更

2. **CommandBus.ts**
   - ハンドラー登録処理を簡素化

## 期待される結果
- エラー数: 145 → 20件以下
- ビルド成功
- アプリケーション起動可能

## 実装順序
1. Phase A: ファイル削除
2. Phase B: import文削除
3. Phase C: 型定義修正
4. Phase D: リファクタリング（オプション）