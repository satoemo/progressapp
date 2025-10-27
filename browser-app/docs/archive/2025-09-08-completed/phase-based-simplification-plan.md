# フェーズベース簡素化実装計画 - 現在システムとの比較

## 現在のシステム構造分析

### 現在のアーキテクチャ（AS-IS）
```
src/
├── application/           # CQRSレイヤー（複雑）
│   ├── commands/         # 24個のCommandファイル
│   │   └── handlers/     # CommandHandler群
│   ├── queries/          # Query定義
│   │   └── handlers/     # QueryHandler群
│   ├── ApplicationFacade.ts
│   ├── ApplicationService.ts
│   ├── CommandBus.ts
│   ├── QueryBus.ts
│   ├── ServiceContainer.ts
│   └── UnifiedEventCoordinator.ts
│
├── domain/               # DDDレイヤー
│   ├── aggregates/       # CutAggregate等
│   ├── events/           # CutEvents
│   ├── types.ts
│   └── field-metadata/
│
├── infrastructure/       # 永続化レイヤー（複雑）
│   ├── EventSourcedCutRepository.ts
│   ├── SimplifiedStore.ts
│   ├── IRepository.ts
│   ├── CutReadModel.ts
│   └── api/
│       └── MockKintoneApiClient.ts
│
├── services/            # 新サービスレイヤー（Phase 2で追加）
│   ├── core/
│   │   ├── UnifiedCutService.ts
│   │   └── SimplifiedReadModel.ts
│   ├── deletion/        # 削除処理（複雑）
│   │   ├── CutDeletionService.ts
│   │   ├── DeletionValidator.ts
│   │   ├── DeletionState.ts
│   │   └── DeletionPersistence.ts
│   ├── migration/
│   │   ├── CommandMigrationAdapter.ts
│   │   ├── QueryMigrationAdapter.ts
│   │   └── ReadModelMigrationService.ts
│   └── ServiceLocator.ts
│
└── ui/                  # UIレイヤー
    ├── ProgressTable.ts  # Command/Query使用
    ├── staff/
    │   └── StaffView.ts  # Command/Query使用
    └── cell-editor/
        └── CellEditor.ts # UpdateBasicInfoCommand使用
```

### 問題のデータフロー
```
UI → Command → CommandBus → CommandHandler → Aggregate 
→ Event → EventDispatcher → UnifiedEventCoordinator 
→ ReadModelUpdateService → ReadModelStore → Query 
→ QueryBus → QueryHandler → UI
```
**経由コンポーネント数: 12個**

## Phase 1: 即座の簡素化（1週間）

### 目標
- 削除処理を10コンポーネントから2コンポーネントへ
- データフローを12ステップから4ステップへ

### Step 1.1: SimpleCutDeletionService実装（2時間）

#### 現在の削除処理
```typescript
// 現在: 10個のコンポーネントが関与
1. DeleteButtonHandler (UI)
2. DeleteCutCommand 
3. CommandBus
4. DeleteCutCommandHandler
5. CutAggregate
6. CutDeletedEvent
7. EventDispatcher
8. UnifiedEventCoordinator
9. ReadModelUpdateService
10. ReadModelStore
```

#### 新しい削除処理
```typescript
// src/services/simplified/SimpleCutDeletionService.ts
export class SimpleCutDeletionService {
  async delete(cutId: string): Promise<void> {
    // 1. 直接データアクセス
    const data = localStorage.getItem(`cut_${cutId}`);
    if (!data) throw new Error('Cut not found');
    
    const cut = JSON.parse(data);
    
    // 2. 削除フラグ設定
    cut.isDeleted = true;
    cut.deletedAt = new Date().toISOString();
    
    // 3. 保存
    localStorage.setItem(`cut_${cutId}`, JSON.stringify(cut));
    
    // 4. UI通知（シンプル）
    window.dispatchEvent(new CustomEvent('cutDeleted', { detail: cutId }));
  }
}
```

### Step 1.2: SimpleCutService実装（3時間）

#### 現在のCRUD処理
```typescript
// 現在: Create処理の流れ
UI → CreateCutCommand → CommandBus → CreateCutCommandHandler 
→ CutAggregate → CutCreatedEvent → EventStore → ReadModel
```

#### 新しいCRUD処理
```typescript
// src/services/simplified/SimpleCutService.ts
export class SimpleCutService {
  private storage = localStorage;
  
  async create(data: Partial<Cut>): Promise<Cut> {
    const id = `cut_${Date.now()}`;
    const cut = {
      id,
      ...data,
      createdAt: new Date().toISOString(),
      isDeleted: false
    };
    
    this.storage.setItem(id, JSON.stringify(cut));
    this.notifyUI('cutCreated', cut);
    return cut;
  }
  
  async findById(id: string): Promise<Cut | null> {
    const data = this.storage.getItem(id);
    return data ? JSON.parse(data) : null;
  }
  
  async findAll(): Promise<Cut[]> {
    const cuts = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith('cut_')) {
        const cut = JSON.parse(this.storage.getItem(key)!);
        if (!cut.isDeleted) {
          cuts.push(cut);
        }
      }
    }
    return cuts;
  }
  
  async update(id: string, changes: Partial<Cut>): Promise<Cut> {
    const cut = await this.findById(id);
    if (!cut) throw new Error('Cut not found');
    
    Object.assign(cut, changes, {
      updatedAt: new Date().toISOString()
    });
    
    this.storage.setItem(id, JSON.stringify(cut));
    this.notifyUI('cutUpdated', cut);
    return cut;
  }
  
  private notifyUI(event: string, data: any): void {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
}
```

