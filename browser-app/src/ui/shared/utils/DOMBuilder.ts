/**
 * DOM操作の統一ユーティリティ
 * 314箇所のDOM操作パターンを統一化
 */

export interface ElementOptions {
  className?: string | string[];
  textContent?: string;
  innerHTML?: string;
  attributes?: Record<string, string>;
  data?: Record<string, string>;
  dataset?: Record<string, string>;
  styles?: Partial<CSSStyleDeclaration>;
  children?: (HTMLElement | string)[];
  events?: Record<string, EventListener>;
}

export interface UpdateOptions {
  text?: string;
  html?: string;
  classes?: {
    add?: string[];
    remove?: string[];
    toggle?: Record<string, boolean>;
  };
  attributes?: Record<string, string | null>;
  styles?: Partial<CSSStyleDeclaration>;
}

export class DOMBuilder {
  /**
   * 要素を作成（最も使用頻度が高い）
   */
  static create<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options: ElementOptions = {}
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    
    // クラス設定
    if (options.className) {
      const classes = Array.isArray(options.className) 
        ? options.className 
        : [options.className];
      element.className = classes.filter(Boolean).join(' ');
    }
    
    // テキスト/HTML設定
    if (options.textContent !== undefined) {
      element.textContent = options.textContent;
    } else if (options.innerHTML !== undefined) {
      element.innerHTML = options.innerHTML;
    }
    
    // 属性設定
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    // データ属性設定
    if (options.data) {
      Object.entries(options.data).forEach(([key, value]) => {
        element.dataset[key] = value;
      });
    }
    
    // dataset プロパティ設定（互換性のため）
    if (options.dataset) {
      Object.entries(options.dataset).forEach(([key, value]) => {
        element.dataset[key] = value;
      });
    }
    
    // スタイル設定
    if (options.styles) {
      Object.assign(element.style, options.styles);
    }
    
