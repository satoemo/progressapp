import { ApplicationFacade } from '../../../core/ApplicationFacade';
import { CutReadModel } from '../../../data/models/CutReadModel';
import { CutData } from '../../../models/types';
import { TableEventManager } from '../../../core/events/TableEventManager';
import { NormaTable } from './NormaTable';
import { DOMUtils } from '../../../utils/DOMUtils';
import { DOMBuilder } from '../../shared/utils/DOMBuilder';
import { DataProcessor, DATE_FORMATS } from '../../shared/utils/DataProcessor';
import { ValidationHelper } from '../../shared/utils/ValidationHelper';
import { DateHelper } from '../../shared/utils/DateHelper';

/**
 * シミュレーション表示コンポーネント
 */
export class SimulationView {
  private container: HTMLElement;
  private appFacade: ApplicationFacade;
  private cuts: CutData[] = [];
  private tableEventManager: TableEventManager;
  private normaTable: NormaTable | null = null;

  constructor(containerId: string, appFacade?: ApplicationFacade, _unusedParam?: ApplicationFacade) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container #${containerId} not found`);
    }

    this.container = container;
    this.appFacade = appFacade || new ApplicationFacade();
    this.tableEventManager = new TableEventManager();

    this.initialize();
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    // データを読み込み
    await this.loadCuts();

    // イベントリスナーを設定
    this.setupEventListeners();

    // レンダリング
    this.render();
  }

  /**
   * カットデータを読み込み
   */
  private async loadCuts(): Promise<void> {
    // ApplicationFacadeから統一的にデータを取得
    const allCuts = await this.appFacade.getAllCuts();
    console.log(`[SimulationView] loadCuts: Loaded ${allCuts.length} cuts from ApplicationFacade`);
    this.cuts = allCuts;
  }
  
  /**
   * データをリフレッシュ（タブ切り替え時に呼ばれる）
   */
  async refreshData(): Promise<void> {
    console.log('[SimulationView] refreshData: Starting data refresh');
    await this.loadCuts();
    this.render();
    console.log('[SimulationView] refreshData: Data refresh completed');
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // プロジェクト設定はProgressTableで管理されるため、
    // SimulationViewでは特に監視不要
  }

  /**
   * レンダリング
   */
  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'simulation-view';

    // ヘッダー
    const header = this.createHeader();

    // ノルマ表のみ
    const normaSection = this.createNormaSection();

    DOMBuilder.append(this.container, header, normaSection);
  }

  /**
   * ヘッダーを作成
   */
  private createHeader(): HTMLElement {
    const header = DOMBuilder.create('div');
    header.className = 'simulation-header';
    header.innerHTML = `
      <h2>シミュレーション</h2>
    `;
    return header;
  }

  /**
   * ノルマ表セクションを作成
   */
  private createNormaSection(): HTMLElement {
    const section = DOMBuilder.create('div');
    section.className = 'norma-section';

    // ノルマ表のコンテナ
    const normaContainer = DOMBuilder.create('div');
    normaContainer.id = 'norma-table-container';
    DOMBuilder.append(section, normaContainer);

    // NormaTableインスタンスを作成
    if (this.normaTable) {
      this.normaTable.destroy();
    }

    // プロジェクト設定を取得
    const settings = this.appFacade.getProjectSettings();
    const projectId = `${settings.projectStartDate}_${settings.projectEndDate}`;

    // 日付文字列をDateオブジェクトに変換
    const startDate = new Date(settings.projectStartDate);
    const endDate = new Date(settings.projectEndDate);

    this.normaTable = new NormaTable(
      normaContainer,
      projectId,
      startDate,
      endDate
    );

    // ApplicationFacadeを設定
    this.normaTable.setApplicationFacade(this.appFacade);

    return section;
  }


  /**
   * 日付をフォーマット
   */
  private formatDate(date: Date | null | undefined): string {
    return DateHelper.formatDate(date); // YYYY-MM-DD形式
  }

  /**
   * タブがアクティブになった時の処理
   */
  async onTabActivated(): Promise<void> {
    // ノルマ表のデータを更新
    if (this.normaTable) {
      await this.normaTable.updateData();
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // TableEventManagerで管理されているイベントを削除
    this.tableEventManager.destroy();
    
    // NormaTableをクリーンアップ
    if (this.normaTable) {
      this.normaTable.destroy();
      this.normaTable = null;
    }
    
    // コンテナをクリア
    this.container.innerHTML = '';
  }
}