# アーキテクチャ図表集
作成日: 2025年9月16日

## 1. 全体アーキテクチャ図

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[UI Components]
        Views[Views]
        Editors[Editors]
        Popups[Popups]
    end
    
    subgraph "Application Layer"
        AF[ApplicationFacade]
        SC[ServiceContainer]
        ED[EventDispatcher]
        UEC[UnifiedEventCoordinator]
        Services[Services]
    end
    
    subgraph "Domain Layer"
        Entities[Entities]
        Events[Domain Events]
        ValueObjects[Value Objects]
        DomainServices[Domain Services]
    end
    
    subgraph "Infrastructure Layer"
        UDS[UnifiedDataStore]
        CRM[CutReadModel]
        MRM[MemoReadModel]
        Adapters[Storage Adapters]
    end
    
    UI --> AF
    Views --> AF
    Editors --> AF
    Popups --> AF
    
    AF --> SC
    AF --> UEC
    AF --> Services
    
    SC --> UDS
    SC --> ED
    
    UEC --> ED
    UEC --> UDS
    
    Services --> UDS
    Services --> CRM
    
    UDS --> Adapters
    UDS --> CRM
    UDS --> MRM
    
    Events --> ED
    DomainServices --> Entities
    ValueObjects --> Entities
```

## 2. データフロー図

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Component
    participant AF as ApplicationFacade
    participant UDS as UnifiedDataStore
    participant ED as EventDispatcher
    participant CRM as CutReadModel
    
    User->>UI: データ入力
    UI->>AF: createCut(data)
    AF->>UDS: save(id, data)
    UDS->>UDS: キャッシュ更新
    UDS->>UDS: LocalStorage保存
    UDS-->>AF: 完了
    AF->>ED: dispatch(CutCreated)
    ED->>CRM: 更新通知
    CRM->>CRM: ReadModel更新
    ED->>UI: UI更新通知
    UI-->>User: 表示更新
```

## 3. イベントフロー図

```mermaid
flowchart LR
    subgraph "Event Sources"
        Create[Cut作成]
        Update[Cut更新]
        Delete[Cut削除]
        Bulk[一括更新]
    end
    
    subgraph "Event System"
        ED[EventDispatcher]
        Queue[Event Queue]
        UEC[UnifiedEventCoordinator]
    end
    
    subgraph "Event Handlers"
        RMS[ReadModelUpdateService]
        RSS[RealtimeSyncService]
        UIH[UI Handlers]
        SM[StateManager]
    end
    
    Create --> ED
    Update --> ED
    Delete --> ED
    Bulk --> ED
    
    ED --> Queue
    Queue --> UEC
    
    UEC --> RMS
    UEC --> RSS
    UEC --> UIH
    UEC --> SM
```

## 4. ServiceContainer依存関係図

```mermaid
graph TD
    SC[ServiceContainer]
    
    SC -->|管理| Store[UnifiedDataStore]
    SC -->|管理| ED[EventDispatcher]
    SC -->|管理| Repo[StoreRepositoryAdapter]
    
    SC -->|使用元| AF[ApplicationFacade]
    SC -->|使用元| USM[UnifiedStateManager]
    SC -->|使用元| RMS[ReadModelUpdateService]
    SC -->|使用元| UEC[UnifiedEventCoordinator]
    SC -->|使用元| MB[main-browser.ts]
    
    Store -->|実装| LSA[LocalStorageAdapter]
    Store -->|実装| MSA[MemoryStorageAdapter]
    
    style SC fill:#f9f,stroke:#333,stroke-width:4px
```

## 5. UI層コンポーネント構造

```mermaid
graph TB
    subgraph "Table Components"
        PT[ProgressTable]
        BPT[BaseProgressTable]
        TR[TableRenderer]
        THM[TableHeaderManager]
        
        PT --> BPT
        PT --> TR
        PT --> THM
    end
    
    subgraph "Editor Components"
        CE[CellEditor]
        CEF[CellEditorFactory]
        CS[CellSelection]
        
        CEF --> CE
        CE --> CS
    end
    
    subgraph "Filter Components"
        FM[FilterManager]
        FD[FilterDropdown]
        FS[FilterStorage]
        
        FD --> FM
        FM --> FS
    end
    
    subgraph "Popup Components"
        BP[BasePopup]
        CP[CalendarPopup]
        DP[DropdownPopup]
        KMP[KenyoMultiSelectPopup]
        SMP[SpecialMultiSelectPopup]
        
        CP --> BP
        DP --> BP
        KMP --> BP
        SMP --> BP
    end
```

## 6. データストア内部構造

```mermaid
graph LR
    subgraph "UnifiedDataStore"
        Cache[LRU Cache]
        Storage[Storage Adapter]
        ReadModels[Read Models Map]
        Backup[Backup System]
        
        Cache -->|miss| Storage
        Storage -->|load| Cache
        Cache --> ReadModels
        Storage --> Backup
    end
    
    subgraph "Storage Adapters"
        LSA[LocalStorageAdapter]
        MSA[MemoryStorageAdapter]
    end
    
    Storage --> LSA
    Storage --> MSA
```

