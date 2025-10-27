import { DynamicStyleManager } from './DynamicStyleManager';
import { DOMBuilder } from '@/ui/shared/utils/DOMBuilder';

/**
 * DOM操作の共通ユーティリティクラス
 */
export class DOMUtils {
  /**
   * HTMLエスケープ処理
   * XSS対策として、特殊文字をHTMLエンティティに変換
   * @param text エスケープする文字列
   * @returns エスケープされた文字列
   */
  static escapeHtml(text: string): string {
    const div = DOMBuilder.create('div', {
      textContent: text
    });
    return div.innerHTML;
  }
}