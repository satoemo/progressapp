import { CutData } from '@/domain/types';
import { CutReadModel } from '@/infrastructure/CutReadModel';

export const mockCutData: CutData = {
  cutNumber: '001A',
  scene: 'SC001',
  cut: 'C001',
  contents: 'テストカット',
  frames: 24,
  originalStart: '2025-01-01',
  originalEnd: '2025-01-05',
  currentStart: '2025-01-01',
  currentEnd: '2025-01-05',
  retest_num: 0,
  shootingStatus: '作画',
  director: '監督A',
  animationDirector: '作監B',
  productionManager: '制作C',
  keyAnimator: '原画D',
  secondKeyAnimator: '',
  inbetweenInspector: 'IN_CHECK E',
  photographer: '撮影F',
  painter: 'FIN G',
  originalDate: '2025-01-02',
  firstRetakeDate: null,
  keyAnimationDate: '2025-01-03',
  secondKeyAnimationDate: null,
  inbetweenInspectionDate: '2025-01-04',
  photographyDate: '2025-01-05',
  paintingDate: null,
  completionDate: null,
  special: '',
  kenyo: '',
  kenyo2: '',
  kenyo3: '',
  kenyo4: '',
  unit_price: '10000',
  key_price: '5000',
  second_price: '0',
  in_between_price: '3000',
  finishing_price: '2000',
  bookNo: 'BOOK001',
  retestRemarks: '',
  directRetakeReason: '',
  satsueRetakeReason: '',
  memos: {}
};

export const createMockCutReadModel = (overrides?: Partial<CutData>): CutReadModel => {
  const data = { ...mockCutData, ...overrides };
  const readModel: CutReadModel = {
    ...data,
    id: `cut_${data.cutNumber}`,
    getMemos: () => data.memos || {},
    getCutData: () => data
  };
  return readModel;
};

export const createMockCutReadModels = (count: number = 5): CutReadModel[] => {
  return Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(3, '0');
    return createMockCutReadModel({
      cutNumber: `${num}A`,
      scene: `SC${num}`,
      cut: `C${num}`,
      contents: `テストカット${num}`,
      director: i % 2 === 0 ? '監督A' : '監督B',
      shootingStatus: i % 3 === 0 ? '作画' : i % 3 === 1 ? '撮影' : '完成'
    });
  });
};