## 7. 状態管理フロー

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Processing: ユーザー操作
    Processing --> Validating: データ入力
    Validating --> Saving: 検証成功
    Validating --> Error: 検証失敗
    
    Saving --> Updating: ストア保存
    Updating --> Broadcasting: イベント発行
    Broadcasting --> Syncing: 同期処理
    Syncing --> Idle: 完了
    
    Error --> Idle: エラー処理
```

## 8. リファクタリング前後比較

```mermaid
graph TB
    subgraph "現在のアーキテクチャ"
        A1[UI] --> A2[ApplicationFacade]
        A2 --> A3[ServiceContainer]
        A3 --> A4[UnifiedDataStore]
        A2 --> A5[EventCoordinator]
        A5 --> A6[EventDispatcher]
    end
    
    subgraph "目標アーキテクチャ"
        B1[UI] --> B2[ApplicationFacade<br/>ServiceContainer統合]
        B2 --> B3[CutService]
        B2 --> B4[DeletionService]
        B3 --> B5[UnifiedDataStore]
        B4 --> B5
    end
```

## 9. 主要クラス関係図

```mermaid
classDiagram
    class ApplicationFacade {
        -serviceContainer: ServiceContainer
        -eventCoordinator: UnifiedEventCoordinator
        -stateManager: UnifiedStateManager
        +createCut(data): Promise~CutData~
        +updateCut(id, data): Promise~CutData~
        +deleteCut(id): Promise~void~
        +findAllCuts(filter): Promise~CutData[]~
    }
    
    class ServiceContainer {
        -services: Map
        -factories: Map
        -singletons: Map
        +register(name, service): void
        +get(name): T
        +getInstance(): ServiceContainer
    }
    
    class UnifiedDataStore {
        -adapter: StorageAdapter
        -cache: LRUCache
        -readModels: Map
        +save(id, data): Promise~void~
        +load(id): Promise~any~
        +delete(id): Promise~void~
    }
    
    class EventDispatcher {
        -listeners: Map
        -eventQueue: DomainEvent[]
        +dispatch(event): void
        +subscribe(type, listener): void
        +getInstance(): EventDispatcher
    }
    
    ApplicationFacade --> ServiceContainer
    ServiceContainer --> UnifiedDataStore
    ServiceContainer --> EventDispatcher
    ApplicationFacade --> UnifiedEventCoordinator
    UnifiedEventCoordinator --> EventDispatcher
```

## 10. パフォーマンス最適化ポイント

```mermaid
graph TD
    subgraph "最適化対象"
        C1[キャッシュ戦略]
        C2[イベント処理]
        C3[一括更新]
        C4[DOM操作]
    end
    
    subgraph "最適化手法"
        O1[LRUキャッシュ<br/>サイズ動的調整]
        O2[非同期イベント<br/>バッチ処理]
        O3[トランザクション<br/>並列処理]
        O4[仮想DOM<br/>差分更新]
    end
    
    C1 --> O1
    C2 --> O2
    C3 --> O3
    C4 --> O4
    
    O1 -->|効果| E1[メモリ効率 20%向上]
    O2 -->|効果| E2[レスポンス 30%改善]
    O3 -->|効果| E3[処理時間 50%短縮]
    O4 -->|効果| E4[描画性能 40%向上]
```

## 11. エラーハンドリングフロー

```mermaid
flowchart TD
    Start[処理開始]
    
    Start --> Try{Try Block}
    Try -->|成功| Success[正常処理]
    Try -->|エラー| Catch[Catch Block]
    
    Catch --> ErrorType{エラー種別判定}
    
    ErrorType -->|Validation| VE[ValidationError]
    ErrorType -->|Network| NE[NetworkError]
    ErrorType -->|Storage| SE[StorageError]
    ErrorType -->|Unknown| UE[UnknownError]
    
    VE --> UserNotify[ユーザー通知]
    NE --> Retry[リトライ処理]
    SE --> Fallback[フォールバック]
    UE --> Log[ログ記録]
    
    UserNotify --> Recovery[復旧処理]
    Retry --> Recovery
    Fallback --> Recovery
    Log --> Recovery
    
    Success --> End[処理完了]
    Recovery --> End
```

## 12. テスト戦略図

```mermaid
graph TB
    subgraph "テストレベル"
        UT[単体テスト]
        IT[統合テスト]
        E2E[E2Eテスト]
    end
    
    subgraph "テスト対象"
        Domain[Domain層]
        App[Application層]
        Infra[Infrastructure層]
        UI[UI層]
    end
    
    UT --> Domain
    UT --> App
    IT --> Infra
    E2E --> UI
    
    Domain -->|カバレッジ| DC[目標 90%]
    App -->|カバレッジ| AC[目標 80%]
    Infra -->|カバレッジ| IC[目標 70%]
    UI -->|カバレッジ| UC[目標 60%]
```

---

これらの図表は、v10.3.3のアーキテクチャを視覚的に表現したものです。
プロジェクトの理解とコミュニケーションにご活用ください。