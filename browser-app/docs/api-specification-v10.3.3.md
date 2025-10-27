# API仕様書 v10.3.3

作成日: 2025-09-16

## 目次
1. [概要](#概要)
2. [ApplicationFacade API](#applicationfacade-api)
3. [CoreService API](#coreservice-api)
4. [データ型定義](#データ型定義)
5. [イベントAPI](#イベントapi)
6. [エラーコード](#エラーコード)
7. [使用例](#使用例)

---

## 概要

本仕様書は、kintone進捗管理アプリ v10.3.3の公開APIを定義します。
主要なエントリーポイントはApplicationFacadeクラスで、シングルトンパターンで実装されています。

### APIアクセス方法

```typescript
import { ApplicationFacade } from '@/core/ApplicationFacade';

// シングルトンインスタンス取得
const facade = ApplicationFacade.getInstance();

// 初期化
await facade.initialize({
  useLocalStorage: true,
  enablePerformanceMonitoring: false
});
```

---

## ApplicationFacade API

### インスタンス管理

#### getInstance()
シングルトンインスタンスを取得

```typescript
static getInstance(): ApplicationFacade
```

**戻り値**
- ApplicationFacadeのシングルトンインスタンス

---

### 初期化

#### initialize(config?)
アプリケーションを初期化

```typescript
async initialize(config?: ApplicationFacadeConfig): Promise<void>
```

**パラメータ**
- `config` (optional): 初期化設定

```typescript
interface ApplicationFacadeConfig {
  useLocalStorage?: boolean;           // LocalStorage使用（デフォルト: true）
  snapshotFrequency?: number;         // スナップショット頻度（ミリ秒）
  enablePerformanceMonitoring?: boolean; // パフォーマンス監視
}
```

**例**
```typescript
await facade.initialize({
  useLocalStorage: true,
  snapshotFrequency: 300000,  // 5分ごと
  enablePerformanceMonitoring: false
});
```

---

### カット操作

#### createCut(data)
新規カットを作成

```typescript
async createCut(data: Partial<CutData>): Promise<CutData>
```

**パラメータ**
- `data`: カットデータ（部分的）

**戻り値**
- 作成されたカットデータ（IDを含む完全なデータ）

**例外**
- `ValidationError`: データ検証エラー
- `StorageError`: ストレージアクセスエラー

**例**
```typescript
const newCut = await facade.createCut({
  cutNumber: 'C001',
  status: '作業中',
  special: 'A',
  kenyo: '兼用',
  maisu: '24'
});
console.log(newCut.id); // 自動生成されたID
```

---

#### updateCut(id, data)
カット情報を更新

```typescript
async updateCut(id: string, data: Partial<CutData>): Promise<void>
```

**パラメータ**
- `id`: カットID
- `data`: 更新データ（部分的）

**例外**
- `NotFoundError`: カットが存在しない
- `ValidationError`: データ検証エラー

**例**
```typescript
await facade.updateCut('cut_001', {
  status: '完了',
  completionRate: 100
});
```

---

#### deleteCut(id)
カットを削除（論理削除）

```typescript
async deleteCut(id: string): Promise<void>
```

**パラメータ**
- `id`: カットID

**例外**
- `NotFoundError`: カットが存在しない

---

#### getCutById(id)
IDでカットを取得（非同期）

```typescript
async getCutById(id: string): Promise<CutData | null>
```

**パラメータ**
- `id`: カットID

**戻り値**
- カットデータまたはnull

---

#### getCutByCutNumber(cutNumber)
カット番号でカットを取得（同期）

```typescript
getCutByCutNumber(cutNumber: string): CutData | null
```

**パラメータ**
- `cutNumber`: カット番号

**戻り値**
- カットデータまたはnull

---

#### getAllCuts(filter?)
全カットを取得（フィルタリング可能）

```typescript
getAllCuts(filter?: CutFilter): CutData[]
```

**パラメータ**
- `filter` (optional): フィルタ条件

```typescript
interface CutFilter {
  scene?: string;
  status?: string;
  manager?: string;
  cutNumber?: string;
  isDeleted?: boolean;
}
```

**戻り値**
- カットデータの配列

**例**
```typescript
// 作業中のカットのみ取得
const workingCuts = facade.getAllCuts({
  status: '作業中'
});

// シーン1のカットのみ取得
const scene1Cuts = facade.getAllCuts({
  scene: 'シーン1'
});
```

---

### メモ操作

#### getCellMemo(cutNumber, fieldKey)
セルメモを取得

```typescript
getCellMemo(cutNumber: string, fieldKey: string): string | undefined
```

**パラメータ**
- `cutNumber`: カット番号
- `fieldKey`: フィールドキー

**戻り値**
- メモ内容またはundefined

---

#### updateCellMemo(cutNumber, fieldKey, content)
セルメモを更新

```typescript
updateCellMemo(cutNumber: string, fieldKey: string, content: string): void
```

**パラメータ**
- `cutNumber`: カット番号
- `fieldKey`: フィールドキー
- `content`: メモ内容（空文字で削除）

**例**
```typescript
// メモ追加
facade.updateCellMemo('C001', 'status', '確認待ち');

// メモ削除
facade.updateCellMemo('C001', 'status', '');
```

---

### イベント購読

#### subscribe(eventType, handler)
イベントを購読

```typescript
subscribe(eventType: string, handler: EventHandler): () => void
```

**パラメータ**
- `eventType`: イベントタイプ
- `handler`: イベントハンドラ関数

**戻り値**
- 購読解除関数

```typescript
type EventHandler = (event: DomainEvent) => void | Promise<void>;
```

**例**
```typescript
const unsubscribe = facade.subscribe('CutCreated', (event) => {
  console.log('新規カット作成:', event.payload);
});

// 購読解除
unsubscribe();
```

---

### データアクセス統計

#### getStatistics()
データアクセス統計を取得

```typescript
getStatistics(): DataAccessStatistics
```

**戻り値**
```typescript
interface DataAccessStatistics {
  totalReads: number;
  totalWrites: number;
  cacheHitRate: number;
  averageResponseTime: number;
}
```

---

### バックアップ・リストア

#### backup()
データをバックアップ

```typescript
async backup(): Promise<BackupData>
```

**戻り値**
- バックアップデータ

---

#### restore(backupData)
データをリストア

```typescript
async restore(backupData: BackupData): Promise<void>
```

**パラメータ**
- `backupData`: バックアップデータ

---

## CoreService API

CoreServiceはApplicationFacade内部で使用されますが、直接アクセスも可能です。

### カット操作（内部API）

```typescript
class CoreService {
  // カット作成（検証付き）
  async createCut(data: Partial<CutData>): Promise<CutData>
  
  // カット更新（検証付き）
  async updateCut(id: string, data: Partial<CutData>): Promise<void>
  
  // カット削除
  async deleteCut(cutId: string): Promise<void>
  
  // カット取得（同期）
  getCut(id: string): CutData | null
  
  // 全カット取得（フィルタ・ソート対応）
  getAllCuts(options?: FilterOptions): CutData[]
  
  // メモ取得
  async getCellMemo(cutNumber: string, fieldKey: string): Promise<string | undefined>
  
  // メモ更新
  async updateCellMemo(cutNumber: string, fieldKey: string, content: string): Promise<void>
}
```

### FilterOptions詳細

```typescript
interface FilterOptions {
  filter?: Record<string, any>;     // フィルタ条件
  sort?: {
    field: string;                   // ソートフィールド
    order?: 'asc' | 'desc';         // ソート順（デフォルト: 'asc'）
  };
  page?: number;                    // ページ番号（1始まり）
  pageSize?: number;                // ページサイズ
}
```

---

## データ型定義

### CutData
カットデータの完全な型定義

```typescript
interface CutData {
  // 基本情報（9フィールド）
  id: string;                        // 自動生成ID
  cutNumber: string;                 // カット番号
  status: string;                    // ステータス
  special: string;                   // 特殊
  kenyo: string;                     // 兼用
  maisu: string;                     // 枚数
  manager: string;                   // 担当者
  ensyutsu: string;                  // 演出
  sousakkan: string;                 // 総作監
  
  // 削除フラグ
  isDeleted?: string | boolean;
  
  // 拡張フィールド
  scene?: string;                    // シーン
  completionRate?: number;           // 完了率
  totalCost?: number;               // 総コスト
  
  // LO情報（4フィールド）
  loManager: string;                 // LO担当
  loSakkan: string;                  // LO作監
  loOffice: string;                  // LO会社
  loCost: string;                    // LOコスト
  
  // LO進捗（10フィールド）
  _3dLoCheck: string;                // 3DLOチェック
  _3dLoRender: string;               // 3DLOレンダー
  sakuuchi: string;                  // 作打ち
  loIn: string;                      // LO In
  loUp: string;                      // LO Up
  ensyutsuUp: string;                // 演出 Up
  sakkanUp: string;                  // 作監 Up
  losakkanUp: string;                // LO作監 Up
  sosakkanUp: string;                // 総作監 Up
  genzuUp: string;                   // 原図 Up
  
  // 原画情報（4フィールド）
  genManager: string;
  genSakkan: string;
  genOffice: string;
  genCost: string;
  
  // 原画進捗（4フィールド）
  genIn: string;
  genUp: string;
  genEnsyutsuUp: string;
  genSakkanUp: string;
  
  // 動画情報（4フィールド）
  dougaManager: string;
  dougaOffice: string;
  dougaMaki: string;
  dougaCost: string;
  
  // 動画進捗（2フィールド）
  dougaIn: string;
  dougaUp: string;
  
  // 動検情報（3フィールド）
  doukenManager: string;
  doukenOffice: string;
  doukenCost: string;
  
  // 動検進捗（2フィールド）
  doukenIn: string;
  doukenUp: string;
  
  // 色進捗（2フィールド）
  iroIn: string;
  iroUp: string;
  
  // 仕上げ情報（3フィールド）
  shiageManager: string;
  shiageOffice: string;
  shiageCost: string;
  
  // 仕上げ進捗（2フィールド）
  shiageIn: string;
  shiageUp: string;
  
  // 試験・その他進捗（8フィールド）
  shikenIn: string;
  shikenUp: string;
  tokkouIn: string;
  tokkouUp: string;
  haikeiIn: string;
  haikeiUp: string;
  bikanIn: string;
  bikanUp: string;
  
  // 2D/3D進捗（4フィールド）
  _2dIn: string;
  _2dUp: string;
  _3dIn: string;
  _3dUp: string;
  
  // 撮影進捗（10フィールド）
  satsuBg: string;
  satsu2d: string;
  satsu3d: string;
  satsuToku: string;
  satsuHon: string;
  satsuIre: string;
  satsuTimingRoll: string;
  satsuTimingIn: string;
  satsuHonRoll: string;
  satsuHonUp: string;
  
  // システムフィールド
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}
```

### フィールドキー型

```typescript
type FieldKey = keyof CutData;

// 進捗フィールド
type ProgressFieldKey = 
  | '_3dLoCheck' | '_3dLoRender' | 'sakuuchi' 
  | 'loIn' | 'loUp' | 'ensyutsuUp' 
  // ... 他の進捗フィールド

// 情報フィールド  
type InfoFieldKey = 
  | 'loManager' | 'loSakkan' | 'loOffice' | 'loCost'
  | 'genManager' | 'genSakkan' | 'genOffice' | 'genCost'
  // ... 他の情報フィールド
```

---

## イベントAPI

### イベントタイプ

```typescript
type DomainEventType = 
  | 'CutCreated'           // カット作成
  | 'CutUpdated'           // カット更新
  | 'CutDeleted'           // カット削除
  | 'CellMemoUpdated'      // セルメモ更新
  | 'StateChanged'         // 状態変更
  | 'SyncStarted'          // 同期開始
  | 'SyncCompleted'        // 同期完了
  | 'SyncFailed'           // 同期失敗
  | 'ErrorOccurred'        // エラー発生
  | 'BackupCreated'        // バックアップ作成
  | 'RestoreCompleted';    // リストア完了
```

### DomainEvent構造

```typescript
class DomainEvent {
  type: string;              // イベントタイプ
  payload: any;              // イベントデータ
  metadata: {
    timestamp: number;       // タイムスタンプ
    source: string;          // 発生源
    userId?: string;         // ユーザーID
    correlationId?: string;  // 相関ID
  };
}
```

### イベントペイロード例

#### CutCreated
```typescript
{
  type: 'CutCreated',
  payload: {
    cut: CutData           // 作成されたカットデータ
  }
}
```

#### CutUpdated
```typescript
{
  type: 'CutUpdated',
  payload: {
    id: string,            // カットID
    changes: Partial<CutData>, // 変更内容
    previousValues: Partial<CutData> // 変更前の値
  }
}
```

#### CellMemoUpdated
```typescript
{
  type: 'CellMemoUpdated',
  payload: {
    cutNumber: string,     // カット番号
    fieldKey: string,      // フィールドキー
    content: string,       // メモ内容
    previousContent?: string // 前のメモ内容
  }
}
```

---

## エラーコード

### エラーコード体系

```typescript
enum ErrorCode {
  // ネットワークエラー (1xxx)
  NETWORK_ERROR = 1000,
  TIMEOUT = 1001,
  CONNECTION_LOST = 1002,
  
  // バリデーションエラー (2xxx)
  VALIDATION_ERROR = 2000,
  REQUIRED_FIELD_MISSING = 2001,
  INVALID_FORMAT = 2002,
  VALUE_OUT_OF_RANGE = 2003,
  
  // 権限エラー (3xxx)
  UNAUTHORIZED = 3000,
  FORBIDDEN = 3001,
  SESSION_EXPIRED = 3002,
  
  // システムエラー (4xxx)
  INTERNAL_ERROR = 4000,
  STORAGE_FULL = 4001,
  MEMORY_EXCEEDED = 4002,
  
  // データエラー (5xxx)
  NOT_FOUND = 5000,
  ALREADY_EXISTS = 5001,
  CONFLICT = 5002,
  STALE_DATA = 5003,
  
  // 不明なエラー (9xxx)
  UNKNOWN_ERROR = 9999
}
```

### エラーレスポンス構造

```typescript
interface ErrorResponse {
  code: ErrorCode;           // エラーコード
  message: string;           // エラーメッセージ
  details?: any;             // 詳細情報
  timestamp: string;         // 発生時刻
  context?: string;          // コンテキスト情報
  recoverable?: boolean;     // 回復可能フラグ
  retryAfter?: number;       // リトライ待機時間（秒）
}
```

---

## 使用例

### 基本的な使用例

```typescript
// アプリケーション初期化
const facade = ApplicationFacade.getInstance();
await facade.initialize({
  useLocalStorage: true
});

// イベント購読
const unsubscribe = facade.subscribe('CutCreated', async (event) => {
  console.log('カット作成:', event.payload.cut.cutNumber);
});

// カット作成
const newCut = await facade.createCut({
  cutNumber: 'C001',
  status: '作業中',
  special: 'A',
  kenyo: '兼用',
  maisu: '24'
});

// カット更新
await facade.updateCut(newCut.id, {
  status: '完了',
  completionRate: 100
});

// メモ追加
facade.updateCellMemo('C001', 'status', '最終チェック済み');

// カット検索
const cuts = facade.getAllCuts({
  status: '完了'
});

// バックアップ
const backup = await facade.backup();
localStorage.setItem('backup', JSON.stringify(backup));

// クリーンアップ
unsubscribe();
```

### エラーハンドリング例

```typescript
try {
  await facade.createCut({
    cutNumber: '', // 必須フィールドが空
  });
} catch (error) {
  if (error.code === ErrorCode.REQUIRED_FIELD_MISSING) {
    console.error('必須フィールドが不足:', error.message);
  } else if (error.code === ErrorCode.VALIDATION_ERROR) {
    console.error('検証エラー:', error.details);
  } else {
    console.error('予期しないエラー:', error);
  }
}
```

### バッチ処理例

```typescript
// 複数カットの一括更新
const cuts = facade.getAllCuts({ status: '作業中' });

for (const cut of cuts) {
  try {
    // 進捗率を計算して更新
    const rate = calculateCompletionRate(cut);
    await facade.updateCut(cut.id, {
      completionRate: rate
    });
  } catch (error) {
    console.error(`カット ${cut.cutNumber} の更新失敗:`, error);
    continue; // エラーがあっても続行
  }
}
```

### リアルタイム同期例

```typescript
// 同期イベントの監視
facade.subscribe('SyncStarted', () => {
  console.log('同期開始...');
  showLoadingIndicator();
});

facade.subscribe('SyncCompleted', (event) => {
  console.log('同期完了:', event.payload.syncedCount, '件');
  hideLoadingIndicator();
});

facade.subscribe('SyncFailed', (event) => {
  console.error('同期失敗:', event.payload.error);
  showErrorMessage('同期に失敗しました');
});
```

---

## APIバージョニング

### 現在のバージョン
- **API Version**: 10.3.3
- **互換性**: v10.x.xと後方互換

### 廃止予定API
なし

### 今後の拡張予定
- GraphQL対応
- WebSocket リアルタイム通信
- バッチAPI
- 非同期ジョブAPI

---

*本仕様書はkintone進捗管理アプリ v10.3.3のAPI仕様を定義しています。*