# イベント管理簡素化提案 - 2025-08

## 概要

現在のEvent Sourcing + CQRSアーキテクチャからシンプルな階層構造への移行において、イベント管理をどのように設計するかの提案と比較分析。

## 現在のイベント管理の複雑さ

### 現在の構造
```
DeleteCommand → CutAggregate → CutDeletedEvent → EventDispatcher 
→ UnifiedEventCoordinator → ReadModelUpdateService → ReadModelStore
→ GetAllCutsQuery → UI更新
```

### 問題点
- 6層以上のイベントフロー
- Event Soucing による完全なイベント履歴管理（kintoneとの二重永続化）
- ReadModelとDomainModelの複雑な同期
- デバッグ困難な非同期処理

## 提案：3つのアプローチ

### アプローチ1: イベント完全廃止（最もシンプル）

#### 構造
```
Command → Service → Repository → Query → UI
```

#### 実装例
```typescript
class CutService {
  async deleteCut(cutId: string): Promise<void> {
    // 1. バリデーション
    const cut = await this.repository.findById(cutId);
    if (!cut) throw new Error('Cut not found');
    if (cut.isDeleted) throw new Error('Already deleted');
    
    // 2. 削除実行
    cut.markAsDeleted();
    await this.repository.save(cut);
    
    // 3. 監査ログ記録
    await this.auditService.log({
      operation: 'DELETE_CUT',
      entityId: cutId,
      timestamp: new Date()
    });
    
    // 4. UI通知（直接）
    this.notificationService.notifyDataChanged('cuts');
  }
}
```

#### メリット
- **最高の理解しやすさ**: 線形な処理フロー
- **デバッグの容易さ**: 同期的な処理
- **高いパフォーマンス**: イベント配信のオーバーヘッドなし
- **簡単なテスト**: 単体テスト・統合テストが直感的

#### デメリット
- **拡張性の制限**: 将来的な機能追加で複雑化の可能性
- **副作用の管理**: 関連する処理が散在する可能性
- **リアルタイム通知**: 複数コンポーネントへの通知が煩雑

#### 移行戦略
```typescript
// Phase 1: CutService作成
class CutService {
  constructor(
    private repository: ICutRepository,
    private auditService: AuditService,
    private notificationService: NotificationService
  ) {}
}

// Phase 2: 既存のCommandHandlerをServiceに移行
// Phase 3: EventDispatcher削除
// Phase 4: ReadModel簡素化
```

---

### アプローチ2: 軽量イベントシステム（推奨）

#### 構造
```
Command → Service → Repository
              ↓
        SimpleEventBus → UI通知
              ↓
          AuditLogger
```

#### 実装例
```typescript
interface DomainEvent {
  type: string;
  aggregateId: string;
  data: any;
  timestamp: Date;
}

class SimpleEventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => void>>();
  
  subscribe(eventType: string, handler: (event: DomainEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
  
  publish(event: DomainEvent): void {
    const handlers = this.handlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  }
}

class CutService {
  async deleteCut(cutId: string): Promise<void> {
    // 1. バリデーション・削除実行
    const cut = await this.repository.findById(cutId);
    if (!cut) throw new Error('Cut not found');
    
    cut.markAsDeleted();
    await this.repository.save(cut);
    
    // 2. イベント発行（非同期副作用）
    this.eventBus.publish({
      type: 'CutDeleted',
      aggregateId: cutId,
      data: { cutNumber: cut.cutNumber },
      timestamp: new Date()
    });
  }
}

// UI通知ハンドラー
this.eventBus.subscribe('CutDeleted', (event) => {
  this.uiNotificationService.refreshData();
});

// 監査ログハンドラー
this.eventBus.subscribe('CutDeleted', (event) => {
  this.auditService.log({
    operation: 'DELETE_CUT',
    entityId: event.aggregateId,
    timestamp: event.timestamp
  });
});
```

#### メリット
- **適度な分離**: 主処理と副作用の分離
- **拡張性**: 新しいハンドラーの追加が容易
- **テスト容易性**: イベント発行をモック可能
- **段階的移行**: 既存システムから少しずつ移行可能

#### デメリット
- **軽微な複雑さ**: イベントバスの理解が必要
- **デバッグ**: 非同期処理の追跡が必要

---

### アプローチ3: 選択的Event Sourcing（ハイブリッド）

#### 構造
```
Command → Service → Repository
              ↓
    重要操作のみEvent Sourcing
              ↓
        EventStore + EventBus
```

