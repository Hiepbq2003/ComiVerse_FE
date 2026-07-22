import { describe, it, expect, beforeEach, vi } from 'vitest';
import AxiosClient from '../../services/api/AxiosClient';
import * as AuthModule from '../../utils/Auth';
import { toast } from 'react-toastify';

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Security & Axios Interceptor Tests (AxiosClient.jsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Request Interceptor & Authorization Header Injection', () => {
    it('should inject Authorization Bearer header when token exists in storage', async () => {
      const mockToken = 'jwt-token-sample-12345';
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: mockToken, user: { id: 'uuid-1' } });

      // Run request interceptor handler directly
      const requestHandler = AxiosClient.interceptors.request.handlers[0].fulfilled;
      const config = { headers: {} };
      const resultConfig = requestHandler(config);

      expect(resultConfig.headers.Authorization).toBe(`Bearer ${mockToken}`);
    });

    it('should NOT attach Authorization header when user is unauthenticated', async () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue(null);

      const requestHandler = AxiosClient.interceptors.request.handlers[0].fulfilled;
      const config = { headers: {} };
      const resultConfig = requestHandler(config);

      expect(resultConfig.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor Data Unwrapping Security', () => {
    it('should return response.data when pagination metadata exists', () => {
      const responseHandler = AxiosClient.interceptors.response.handlers[0].fulfilled;
      const mockResponseBody = {
        data: [{ id: 1 }, { id: 2 }],
        metadata: { page: 1, totalPages: 5, totalElements: 10 }
      };

      const result = responseHandler({ data: mockResponseBody });
      expect(result).toEqual(mockResponseBody);
    });

    it('should unwrap data payload cleanly if response.data.data exists', () => {
      const responseHandler = AxiosClient.interceptors.response.handlers[0].fulfilled;
      const mockResponseBody = {
        data: { id: 'uuid-100', name: 'Comic Detail' }
      };

      const result = responseHandler({ data: mockResponseBody });
      expect(result).toEqual({ id: 'uuid-100', name: 'Comic Detail' });
    });
  });

  describe('Security Exception Handling (401, 403, 500 Interceptions)', () => {
    it('should trigger clearAuth and show toast error when 401 Unauthorized occurs on private routes', async () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: 'expired-token' });
      const clearAuthSpy = vi.spyOn(AuthModule, 'clearAuth');

      // Simulate being on private route
      delete window.location;
      window.location = { pathname: '/admin/statistics', href: '' };

      const errorHandler = AxiosClient.interceptors.response.handlers[0].rejected;
      const error401 = {
        response: { status: 401 },
        config: { url: '/api/admin/stats' }
      };

      await expect(errorHandler(error401)).rejects.toEqual(error401);

      expect(clearAuthSpy).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        "Session expired. Please log in again!",
        expect.objectContaining({ toastId: "session-expired-401" })
      );
      expect(window.location.href).toBe('/');
    });

    it('should NOT trigger session expired toast on public login endpoint failure (401 on login)', async () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue(null);

      window.location = { pathname: '/auth', href: '' };

      const errorHandler = AxiosClient.interceptors.response.handlers[0].rejected;
      const loginError401 = {
        response: { status: 401 },
        config: { url: '/api/auth/login' }
      };

      await expect(errorHandler(loginError401)).rejects.toEqual(loginError401);
      expect(toast.error).not.toHaveBeenCalledWith("Session expired. Please log in again!", expect.anything());
    });

    it('should intercept 403 Forbidden and display Access Denied notification', async () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: 'reader-token' });

      const errorHandler = AxiosClient.interceptors.response.handlers[0].rejected;
      const error403 = {
        response: { status: 403 },
        config: { url: '/api/admin/users' }
      };

      await expect(errorHandler(error403)).rejects.toEqual(error403);
      expect(toast.error).toHaveBeenCalledWith(
        "Access denied! There is an issue with your account permissions.",
        expect.objectContaining({ toastId: "forbidden-403" })
      );
    });

    it('should intercept 500 Internal Server Error and display System Error notification', async () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: 'valid-token' });

      const errorHandler = AxiosClient.interceptors.response.handlers[0].rejected;
      const error500 = {
        response: { status: 500 },
        config: { url: '/api/comics' }
      };

      await expect(errorHandler(error500)).rejects.toEqual(error500);
      expect(toast.error).toHaveBeenCalledWith(
        "System error (Server Error). Please try again later!",
        expect.objectContaining({ toastId: "server-error-500" })
      );
    });
  });
});
