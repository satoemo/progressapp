// LocalStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

global.localStorage = localStorageMock as Storage;

// consoleメソッドのモック（テスト中のログを抑制）
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

// DOMイベントのモック
global.Event = jest.fn() as any;
global.CustomEvent = jest.fn() as any;

// DateのモックなどVを設定する場合
// jest.useFakeTimers();

// テスト後のクリーンアップ
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});