# 簡素化実装計画 - 2025-09-02

## 概要
アーキテクチャ簡素化提案書（2025-08-27）に基づき、プロジェクト規模に適したシンプルなアーキテクチャへの段階的移行計画を定めます。

## 基本方針
1. **即座に効果が出る部分から着手**（削除処理の簡素化）
2. **既存機能を維持しながら段階的移行**
3. **各ステップでテスト可能な最小単位で実装**

## Phase 1: 即座の簡素化（1週間）

### Step 1.1: 削除処理の一元化（2時間）

#### 現状の問題
- 削除処理が10以上のコンポーネントを経由
- DeletedEventとReadModelの同期不整合
- デバッグに数時間必要

#### 実装内容
```typescript
// src/services/simplified/SimpleCutDeletionService.ts
export class SimpleCutDeletionService {
  async delete(cutId: string): Promise<void> {
    // 1. データ取得
    const cut = await this.getCut(cutId);
    
    // 2. バリデーション
    if (!cut || cut.isDeleted) {
      throw new Error('カットが存在しないか、既に削除されています');
    }
    
    // 3. 削除実行（シンプルなフラグ更新）
    cut.isDeleted = true;
    cut.deletedAt = new Date();
    
    // 4. 保存
    await this.saveCut(cut);
    
    // 5. UI通知（シンプルなイベント）
    this.notifyUI('cutDeleted', cutId);
  }
}
```

#### テスト方法
```javascript
// test-all-phase1.js
async function testSimpleDeletion() {
  const service = new SimpleCutDeletionService();
  
  // 削除実行
  await service.delete('cut-1');
  
  // 確認
  const cut = await service.getCut('cut-1');
  assert(cut.isDeleted === true);
  
  // リロード後も削除状態維持
  location.reload();
  const reloadedCut = await service.getCut('cut-1');
  assert(reloadedCut.isDeleted === true);
}
```

### Step 1.2: 統合CRUDサービスの作成（3時間）

#### 実装内容
```typescript
// src/services/simplified/SimpleCutService.ts
export class SimpleCutService {
  private cuts: Map<string, Cut> = new Map();
  
  // Create
  async create(data: Partial<Cut>): Promise<Cut> {
    const id = this.generateId();
    const cut = { id, ...data, createdAt: new Date() };
    this.cuts.set(id, cut);
    await this.persist();
    return cut;
  }
  
  // Read
  async findById(id: string): Promise<Cut | null> {
    return this.cuts.get(id) || null;
  }
  
  async findAll(): Promise<Cut[]> {
    return Array.from(this.cuts.values())
      .filter(cut => !cut.isDeleted);
  }
  
  // Update
  async update(id: string, data: Partial<Cut>): Promise<Cut> {
    const cut = this.cuts.get(id);
    if (!cut) throw new Error('Cut not found');
    
    Object.assign(cut, data, { updatedAt: new Date() });
    await this.persist();
    return cut;
  }
  
  // Delete（SimpleCutDeletionServiceを使用）
  async delete(id: string): Promise<void> {
    const deletionService = new SimpleCutDeletionService();
    await deletionService.delete(id);
  }
}
```

### Step 1.3: 既存システムとの接続（2時間）

#### 実装内容
```typescript
// src/services/migration/ServiceAdapter.ts
export class ServiceAdapter {
  constructor(
    private simpleCutService: SimpleCutService,
    private legacyCommandBus: CommandBus
  ) {}
  
  // 既存のCommandBusからの呼び出しを新サービスへ転送
  async handleCommand(command: Command): Promise<any> {
    switch (command.type) {
      case 'CreateCut':
        return this.simpleCutService.create(command.data);
      case 'UpdateCut':
        return this.simpleCutService.update(command.id, command.data);
      case 'DeleteCut':
        return this.simpleCutService.delete(command.id);
      default:
        // 未対応のコマンドは既存システムへ
        return this.legacyCommandBus.execute(command);
    }
  }
}
```

## Phase 2: 中期的簡素化（2週間）

### Step 2.1: Command/Query統合（1週間）

#### 目標
- CommandBusとQueryBusを統合
- 直接的なサービス呼び出しへ移行

#### 実装計画
1. ApplicationFacadeに統合APIを追加
2. UIコンポーネントを段階的に移行
3. 旧Command/Queryクラスを削除

### Step 2.2: Event Sourcing削減（1週間）

#### 目標
- Event Storeを単純なログに置き換え
- Aggregateパターンを削除
- ReadModel/WriteModel統合

## Phase 3: 長期的最適化（1ヶ月）

### Step 3.1: ファイル構造再編成

#### 新構造
```
src/
├── components/     # UIコンポーネント
│   ├── tables/
│   ├── dialogs/
│   └── forms/
├── services/       # ビジネスロジック
│   ├── cut/
│   ├── staff/
│   └── export/
├── data/          # データアクセス
│   ├── repositories/
│   └── models/
├── utils/         # ユーティリティ
└── types/         # 型定義
```

### Step 3.2: 状態管理の簡素化

#### 目標
- シンプルなStateストア実装
- 不要な抽象化の削除

## テスト戦略

### 1. 統合テスト重視
- 各機能の end-to-end テスト
- test-api-mock.html での実機確認

### 2. 段階的テスト
- 各Stepごとにテストを実装
- 既存機能の regression test

### 3. パフォーマンス測定
- 各Phase完了時に測定
- Before/After比較

## 成功指標

### Phase 1（1週間後）
- [ ] 削除バグ解消
- [ ] 削除処理時間 50%短縮
- [ ] コード行数 10%削減

### Phase 2（3週間後）
- [ ] Command/Query統合完了
- [ ] コード行数 30%削減
- [ ] 新機能開発速度 30%向上

### Phase 3（2ヶ月後）
- [ ] ファイル構造再編完了
- [ ] コード行数 40%削減
- [ ] 保守コスト 50%削減

## リスク管理

### 移行中の不整合
- **対策**: フィーチャーフラグによる切り替え
- **ロールバック**: 各Stepで元に戻せる設計

### パフォーマンス劣化
- **対策**: 各Step完了時に測定
- **基準**: 10%以上の劣化で見直し

## 次のアクション

1. **Phase 1 Step 1.1 から開始**
   - SimpleCutDeletionService の実装
   - テストの作成と実行

2. **進捗の追跡**
   - 各Step完了時にドキュメント更新
   - 問題があれば即座に報告

3. **定期レビュー**
   - 週次で進捗確認
   - 必要に応じて計画調整