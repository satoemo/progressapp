# Phase 4: 状態管理の簡素化 - 詳細実装計画

## 概要
Event Store + ReadModel + Aggregateの複雑な状態管理を、シンプルなStateストアに置換。非同期処理を簡潔化し、全体のコード量を40%削減。各タスクを独立してテスト可能な最小単位（約30分-1時間）に分解。

## 現状の状態管理（問題）
```
Event → EventStore → Aggregate → ReadModel → ReadModelStore 
→ UnifiedStateManager → DebouncedSyncManager → UI
```

## 目標の状態管理（簡素化後）
```
Action → StateStore → UI
```

## タスク分解（独立してテスト可能な最小単位）

### ステップ 1: シンプルなStateストアの設計（Month 1 - Week 1）

#### 1.1 Stateストアインターフェース定義（30分）
**ファイル**: `src/state/IStateStore.ts`
```typescript
interface IStateStore<T = any> {
  getState(): T;
  setState(updater: (state: T) => T): void;
  subscribe(listener: (state: T) => void): () => void;
  dispatch(action: Action): void;
}
```
**テスト**: `test-state-interface.html`
- インターフェース定義
- 型チェック
- 基本動作確認

#### 1.2 アクション定義（30分）
**ファイル**: `src/state/actions.ts`
```typescript
interface Action {
  type: string;
  payload?: any;
}

// アクションクリエーター
const actions = {
  addCut: (data: CutData) => ({ type: 'ADD_CUT', payload: data }),
  updateCut: (id: string, changes: Partial<Cut>) => 
    ({ type: 'UPDATE_CUT', payload: { id, changes } }),
  deleteCut: (id: string) => ({ type: 'DELETE_CUT', payload: id })
};
```
**テスト**: `test-actions.html`
- アクション生成
- ペイロード検証
- 型安全性

#### 1.3 基本Stateストア実装（45分）
**ファイル**: `src/state/StateStore.ts`
```typescript
class StateStore<T> implements IStateStore<T> {
  private state: T;
  private listeners: Set<(state: T) => void>;
  
  constructor(initialState: T) {
    this.state = initialState;
    this.listeners = new Set();
  }
  
  getState(): T {
    return this.state;
  }
  
  setState(updater: (state: T) => T): void {
    this.state = updater(this.state);
    this.notify();
  }
  
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}
```
**テスト**: `test-state-store.html`
- 状態取得・更新
- リスナー通知
- メモリリーク確認

### ステップ 2: リデューサーパターンの実装（Month 1 - Week 1）

#### 2.1 リデューサー定義（30分）
**ファイル**: `src/state/reducers.ts`
```typescript
type Reducer<S, A> = (state: S, action: A) => S;

// ルートリデューサー
const rootReducer: Reducer<AppState, Action> = (state, action) => {
  switch (action.type) {
    case 'ADD_CUT':
      return { ...state, cuts: [...state.cuts, action.payload] };
    case 'UPDATE_CUT':
      return updateCutInState(state, action.payload);
    case 'DELETE_CUT':
      return removeCutFromState(state, action.payload);
    default:
      return state;
  }
};
```
**テスト**: `test-reducers.html`
- 各アクションの処理
- 不変性の確認
- 状態の整合性

#### 2.2 リデューサー合成（30分）
**ファイル**: `src/state/combineReducers.ts`
```typescript
function combineReducers<S>(reducers: {[K in keyof S]: Reducer<S[K], any>}): Reducer<S, any> {
  return (state: S, action: any) => {
    const nextState = {} as S;
    let hasChanged = false;
    
    for (const key in reducers) {
      const reducer = reducers[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    
    return hasChanged ? nextState : state;
  };
}
```
**テスト**: `test-combine-reducers.html`
- リデューサー合成
- 部分状態更新
- パフォーマンス

#### 2.3 ミドルウェアサポート（45分）
**ファイル**: `src/state/middleware.ts`
```typescript
type Middleware<S> = (store: IStateStore<S>) => (next: (action: Action) => void) => (action: Action) => void;

// ログミドルウェア
const loggerMiddleware: Middleware<any> = store => next => action => {
  console.log('dispatching', action);
  const result = next(action);
  console.log('next state', store.getState());
  return result;
};
```
**テスト**: `test-middleware.html`
- ミドルウェア実行
- チェーン処理
- 非同期対応

