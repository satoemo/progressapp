# Phase 2 Step 2.1: ApplicationFacade拡張 - 実装仕様

## 目的
ApplicationFacadeに新サービスへのアクセスメソッドを追加し、UIコンポーネントから直接サービスを呼び出せるようにする

## 実装内容

### 1. ServiceLocatorの初期化追加

```typescript
// ApplicationFacade.ts のコンストラクタに追加

import { getServiceLocator, getCutService } from '@/services/ServiceLocator';
import { SimpleCutDeletionService } from '@/services/simplified/SimpleCutDeletionService';

constructor(config: ServiceContainerConfig = {}) {
  // 既存の初期化コード...
  
  // ServiceLocatorの初期化（新規追加）
  this.initializeServiceLocator();
}

private initializeServiceLocator(): void {
  const locator = getServiceLocator();
  
  // サービスが未登録の場合のみ初期化
  if (!locator.has('CutService')) {
    locator.initializeDefaultServices();
  }
  
  // SimpleCutDeletionServiceの登録
  if (!locator.has('DeletionService')) {
    locator.registerSingleton('DeletionService', 
      () => new SimpleCutDeletionService()
    );
  }
}
```

### 2. 公開メソッドの追加

```typescript
// ApplicationFacade.ts に追加する公開メソッド

/**
 * 統合カットサービスを取得
 * UIコンポーネントから直接呼び出し可能
 */
public getCutService(): UnifiedCutService {
  return getServiceLocator().getCutService();
}

/**
 * 簡素化削除サービスを取得
 */
public getSimpleDeletionService(): SimpleCutDeletionService {
  return getServiceLocator().get<SimpleCutDeletionService>('DeletionService');
}

/**
 * 移行モードの設定（デバッグ/テスト用）
 */
public setMigrationMode(mode: 'legacy' | 'new' | 'hybrid'): void {
  this.migrationMode = mode;
  
  switch (mode) {
    case 'legacy':
      // 旧システム（CommandBus/QueryBus）を使用
      this.useCommandBus = true;
      this.useCutService = false;
      break;
    case 'new':
      // 新システム（ServiceLocator）を使用
      this.useCommandBus = false;
      this.useCutService = true;
      break;
    case 'hybrid':
      // 両方を併用（移行期間中）
      this.useCommandBus = true;
      this.useCutService = true;
      break;
  }
}

/**
 * 現在の移行モードを取得
 */
public getMigrationMode(): string {
  if (this.useCommandBus && !this.useCutService) return 'legacy';
  if (!this.useCommandBus && this.useCutService) return 'new';
  return 'hybrid';
}
```

### 3. 条件付き処理の実装

```typescript
// ApplicationFacade.ts の内部メソッド

private migrationMode: 'legacy' | 'new' | 'hybrid' = 'hybrid';
private useCommandBus: boolean = true;
private useCutService: boolean = true;

/**
 * カット作成の統一インターフェース
 * 移行モードに応じて適切なサービスを使用
 */
public async createCut(data: CutCreateData): Promise<CutData> {
  if (this.useCutService) {
    // 新システム使用
    return this.getCutService().create(data);
  } else {
    // 旧システム使用（後方互換性）
    const command = new CreateCutCommand(data.cutNumber, data);
    return this.serviceContainer.getCommandBus().execute(command);
  }
}

/**
 * カット更新の統一インターフェース
 */
public async updateCut(id: string, data: Partial<CutData>): Promise<CutData> {
  if (this.useCutService) {
    return this.getCutService().update(id, data);
  } else {
    const command = new UpdateBasicInfoCommand(id, data);
    return this.serviceContainer.getCommandBus().execute(command);
  }
}

/**
 * カット削除の統一インターフェース
 */
public async deleteCut(id: string): Promise<void> {
  if (this.useCutService) {
    return this.getSimpleDeletionService().delete(id);
  } else {
    const command = new DeleteCutCommand(id);
    return this.serviceContainer.getCommandBus().execute(command);
  }
}

/**
 * 全カット取得の統一インターフェース
 */
public async getAllCuts(filter?: any): Promise<CutData[]> {
  if (this.useCutService) {
    return this.getCutService().findAll(filter);
  } else {
    const query = new GetAllCutsQuery(filter);
    return this.serviceContainer.getQueryBus().execute(query);
  }
}
```

### 4. デバッグ/モニタリング機能

