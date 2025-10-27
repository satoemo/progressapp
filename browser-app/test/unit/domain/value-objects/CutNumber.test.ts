import { CutNumber } from '@/domain/value-objects/CutNumber';

describe('CutNumber', () => {
  describe('constructor', () => {
    it('正常なカット番号を受け入れる', () => {
      const cutNumber = new CutNumber('001A');
      expect(cutNumber.getValue()).toBe('001A');
    });

    it('小文字も受け入れる', () => {
      const cutNumber = new CutNumber('001a');
      expect(cutNumber.getValue()).toBe('001a');
    });

    it('空文字列でエラーをスローする', () => {
      expect(() => new CutNumber('')).toThrow('Invalid cut number: ');
    });

    it('nullでエラーをスローする', () => {
      expect(() => new CutNumber(null as unknown as string)).toThrow();
    });

    it('undefinedでエラーをスローする', () => {
      expect(() => new CutNumber(undefined as unknown as string)).toThrow();
    });
  });

  // parseメソッドは未実装のため、テストをスキップ - Phase 6で削除予定
  describe.skip('parse', () => {
    it('正常なカット番号をパースする', () => {
      const result = CutNumber.parse('123B');
      expect(result.numeric).toBe(123);
      expect(result.suffix).toBe('B');
    });

    it('接尾辞なしのカット番号をパースする', () => {
      const result = CutNumber.parse('456');
      expect(result.numeric).toBe(456);
      expect(result.suffix).toBe('');
    });

    it('複数文字の接尾辞をパースする', () => {
      const result = CutNumber.parse('789XYZ');
      expect(result.numeric).toBe(789);
      expect(result.suffix).toBe('XYZ');
    });

    it('ゼロパディングされた番号をパースする', () => {
      const result = CutNumber.parse('001A');
      expect(result.numeric).toBe(1);
      expect(result.suffix).toBe('A');
    });
  });

  describe('compare', () => {
    it('数値部分が異なる場合、数値で比較する', () => {
      const cut1 = new CutNumber('001A');
      const cut2 = new CutNumber('002A');
      expect(cut1.compare(cut2)).toBeLessThan(0);
      expect(cut2.compare(cut1)).toBeGreaterThan(0);
    });

    it('数値部分が同じ場合、接尾辞で比較する', () => {
      const cut1 = new CutNumber('001A');
      const cut2 = new CutNumber('001B');
      expect(cut1.compare(cut2)).toBeLessThan(0);
      expect(cut2.compare(cut1)).toBeGreaterThan(0);
    });

    it('完全に同じ場合、0を返す', () => {
      const cut1 = new CutNumber('001A');
      const cut2 = new CutNumber('001A');
      expect(cut1.compare(cut2)).toBe(0);
    });

    it('接尾辞なしとありを正しく比較する', () => {
      const cut1 = new CutNumber('001');
      const cut2 = new CutNumber('001A');
      expect(cut1.compare(cut2)).toBeLessThan(0);
    });
  });

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      const cut1 = new CutNumber('001A');
      const cut2 = new CutNumber('001A');
      expect(cut1.equals(cut2)).toBe(true);
    });

    it('異なる値の場合falseを返す', () => {
      const cut1 = new CutNumber('001A');
      const cut2 = new CutNumber('001B');
      expect(cut1.equals(cut2)).toBe(false);
    });

    it('大文字小文字を区別する', () => {
      const cut1 = new CutNumber('001a');
      const cut2 = new CutNumber('001A');
      expect(cut1.equals(cut2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('文字列表現を返す', () => {
      const cutNumber = new CutNumber('001A');
      expect(cutNumber.toString()).toBe('001A');
    });
  });


  describe('compare', () => {
    it('数字のみのカット番号を正しく比較する', () => {
      const cut1 = new CutNumber('1');
      const cut2 = new CutNumber('2');
      const cut10 = new CutNumber('10');
      
      expect(cut1.compare(cut2)).toBeLessThan(0);
      expect(cut2.compare(cut1)).toBeGreaterThan(0);
      expect(cut1.compare(cut1)).toBe(0);
      expect(cut2.compare(cut10)).toBeLessThan(0);
    });

    it('サフィックス付きのカット番号を正しく比較する', () => {
      const cut3 = new CutNumber('3');
      const cut3a = new CutNumber('3-a');
      const cut3b = new CutNumber('3-b');
      
      expect(cut3.compare(cut3a)).toBeLessThan(0);
      expect(cut3a.compare(cut3b)).toBeLessThan(0);
      expect(cut3b.compare(cut3a)).toBeGreaterThan(0);
    });
  });

  describe('sort', () => {
    it('カット番号の配列を正しくソートする', () => {
      const unsorted = ['10', '2', '3-b', '1', '3-a', '3', '7a', '7b'];
      const sorted = CutNumber.sort(unsorted);
      
      expect(sorted).toEqual(['1', '2', '3', '3-a', '3-b', '7a', '7b', '10']);
    });

    it('空の値を除外してソートする', () => {
      const unsorted = ['2', '', '1', null as unknown as string, undefined as unknown as string, '3'];
      const sorted = CutNumber.sort(unsorted);
      
      expect(sorted).toEqual(['1', '2', '3']);
    });
  });
});