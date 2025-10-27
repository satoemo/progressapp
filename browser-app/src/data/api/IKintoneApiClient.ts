/**
 * kintone APIクライアントのインターフェース
 */
export interface IKintoneApiClient {
  /**
   * レコードを取得
   */
  getRecord(appId: number, recordId: number): Promise<KintoneRecord>;

  /**
   * レコードを更新
   */
  updateRecord(appId: number, recordId: number, record: Partial<KintoneRecord>): Promise<void>;

  /**
   * レコードを作成
   */
  createRecord(appId: number, record: Partial<KintoneRecord>): Promise<number>;

  /**
   * 最初のレコードを検索（共有レコード用）
   */
  findFirstRecord(appId: number): Promise<KintoneRecord | null>;
}

/**
 * kintoneレコードの型定義
 */
export interface KintoneRecord {
  cutDataJson?: KintoneFieldValue<string>;
  eventsJson?: KintoneFieldValue<string>;
  memoJson?: KintoneFieldValue<string>;
  lastModified?: KintoneFieldValue<string>;
  version?: KintoneFieldValue<string>;
  cutNumber?: KintoneFieldValue<string>;
  status?: KintoneFieldValue<string>;
  $id?: KintoneFieldValue<string>;
  $revision?: KintoneFieldValue<string>;
}

/**
 * kintoneフィールド値の型定義
 */
export interface KintoneFieldValue<T> {
  value: T;
}