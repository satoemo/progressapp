import { ApplicationFacade } from '@/core/ApplicationFacade';
import { ProgressFieldKey, PROGRESS_FIELDS } from '@/domain/types';
import { IdGenerator } from '@/utils/IdGenerator';
import { ProgressFieldService } from '@/services/domain/ProgressFieldService';
import { DataProcessor } from '@/ui/shared/utils/DataProcessor';

// ========================================
// 定数定義
// ========================================

/** バッチサイズ（一度に処理するカット数） */
const BATCH_SIZE = 10;

/** バッチ間の待機時間（ミリ秒） - パフォーマンス最適化のため削除 */
const BATCH_DELAY_MS = 0;

/** 進捗を設定するカットの割合 */
const PROGRESS_CREATION_RATE = 1.0;  // デバッグ用に一時的に100%に設定

/** プロジェクト開始日の範囲（日前） */
const PROJECT_START_DAYS_AGO = { MIN: 30, MAX: 60 };

/**
 * プロジェクト設定から日付範囲を取得
 */
function getProgressDateRange(): { START: Date; END: Date } {
  const facade = ApplicationFacade.getInstance();
  const settings = facade.getProjectSettings();

  return {
    START: new Date(settings.projectStartDate),
    END: new Date(settings.projectEndDate)
  };
}

/** 現在進行中工程の完了率 */
const CURRENT_PROCESS_COMPLETION = { MIN: 0.5, MAX: 0.9 };

/** フィールド値の設定確率 */
const FIELD_VALUE_PROBABILITY = {
  COMPLETED_DATE: 0.9,     // 完了工程で日付を設定する確率
  CURRENT_DATE: 0.8,       // 進行中工程で日付を設定する確率
  NOT_REQUIRED: 0.5,       // 「不要」を設定する確率（残りから）
};

/** ダミーデータのマスターデータ */
const MASTER_DATA = {
  managers: ['東京'], // 基本担当者
  ensyutsuManagers: ['北海道', '沖縄'], // 演出担当
  sousakkanManagers: ['徳島', '香川', '愛媛', '高知'], // 総作監担当（四国地方の県名）
  loManagers: ['青森', '岩手', '宮城', '秋田', '山形', '福島'], // LO担当（東北地方の県名）
  loSakkanManagers: ['福岡', '佐賀', '長崎', '熊本'], // LO作監担当（九州地方の県名）
  genManagers: ['茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川'], // 原画担当（関東地方の県名）
  genSakkanManagers: ['大分', '宮崎', '鹿児島'], // 原画作監担当（九州地方の県名）
  dougaManagers: ['新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知'], // 動画担当（中部地方の県名）
  doukenManagers: ['三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山'], // 動検担当（近畿地方の県名）
  shiageManagers: ['鳥取', '島根', '岡山', '広島', '山口'], // 仕上げ担当（中国地方の県名）
  offices: ['スタジオA', 'スタジオB', 'スタジオC', 'フリーランス'],
  statuses: ['作業中', '待機', '完了', 'チェック中'],
  specials: ['', '特殊', '3D', 'エフェクト']
};

/**
 * 工程グループの定義を動的に生成
 */