    // 子要素追加
    if (options.children) {
      options.children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      });
    }
    
    // イベント設定
    if (options.events) {
      Object.entries(options.events).forEach(([event, handler]) => {
        element.addEventListener(event, handler);
      });
    }
    
    return element;
  }
  
  /**
   * 複数要素を一括作成
   */
  static createMany<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    count: number,
    optionsFactory: (index: number) => ElementOptions
  ): HTMLElementTagNameMap[K][] {
    return Array.from({ length: count }, (_, i) =>
      this.create(tag, optionsFactory(i))
    );
  }

  /**
   * 要素を親要素に追加
   */
  static append(parent: HTMLElement, ...children: (HTMLElement | string)[]): void {
    children.forEach(child => {
      if (typeof child === 'string') {
        parent.appendChild(document.createTextNode(child));
      } else if (child) {
        parent.appendChild(child);
      }
    });
  }

  /**
   * DocumentFragmentに要素を追加（パフォーマンス最適化用）
   */
  static appendToFragment(fragment: DocumentFragment, ...children: (HTMLElement | string)[]): void {
    children.forEach(child => {
      if (typeof child === 'string') {
        fragment.appendChild(document.createTextNode(child));
      } else if (child) {
        fragment.appendChild(child);
      }
    });
  }

  /**
   * 要素を親要素の先頭に追加
   */
  static prepend(parent: HTMLElement, ...children: (HTMLElement | string)[]): void {
    children.reverse().forEach(child => {
      if (typeof child === 'string') {
        parent.insertBefore(document.createTextNode(child), parent.firstChild);
      } else if (child) {
        parent.insertBefore(child, parent.firstChild);
      }
    });
  }
  
  /**
   * 条件付きクラス操作（頻繁に使用）
   */
  static toggleClass(
    element: HTMLElement,
    className: string,
    condition?: boolean
  ): void {
    if (condition === undefined) {
      element.classList.toggle(className);
    } else {
      element.classList.toggle(className, condition);
    }
  }
  
  /**
   * 複数クラスの一括操作
   */
  static updateClasses(
    element: HTMLElement,
    add?: string[],
    remove?: string[],
    toggle?: Record<string, boolean>
  ): void {
    if (remove) {
      element.classList.remove(...remove);
    }
    if (add) {
      element.classList.add(...add);
    }
    if (toggle) {
      Object.entries(toggle).forEach(([className, condition]) => {
        this.toggleClass(element, className, condition);
      });
    }
  }
  
  /**
   * 要素の一括更新
   */
  static update(element: HTMLElement, options: UpdateOptions): void {
    // テキスト/HTML更新
    if (options.text !== undefined) {
      element.textContent = options.text;
    } else if (options.html !== undefined) {
      element.innerHTML = options.html;
    }
    
    // クラス更新
    if (options.classes) {
      this.updateClasses(
        element,
        options.classes.add,
        options.classes.remove,
        options.classes.toggle
      );
    }
    
    // 属性更新
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        if (value === null) {
          element.removeAttribute(key);
        } else {
          element.setAttribute(key, value);
        }
      });
    }
    
    // スタイル更新
    if (options.styles) {
      Object.assign(element.style, options.styles);
    }
  }
  
  /**
   * テーブルセル作成（プロジェクト特有）
   */
  static createTableCell(
    content: string,
    options: ElementOptions & {
      row?: number;
      column?: string;
      cutId?: string;
    } = {}
  ): HTMLTableCellElement {
    const { row, column, cutId, ...elementOptions } = options;
    
    const cell = this.create('td', {
      ...elementOptions,
      textContent: content,
      data: {
        ...(row !== undefined && { row: row.toString() }),
        ...(column && { column }),
        ...(cutId && { cutId }),
        ...(elementOptions.data || {})
      }
    });
    
    return cell;
  }
  
  /**
   * ポップアップ作成（プロジェクト特有）
   */
  static createPopup(
    title: string,
    content: HTMLElement | string,
    className?: string
  ): HTMLElement {
    return this.create('div', {
      className: ['popup', className].filter(Boolean) as string[],
      children: [
        this.create('div', {
          className: 'popup-header',
          textContent: title
        }),
        this.create('div', {
          className: 'popup-content',
          children: [typeof content === 'string' ? content : content]
        })
      ]
    });
  }
  
  /**
   * ボタン作成（頻出パターン）
   */
  static createButton(
    text: string,
    onClick: EventListener,
    className?: string
  ): HTMLButtonElement {
    return this.create('button', {
      className,
      textContent: text,
      events: { click: onClick }
    });
  }
  
  /**
   * 入力フィールド作成
   */
  static createInput(
    type: string,
    options: ElementOptions & {
      value?: string;
      placeholder?: string;
      name?: string;
    } = {}
  ): HTMLInputElement {
    const { value, placeholder, name, ...elementOptions } = options;
    
    return this.create('input', {
      ...elementOptions,
      attributes: {
        type,
        ...(value !== undefined && { value }),
        ...(placeholder && { placeholder }),
        ...(name && { name }),
        ...(elementOptions.attributes || {})
      }
    });
  }
  
  /**
   * セレクトボックス作成
   */
  static createSelect(
    options: Array<{ value: string; text: string; selected?: boolean }>,
    elementOptions: ElementOptions = {}
  ): HTMLSelectElement {
    const selectOptions = options.map(opt => 
      this.create('option', {
        textContent: opt.text,
        attributes: {
          value: opt.value,
          ...(opt.selected && { selected: 'selected' })
        }
      })
    );
    
    return this.create('select', {
      ...elementOptions,
      children: selectOptions
    });
  }
  
  /**
   * 要素の安全な削除
   */
  static remove(element: HTMLElement): void {
    element.parentNode?.removeChild(element);
  }
  
  /**
   * 子要素の全削除
   */
  static clear(element: HTMLElement): void {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
  
  /**
   * 要素の存在チェック
   */
  static exists(selector: string, parent: Element = document.body): boolean {
    return parent.querySelector(selector) !== null;
  }
  
  /**
   * 要素の取得（型安全）
   */
  static get<K extends keyof HTMLElementTagNameMap>(
    selector: K | string,
    parent: Element = document.body
  ): HTMLElementTagNameMap[K] | null {
    return parent.querySelector(selector) as HTMLElementTagNameMap[K] | null;
  }
  
  /**
   * 複数要素の取得（型安全）
   */
  static getAll<K extends keyof HTMLElementTagNameMap>(
    selector: K | string,
    parent: Element = document.body
  ): NodeListOf<HTMLElementTagNameMap[K]> {
    return parent.querySelectorAll(selector) as NodeListOf<HTMLElementTagNameMap[K]>;
  }
  
  /**
   * 要素の表示/非表示
   */
  static setVisible(element: HTMLElement, visible: boolean): void {
    element.style.display = visible ? '' : 'none';
  }
  
  /**
   * 要素の有効/無効
   */
  static setEnabled(element: HTMLElement, enabled: boolean): void {
    if (element instanceof HTMLInputElement || 
        element instanceof HTMLButtonElement || 
        element instanceof HTMLSelectElement || 
        element instanceof HTMLTextAreaElement) {
      element.disabled = !enabled;
    }
  }
}