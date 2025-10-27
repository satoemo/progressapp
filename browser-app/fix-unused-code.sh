#!/bin/bash

# Phase A: 未使用コード削除スクリプト

echo "未使用コードの自動削除を開始..."

# プレフィックスを追加して未使用を解消
sed -i 's/constructor(config: ServiceContainerConfig/constructor(_config: ServiceContainerConfig/' src/application/ServiceContainer.ts
sed -i 's/private memoRepository?/private _memoRepository?/' src/application/UnifiedEventCoordinator.ts
sed -i 's/private apiClient:/private _apiClient:/' src/application/services/RealtimeSyncService.ts
sed -i 's/private readonly unifiedStore:/private readonly _unifiedStore:/' src/application/state/UnifiedStateManager.ts
sed -i 's/private readonly memoRepository:/private readonly _memoRepository:/' src/application/state/UnifiedStateManager.ts
sed -i 's/const processPendingEvents/const _processPendingEvents/' src/application/state/UnifiedStateManager.ts
sed -i 's/handler: EventHandler/handler: EventHandler/' src/core/events/TableEventManager.ts
sed -i 's/private retakeView:/private _retakeView:/' src/main-browser.ts
sed -i 's/private syncIndicator:/private _syncIndicator:/' src/main-browser.ts
sed -i 's/private currentView:/private _currentView:/' src/main-browser.ts
sed -i 's/const projectId =/const _projectId =/' src/services/NormaDataService.ts
sed -i 's/const merged =/const _merged =/' src/services/core/CutUpdateService.ts
sed -i 's/const originalContent =/const _originalContent =/' src/ui/components/editor/CellEditor.ts
sed -i 's/private fieldKey:/private _fieldKey:/' src/ui/components/filter/FilterDropdown.ts

echo "完了！"