function generateProcessGroups(): ProcessGroup[] {
  const fieldService = ProgressFieldService.getInstance();
  const progressGroups = fieldService.getProgressGroups();
  
  // ProgressFieldServiceのグループを工程グループにマッピング
  const processGroups: ProcessGroup[] = [];
  
  // レイアウト工程
  const loGroup = progressGroups.find(g => g.id === 'lo');
  if (loGroup) {
    processGroups.push({
      name: 'レイアウト工程',
      fields: loGroup.fields,
      upField: 'loUp' as ProgressFieldKey
    });
  }

  // 原画工程
  const gengaGroup = progressGroups.find(g => g.id === 'genga');
  if (gengaGroup) {
    processGroups.push({
      name: '原画工程',
      fields: gengaGroup.fields,
      upField: 'genUp' as ProgressFieldKey
    });
  }

  // 動画工程
  const dougaGroup = progressGroups.find(g => g.id === 'douga');
  if (dougaGroup) {
    processGroups.push({
      name: '動画工程',
      fields: dougaGroup.fields,
      upField: 'dougaUp' as ProgressFieldKey
    });
  }

  // 動検工程
  const doukenGroup = progressGroups.find(g => g.id === 'douken');
  if (doukenGroup) {
    processGroups.push({
      name: '動検工程',
      fields: doukenGroup.fields,
      upField: 'doukenUp' as ProgressFieldKey
    });
  }

  // 色・仕上げ工程（色指定と仕上げを統合）
  const iroGroup = progressGroups.find(g => g.id === 'iro');
  const shiageGroup = progressGroups.find(g => g.id === 'shiage');
  if (iroGroup && shiageGroup) {
    processGroups.push({
      name: '色・仕上げ工程',
      fields: [...iroGroup.fields, ...shiageGroup.fields],
      upField: 'shiageUp' as ProgressFieldKey
    });
  }
  
  // その他並行工程
  const shikenOthersGroup = progressGroups.find(g => g.id === 'shikenOthers');
  if (shikenOthersGroup) {
    processGroups.push({
      name: 'その他並行工程',
      fields: shikenOthersGroup.fields
    });
  }
  
  // 撮影工程
  const satsuGroup = progressGroups.find(g => g.id === 'satsu');
  if (satsuGroup) {
    processGroups.push({
      name: '撮影工程',
      fields: satsuGroup.fields
    });
  }
  
  return processGroups;
}

/** 工程グループの定義 - 遅延評価のため関数として定義 */
// const PROCESS_GROUPS = generateProcessGroups();  // 初期化タイミングの問題を回避するためコメントアウト

/** 進捗分布の定義 */
const PROGRESS_DISTRIBUTION = [
  { threshold: 0.05, completedGroups: 0 },  // 5%: レイアウト工程の途中
  { threshold: 0.20, completedGroups: 1 },  // 15%: 原画工程の途中
  { threshold: 0.40, completedGroups: 2 },  // 20%: 動画工程の途中
  { threshold: 0.60, completedGroups: 3 },  // 20%: 動検工程の途中
  { threshold: 0.75, completedGroups: 4 },  // 15%: 色・仕上げ工程の途中
  { threshold: 0.90, completedGroups: 5 },  // 15%: その他工程の途中
  { threshold: 0.98, completedGroups: 6 },  // 8%: 撮影工程の途中
  { threshold: 1.00, completedGroups: 7 },  // 2%: 全工程完了
];

// ========================================
// 型定義
// ========================================

/** 進捗グループの型 */
interface ProcessGroup {
  name: string;
  fields: ProgressFieldKey[];
  upField?: ProgressFieldKey;  // アップ日付フィールド
}

/** カット基本情報の型 */
interface CutBasicData {
  status: string;
  special: string;
  maisu: string;
  manager: string;
  ensyutsu: string;
  sousakkan: string;
  loManager: string;
  loSakkan: string;
  loOffice: string;
  loCost: string;
  genManager: string;
  genSakkan: string;
  genOffice: string;
  genCost: string;
  dougaManager: string;
  dougaOffice: string;
  dougaMaki: string;
  dougaCost: string;
  doukenManager: string;
  doukenOffice: string;
  doukenCost: string;
  shiageManager: string;
  shiageOffice: string;
  shiageCost: string;
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 配列からランダムに要素を選択
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 指定範囲のランダムな整数を生成
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 日付をフォーマット
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 指定範囲内のランダムな日付を生成
 */
function generateRandomDate(startDate: Date, endDate: Date): string {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return formatDate(new Date(randomTime));
}

// ========================================
// メインクラス
// ========================================

/**
 * 進捗データ生成クラス
 */
class ProgressGenerator {
  private readonly now: Date;
  private readonly projectStartDaysAgo: number;
  private readonly projectStartDate: Date;
  private currentDate: Date;

  constructor() {
    this.now = new Date();
    this.projectStartDaysAgo = getRandomInt(
      PROJECT_START_DAYS_AGO.MIN,
      PROJECT_START_DAYS_AGO.MAX
    );

    // プロジェクト開始日を計算
    this.projectStartDate = new Date(this.now);
    this.projectStartDate.setDate(this.now.getDate() - this.projectStartDaysAgo);

    // 現在日の初期値はプロジェクト開始日
    this.currentDate = new Date(this.projectStartDate);
  }

