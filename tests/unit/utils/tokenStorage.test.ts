import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/utils/tokenStorage';

describe('tokenStorage', () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;
  let getItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearAccessToken();
    vi.restoreAllMocks();
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
  });

  it('setAccessToken stores the token in memory', () => {
    setAccessToken('my-token');
    expect(getAccessToken()).toBe('my-token');
  });

  it('getAccessToken returns null before any token is set', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('clearAccessToken removes the stored token', () => {
    setAccessToken('my-token');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });

  it('does NOT use localStorage', () => {
    setAccessToken('my-token');
    getAccessToken();
    clearAccessToken();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();
  });

  it('does NOT use sessionStorage', () => {
    setAccessToken('my-token');
    getAccessToken();
    clearAccessToken();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();
  });
});
