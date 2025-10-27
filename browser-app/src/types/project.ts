/**
 * プロジェクト設定関連の型定義
 */

/**
 * プロジェクト設定
 */
export interface ProjectSettings {
  projectStartDate: string;  // YYYY-MM-DD形式
  projectEndDate: string;    // YYYY-MM-DD形式
}

/**
 * デフォルトのプロジェクト設定を生成
 * デフォルト期間: 今日から6ヶ月後まで
 */
export function createDefaultProjectSettings(): ProjectSettings {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 6); // 6ヶ月後

  return {
    projectStartDate: formatDate(today),
    projectEndDate: formatDate(endDate)
  };
}

/**
 * プロジェクト設定のバリデーション
 *
 * @param settings プロジェクト設定
 * @returns バリデーション結果（true: 有効, false: 無効）
 */
export function validateProjectSettings(settings: ProjectSettings): boolean {
  // 日付文字列が存在するかチェック
  if (!settings.projectStartDate || !settings.projectEndDate) {
    return false;
  }

  const start = new Date(settings.projectStartDate);
  const end = new Date(settings.projectEndDate);

  // 日付が有効か
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  // 開始日 <= 終了日
  return start <= end;
}

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 *
 * @param date フォーマット対象の日付
 * @returns YYYY-MM-DD形式の文字列
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
