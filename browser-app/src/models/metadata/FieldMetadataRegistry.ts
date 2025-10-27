import { FieldKey } from '../types';

/**
 * フィールドメタデータ型定義
 */
export interface FieldMetadata {
  id: string;
  field: FieldKey;
  title: string;
  width: number;
  category: string;
  groupId: string;
  section: 'basic' | 'preproduction' | 'animation' | 'finishing' | 'postproduction';
  order: number;
  type?: 'progress' | 'currency' | 'special';
  editable?: boolean;
  fixed?: boolean;
  calcType?: 'progress' | 'currency' | 'special' | 'maisu' | 'count';
}

/**
 * フィールドメタデータレジストリ
 * 全フィールドの定義を一元管理
 */
export class FieldMetadataRegistry {
  private static instance: FieldMetadataRegistry;
  private metadata: Map<FieldKey, FieldMetadata> = new Map();
  private orderedFields: FieldKey[] = [];

  private constructor() {
    this.initializeMetadata();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): FieldMetadataRegistry {
    if (!FieldMetadataRegistry.instance) {
      FieldMetadataRegistry.instance = new FieldMetadataRegistry();
    }
    return FieldMetadataRegistry.instance;
  }

  /**
   * メタデータを初期化
   */
  private initializeMetadata(): void {
    const fieldDefinitions: FieldMetadata[] = [
      // 基本情報
      { id: 'cutNumber', field: 'cutNumber', title: 'カット番号', width: 90, category: 'basic', groupId: 'basic', section: 'basic', order: 1, fixed: true, calcType: 'count' },
      { id: 'status', field: 'status', title: 'ステータス', width: 120, category: 'basic', groupId: 'basic', section: 'basic', order: 2, fixed: true, calcType: 'count' },
      { id: 'special', field: 'special', title: '特殊', width: 120, type: 'special', category: 'cutInfo', groupId: 'cutInfo', section: 'basic', order: 3, calcType: 'special' },
      { id: 'kenyo', field: 'kenyo', title: '兼用', width: 120, category: 'cutInfo', groupId: 'cutInfo', section: 'basic', order: 4, calcType: 'count' },
      { id: 'maisu', field: 'maisu', title: '枚数', width: 60, category: 'cutInfo', groupId: 'cutInfo', section: 'basic', order: 5, calcType: 'maisu' },
      { id: 'manager', field: 'manager', title: '制作', width: 80, category: 'cutInfo', groupId: 'cutInfo', section: 'basic', order: 6, calcType: 'count' },
      { id: 'ensyutsu', field: 'ensyutsu', title: '演出', width: 80, category: 'cutInfo', groupId: 'cutInfo', section: 'basic', order: 7, calcType: 'count' },
      { id: 'sousakkan', field: 'sousakkan', title: '総作監', width: 80, category: 'cutInfo', groupId: 'cutInfo', section: 'basic', order: 8, calcType: 'count' },
      
      // LO情報
      { id: 'loManager', field: 'loManager', title: 'LO担当', width: 80, category: 'loInfo', groupId: 'loInfo', section: 'preproduction', order: 9, calcType: 'count' },
      { id: 'loOffice', field: 'loOffice', title: 'LO事務所', width: 100, category: 'loInfo', groupId: 'loInfo', section: 'preproduction', order: 10, calcType: 'count' },
      { id: 'loCost', field: 'loCost', title: 'LO単価', width: 100, type: 'currency', category: 'loInfo', groupId: 'loInfo', section: 'preproduction', order: 11, calcType: 'currency' },
      { id: 'loSakkan', field: 'loSakkan', title: 'LO作監', width: 80, category: 'loInfo', groupId: 'loInfo', section: 'preproduction', order: 12, calcType: 'count' },
      
      // LO進捗
      { id: '_3dLoCheck', field: '_3dLoCheck', title: '3D LOチェック', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 13, editable: true, calcType: 'progress' },
      { id: '_3dLoRender', field: '_3dLoRender', title: '3D LOレンダー', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 14, editable: true, calcType: 'progress' },
      { id: 'sakuuchi', field: 'sakuuchi', title: '作打ち', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 15, editable: true, calcType: 'progress' },
      { id: 'loIn', field: 'loIn', title: 'LO IN', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 16, editable: true, calcType: 'progress' },
      { id: 'loUp', field: 'loUp', title: 'LO UP', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 17, editable: true, calcType: 'progress' },
      { id: 'ensyutsuUp', field: 'ensyutsuUp', title: '演出UP', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 18, editable: true, calcType: 'progress' },
      { id: 'sakkanUp', field: 'sakkanUp', title: '作監UP', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 19, editable: true, calcType: 'progress' },
      { id: 'losakkanUp', field: 'losakkanUp', title: 'LO作監UP', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 20, editable: true, calcType: 'progress' },
      { id: 'sosakkanUp', field: 'sosakkanUp', title: '総作監UP', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 21, editable: true, calcType: 'progress' },
      { id: 'genzuUp', field: 'genzuUp', title: '原図UP', width: 115, type: 'progress', category: 'loProgress', groupId: 'loProgress', section: 'preproduction', order: 22, editable: true, calcType: 'progress' },
      
      // 原画情報
      { id: 'genManager', field: 'genManager', title: '原画担当', width: 80, category: 'genInfo', groupId: 'genInfo', section: 'animation', order: 23, calcType: 'count' },
      { id: 'genOffice', field: 'genOffice', title: '原画事務所', width: 100, category: 'genInfo', groupId: 'genInfo', section: 'animation', order: 24, calcType: 'count' },
      { id: 'genCost', field: 'genCost', title: '原画単価', width: 100, type: 'currency', category: 'genInfo', groupId: 'genInfo', section: 'animation', order: 25, calcType: 'currency' },
      { id: 'genSakkan', field: 'genSakkan', title: '原画作監', width: 80, category: 'genInfo', groupId: 'genInfo', section: 'animation', order: 26, calcType: 'count' },
      
      // 原画進捗
      { id: 'genIn', field: 'genIn', title: '原画IN', width: 115, type: 'progress', category: 'genProgress', groupId: 'genProgress', section: 'animation', order: 27, editable: true, calcType: 'progress' },
      { id: 'genUp', field: 'genUp', title: '原画UP', width: 115, type: 'progress', category: 'genProgress', groupId: 'genProgress', section: 'animation', order: 28, editable: true, calcType: 'progress' },
      { id: 'genEnsyutsuUp', field: 'genEnsyutsuUp', title: '原画演出UP', width: 115, type: 'progress', category: 'genProgress', groupId: 'genProgress', section: 'animation', order: 29, editable: true, calcType: 'progress' },
      { id: 'genSakkanUp', field: 'genSakkanUp', title: '原画作監UP', width: 115, type: 'progress', category: 'genProgress', groupId: 'genProgress', section: 'animation', order: 30, editable: true, calcType: 'progress' },
      
      // 動画情報
      { id: 'dougaManager', field: 'dougaManager', title: '動画担当', width: 80, category: 'dougaInfo', groupId: 'dougaInfo', section: 'animation', order: 31, calcType: 'count' },
      { id: 'dougaOffice', field: 'dougaOffice', title: '動画事務所', width: 100, category: 'dougaInfo', groupId: 'dougaInfo', section: 'animation', order: 32, calcType: 'count' },
      { id: 'dougaMaki', field: 'dougaMaki', title: '動画撒き', width: 60, category: 'dougaInfo', groupId: 'dougaInfo', section: 'animation', order: 33, calcType: 'count' },
      { id: 'dougaCost', field: 'dougaCost', title: '動画単価', width: 100, type: 'currency', category: 'dougaInfo', groupId: 'dougaInfo', section: 'animation', order: 34, calcType: 'currency' },
      
      // 動画進捗
      { id: 'dougaIn', field: 'dougaIn', title: '動画IN', width: 115, type: 'progress', category: 'dougaProgress', groupId: 'dougaProgress', section: 'animation', order: 35, editable: true, calcType: 'progress' },
      { id: 'dougaUp', field: 'dougaUp', title: '動画UP', width: 115, type: 'progress', category: 'dougaProgress', groupId: 'dougaProgress', section: 'animation', order: 36, editable: true, calcType: 'progress' },
      
      // 動検情報
      { id: 'doukenManager', field: 'doukenManager', title: '動検担当', width: 80, category: 'doukenInfo', groupId: 'doukenInfo', section: 'animation', order: 37, calcType: 'count' },
      { id: 'doukenOffice', field: 'doukenOffice', title: '動検事務所', width: 100, category: 'doukenInfo', groupId: 'doukenInfo', section: 'animation', order: 38, calcType: 'count' },
      { id: 'doukenCost', field: 'doukenCost', title: '動検単価', width: 100, type: 'currency', category: 'doukenInfo', groupId: 'doukenInfo', section: 'animation', order: 39, calcType: 'currency' },
      
      // 動検進捗
      { id: 'doukenIn', field: 'doukenIn', title: '動検IN', width: 115, type: 'progress', category: 'doukenProgress', groupId: 'doukenProgress', section: 'animation', order: 40, editable: true, calcType: 'progress' },
      { id: 'doukenUp', field: 'doukenUp', title: '動検UP', width: 115, type: 'progress', category: 'doukenProgress', groupId: 'doukenProgress', section: 'animation', order: 41, editable: true, calcType: 'progress' },
      
      // 色指定進捗
      { id: 'iroIn', field: 'iroIn', title: '色指定IN', width: 115, type: 'progress', category: 'iroProgress', groupId: 'iroProgress', section: 'finishing', order: 42, editable: true, calcType: 'progress' },
      { id: 'iroUp', field: 'iroUp', title: '色指定UP', width: 115, type: 'progress', category: 'iroProgress', groupId: 'iroProgress', section: 'finishing', order: 43, editable: true, calcType: 'progress' },
      
      // 仕上げ情報
      { id: 'shiageManager', field: 'shiageManager', title: '仕上げ担当', width: 80, category: 'shiageInfo', groupId: 'shiageInfo', section: 'finishing', order: 44, calcType: 'count' },
      { id: 'shiageOffice', field: 'shiageOffice', title: '仕上げ事務所', width: 100, category: 'shiageInfo', groupId: 'shiageInfo', section: 'finishing', order: 45, calcType: 'count' },
      { id: 'shiageCost', field: 'shiageCost', title: '仕上げ単価', width: 100, type: 'currency', category: 'shiageInfo', groupId: 'shiageInfo', section: 'finishing', order: 46, calcType: 'currency' },
      
      // 仕上げ進捗
      { id: 'shiageIn', field: 'shiageIn', title: '仕上げIN', width: 115, type: 'progress', category: 'shiageProgress', groupId: 'shiageProgress', section: 'finishing', order: 47, editable: true, calcType: 'progress' },
      { id: 'shiageUp', field: 'shiageUp', title: '仕上げUP', width: 115, type: 'progress', category: 'shiageProgress', groupId: 'shiageProgress', section: 'finishing', order: 48, editable: true, calcType: 'progress' },
      
      // 仕検その他進捗
      { id: 'shikenIn', field: 'shikenIn', title: '仕検IN', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 49, editable: true, calcType: 'progress' },
      { id: 'shikenUp', field: 'shikenUp', title: '仕検UP', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 50, editable: true, calcType: 'progress' },
      { id: 'tokkouIn', field: 'tokkouIn', title: '特効IN', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 51, editable: true, calcType: 'progress' },
      { id: 'tokkouUp', field: 'tokkouUp', title: '特効UP', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 52, editable: true, calcType: 'progress' },
      { id: 'haikeiIn', field: 'haikeiIn', title: '背景IN', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 53, editable: true, calcType: 'progress' },
      { id: 'haikeiUp', field: 'haikeiUp', title: '背景UP', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 54, editable: true, calcType: 'progress' },
      { id: 'bikanIn', field: 'bikanIn', title: '美監IN', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 55, editable: true, calcType: 'progress' },
      { id: 'bikanUp', field: 'bikanUp', title: '美監UP', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 56, editable: true, calcType: 'progress' },
      { id: '_2dIn', field: '_2dIn', title: '2D IN', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 57, editable: true, calcType: 'progress' },
      { id: '_2dUp', field: '_2dUp', title: '2D UP', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 58, editable: true, calcType: 'progress' },
      { id: '_3dIn', field: '_3dIn', title: '3D IN', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 59, editable: true, calcType: 'progress' },
      { id: '_3dUp', field: '_3dUp', title: '3D UP', width: 115, type: 'progress', category: 'shikenOthersProgress', groupId: 'shikenOthersProgress', section: 'finishing', order: 60, editable: true, calcType: 'progress' },
      
      // 撮影進捗
      { id: 'satsuBg', field: 'satsuBg', title: '撮背景', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 61, editable: true, calcType: 'progress' },
      { id: 'satsu2d', field: 'satsu2d', title: '撮2D', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 62, editable: true, calcType: 'progress' },
      { id: 'satsu3d', field: 'satsu3d', title: '撮3D', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 63, editable: true, calcType: 'progress' },
      { id: 'satsuToku', field: 'satsuToku', title: '撮特効', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 64, editable: true, calcType: 'progress' },
      { id: 'satsuHon', field: 'satsuHon', title: '本撮', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 65, editable: true, calcType: 'progress' },
      { id: 'satsuIre', field: 'satsuIre', title: '撮入れ', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 66, editable: true, calcType: 'progress' },
      { id: 'satsuTimingRoll', field: 'satsuTimingRoll', title: '撮タイミングロール', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 67, editable: true, calcType: 'progress' },
      { id: 'satsuTimingIn', field: 'satsuTimingIn', title: '撮タイミングIN', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 68, editable: true, calcType: 'progress' },
      { id: 'satsuHonRoll', field: 'satsuHonRoll', title: '本撮ロール', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 69, editable: true, calcType: 'progress' },
      { id: 'satsuHonUp', field: 'satsuHonUp', title: '本撮UP', width: 115, type: 'progress', category: 'satsuProgress', groupId: 'satsuProgress', section: 'postproduction', order: 70, editable: true, calcType: 'progress' }
    ];

    // メタデータをMapに登録
    fieldDefinitions.forEach(metadata => {
      this.metadata.set(metadata.field, metadata);
      this.orderedFields.push(metadata.field);
    });
  }