#### 実装例
```typescript
enum EventImportance {
  AUDIT_REQUIRED = 'audit',  // 削除、重要更新
  NOTIFICATION_ONLY = 'notification'  // UI更新のみ
}

class HybridEventService {
  async publishEvent(event: DomainEvent, importance: EventImportance): Promise<void> {
    // 重要なイベントは永続化
    if (importance === EventImportance.AUDIT_REQUIRED) {
      await this.eventStore.save(event);
    }
    
    // 全イベントはリアルタイム通知
    this.eventBus.publish(event);
  }
}

class CutService {
  async deleteCut(cutId: string): Promise<void> {
    // 削除実行
    const cut = await this.repository.findById(cutId);
    cut.markAsDeleted();
    await this.repository.save(cut);
    
    // 重要イベントとして記録
    await this.hybridEventService.publishEvent(
      { type: 'CutDeleted', aggregateId: cutId, data: cut.getData() },
      EventImportance.AUDIT_REQUIRED
    );
  }
  
  async updateProgress(cutId: string, progress: string): Promise<void> {
    // 進捗更新
    const cut = await this.repository.findById(cutId);
    cut.updateProgress(progress);
    await this.repository.save(cut);
    
    // 通知のみ
    await this.hybridEventService.publishEvent(
      { type: 'ProgressUpdated', aggregateId: cutId, data: { progress } },
      EventImportance.NOTIFICATION_ONLY
    );
  }
}
```

#### メリット
- **監査要件の満足**: 重要操作の完全な履歴
- **パフォーマンス**: 通常操作は軽量
- **柔軟性**: 操作の重要度に応じた処理

#### デメリット
- **複雑さ**: 2つのイベント処理方法
- **判断コスト**: どのイベントを永続化するかの判断

## 比較表

| 項目 | 完全廃止 | 軽量イベント | 選択的ES |
|------|----------|-------------|----------|
| 理解しやすさ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| デバッグ容易性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| パフォーマンス | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 拡張性 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 監査要件 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 移行コスト | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## 推奨アプローチ：軽量イベントシステム

### 理由
1. **バランス**: 複雑さと機能性の良いバランス
2. **段階移行**: 現在のシステムから段階的に移行可能
3. **十分な機能**: UI通知・監査ログ・拡張性を提供
4. **理解しやすさ**: 開発チームにとって適切な複雑さ

### 移行計画

#### Phase 1: SimpleEventBus導入（2週間）
```typescript
// 新しいイベントバス実装
class SimpleEventBus {
  // 実装...
}

// 既存システムと並行運用
class CutService {
  async deleteCut(cutId: string): Promise<void> {
    // 既存のCommandをServiceに移行
    // SimpleEventBus追加
  }
}
```

#### Phase 2: Service層統合（3週間）
- CommandHandlerの機能をServiceに統合
- 既存のEventDispatcherと並行運用
- ReadModel更新をイベントハンドラーに移行

#### Phase 3: 旧システム削除（2週間）
- EventDispatcher、UnifiedEventCoordinator削除
- Event Sourcing廃止
- ReadModelStore簡素化

### 実装ガイドライン

#### 1. イベント設計
```typescript
// シンプルで明確なイベント
interface CutDeletedEvent {
  type: 'CutDeleted';
  aggregateId: string;
  cutNumber: string;
  deletedAt: Date;
  deletedBy?: string;
}
```

#### 2. エラーハンドリング
```typescript
class SimpleEventBus {
  publish(event: DomainEvent): void {
    const handlers = this.handlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        // ハンドラーエラーは主処理に影響しない
        this.errorLogger.log('Event handler failed', { event, error });
      }
    });
  }
}
```

#### 3. テスト戦略
```typescript
describe('CutService', () => {
  it('should delete cut and publish event', async () => {
    const eventSpy = jest.spyOn(eventBus, 'publish');
    
    await cutService.deleteCut('cut_1');
    
    expect(eventSpy).toHaveBeenCalledWith({
      type: 'CutDeleted',
      aggregateId: 'cut_1',
      // ...
    });
  });
});
```

## 結論

**推奨**: 軽量イベントシステムアプローチ

このアプローチにより、現在の複雑さを大幅に削減しながら、必要な機能（UI通知、監査、拡張性）を維持できる。特に、デバッグ困難だった論理削除バグのような問題を防ぎ、開発生産性を大幅に向上させることが期待できる。

移行は段階的に行い、各フェーズで十分なテストを実施することで、リスクを最小化できる。