### ステップ 3: 状態の永続化（Month 1 - Week 2）

#### 3.1 永続化レイヤー（30分）
**ファイル**: `src/state/persistence.ts`
```typescript
class StatePersistence<T> {
  private key: string;
  
  constructor(key: string) {
    this.key = key;
  }
  
  save(state: T): void {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
  
  load(): T | null {
    const saved = localStorage.getItem(this.key);
    return saved ? JSON.parse(saved) : null;
  }
  
  clear(): void {
    localStorage.removeItem(this.key);
  }
}
```
**テスト**: `test-persistence.html`
- 保存・読込
- シリアライズ
- エラー処理

#### 3.2 自動保存機能（30分）
**ファイル**: `src/state/AutoSave.ts`
```typescript
class AutoSave<T> {
  private persistence: StatePersistence<T>;
  private debounceTime: number;
  private saveTimer?: NodeJS.Timeout;
  
  constructor(persistence: StatePersistence<T>, debounceTime = 1000) {
    this.persistence = persistence;
    this.debounceTime = debounceTime;
  }
  
  scheduleSave(state: T): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.persistence.save(state);
    }, this.debounceTime);
  }
}
```
**テスト**: `test-autosave.html`
- デバウンス動作
- 自動保存タイミング
- キャンセル処理

#### 3.3 状態の復元（30分）
**ファイル**: `src/state/StateRestorer.ts`
```typescript
class StateRestorer<T> {
  restore(persistence: StatePersistence<T>, defaultState: T): T {
    try {
      const saved = persistence.load();
      return saved ? this.migrate(saved) : defaultState;
    } catch (error) {
      console.error('Failed to restore state', error);
      return defaultState;
    }
  }
  
  private migrate(saved: any): T {
    // バージョン管理とマイグレーション
    return saved;
  }
}
```
**テスト**: `test-state-restore.html`
- 状態復元
- エラー回復
- マイグレーション

### ステップ 4: セレクターとメモ化（Month 1 - Week 2）

#### 4.1 セレクター実装（30分）
**ファイル**: `src/state/selectors.ts`
```typescript
type Selector<S, R> = (state: S) => R;

// 基本セレクター
const selectors = {
  getCuts: (state: AppState) => state.cuts,
  getCutById: (id: string) => (state: AppState) => 
    state.cuts.find(cut => cut.id === id),
  getFilteredCuts: (filter: Filter) => (state: AppState) =>
    state.cuts.filter(cut => matchesFilter(cut, filter))
};
```
**テスト**: `test-selectors.html`
- データ選択
- フィルタリング
- パフォーマンス

#### 4.2 メモ化セレクター（30分）
**ファイル**: `src/state/memoize.ts`
```typescript
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// メモ化されたセレクター
const memoizedSelectors = {
  getExpensiveCuts: memoize((state: AppState) => {
    // 高コストな計算
    return state.cuts.map(cut => ({
      ...cut,
      calculated: heavyCalculation(cut)
    }));
  })
};
```
**テスト**: `test-memoize.html`
- キャッシュヒット
- メモリ使用量
- 無効化戦略

#### 4.3 派生状態の管理（30分）
**ファイル**: `src/state/derived.ts`
```typescript
class DerivedState<S, D> {
  private selector: Selector<S, D>;
  private cache?: D;
  private lastState?: S;
  
  constructor(selector: Selector<S, D>) {
    this.selector = selector;
  }
  
  get(state: S): D {
    if (state !== this.lastState) {
      this.cache = this.selector(state);
      this.lastState = state;
    }
    return this.cache!;
  }
}
```
**テスト**: `test-derived-state.html`
- 派生状態計算
- キャッシュ更新
- 依存関係追跡

### ステップ 5: 非同期処理の簡素化（Month 1 - Week 3）