  /**
   * 進捗データを生成
   */
  generate(): Partial<Record<ProgressFieldKey, string>> {
    const progress: Partial<Record<ProgressFieldKey, string>> = {};

    // 遅延評価：毎回generateProcessGroups()を呼ぶことで初期化タイミングの問題を回避
    const processGroups = generateProcessGroups();

    const completedGroups = this.determineCompletedGroups();

    processGroups.forEach((group, groupIndex) => {
      if (groupIndex < completedGroups || completedGroups >= processGroups.length) {
        this.fillCompletedGroup(progress, group, groupIndex);
      } else if (groupIndex === completedGroups) {
        this.fillCurrentGroup(progress, group);
      }
    });

    return progress;
  }

  /**
   * 完了済み工程グループ数を決定
   */
  private determineCompletedGroups(): number {
    const random = Math.random();
    for (const dist of PROGRESS_DISTRIBUTION) {
      if (random < dist.threshold) {
        return dist.completedGroups;
      }
    }
    return PROGRESS_DISTRIBUTION[PROGRESS_DISTRIBUTION.length - 1].completedGroups;
  }

  /**
   * 工程グループに応じた完了日を生成
   * 後の工程ほど新しい日付を返す
   */
  private generateCompletedDate(groupIndex: number, fieldIndex: number): string {
    const dateRange = getProgressDateRange();

    // 工程グループ数を取得（7: LO, 原画, 動画, 動検, 色・仕上げ, その他, 撮影）
    const totalGroups = 7;

    // プロジェクト期間内で工程順序に基づいた日付を生成
    const totalDays = Math.floor((dateRange.END.getTime() - dateRange.START.getTime()) / (1000 * 60 * 60 * 24));
    const daysPerGroup = Math.floor(totalDays / totalGroups);

    const baseOffset = groupIndex * daysPerGroup;
    const fieldOffset = Math.floor((daysPerGroup / 4) * fieldIndex);
    const randomOffset = Math.floor(Math.random() * (daysPerGroup / 4));

    const date = new Date(dateRange.START);
    date.setDate(date.getDate() + baseOffset + fieldOffset + randomOffset);

    // 終了日を超えないようにクリップ
    if (date > dateRange.END) {
      return formatDate(dateRange.END);
    }

    return formatDate(date);
  }

  /**
   * 進行中工程の日付を生成
   * より最近の日付を返す
   */
  private generateCurrentDate(): string {
    const dateRange = getProgressDateRange();
    const today = new Date();

    // プロジェクト期間内の日付を生成（今日付近）
    const minDate = new Date(Math.max(dateRange.START.getTime(), today.getTime() - 30 * 24 * 60 * 60 * 1000));
    const maxDate = new Date(Math.min(dateRange.END.getTime(), today.getTime()));

    const randomTime = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
    const date = new Date(randomTime);

    return formatDate(date);
  }

  /**
   * 完了済み工程グループのフィールドを埋める
   */
  private fillCompletedGroup(
    progress: Partial<Record<ProgressFieldKey, string>>,
    group: ProcessGroup,
    groupIndex: number
  ): void {
    let hasCompletedDate = false;
    let latestDate: string | null = null;

    group.fields.forEach((field, fieldIndex) => {
      if (Math.random() < FIELD_VALUE_PROBABILITY.COMPLETED_DATE) {
        // 完了済みフィールドは実際の日付を設定
        const date = this.generateCompletedDate(groupIndex, fieldIndex);
        progress[field] = date;
        hasCompletedDate = true;
        latestDate = date;
      } else {
        progress[field] = '不要';
      }
    });

    // 完了した工程がある場合、アップ日付を設定
    if (hasCompletedDate && latestDate && group.upField) {
      progress[group.upField] = latestDate;
    }
  }

  /**
   * 現在進行中工程グループのフィールドを埋める
   */
  private fillCurrentGroup(
    progress: Partial<Record<ProgressFieldKey, string>>,
    group: ProcessGroup
  ): void {
    const completionRate = CURRENT_PROCESS_COMPLETION.MIN +
      Math.random() * (CURRENT_PROCESS_COMPLETION.MAX - CURRENT_PROCESS_COMPLETION.MIN);
    const fieldsToComplete = Math.max(1, Math.floor(group.fields.length * completionRate));

    let hasCompletedDate = false;
    let latestDate: string | null = null;

    // 完了したフィールドを連続させるため、最初から順番に設定
    for (let i = 0; i < fieldsToComplete && i < group.fields.length; i++) {
      const field = group.fields[i];
      // 日付または「不要」のいずれかを必ず設定（空白を挟まない）
      if (Math.random() < FIELD_VALUE_PROBABILITY.NOT_REQUIRED) {
        progress[field] = '不要';
      } else {
        // 進行中のフィールドは最近の日付を設定
        const date = this.generateCurrentDate();
        progress[field] = date;
        hasCompletedDate = true;
        latestDate = date;
      }
    }
    // fieldsToComplete以降のフィールドは空白のまま（未着手）

    // 進行中の工程がある場合、アップ日付を設定
    if (hasCompletedDate && latestDate && group.upField) {
      progress[group.upField] = latestDate;
    }
  }
}

/**
 * ダミーデータ生成クラス
 */
class DummyDataGenerator {
  constructor(private readonly appFacade: ApplicationFacade) {}

