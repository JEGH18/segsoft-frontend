import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearSessionEndedNotice,
  readSessionEndedNotice,
  saveSessionEndedNotice,
  sessionEndedMessage,
} from '@/utils/sessionNotice';

const LOCKED = 'La cuenta está bloqueada por demasiados intentos fallidos. Intenta de nuevo en 30 minutos.';

function apiError(url: string, status: number, errorCode: string, withSession = true) {
  return {
    config: { url, headers: withSession ? { Authorization: 'Bearer t' } : {} },
    response: { status, data: { errorCode, message: LOCKED } },
  };
}

describe('sessionEndedMessage', () => {
  it('ends the session when a request made with it finds the account locked', () => {
    expect(sessionEndedMessage(apiError('/api/v1/repositories', 423, 'ACCOUNT_LOCKED'))).toBe(LOCKED);
    expect(sessionEndedMessage(apiError('/api/v1/auth/me', 423, 'ACCOUNT_LOCKED'))).toBe(LOCKED);
  });

  it('ends the session when the account was disabled or deleted', () => {
    expect(sessionEndedMessage(apiError('/api/v1/repositories', 401, 'SESSION_REVOKED'))).toBe(LOCKED);
  });

  it('leaves the public auth endpoints to report the lock in their own page', () => {
    expect(sessionEndedMessage(apiError('/api/v1/auth/login', 423, 'ACCOUNT_LOCKED'))).toBeNull();
    expect(sessionEndedMessage(apiError('/api/v1/auth/verify-email', 423, 'ACCOUNT_LOCKED'))).toBeNull();
  });

  it('ignores requests without a session and any other error', () => {
    expect(sessionEndedMessage(apiError('/api/v1/repositories', 423, 'ACCOUNT_LOCKED', false))).toBeNull();
    expect(sessionEndedMessage(apiError('/api/v1/repositories', 401, 'TOKEN_EXPIRED'))).toBeNull();
    expect(sessionEndedMessage(apiError('/api/v1/repositories', 403, 'FORBIDDEN'))).toBeNull();
    expect(sessionEndedMessage(new Error('network'))).toBeNull();
  });
});

describe('session ended notice', () => {
  beforeEach(() => clearSessionEndedNotice());

  it('survives until it is cleared', () => {
    expect(readSessionEndedNotice()).toBeNull();
    saveSessionEndedNotice(LOCKED);
    expect(readSessionEndedNotice()).toBe(LOCKED);
    clearSessionEndedNotice();
    expect(readSessionEndedNotice()).toBeNull();
  });
});