#### 5.1 非同期アクション（45分）
**ファイル**: `src/state/asyncActions.ts`
```typescript
type AsyncAction = (dispatch: (action: Action) => void, getState: () => any) => Promise<void>;

// 非同期アクションクリエーター
const asyncActions = {
  fetchCuts: (): AsyncAction => async (dispatch, getState) => {
    dispatch({ type: 'FETCH_CUTS_START' });
    try {
      const cuts = await api.getCuts();
      dispatch({ type: 'FETCH_CUTS_SUCCESS', payload: cuts });
    } catch (error) {
      dispatch({ type: 'FETCH_CUTS_ERROR', payload: error });
    }
  }
};
```
**テスト**: `test-async-actions.html`
- 非同期フロー
- エラー処理
- 状態遷移

#### 5.2 サンクミドルウェア（30分）
**ファイル**: `src/state/thunk.ts`
```typescript
const thunkMiddleware: Middleware<any> = store => next => action => {
  if (typeof action === 'function') {
    return action(store.dispatch, store.getState);
  }
  return next(action);
};
```
**テスト**: `test-thunk.html`
- サンク実行
- Promise処理
- エラー伝播

#### 5.3 エフェクト管理（30分）
**ファイル**: `src/state/effects.ts`
```typescript
class EffectManager {
  private effects: Map<string, (action: Action) => void>;
  
  register(actionType: string, effect: (action: Action) => void): void {
    this.effects.set(actionType, effect);
  }
  
  run(action: Action): void {
    const effect = this.effects.get(action.type);
    if (effect) {
      effect(action);
    }
  }
}
```
**テスト**: `test-effects.html`
- サイドエフェクト実行
- エラー分離
- クリーンアップ

### ステップ 6: UIバインディング（Month 1 - Week 3）

#### 6.1 React風バインディング（45分）
**ファイル**: `src/state/bindings.ts`
```typescript
function useStore<T>(store: IStateStore<T>): T {
  const [state, setState] = useState(store.getState());
  
  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return unsubscribe;
  }, [store]);
  
  return state;
}

// バニラJS版
class StoreBinding<T> {
  constructor(
    private store: IStateStore<T>,
    private render: (state: T) => void
  ) {
    this.store.subscribe(this.render);
    this.render(this.store.getState());
  }
}
```
**テスト**: `test-bindings.html`
- 状態購読
- 自動レンダリング
- クリーンアップ

#### 6.2 コンポーネント接続（30分）
**ファイル**: `src/state/connect.ts`
```typescript
function connect<S, P>(
  mapStateToProps: (state: S) => P
): (Component: any) => any {
  return (Component: any) => {
    return class Connected {
      private props: P;
      private unsubscribe?: () => void;
      
      constructor(private store: IStateStore<S>) {
        this.props = mapStateToProps(store.getState());
        this.unsubscribe = store.subscribe((state) => {
          this.props = mapStateToProps(state);
          this.render();
        });
      }
      
      render(): void {
        Component(this.props);
      }
    };
  };
}
```
**テスト**: `test-connect.html`
- コンポーネント接続
- プロップス更新
- パフォーマンス

#### 6.3 フォームバインディング（30分）
**ファイル**: `src/state/formBinding.ts`
```typescript
class FormBinding<T> {
  constructor(
    private store: IStateStore<T>,
    private form: HTMLFormElement
  ) {
    this.bindInputs();
  }
  
  private bindInputs(): void {
    const inputs = this.form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.store.dispatch({
          type: 'UPDATE_FORM',
          payload: { [target.name]: target.value }
        });
      });
    });
  }
}
```
**テスト**: `test-form-binding.html`
- 入力同期
- バリデーション
- サブミット処理

### ステップ 7: パフォーマンス最適化（Month 2 - Week 1）

#### 7.1 バッチ更新（30分）
**ファイル**: `src/state/batchUpdate.ts`
```typescript
class BatchUpdate<T> {
  private pending: Action[] = [];
  private scheduled = false;
  
  constructor(private store: IStateStore<T>) {}
  
  enqueue(action: Action): void {
    this.pending.push(action);
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }
  
  private flush(): void {
    const actions = this.pending;
    this.pending = [];
    this.scheduled = false;
    
    actions.forEach(action => this.store.dispatch(action));
  }
}
```
**テスト**: `test-batch-update.html`
- バッチ処理
- タイミング制御
- パフォーマンス向上