  /**
   * 指定数のダミーカットを生成
   */
  async generate(count: number): Promise<void> {
    console.log(`ダミーデータ生成開始: ${count}件のカットを作成します`);

    // パフォーマンス最適化: バルク操作中は自動更新を無効化
    (window as any).__disableAutoRefresh = true;
    console.log('バルク操作中: UI自動更新を一時的に無効化');

    try {
      const maxNumber = await this.getMaxCutNumber();
      console.log(`既存の最大カット番号: ${maxNumber}`);
      console.log(`${maxNumber + 1}番から${maxNumber + count}番までのカットを生成します`);

      let totalGenerated = 0;
      const totalBatches = Math.ceil(count / BATCH_SIZE);

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchGenerated = await this.processBatch(batch, count, maxNumber);
        totalGenerated += batchGenerated;
        this.showProgress(totalGenerated, count);

        // EventStore関連の処理は削除（Phase CでEventStoreを廃止）

        if (batch < totalBatches - 1) {
          await this.delay(BATCH_DELAY_MS);
        }
      }

      console.log(`✅ ダミーデータ生成完了: ${totalGenerated}件のカットを作成しました`);
      
      // EventStore関連の処理は削除（Phase CでEventStoreを廃止）
      
      // 追加の待機時間はパフォーマンスのため削除
      // await this.delay(500);
      
      // ReadModelの同期は不要 - データは既にUnifiedCutService経由で保存済み
      // await this.appFacade.syncReadModels();
      
      // EventStore関連の処理は削除（Phase CでEventStoreを廃止）
    } finally {
      // バルク操作完了後、自動更新を再有効化
      (window as any).__disableAutoRefresh = false;
      console.log('バルク操作完了: UI自動更新を再有効化');
      
      // 最終的な手動更新を1回だけ実行
      console.log('UIを手動で更新中...');
      window.dispatchEvent(new CustomEvent('cutCreated', { 
        detail: { bulkOperation: true },
        bubbles: true 
      }));
    }
  }

