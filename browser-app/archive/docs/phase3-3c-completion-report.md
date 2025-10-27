# Phase 3.3c 完了レポート

## 実施日時
2025-08-21

## 実施内容
ビューコンポーネントの移行（6ファイル）

## 完了したビューコンポーネント

### 1. StaffView.ts
- ✅ ApplicationServiceからAppServiceへ変更
- ✅ ReadModelStore削除、getReadModelStore()経由でアクセス
- ✅ コンストラクタのパラメータをオプショナルに変更

### 2. ScheduleView.ts
- ✅ シンプルな移行（未実装ビュー）
- ✅ ApplicationServiceからAppServiceへ変更

### 3. SimulationView.ts
- ✅ ApplicationServiceからAppServiceへ変更
- ✅ ReadModelStore削除、getReadModelStore()経由でアクセス
- ✅ NormaTableとの連携は維持

### 4. RetakeView.ts
- ✅ シンプルな移行（未実装ビュー）
- ✅ ApplicationServiceからAppServiceへ変更

### 5. OrderView.ts
- ✅ シンプルな移行（未実装ビュー）
- ✅ ApplicationServiceからAppServiceへ変更

### 6. CutBagView.ts
- ✅ シンプルな移行（未実装ビュー）
- ✅ ApplicationServiceからAppServiceへ変更

## 移行パターン

### 実装済みビュー（StaffView、SimulationView）
```typescript
// 変更前
import { ApplicationService } from '../../application/ApplicationService';
import { ReadModelStore } from '../../infrastructure/ReadModelStore';

constructor(containerId: string, appService: ApplicationService) {
  this.appService = appService;
  this.readModelStore = appService.getReadModelStore();
}

// 変更後
import { AppService, getAppService } from '../../services/AppService';

constructor(containerId: string, appService?: AppService) {
  this.appService = appService || getAppService();
  this.readModelStore = this.appService.getReadModelStore();
}
```

### 未実装ビュー（ScheduleView、RetakeView、OrderView、CutBagView）
```typescript
// 変更前
import { ApplicationService } from '../../application/ApplicationService';

constructor(containerId: string, appService: ApplicationService) {
  this.appService = appService;
}

// 変更後
import { AppService, getAppService } from '../../services/AppService';

constructor(containerId: string, appService?: AppService) {
  this.appService = appService || getAppService();
}
```

## ビルドエラーの状況

### 残りのエラー（主要なもの）
1. **AppInitializer.ts**（2箇所）: ApplicationServiceをAppServiceに渡そうとしている
2. **main-browser.ts**（1箇所）: 同上
3. **ProgressTable.ts**（3箇所）: facadeプロパティのアクセス修飾子の違い
4. **型推論エラー**（数箇所）: readModelStore.getAll()の戻り値がunknown[]

## 次のステップ
Phase 3.3d: 最終統合
- AppInitializer.tsの移行
- main-browser.tsの移行
- 型推論エラーの修正
- 最終動作確認

## 所要時間
約20分（6ファイル×約3分）

## 備考
- すべてのビューコンポーネントが新AppServiceに対応
- getAppService()シングルトンパターンを活用
- 下位互換性を維持（ApplicationServiceからの移行がスムーズ）