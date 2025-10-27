/**
 * 統合カットモデル
 * ReadModelとWriteModelを統合したシンプルな単一モデル
 * 計算フィールドは遅延評価でパフォーマンス最適化
 */

import { CutData, ProgressFieldKey } from '@/models/types';
import { ValidationHelper } from '@/ui/shared/utils/ValidationHelper';

/**
 * 統合カットモデル
 * ReadModelとWriteModelの機能を統合
 */
export class UnifiedCutModel {
  private _data: CutData;
  private _completionRateCache: number | null = null;
  private _totalCostCache: number | null = null;
  private _isModified: boolean = false;

  constructor(data: CutData) {
    this._data = { ...data };
  }

  /**
   * IDを取得
   */
  get id(): string {
    return this._data.id;
  }

  /**
   * カット番号を取得
   */
  get cutNumber(): string {
    return this._data.cutNumber;
  }

  /**
   * 全データを取得（読み取り専用）
   */
  get data(): Readonly<CutData> {
    return { ...this._data };
  }

  /**
   * 完了率を計算（遅延評価・キャッシュ付き）
   */
  get completionRate(): number {
    if (this._completionRateCache === null || this._isModified) {
      this._completionRateCache = this.calculateCompletionRate();
      this._isModified = false;
    }
    return this._completionRateCache;
  }

  /**
   * 総コストを計算（遅延評価・キャッシュ付き）
   */
  get totalCost(): number {
    if (this._totalCostCache === null || this._isModified) {
      this._totalCostCache = this.calculateTotalCost();
      this._isModified = false;
    }
    return this._totalCostCache;
  }

  /**
   * データを更新
   */
  update(updates: Partial<CutData>): void {
    Object.assign(this._data, updates);
    this._isModified = true;
    // キャッシュを無効化
    this._completionRateCache = null;
    this._totalCostCache = null;
  }

  /**
   * 特定フィールドの値を取得
   */
  getField(fieldName: keyof CutData): string | number | boolean | undefined {
    return this._data[fieldName];
  }

  /**
   * 特定フィールドの値を設定
   */
  setField(fieldName: keyof CutData, value: string | number | boolean | undefined): void {
    (this._data as unknown as Record<string, unknown>)[fieldName] = value;
    this._isModified = true;
    // キャッシュを無効化
    this._completionRateCache = null;
    this._totalCostCache = null;
  }

  /**
   * 削除済みかどうか
   */
  get isDeleted(): boolean {
    return this._data.isDeleted === true;
  }

  /**
   * JSONに変換
   */
  toJSON(): CutData {
    return {
      ...this._data,
      // 計算フィールドも含める（必要に応じて）
      completionRate: this.completionRate,
      totalCost: this.totalCost
    };
  }

  /**
   * プレーンオブジェクトに変換
   */
  toPlainObject(): CutData {
    return { ...this._data };
  }

  /**
   * モデルのクローンを作成
   */
  clone(): UnifiedCutModel {
    return new UnifiedCutModel(this._data);
  }

  /**
   * 変更があったかどうか
   */
  get isModified(): boolean {
    return this._isModified;
  }

  /**
   * 変更フラグをリセット
   */
  resetModified(): void {
    this._isModified = false;
  }

  /**
   * 完了率を計算（内部メソッド）
   */
  private calculateCompletionRate(): number {
    // 進捗フィールドを特定
    const progressFields = Object.keys(this._data).filter(key => 
      key.endsWith('In') || key.endsWith('Up') || 
      key.includes('Check') || key.includes('Render') ||
      key.includes('Bg') || key.includes('2d') || key.includes('3d')
    );
    
    // 完了・不要フィールドをカウント
    const completed = progressFields.filter(field => {
      const value = this._data[field as keyof CutData];
      if (field === 'isDeleted' || typeof value !== 'string') {
        return false;
      }
      // '済'または'不要'なら完了とみなす
      return value === '済' || value === '不要';
    }).length;
    
    return progressFields.length > 0 ? (completed / progressFields.length) * 100 : 0;
  }

  /**
   * 総コストを計算（内部メソッド）
   */
  private calculateTotalCost(): number {
    const costFields = ['loCost', 'genCost', 'dougaCost', 'doukenCost', 'shiageCost'] as const;
    
    return costFields.reduce((total, field) => {
      const value = this._data[field];
      if (value) {
        const numValue = ValidationHelper.ensureNumber(value, 0);
        if (ValidationHelper.isValidNumber(numValue)) {
          return total + numValue;
        }
      }
      return total;
    }, 0);
  }

  /**
   * 静的ファクトリメソッド: 新規作成
   */
  static create(cutNumber: string, initialData?: Partial<CutData>): UnifiedCutModel {
    const data: CutData = {
      id: `cut-${cutNumber}`,
      cutNumber,
      status: '',
      special: '',
      kenyo: '',
      maisu: '',
      manager: '',
      ensyutsu: '',
      sousakkan: '',
      loManager: '',
      loSakkan: '',
      loOffice: '',
      loCost: '',
      _3dLoCheck: '',
      _3dLoRender: '',
      sakuuchi: '',
      loIn: '',
      loUp: '',
      ensyutsuUp: '',
      sakkanUp: '',
      losakkanUp: '',
      sosakkanUp: '',
      genzuUp: '',
      genManager: '',
      genSakkan: '',
      genOffice: '',
      genCost: '',
      genIn: '',
      genUp: '',
      genEnsyutsuUp: '',
      genSakkanUp: '',
      dougaManager: '',
      dougaOffice: '',
      dougaMaki: '',
      dougaCost: '',
      dougaIn: '',
      dougaUp: '',
      doukenManager: '',
      doukenOffice: '',
      doukenCost: '',
      doukenIn: '',
      doukenUp: '',
      iroIn: '',
      iroUp: '',
      shiageManager: '',
      shiageOffice: '',
      shiageCost: '',
      shiageIn: '',
      shiageUp: '',
      shikenIn: '',
      shikenUp: '',
      tokkouIn: '',
      tokkouUp: '',
      haikeiIn: '',
      haikeiUp: '',
      bikanIn: '',
      bikanUp: '',
      _2dIn: '',
      _2dUp: '',
      _3dIn: '',
      _3dUp: '',
      satsuBg: '',
      satsu2d: '',
      satsu3d: '',
      satsuToku: '',
      satsuHon: '',
      satsuIre: '',
      satsuTimingRoll: '',
      satsuTimingIn: '',
      satsuHonRoll: '',
      satsuHonUp: '',
      ...initialData
    };

    return new UnifiedCutModel(data);
  }

  /**
   * 静的ファクトリメソッド: 既存データから復元
   */
  static fromData(data: CutData): UnifiedCutModel {
    return new UnifiedCutModel(data);
  }

  /**
   * 進捗ステータスの判定ヘルパー
   */
  isProgressCompleted(fieldName: ProgressFieldKey): boolean {
    const value = this._data[fieldName];
    return value === '済' || value === '不要';
  }

  /**
   * 進捗ステータスの判定ヘルパー
   */
  isProgressPending(fieldName: ProgressFieldKey): boolean {
    const value = this._data[fieldName];
    return value === '' || value === undefined || value === null;
  }

  /**
   * 進捗ステータスの判定ヘルパー
   */
  isProgressInProgress(fieldName: ProgressFieldKey): boolean {
    const value = this._data[fieldName];
    return value !== '済' && value !== '不要' && value !== '' && value !== undefined && value !== null;
  }
}