  /**
   * 既存の最大カット番号を取得（最適化版）
   */
  private async getMaxCutNumber(): Promise<number> {
    // LocalStorageから直接最大番号を取得（全データ取得を回避）
    let maxNumber = 0;
    const storageKeys = Object.keys(localStorage);

    for (const key of storageKeys) {
      // unified_store_cut-XXX 形式のキーを検索
      if (key.includes('unified_store_cut-')) {
        // キーからカット番号を抽出
        const match = key.match(/unified_store_cut-(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    console.log(`LocalStorageから取得した最大カット番号: ${maxNumber}`);
    return maxNumber;
  }

  /**
   * バッチ処理（並列化最適化版）
   */
  private async processBatch(
    batchIndex: number,
    totalCount: number,
    maxNumber: number
  ): Promise<number> {
    const startIdx = batchIndex * BATCH_SIZE + 1;
    const endIdx = Math.min((batchIndex + 1) * BATCH_SIZE, totalCount);
    
    // バッチ内のカットを並列に作成
    const createPromises: Promise<boolean>[] = [];
    
    for (let i = startIdx; i <= endIdx; i++) {
      // カット番号を生成（3桁ゼロパディング、最大4桁まで対応）
      const cutNumber = String(maxNumber + i).padStart(3, '0');
      createPromises.push(this.createCut(cutNumber));
    }
    
    // 並列実行して結果を待つ
    const results = await Promise.all(createPromises);
    const batchGenerated = results.filter(success => success).length;

    return batchGenerated;
  }

  /**
   * カットを作成
   */
  private async createCut(cutNumber: string): Promise<boolean> {
    try {
      const initialData = this.generateBasicData();
      
      await this.appFacade.createCut({
        cutNumber,
        ...initialData
      });

      if (Math.random() < PROGRESS_CREATION_RATE) {
        await this.addProgress(cutNumber);
      }

      return true;
    } catch (error: any) {
      if (error.message?.includes('already exists') || 
          error.message?.includes('すでに存在') ||
          error.message?.includes('Cut ' + cutNumber)) {
        console.warn(`カット ${cutNumber} は既に存在します。スキップします。`);
      } else {
        console.error(`カット ${cutNumber} の作成に失敗しました:`, error);
      }
      return false;
    }
  }

  /**
   * カット基本データを生成
   */
  private generateBasicData(): CutBasicData {
    return {
      status: getRandomElement(MASTER_DATA.statuses),
      special: getRandomElement(MASTER_DATA.specials),
      maisu: String(getRandomInt(1, 20)),
      manager: getRandomElement(MASTER_DATA.managers),
      ensyutsu: getRandomElement(MASTER_DATA.ensyutsuManagers),
      sousakkan: getRandomElement(MASTER_DATA.sousakkanManagers),
      
      loManager: getRandomElement(MASTER_DATA.loManagers),
      loSakkan: getRandomElement(MASTER_DATA.loSakkanManagers),
      loOffice: getRandomElement(MASTER_DATA.offices),
      loCost: String(getRandomInt(5000, 15000)),
      
      genManager: getRandomElement(MASTER_DATA.genManagers),
      genSakkan: getRandomElement(MASTER_DATA.genSakkanManagers),
      genOffice: getRandomElement(MASTER_DATA.offices),
      genCost: String(getRandomInt(8000, 23000)),
      
      dougaManager: getRandomElement(MASTER_DATA.dougaManagers),
      dougaOffice: getRandomElement(MASTER_DATA.offices),
      dougaMaki: String(getRandomInt(1, 10)),
      dougaCost: String(getRandomInt(3000, 11000)),
      
      doukenManager: getRandomElement(MASTER_DATA.doukenManagers),
      doukenOffice: getRandomElement(MASTER_DATA.offices),
      doukenCost: String(getRandomInt(2000, 8000)),
      
      shiageManager: getRandomElement(MASTER_DATA.shiageManagers),
      shiageOffice: getRandomElement(MASTER_DATA.offices),
      shiageCost: String(getRandomInt(1500, 6000)),
    };
  }

  /**
   * 進捗データを追加
   */
  private async addProgress(cutNumber: string): Promise<void> {
    const cutId = IdGenerator.generateCutId(cutNumber);
    const progressGenerator = new ProgressGenerator();
    const progressToUpdate = progressGenerator.generate();

    console.log(`[DEBUG] addProgress called for ${cutNumber}`);
    console.log(`[DEBUG] progressToUpdate keys:`, Object.keys(progressToUpdate).length);
    console.log(`[DEBUG] progressToUpdate sample:`, Object.keys(progressToUpdate).slice(0, 5), Object.values(progressToUpdate).slice(0, 5));

    // パフォーマンス改善：全フィールドを一度に更新
    const updates: any = {};
    for (const [field, value] of Object.entries(progressToUpdate)) {
      if (value) {
        updates[field] = value;
      }
    }

    console.log(`[DEBUG] updates keys:`, Object.keys(updates).length);

    // 1回の更新で全フィールドを送信
    if (Object.keys(updates).length > 0) {
      console.log(`[DEBUG] Updating cut ${cutNumber} with`, Object.keys(updates).length, 'fields');
      await this.appFacade.updateCut(cutId, updates);
    } else {
      console.warn(`[DEBUG] No updates for cut ${cutNumber} - progressToUpdate was empty`);
    }
  }

  /**
   * 進捗を表示
   */
  private showProgress(current: number, total: number): void {
    const percentage = DataProcessor.toPercentage(current, total);
    console.log(`進捗: ${current}/${total} (${percentage})`);
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ========================================
// エクスポート関数（既存APIの維持）
// ========================================

/**
 * ダミーデータを生成（バッチ処理対応版）
 */
export async function generateDummyData(
  appFacade: ApplicationFacade,
  count: number = 50
): Promise<void> {
  const generator = new DummyDataGenerator(appFacade);
  await generator.generate(count);
}