#### 7.2 差分検出（30分）
**ファイル**: `src/state/diff.ts`
```typescript
function diff<T>(prev: T, next: T): Partial<T> | null {
  if (prev === next) return null;
  
  const changes: Partial<T> = {};
  let hasChanges = false;
  
  for (const key in next) {
    if (prev[key] !== next[key]) {
      changes[key] = next[key];
      hasChanges = true;
    }
  }
  
  return hasChanges ? changes : null;
}
```
**テスト**: `test-diff.html`
- 差分検出
- 深い比較
- 最小更新

#### 7.3 仮想化とページネーション（45分）
**ファイル**: `src/state/virtualization.ts`
```typescript
class VirtualizedState<T> {
  private viewport: { start: number; end: number };
  private pageSize: number;
  
  constructor(pageSize = 50) {
    this.pageSize = pageSize;
    this.viewport = { start: 0, end: pageSize };
  }
  
  getVisible(items: T[]): T[] {
    return items.slice(this.viewport.start, this.viewport.end);
  }
  
  scroll(offset: number): void {
    this.viewport = {
      start: offset,
      end: offset + this.pageSize
    };
  }
}
```
**テスト**: `test-virtualization.html`
- 仮想スクロール
- ページング
- メモリ効率

### ステップ 8: 移行と統合（Month 2 - Week 2-4）

#### 8.1 既存システムからの移行（1時間）
**ファイル**: `src/migration/stateMigration.ts`
```typescript
class StateMigration {
  async migrateFromEventStore(eventStore: any): Promise<AppState> {
    // Event Storeから状態を構築
    const events = await eventStore.getAllEvents();
    return this.buildStateFromEvents(events);
  }
  
  private buildStateFromEvents(events: any[]): AppState {
    return events.reduce((state, event) => {
      // イベントを状態に変換
      return rootReducer(state, this.eventToAction(event));
    }, initialState);
  }
}
```
**テスト**: `test-state-migration.html`
- データ移行
- 整合性確認
- パフォーマンス

#### 8.2 統合テスト（1時間）
**ファイル**: `test-phase4-integration.html`
```html
<!DOCTYPE html>
<html>
<head>
    <title>Phase 4 統合テスト</title>
    <script type="module">
        // 全状態管理機能のテスト
        // パフォーマンス測定
        // メモリプロファイリング
    </script>
</head>
</html>
```

#### 8.3 ドキュメント作成（30分）
**ファイル**: `docs/state-management-guide.md`
- 新状態管理の使い方
- 移行ガイド
- ベストプラクティス

## 成功基準

### 各ステップの完了条件
- [ ] 単体テスト全て成功
- [ ] メモリリークなし
- [ ] パフォーマンス基準達成

### Phase 4全体の成功基準
- [ ] コード行数: 40%削減
- [ ] 状態更新時間: 60%短縮
- [ ] メモリ使用量: 50%削減
- [ ] 複雑度: 70%削減
- [ ] テストカバレッジ: 90%以上

## リスク管理

### 段階的移行
1. **Feature Flag**: 新旧切り替え可能
2. **並行運用**: 移行期間中の共存
3. **ロールバック**: 問題時の復旧計画

## スケジュール

| ステップ | 作業時間 | 期間 | 依存関係 |
|---------|---------|------|---------|
| 1.1-1.3 | 1.5時間 | Week 1 Day 1 | Phase 3完了 |
| 2.1-2.3 | 1.5時間 | Week 1 Day 2 | ステップ1完了 |
| 3.1-3.3 | 1.5時間 | Week 2 Day 1 | ステップ2完了 |
| 4.1-4.3 | 1.5時間 | Week 2 Day 2 | ステップ3完了 |
| 5.1-5.3 | 1.5時間 | Week 3 Day 1 | ステップ4完了 |
| 6.1-6.3 | 1.5時間 | Week 3 Day 2 | ステップ5完了 |
| 7.1-7.3 | 1.5時間 | Month 2 Week 1 | ステップ6完了 |
| 8.1-8.3 | 2.5時間 | Month 2 Week 2-4 | ステップ7完了 |

**合計**: 約13時間（2ヶ月で分散実施）

## 次のアクション
1. Phase 3完了確認
2. ステップ1.1から開始
3. 週次で進捗レビュー

---

**注意**: 各タスクは30分-1時間で完了可能。独立してテスト可能で、既存機能を維持しながら段階的に移行。