```typescript
// ApplicationFacade.ts に追加

/**
 * サービス使用統計を取得（デバッグ用）
 */
public getServiceStatistics(): {
  mode: string;
  commandBusActive: boolean;
  cutServiceActive: boolean;
  registeredServices: string[];
  callCounts: Map<string, number>;
} {
  const locator = getServiceLocator();
  return {
    mode: this.getMigrationMode(),
    commandBusActive: this.useCommandBus,
    cutServiceActive: this.useCutService,
    registeredServices: locator.getStatistics().services,
    callCounts: this.serviceCallCounts
  };
}

private serviceCallCounts: Map<string, number> = new Map();

/**
 * サービス呼び出しをトラッキング
 */
private trackServiceCall(serviceName: string): void {
  const count = this.serviceCallCounts.get(serviceName) || 0;
  this.serviceCallCounts.set(serviceName, count + 1);
}
```

## テストコード

```javascript
// test-phase2-step2.1.js

async function testApplicationFacadeExtension() {
  console.log('=== ApplicationFacade拡張テスト ===');
  
  // 1. ApplicationFacade初期化
  const appFacade = new ApplicationFacade();
  
  // 2. サービス取得テスト
  console.log('2. サービス取得テスト');
  const cutService = appFacade.getCutService();
  const deletionService = appFacade.getSimpleDeletionService();
  
  console.assert(cutService !== null, '✅ CutService取得成功');
  console.assert(deletionService !== null, '✅ DeletionService取得成功');
  
  // 3. 移行モードテスト
  console.log('3. 移行モードテスト');
  
  // Legacyモード
  appFacade.setMigrationMode('legacy');
  console.assert(appFacade.getMigrationMode() === 'legacy', '✅ Legacyモード設定');
  
  // Newモード
  appFacade.setMigrationMode('new');
  console.assert(appFacade.getMigrationMode() === 'new', '✅ Newモード設定');
  
  // Hybridモード
  appFacade.setMigrationMode('hybrid');
  console.assert(appFacade.getMigrationMode() === 'hybrid', '✅ Hybridモード設定');
  
  // 4. 統一インターフェーステスト
  console.log('4. 統一インターフェーステスト');
  
  // カット作成
  const newCut = await appFacade.createCut({
    cutNumber: 1,
    scene: 'テストシーン'
  });
  console.assert(newCut.id !== undefined, '✅ カット作成成功');
  
  // カット更新
  const updatedCut = await appFacade.updateCut(newCut.id, {
    scene: '更新シーン'
  });
  console.assert(updatedCut.scene === '更新シーン', '✅ カット更新成功');
  
  // 全カット取得
  const allCuts = await appFacade.getAllCuts();
  console.assert(allCuts.length > 0, '✅ 全カット取得成功');
  
  // カット削除
  await appFacade.deleteCut(newCut.id);
  console.log('✅ カット削除成功');
  
  // 5. 統計情報取得
  console.log('5. 統計情報取得');
  const stats = appFacade.getServiceStatistics();
  console.log('サービス統計:', stats);
  
  console.log('✅ ApplicationFacade拡張テスト完了');
}

// テスト実行
testApplicationFacadeExtension().catch(console.error);
```

## 実装チェックリスト

- [ ] ServiceLocator初期化メソッド追加
- [ ] getCutService()メソッド追加
- [ ] getSimpleDeletionService()メソッド追加
- [ ] setMigrationMode()メソッド追加
- [ ] getMigrationMode()メソッド追加
- [ ] 統一インターフェースメソッド追加（create/update/delete/getAll）
- [ ] デバッグ用統計メソッド追加
- [ ] テストコード作成
- [ ] テスト実行・動作確認

## 注意事項

1. **既存機能への影響を最小限に**
   - 既存のCommandBus/QueryBusは削除しない
   - Hybridモードで両方動作可能に

2. **エラーハンドリング**
   - サービスが見つからない場合の処理
   - 移行モード切り替え時の整合性確認

3. **パフォーマンス考慮**
   - ServiceLocatorのキャッシュ活用
   - 不要な初期化を避ける

## 次のステップ

Step 2.1完了後、以下の順で実装：
1. Step 2.2: generateDummyData.ts移行
2. Step 2.3: CellEditor.ts移行
3. Step 2.4: KenyoMultiSelectPopup.ts移行