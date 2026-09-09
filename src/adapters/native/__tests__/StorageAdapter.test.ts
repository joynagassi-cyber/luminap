import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageAdapter } from '../StorageAdapter';

// vi.hoisted runs before hoisted vi.mock, so mocks are available inside the factory
const { mockStoragePlugin } = vi.hoisted(() => ({
  mockStoragePlugin: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    keys: vi.fn(),
  },
}));

vi.mock('@capacitor/storage', () => ({
  Storage: mockStoragePlugin,
}));

// Stub window for node environment
vi.stubGlobal('window', globalThis);

// Provide localStorage in node environment
const mockLocalStorage = new Map<string, string>();
const mockLocalStorageImpl = {
  getItem: vi.fn((key: string) => mockLocalStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { mockLocalStorage.set(key, value); }),
  removeItem: vi.fn((key: string) => mockLocalStorage.delete(key)),
  clear: vi.fn(() => { mockLocalStorage.clear(); }),
  keys: vi.fn(() => Array.from(mockLocalStorage.keys())),
  get length() { return mockLocalStorage.size; },
};
vi.stubGlobal('localStorage', mockLocalStorageImpl);

// ─── Tests ─────────────────────────────────────────────────────

describe('StorageAdapter', () => {
  beforeEach(() => {
    StorageAdapter.injectMockPlugin(mockStoragePlugin);
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    StorageAdapter.resetMockPlugin();
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('returns parsed JSON from plugin', async () => {
      mockStoragePlugin.get.mockResolvedValue({
        value: JSON.stringify({ name: 'test', count: 42 }),
      });
      const adapter = StorageAdapter.getInstance();
      const result = await adapter.get<{ name: string; count: number }>('user');
      expect(result).toEqual({ name: 'test', count: 42 });
      expect(mockStoragePlugin.get).toHaveBeenCalledWith({ key: 'user' });
    });

    it('returns null when plugin returns null value', async () => {
      mockStoragePlugin.get.mockResolvedValue({ value: null });
      const adapter = StorageAdapter.getInstance();
      const result = await adapter.get<string>('missing');
      expect(result).toBeNull();
    });

    it('falls back to localStorage on plugin error', async () => {
      StorageAdapter.resetMockPlugin();
      mockLocalStorageImpl.setItem('mykey', JSON.stringify({ ok: true }));
      const adapter = StorageAdapter.getInstance();
      const result = await adapter.get<{ ok: boolean }>('mykey');
      expect(result).toEqual({ ok: true });
      StorageAdapter.injectMockPlugin(mockStoragePlugin);
    });

    it('returns null for missing key in localStorage', async () => {
      StorageAdapter.resetMockPlugin();
      const adapter = StorageAdapter.getInstance();
      const result = await adapter.get<string>('nonexistent');
      expect(result).toBeNull();
      StorageAdapter.injectMockPlugin(mockStoragePlugin);
    });

    it('returns raw string when value is not JSON', async () => {
      StorageAdapter.resetMockPlugin();
      mockLocalStorageImpl.setItem('raw', 'hello');
      const adapter = StorageAdapter.getInstance();
      const result = await adapter.get<string>('raw');
      expect(result).toBe('hello');
      StorageAdapter.injectMockPlugin(mockStoragePlugin);
    });
  });

  describe('set', () => {
    it('sends serialized value to plugin', async () => {
      const adapter = StorageAdapter.getInstance();
      await adapter.set('user', { id: '1', name: 'Alice' });
      expect(mockStoragePlugin.set).toHaveBeenCalledWith({
        key: 'user',
        value: JSON.stringify({ id: '1', name: 'Alice' }),
      });
    });

    it('falls back to localStorage on plugin error', async () => {
      StorageAdapter.resetMockPlugin();
      const adapter = StorageAdapter.getInstance();
      await adapter.set('count', 99);
      expect(mockLocalStorageImpl.getItem('count')).toBe('99');
      StorageAdapter.injectMockPlugin(mockStoragePlugin);
    });
  });

  describe('remove', () => {
    it('calls plugin remove', async () => {
      const adapter = StorageAdapter.getInstance();
      await adapter.remove('user');
      expect(mockStoragePlugin.remove).toHaveBeenCalledWith({ key: 'user' });
    });

    it('removes from localStorage on fallback', async () => {
      StorageAdapter.resetMockPlugin();
      mockLocalStorageImpl.setItem('temp', '1');
      const adapter = StorageAdapter.getInstance();
      await adapter.remove('temp');
      expect(mockLocalStorageImpl.getItem('temp')).toBeNull();
      StorageAdapter.injectMockPlugin(mockStoragePlugin);
    });
  });

  describe('clear', () => {
    it('calls plugin clear', async () => {
      const adapter = StorageAdapter.getInstance();
      await adapter.clear();
      expect(mockStoragePlugin.clear).toHaveBeenCalled();
    });

    it('clears localStorage on fallback', async () => {
      StorageAdapter.resetMockPlugin();
      mockLocalStorageImpl.setItem('a', '1');
      mockLocalStorageImpl.setItem('b', '2');
      const adapter = StorageAdapter.getInstance();
      await adapter.clear();
      expect(mockLocalStorageImpl.length).toBe(0);
      StorageAdapter.injectMockPlugin(mockStoragePlugin);
    });
  });

  describe('keys', () => {
    it('returns keys from plugin', async () => {
      mockStoragePlugin.keys.mockResolvedValue({ keys: ['user', 'settings', 'token'] });
      const adapter = StorageAdapter.getInstance();
      const result = await adapter.keys();
      expect(result).toEqual(['user', 'settings', 'token']);
    });

    it('returns localStorage keys on fallback', async () => {
      StorageAdapter.resetMockPlugin();
      mockLocalStorageImpl.setItem('foo', '1');
      mockLocalStorageImpl.setItem('bar', '2');
      const adapter = StorageAdapter.getInstance();
      const result = await adapter.keys();
      expect(result).toContain('foo');
      expect(result).toContain('bar');
      StorageAdapter.injectMockPlugin(mockStoragePlugin);
    });
  });

  describe('singleton', () => {
    it('returns the same instance with same group', () => {
      const a = StorageAdapter.getInstance('myapp');
      const b = StorageAdapter.getInstance('myapp');
      expect(a).toBe(b);
    });

    it('returns the same instance regardless of group (singleton)', () => {
      // Force a fresh instance with a specific group
      StorageAdapter.resetMockPlugin();
      (StorageAdapter as any).instance = null;
      StorageAdapter.injectMockPlugin(mockStoragePlugin);
      const a = StorageAdapter.getInstance('app1');
      const b = StorageAdapter.getInstance('app2');
      expect(a).toBe(b); // Same singleton instance
    });
  });
});
