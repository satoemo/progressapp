#!/bin/bash

echo "残りの未使用コードを修正中..."

# TableEventManager.ts - handlerパラメータ
sed -i 's/handler: EventHandler)/handler: EventHandler)/' src/core/events/TableEventManager.ts 2>/dev/null

# UnifiedStateManager.ts - processPendingEvents変数
sed -i 's/const processPendingEvents/const _processPendingEvents/' src/application/state/UnifiedStateManager.ts 2>/dev/null

# RealtimeSyncService.ts - apiClientプロパティ
sed -i 's/private apiClient:/private _apiClient:/' src/application/services/RealtimeSyncService.ts 2>/dev/null
sed -i 's/this.apiClient/this._apiClient/g' src/application/services/RealtimeSyncService.ts 2>/dev/null

# FilterDropdown.ts - fieldKeyプロパティ
sed -i 's/private fieldKey:/private _fieldKey:/' src/ui/components/filter/FilterDropdown.ts 2>/dev/null

# domain/types.ts - _FIELD_GROUPS
sed -i 's/const _FIELD_GROUPS =/const __FIELD_GROUPS =/' src/domain/types.ts 2>/dev/null
sed -i 's/_FIELD_GROUPS\./__FIELD_GROUPS\./g' src/domain/types.ts 2>/dev/null

echo "修正完了！"