  /**
   * フィールドのメタデータを取得
   */
  public getFieldMetadata(field: FieldKey): FieldMetadata | undefined {
    return this.metadata.get(field);
  }

  /**
   * 全フィールドのメタデータを取得（順序付き）
   */
  public getAllFieldMetadata(): FieldMetadata[] {
    return this.orderedFields.map(field => this.metadata.get(field)!);
  }

  /**
   * カテゴリーでフィールドを取得
   */
  public getFieldsByCategory(category: string): FieldMetadata[] {
    return this.getAllFieldMetadata().filter(meta => meta.category === category);
  }

  /**
   * グループIDでフィールドを取得
   */
  public getFieldsByGroupId(groupId: string): FieldMetadata[] {
    return this.getAllFieldMetadata().filter(meta => meta.groupId === groupId);
  }

  /**
   * セクションでフィールドを取得
   */
  public getFieldsBySection(section: string): FieldMetadata[] {
    return this.getAllFieldMetadata().filter(meta => meta.section === section);
  }

  /**
   * 進捗フィールドのみ取得
   */
  public getProgressFields(): FieldMetadata[] {
    return this.getAllFieldMetadata().filter(meta => meta.type === 'progress');
  }

  /**
   * 編集可能フィールドのみ取得
   */
  public getEditableFields(): FieldMetadata[] {
    return this.getAllFieldMetadata().filter(meta => meta.editable === true);
  }

  /**
   * フィールドラベルのマップを生成
   */
  public generateFieldLabels(): Record<FieldKey, string> {
    const labels: Partial<Record<FieldKey, string>> = {};
    this.metadata.forEach((meta, field) => {
      labels[field] = meta.title;
    });
    // IDフィールドは手動で追加（メタデータに含まれていないため）
    labels.id = 'ID';
    return labels as Record<FieldKey, string>;
  }

  /**
   * フィールドの順序を取得
   */
  public getFieldOrder(field: FieldKey): number {
    const meta = this.metadata.get(field);
    return meta ? meta.order : -1;
  }

  /**
   * 次のフィールドを取得
   */
  public getNextField(field: FieldKey): FieldKey | null {
    const currentIndex = this.orderedFields.indexOf(field);
    if (currentIndex === -1 || currentIndex === this.orderedFields.length - 1) {
      return null;
    }
    return this.orderedFields[currentIndex + 1];
  }

  /**
   * 前のフィールドを取得
   */
  public getPreviousField(field: FieldKey): FieldKey | null {
    const currentIndex = this.orderedFields.indexOf(field);
    if (currentIndex <= 0) {
      return null;
    }
    return this.orderedFields[currentIndex - 1];
  }
}