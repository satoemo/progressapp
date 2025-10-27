# Phase 3 Step 2 修正版実装計画 - 互換性維持を考慮した段階的移行

## 変更点
Phase 3の当初計画では、CommandBus/QueryBusを即座に削除する予定でしたが、
UIコンポーネントとの互換性を維持するため、段階的移行アプローチに変更します。

## Step 2.1: ApplicationFacadeの拡張（30分）

### 実装内容
ApplicationFacadeに新旧両方のAPIを共存させる

**ファイル**: `src/application/ApplicationFacade.ts`

```typescript
class ApplicationFacade {
  // 既存API（互換性のため維持）
  getCommandBus(): CommandBus { 
    return this.commandBus; 
  }
  
  getQueryBus(): QueryBus { 
    return this.queryBus; 
  }
  
  // 新API（段階的に導入）
  getCutService(): UnifiedCutService {
    return getServiceLocator().getCutService();
  }
  
  getReadModel(): SimplifiedReadModel {
    return getServiceLocator().getReadModel();
  }
  
  // 移行支援メソッド
  isUsingNewAPI(): boolean {
    return this.useNewAPI || false;
  }
  
  enableNewAPI(): void {
    this.useNewAPI = true;
  }
}
```

### テスト方法
```javascript
// test-all-phase1.js に追加
function testApplicationFacadeAPIs() {
  const facade = ApplicationService.getInstance();
  
  // 既存APIの確認
  assert(facade.getCommandBus() !== undefined);
  assert(facade.getQueryBus() !== undefined);
  
  // 新APIの確認
  assert(facade.getCutService() !== undefined);
  assert(facade.getReadModel() !== undefined);
  
  console.log('✅ ApplicationFacade: 新旧API共存確認');
}
```

## Step 2.2: CellEditorの段階的移行（45分）

### 実装内容
最もシンプルなコンポーネントから移行開始

**ファイル**: `src/ui/cell-editor/CellEditor.ts`

1. 既存コードを維持したまま、条件分岐を追加:
```typescript
private async saveValue(): Promise<void> {
  const newValue = (this.options.cell.textContent || '').trim();
  
  if (this.options.appService.isUsingNewAPI()) {
    // 新API使用
    const cutService = this.options.appService.getCutService();
    await cutService.update(
      this.options.cut.id,
      { [this.options.fieldKey]: newValue }
    );
  } else {
    // 既存API使用（現在のコード）
    const command = new UpdateBasicInfoCommand(
      this.options.cut.id,
      { [this.options.fieldKey]: newValue }
    );
    await this.options.appService.getCommandBus().execute(command);
  }
  
  this.currentValue = newValue;
}
```

### テスト方法
```javascript
// test-all-phase1.js に追加
async function testCellEditorMigration() {
  const facade = ApplicationService.getInstance();
  
  // 旧API動作確認
  facade.disableNewAPI();
  // セル編集テスト
  
  // 新API動作確認
  facade.enableNewAPI();
  // 同じセル編集テスト
  
  console.log('✅ CellEditor: 新旧API切り替え確認');
}
```

## Step 2.3: Command/Queryスタブの整理（30分）

### 実装内容
互換性維持に必要な最小限のCommand/Queryクラスを整理

**保持するファイル**（UIが直接使用）:
- UpdateBasicInfoCommand.ts
- UpdateProgressCommand.ts
- CreateCutCommand.ts
- GetAllCutsQuery.ts
- GetCellMemoQuery.ts
- UpdateCellMemoCommand.ts

**内部実装を簡素化**:
```typescript
// UpdateBasicInfoCommand.ts
export class UpdateBasicInfoCommand {
  readonly commandType = 'UpdateBasicInfo';
  
  constructor(
    public readonly cutId: string,
    public readonly data: Partial<CutData>
  ) {}
  
  // 新システムでは使用しないが、互換性のため維持
  getData() {
    return { cutId: this.cutId, ...this.data };
  }
}
```

## Step 2.4: 移行進捗トラッキング（30分）

### 実装内容
どのコンポーネントが移行済みかを追跡

**ファイル**: `src/services/migration/MigrationTracker.ts`

```typescript
export class MigrationTracker {
  private static migrationStatus = new Map<string, boolean>();
  
  static markAsMigrated(componentName: string): void {
    this.migrationStatus.set(componentName, true);
  }
  
  static isMigrated(componentName: string): boolean {
    return this.migrationStatus.get(componentName) || false;
  }
  
  static getReport(): MigrationReport {
    const total = this.migrationStatus.size;
    const migrated = Array.from(this.migrationStatus.values())
      .filter(v => v).length;
    
    return {
      total,
      migrated,
      percentage: (migrated / total) * 100,
      components: Array.from(this.migrationStatus.entries())
    };
  }
}
```

## Step 2.5: 統合テストの作成（45分）

### 実装内容
互換性を確認する包括的なテスト

**ファイル**: `test-compatibility-phase3.js`

```javascript
// 新旧APIの結果が同じであることを確認
async function testCompatibility() {
  const testData = {
    cutNumber: 1,
    scene: 'テストシーン',
    cut: 'カット1'
  };
  
  // 旧API経由で作成
  const oldCommand = new CreateCutCommand(testData);
  const oldResult = await commandBus.execute(oldCommand);
  
  // 新API経由で作成
  const newResult = await cutService.create(testData);
  
  // 結果の比較
  assert(oldResult.cutNumber === newResult.cutNumber);
  assert(oldResult.scene === newResult.scene);
  
  console.log('✅ 互換性テスト: 新旧API同一結果');
}
```

## 実装スケジュール

| ステップ | 所要時間 | 内容 |
|---------|---------|------|
| 2.1 | 30分 | ApplicationFacadeの拡張 |
| 2.2 | 45分 | CellEditorの移行 |
| 2.3 | 30分 | Command/Queryスタブ整理 |
| 2.4 | 30分 | 移行トラッキング |
| 2.5 | 45分 | 統合テスト |
| **合計** | **3時間** | |

## 成功基準

1. **互換性維持**
   - [ ] 既存UIコンポーネントが動作継続
   - [ ] エラー発生なし
   - [ ] パフォーマンス劣化なし

2. **段階的移行**
   - [ ] CellEditorが新API使用可能
   - [ ] フラグによる切り替え可能
   - [ ] ロールバック可能

3. **テスト**
   - [ ] 新旧API結果の一致
   - [ ] 切り替えテスト成功
   - [ ] 統合テスト全項目パス

## 次のステップ

Step 2完了後:
1. 他のシンプルなコンポーネントの移行
2. ProgressTableの段階的移行
3. Command/Queryの段階的削除