### Step 1.3: MigrationAdapter更新（2時間）

#### 既存システムとの接続
```typescript
// src/services/migration/SimplifiedMigrationAdapter.ts
export class SimplifiedMigrationAdapter {
  constructor(
    private simpleCutService: SimpleCutService,
    private simpleDeletionService: SimpleCutDeletionService
  ) {}
  
  // CommandBusからの呼び出しを新サービスへ転送
  async handleCommand(command: any): Promise<any> {
    switch (command.constructor.name) {
      case 'CreateCutCommand':
        return this.simpleCutService.create(command.data);
        
      case 'UpdateBasicInfoCommand':
      case 'UpdateProgressCommand':
        return this.simpleCutService.update(command.cutId, command.data);
        
      case 'DeleteCutCommand':
        return this.simpleDeletionService.delete(command.cutId);
        
      default:
        console.warn('Unknown command:', command);
        return null;
    }
  }
  
  // QueryBusからの呼び出しを新サービスへ転送
  async handleQuery(query: any): Promise<any> {
    switch (query.constructor.name) {
      case 'GetAllCutsQuery':
        return this.simpleCutService.findAll();
        
      case 'GetCutByIdQuery':
        return this.simpleCutService.findById(query.cutId);
        
      default:
        console.warn('Unknown query:', query);
        return null;
    }
  }
}
```

### Phase 1 テスト計画
```javascript
// test-api-mock.htmlに追加
async function testPhase1Simplification() {
  console.log('=== Phase 1 簡素化テスト ===');
  
  // 新サービス初期化
  const cutService = new SimpleCutService();
  const deletionService = new SimpleCutDeletionService();
  
  // 1. 作成テスト
  const cut = await cutService.create({
    cutNumber: 1,
    scene: 'テストシーン'
  });
  console.log('✅ 作成成功:', cut.id);
  
  // 2. 更新テスト
  await cutService.update(cut.id, { scene: '更新シーン' });
  console.log('✅ 更新成功');
  
  // 3. 削除テスト
  await deletionService.delete(cut.id);
  console.log('✅ 削除成功');
  
  // 4. パフォーマンス比較
  console.time('新システム: 100件作成');
  for (let i = 0; i < 100; i++) {
    await cutService.create({ cutNumber: i });
  }
  console.timeEnd('新システム: 100件作成');
}
```

## Phase 2: Command/Query統合（2週間）

### 目標
- CommandBus/QueryBus を削除
- UIからの直接サービス呼び出しへ移行

### Step 2.1: ApplicationFacade拡張（3日）

#### 現在
```typescript
// UI側のコード
const command = new UpdateBasicInfoCommand(cutId, data);
await this.appService.getCommandBus().execute(command);
```

#### 移行後
```typescript
// UI側のコード（新API）
await this.appService.getCutService().update(cutId, data);
```

### Step 2.2: UIコンポーネント移行（1週間）

#### 移行対象と優先順位
| コンポーネント | Command/Query使用数 | 優先度 | 工数 |
|--------------|-------------------|--------|------|
| CellEditor.ts | 1 (UpdateBasicInfo) | 高 | 2時間 |
| FilterManager.ts | 1 (GetAllCuts) | 高 | 2時間 |
| ProgressTable.ts | 6 | 中 | 4時間 |
| StaffView.ts | 4 | 低 | 3時間 |

### Step 2.3: 旧システムファイル削除（3日）

#### 削除対象
```
application/commands/    # 24ファイル
application/queries/     # 8ファイル
application/CommandBus.ts
application/QueryBus.ts
domain/aggregates/       # 3ファイル
infrastructure/EventSourced*.ts
```

## Phase 3: ファイル構造再編（1ヶ月）

### 目標構造（TO-BE）
```
src/
├── components/      # UIコンポーネント（旧ui/）
│   ├── tables/
│   ├── dialogs/
│   └── forms/
├── services/        # ビジネスロジック
│   ├── cut/
│   │   ├── CutService.ts
│   │   └── CutDeletionService.ts
│   ├── staff/
│   └── export/
├── data/           # データアクセス
│   ├── repositories/
│   └── models/
├── utils/          # ユーティリティ
└── types/          # 型定義
```

### 移行マッピング
| 現在 | 移行先 | 理由 |
|-----|--------|------|
| ui/ | components/ | 明確な責任分離 |
| application/ | 削除 | CQRS不要 |
| domain/ | services/ + types/ | DDDからシンプルサービスへ |
| infrastructure/ | data/ | 簡潔な名前 |
| services/migration/ | 削除 | 移行完了後不要 |


## リスクと対策

### Phase 1のリスク
- **リスク**: 既存システムとの不整合
- **対策**: MigrationAdapterで完全互換性維持

### Phase 2のリスク
- **リスク**: UI更新時のバグ
- **対策**: 1コンポーネントずつ段階的移行

### Phase 3のリスク
- **リスク**: import文の大量修正
- **対策**: 自動リファクタリングツール使用