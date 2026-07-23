import { describe, it, expect, beforeEach } from 'vitest';
import { getAuth, setAuth, clearAuth } from '../../utils/Auth';

describe('Security & Authentication Storage Unit Tests (Auth.js)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('setAuth & Token Persistence Security', () => {
    it('should securely store valid token and user JSON object in localStorage', () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockTokenPayload';
      const mockUser = { id: 'uuid-1234-5678', username: 'john_doe', role: 'ADMIN' };
      const mockRefreshToken = 'mock-refresh-token-xyz';

      setAuth(mockToken, mockUser, mockRefreshToken);

      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
      expect(localStorage.getItem('refreshToken')).toBe(mockRefreshToken);
    });

    it('should clear authentication data if provided token is null, empty or string "undefined"', () => {
      localStorage.setItem('token', 'existing-token');
      localStorage.setItem('user', JSON.stringify({ username: 'existing' }));

      setAuth(null);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();

      localStorage.setItem('token', 'existing-token');
      setAuth('undefined');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();

      localStorage.setItem('token', 'existing-token');
      setAuth('null');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should remove user payload if user parameter is null or undefined string', () => {
      setAuth('valid-token', null);
      expect(localStorage.getItem('token')).toBe('valid-token');
      expect(localStorage.getItem('user')).toBeNull();

      setAuth('valid-token', 'undefined');
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should accept stringified user object without double JSON encoding', () => {
      const userString = JSON.stringify({ id: 'uuid-999', username: 'author_user', role: 'AUTHOR' });
      setAuth('valid-token', userString);

      expect(localStorage.getItem('user')).toBe(userString);
      const auth = getAuth();
      expect(auth.user.id).toBe('uuid-999');
      expect(auth.user.role).toBe('AUTHOR');
    });
  });

  describe('getAuth & Storage Integrity Verification', () => {
    it('should return null if no token is present in localStorage', () => {
      expect(getAuth()).toBeNull();
    });

    it('should return null if token is literal string "undefined" or "null"', () => {
      localStorage.setItem('token', 'undefined');
      expect(getAuth()).toBeNull();

      localStorage.setItem('token', 'null');
      expect(getAuth()).toBeNull();
    });

    it('should parse valid user JSON payload and return token & user object', () => {
      const token = 'jwt-token-abcd';
      const user = { id: 'uuid-user-007', username: 'security_tester', role: 'MODERATOR' };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      const auth = getAuth();
      expect(auth).toEqual({
        token,
        user
      });
    });

    it('should gracefully handle corrupted/malformed user JSON without throwing an exception', () => {
      localStorage.setItem('token', 'valid-jwt-token');
      localStorage.setItem('user', '{ invalid_json_syntax: true '); // Malformed JSON

      let auth;
      expect(() => {
        auth = getAuth();
      }).not.toThrow();

      expect(auth).toEqual({
        token: 'valid-jwt-token',
        user: null
      });
    });
  });

  describe('clearAuth & Logout Protection', () => {
    it('should purge all sensitive credentials (token, user, refreshToken) on clearAuth', () => {
      localStorage.setItem('token', 'secret-jwt');
      localStorage.setItem('user', JSON.stringify({ id: '1' }));
      localStorage.setItem('refreshToken', 'secret-refresh');

      clearAuth();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(getAuth()).toBeNull();
    });
  });
});
