import { FieldKey, ProgressFieldKey } from '../types';
import { FieldMetadataRegistry } from '../../models/metadata/FieldMetadataRegistry';

/**
 * 進捗フィールドグループ定義
 */
export interface ProgressFieldGroup {
  id: string;
  title: string;
  fields: ProgressFieldKey[];
}

/**
 * 進捗フィールドサービス
 * 進捗フィールドの順序管理を一元化
 */
export class ProgressFieldService {
  private static instance: ProgressFieldService;
  private registry: FieldMetadataRegistry;
  private progressFields: ProgressFieldKey[] = [];
  private progressGroups: ProgressFieldGroup[] = [];

  private constructor() {
    this.registry = FieldMetadataRegistry.getInstance();
    this.initializeProgressFields();
    this.initializeProgressGroups();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): ProgressFieldService {
    if (!ProgressFieldService.instance) {
      ProgressFieldService.instance = new ProgressFieldService();
    }
    return ProgressFieldService.instance;
  }

  /**
   * 進捗フィールドを初期化
   */
  private initializeProgressFields(): void {
    const allProgressMetadata = this.registry.getProgressFields();
    this.progressFields = allProgressMetadata.map(m => m.field) as ProgressFieldKey[];
  }

  /**
   * 進捗グループを初期化
   */
  private initializeProgressGroups(): void {
    this.progressGroups = [
      {
        id: 'lo',
        title: 'レイアウト',
        fields: this.registry.getFieldsByGroupId('loProgress').map(m => m.field) as ProgressFieldKey[]
      },
      {
        id: 'genga',
        title: '原画',
        fields: this.registry.getFieldsByGroupId('genProgress').map(m => m.field) as ProgressFieldKey[]
      },
      {
        id: 'douga',
        title: '動画',
        fields: this.registry.getFieldsByGroupId('dougaProgress').map(m => m.field) as ProgressFieldKey[]
      },
      {
        id: 'douken',
        title: '動検',
        fields: this.registry.getFieldsByGroupId('doukenProgress').map(m => m.field) as ProgressFieldKey[]
      },
      {
        id: 'iro',
        title: '色指定',
        fields: this.registry.getFieldsByGroupId('iroProgress').map(m => m.field) as ProgressFieldKey[]
      },
      {
        id: 'shiage',
        title: '仕上げ',
        fields: this.registry.getFieldsByGroupId('shiageProgress').map(m => m.field) as ProgressFieldKey[]
      },
      {
        id: 'shikenOthers',
        title: '仕検その他',
        fields: this.registry.getFieldsByGroupId('shikenOthersProgress').map(m => m.field) as ProgressFieldKey[]
      },
      {
        id: 'satsu',
        title: '撮影',
        fields: this.registry.getFieldsByGroupId('satsuProgress').map(m => m.field) as ProgressFieldKey[]
      }
    ];
  }

  /**
   * 全進捗フィールドを取得
   */
  public getAllProgressFields(): ProgressFieldKey[] {
    return [...this.progressFields];
  }

  /**
   * 進捗グループを取得
   */
  public getProgressGroups(): ProgressFieldGroup[] {
    return [...this.progressGroups];
  }

  /**
   * フィールドが進捗フィールドかどうかを判定
   */
  public isProgressField(field: FieldKey): field is ProgressFieldKey {
    return this.progressFields.includes(field as ProgressFieldKey);
  }

  /**
   * 次の進捗フィールドを取得
   */
  public getNextProgressField(field: ProgressFieldKey): ProgressFieldKey | null {
    const currentIndex = this.progressFields.indexOf(field);
    if (currentIndex === -1 || currentIndex === this.progressFields.length - 1) {
      return null;
    }
    return this.progressFields[currentIndex + 1];
  }

  /**
   * 前の進捗フィールドを取得
   */
  public getPreviousProgressField(field: ProgressFieldKey): ProgressFieldKey | null {
    const currentIndex = this.progressFields.indexOf(field);
    if (currentIndex <= 0) {
      return null;
    }
    return this.progressFields[currentIndex - 1];
  }

  /**
   * フィールドが属するグループを取得
   */
  public getFieldGroup(field: ProgressFieldKey): ProgressFieldGroup | null {
    return this.progressGroups.find(group => 
      group.fields.includes(field)
    ) || null;
  }

  /**
   * グループIDでグループを取得
   */
  public getGroupById(groupId: string): ProgressFieldGroup | null {
    return this.progressGroups.find(group => group.id === groupId) || null;
  }

  /**
   * グループ内での次のフィールドを取得
   */
  public getNextFieldInGroup(field: ProgressFieldKey): ProgressFieldKey | null {
    const group = this.getFieldGroup(field);
    if (!group) return null;

    const fieldIndex = group.fields.indexOf(field);
    if (fieldIndex === -1 || fieldIndex === group.fields.length - 1) {
      return null;
    }
    return group.fields[fieldIndex + 1];
  }

  /**
   * グループ内での前のフィールドを取得
   */
  public getPreviousFieldInGroup(field: ProgressFieldKey): ProgressFieldKey | null {
    const group = this.getFieldGroup(field);
    if (!group) return null;

    const fieldIndex = group.fields.indexOf(field);
    if (fieldIndex <= 0) {
      return null;
    }
    return group.fields[fieldIndex - 1];
  }

  /**
   * グループの最初のフィールドを取得
   */
  public getFirstFieldInGroup(groupId: string): ProgressFieldKey | null {
    const group = this.getGroupById(groupId);
    return group && group.fields.length > 0 ? group.fields[0] : null;
  }

  /**
   * グループの最後のフィールドを取得
   */
  public getLastFieldInGroup(groupId: string): ProgressFieldKey | null {
    const group = this.getGroupById(groupId);
    return group && group.fields.length > 0 ? group.fields[group.fields.length - 1] : null;
  }

  /**
   * 全フィールドキーの配列を取得（型チェック用）
   */
  public getAllFieldKeys(): readonly FieldKey[] {
    return this.registry.getAllFieldMetadata().map(m => m.field);
  }
}