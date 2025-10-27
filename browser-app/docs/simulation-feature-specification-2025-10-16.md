# シミュレーション機能 現在の仕様書

**作成日**: 2025-10-16
**調査者**: Claude Code
**重要度**: 高（機能完成度が低く、改善が必要）

---

## 目次

1. [概要](#概要)
2. [実装ファイル](#実装ファイル)
3. [機能仕様](#機能仕様)
4. [現状の問題点](#現状の問題点)
5. [アーキテクチャ分析](#アーキテクチャ分析)
6. [改善提案](#改善提案)

---

## 概要

シミュレーション機能は、アニメーション制作プロジェクトの進捗予測と作業計画を管理する機能です。ノルマ表、作業予定入力、進捗予測グラフ、日別作業予定表の4つのサブ機能で構成されています。

### アクセス方法
- サイドバーの「シミュレーション」タブをクリック

### 対象ユーザー
- プロジェクトマネージャー
- 制作進行

---

## 実装ファイル

### メインコンポーネント

| ファイル | 行数 | 説明 |
|---------|------|------|
| `src/ui/views/simulation/SimulationView.ts` | 743行 | シミュレーションビューのメインコントローラー |
| `src/ui/views/simulation/NormaTable.ts` | 1,216行 | ノルマ表コンポーネント |
| `src/ui/views/simulation/NormaCellEditor.ts` | 234行 | ノルマ表のセルエディタ |
| `src/services/NormaDataService.ts` | 257行 | ノルマデータの計算・保存サービス |
| `src/models/events/SimulationEvents.ts` | 71行 | シミュレーション関連イベント定義 |

### 関連ユーティリティ
- `src/utils/WorkdayCalculator.ts` - 稼働日計算
- `src/ui/shared/utils/DateHelper.ts` - 日付フォーマット

---

## 機能仕様

### 1. プロジェクト設定セクション

#### 実装場所
- `SimulationView.createParameterSection()` (L172-211)

#### 機能
- **開始日入力**: プロジェクト開始日を設定
- **終了日入力**: プロジェクト終了日を設定
- **設定適用ボタン**: 設定を反映し、ノルマ表を再生成
- **プロジェクト情報表示**: 期間、稼働日、休日、稼働率を自動計算

#### データフロー
```
ユーザー入力 → SimulationParametersChangedEvent発行
→ EventDispatcher → ノルマ表再生成
```

#### 状態管理
- `simulationData.projectStartDate`: 開始日
- `simulationData.projectEndDate`: 終了日

---

### 2. ノルマ表セクション

#### 実装場所
- `NormaTable.ts` (1,216行)
- `NormaDataService.ts` (257行)

#### 機能

##### 2.1 表示機能
- **セクション別表示**: LO、原画、動画、動検、仕上げの5セクション
- **担当者別表示**: 各セクション内で担当者ごとに行を分割
- **日付列**: プロジェクト期間内の全日付を列として表示
- **週単位グループ化**: 日付を週ごとにグループ化し、第N週としてヘッダー表示
- **セル表示形式**: `実績値/目標値` または `達成率%`

##### 2.2 集計機能
- **個人集計**: 各担当者の期間全体の合計（実績/目標）
- **週計**: 各担当者の週ごとの合計
- **セクション小計**: セクション全体の日別・週別合計
- **総合計**: プロジェクト全体の合計

##### 2.3 編集機能
- **目標値編集**: セルをクリック→数値入力→Enter/Tabで確定
- **キーボード操作**: Tab/Shift+Tab で次/前のセルへ移動、Escでキャンセル
- **自動保存**: 編集内容をLocalStorageに自動保存（debounce: 500ms）

##### 2.4 達成率表示モード
- **切り替えボタン**: 「達成率表示」「実績/目標表示」を切り替え
- **色分け**:
  - 100%以上: 緑色 (achievement-high)
  - 80%以上: 黄色 (achievement-medium)
  - 80%未満: 赤色 (achievement-low)

#### データフロー

```
【実績値計算】
ApplicationFacade.getAllReadModels()
→ NormaDataService.calculateActuals()
→ 各カットの[セクション]Upフィールドをチェック
→ 日付が期間内なら実績値+1
→ NormaTable表示

【目標値保存】
セル編集 → NormaCellEditor
→ NormaDataService.saveTargets()
→ LocalStorage['normaTable_{projectId}']
```

#### ストレージキー
```
normaTable_{projectId}
```

#### データ構造

##### NormaData（実績値）
```typescript
{
  [sectionName: string]: {
    [managerName: string]: {
      [dateString: string]: {
        target: number;
        actual: number;
      }
    }
  }
}
```

##### Targets（目標値）
```typescript
{
  [cellKey: string]: number  // cellKey = "{section}_{manager}_{dateString}"
}
```

#### 実績値計算ロジック

```typescript
// NormaDataService.calculateActuals() (L49-126)
セクションごとの対応フィールド:
- LO: loUp
- 原画: genUp
- 動画: dougaUp
- 動検: doukenUp
- 仕上げ: shiageUp

各カットのUpフィールドに日付が入っている場合、
その日付のactualを+1する
```

#### パフォーマンス最適化
- **キャッシュ**: 実績値を1分間キャッシュ（再計算コストが高いため）
- **DocumentFragment**: DOM操作を最適化
- **デバウンス**: LocalStorage保存を500ms遅延

---

### 3. 作業予定入力セクション

#### 実装場所
- `SimulationView.createScheduleSection()` (L246-278)
- `SimulationView.createScheduleInputRows()` (L390-413)

#### 機能
- **カット一覧表示**: 未完了のカット（最大20件）をテーブル表示
- **開始日入力**: 作業開始日を入力
- **予定日数入力**: 作業にかかる予定日数を入力（0.5日単位）
- **終了予定日自動計算**: 開始日+予定日数から自動計算（稼働日ベース）
- **保存ボタン**: 各行ごとに保存ボタンを配置

#### 表示カラム
1. カット番号
2. 状態
3. 担当者
4. 開始日（input type="date"）
5. 予定日数（input type="number"、step=0.5）
6. 終了予定日（自動計算、読み取り専用）
7. 操作（保存ボタン）

#### データフロー
```
ユーザー入力 → saveWorkSchedule()
→ WorkScheduledEvent発行
→ simulationData.workSchedules.set()
→ calculateSimulation() → render()
```

#### 問題点
- **データが永続化されない**: WorkScheduledEventは発行されるが、LocalStorageやUnifiedDataStoreに保存されていない
- **リロードでデータ消失**: ページをリロードすると作業予定が消える

---

### 4. 進捗予測グラフセクション

#### 実装場所
- `SimulationView.createProgressChart()` (L416-430)
- `SimulationView.renderTextChart()` (L433-486)

#### 機能
- **テキストベースグラフ**: ASCIIアートで進捗を視覚化
- **予定線**: ●マーカーで表示
- **実績線**: ○マーカーで表示
- **Y軸**: カット数（0〜最大カット数）
- **X軸**: 日付（5日ごとにラベル表示）

#### データソース
- `simulationData.progressPredictions`
- `calculateProgressPredictions()` で計算

#### 表示条件
- 作業予定が1件以上入力されている場合のみ表示
- 作業予定がない場合: 「予測データがありません。作業予定を入力してください。」

#### 現状
- **常に空**: 作業予定データが永続化されていないため、常に空のメッセージが表示される

---

### 5. 日別作業予定表セクション

#### 実装場所
- `SimulationView.createWorkScheduleTable()` (L489-503)
- `SimulationView.renderWorkScheduleTable()` (L507-571)

#### 機能
- **担当者別グループ化**: 担当者ごとに作業予定をまとめて表示
- **開始日順ソート**: 各担当者内で開始日順に並べ替え
- **遅延ハイライト**: 終了予定日が過ぎているが完了していない作業を赤色表示

#### 表示カラム
1. 担当者
2. カット番号
3. 開始日
4. 終了予定日
5. 日数
6. 状態（遅延 or 通常の状態）

#### 担当者の表示順
- カット番号順での初登場順（カットデータから取得）

#### データソース
- `simulationData.workSchedules`

#### 現状
- **常に空**: 作業予定データが永続化されていないため、常に「作業予定がありません。」が表示される

---

## 現状の問題点

### 重大な問題

#### 1. 作業予定データの永続化欠如 🔴
**問題**: 作業予定入力で保存しても、データがどこにも保存されない

**影響**:
- 進捗予測グラフが常に空
- 日別作業予定表が常に空
- ページリロードで入力内容が消失

**原因**:
```typescript
// SimulationView.ts:370-386
private saveWorkSchedule(cutId: string): void {
  // WorkScheduledEventを発行
  this.appFacade.getEventDispatcher().dispatch(event);

  // ローカルのMapに保存（メモリ上のみ）
  this.simulationData.workSchedules.set(cutId, {...});

  // ❌ LocalStorageやUnifiedDataStoreへの保存がない
}
```

#### 2. ノルマ表の実績値が常に0 🔴
**問題**: 実績値計算が動作していない

**原因**:
- ダミーデータに各工程のアップ日付（loUp, genUp等）が入っていない
- または日付形式が不正で認識されていない

**デバッグログ**:
```
[NormaDataService] calculateActuals開始: カット数=60
[NormaDataService] フィールド確認: カット=001, セクション=LO, 担当者=山田, フィールド=loUp, 値=undefined
```

#### 3. イベント駆動アーキテクチャの不完全実装 🟡
**問題**: イベントを発行しているが、購読者が存在しない

```typescript
// SimulationEvents.ts で定義されているが、実際には使われていない
- WorkScheduledEvent
- WorkProgressUpdatedEvent
- SimulationParametersChangedEvent
```

#### 4. データの孤立 🟡
**問題**: SimulationViewが独自のsimulationDataを管理しているが、ApplicationFacadeやUnifiedDataStoreと統合されていない

**影響**:
- 他のビューから作業予定データにアクセスできない
- データの一貫性が保証されない

---

### 軽微な問題

#### 5. UIの使いにくさ 🟢
- 作業予定入力で20件しか表示されない（全カットを表示できない）
- グラフがテキストベースで視覚的に分かりにくい
- 日付入力が1件ずつ保存が必要（一括保存がない）

#### 6. エラーハンドリングの不足 🟢
- 作業予定保存時にバリデーションエラーがあってもユーザーに通知されない
- 入力値チェックが不十分（開始日 > 終了日など）

---

## アーキテクチャ分析

### データフロー図

```
┌─────────────────────────────────────────────┐
│          SimulationView (孤立)              │
├─────────────────────────────────────────────┤
│ simulationData: {                           │
│   projectStartDate: Date                    │
│   projectEndDate: Date                      │
│   workSchedules: Map<string, WorkSchedule>  │ ←❌ どこにも保存されない
│   progressPredictions: ProgressPrediction[] │
│ }                                           │
└─────────────────────────────────────────────┘
          ↓ イベント発行（購読者なし）
┌─────────────────────────────────────────────┐
│         EventDispatcher                     │
│ - WorkScheduledEvent ❌                     │
│ - WorkProgressUpdatedEvent ❌               │
│ - SimulationParametersChangedEvent ❌       │
└─────────────────────────────────────────────┘
          ↓ 保存されるべきだが...
┌─────────────────────────────────────────────┐
│      UnifiedDataStore / LocalStorage        │
│                                             │
│  ❌ 作業予定データが保存されていない         │
└─────────────────────────────────────────────┘
```

### 正しいべきアーキテクチャ

```
┌─────────────────────────────────────────────┐
│          SimulationView                     │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│       ApplicationFacade                     │
│  - saveWorkSchedule()                       │
│  - getWorkSchedules()                       │
│  - updateProjectSettings()                  │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│       CoreService                           │
│  - ビジネスロジック                          │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│      UnifiedDataStore                       │
│  - LocalStorage永続化                       │
└─────────────────────────────────────────────┘
```

---

## 改善提案

### 優先度: 高（即座に対応が必要）

#### 1. 作業予定データの永続化実装
**目的**: 作業予定データをLocalStorageに保存し、リロード後も復元できるようにする

**実装方針**:
- LocalStorageキー: `simulation_work_schedules_{projectId}`
- データ形式: JSON
- 保存タイミング: saveWorkSchedule()実行時
- 読み込みタイミング: SimulationView初期化時

**修正箇所**:
- `SimulationView.saveWorkSchedule()` - LocalStorageへの保存処理追加
- `SimulationView.initialize()` - LocalStorageからの読み込み処理追加

#### 2. ダミーデータにアップ日付を追加
**目的**: ノルマ表の実績値計算が動作するようにする

**修正箇所**:
- `test/generateDummyData.ts` - loUp, genUp, dougaUp, doukenUp, shiageUpフィールドに日付を生成

**実装方法**:
- 完了した工程のアップ日付を生成（YYYY-MM-DD形式）
- 工程の順序を考慮（LO → 原画 → 動画 → 動検 → 仕上げ）

#### 3. ApplicationFacadeへの統合
**目的**: データアクセスを統一APIに集約する

**新規メソッド**:
```typescript
// ApplicationFacade.ts
public async saveWorkSchedule(schedule: WorkSchedule): Promise<void>
public getWorkSchedules(): WorkSchedule[]
public updateProjectSettings(settings: ProjectSettings): Promise<void>
```

---

### 優先度: 中（機能改善）

#### 4. 一括保存機能の追加
- 複数の作業予定を一度に保存できるボタンを追加

#### 5. バリデーション強化
- 開始日 > 終了日のチェック
- 予定日数の範囲チェック（0.5〜999）
- 必須項目チェック

#### 6. エラーメッセージ表示
- バリデーションエラーをユーザーに通知
- 保存成功/失敗の通知

---

### 優先度: 低（将来的な改善）

#### 7. グラフのビジュアル化
- Canvas/SVGを使用したグラフ描画
- インタラクティブな操作（ズーム、ツールチップ）

#### 8. 全カット表示対応
- ページネーションまたは仮想スクロール
- フィルタリング機能（担当者別、状態別）

#### 9. 進捗予測アルゴリズムの改善
- 実績ベースの予測精度向上
- 遅延リスクの警告表示

---

## 技術メモ

### LocalStorageキー一覧

```
normaTable_{projectId}                    # ノルマ表の目標値
simulation_work_schedules_{projectId}     # 作業予定データ（要実装）
simulation_project_settings_{projectId}   # プロジェクト設定（要実装）
```

### イベント一覧

```typescript
// 定義済みだが使用されていないイベント
- WorkScheduledEvent          # 作業予定登録時
- WorkProgressUpdatedEvent    # 作業進捗更新時
- SimulationParametersChangedEvent  # パラメータ変更時
```

### データ型定義

```typescript
interface WorkSchedule {
  cutId: string;
  cutNumber: string;
  assignee: string;
  startDate: Date;
  plannedDays: number;
  endDate: Date;
  status: string;
}

interface ProgressPrediction {
  date: Date;
  plannedCount: number;
  completedCount: number;
  delayedCount: number;
}

interface SimulationData {
  projectStartDate: Date;
  projectEndDate: Date;
  workSchedules: Map<string, WorkSchedule>;
  progressPredictions: ProgressPrediction[];
}
```

---

## 参考情報

### 関連ドキュメント
- [システム仕様書](./system-specification-v10.3.3.md)
- [アーキテクチャ概要](./dependency-architecture-v10.3.3.md)

### 関連Issue
- なし（今回新規調査）

---

**最終更新**: 2025-10-16
**次回レビュー予定**: 改善実装後
