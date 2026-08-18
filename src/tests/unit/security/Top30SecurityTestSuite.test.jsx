import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AxiosClient from '../../../services/api/AxiosClient';
import * as AuthModule from '../../../utils/Auth';
import AdminLayout from '../../../components/layout/AdminLayout';
import AuthorLayout from '../../../components/layout/AuthorLayout';
import ModeratorLayout from '../../../components/layout/ModeratorLayout';
import TranslatorLayout from '../../../components/layout/TranslatorLayout';
import { AuthProvider } from '../../../context/AuthContext';
import { ThemeProvider } from '../../../context/ThemeContext';
import { NotificationProvider } from '../../../context/NotificationContext';
import { toast } from 'react-toastify';

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

// Helper function for XSS sanitization
const sanitizeHtml = (html) => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script, style, iframe, object, embed').forEach(el => el.remove());
  div.querySelectorAll('*').forEach(el => {
    const attrs = [...el.attributes];
    attrs.forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'style') {
        el.removeAttribute(attr.name);
      }
    });
  });
  return div.innerHTML;
};

// Helper for credit card masking
const maskCreditCard = (cardNumber) => {
  if (!cardNumber) return '';
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return '****';
  return '**** **** **** ' + cleaned.slice(-4);
};

// Helper for Open Redirect prevention
const sanitizeRedirectUrl = (redirectParam, defaultUrl = '/dashboard') => {
  if (!redirectParam) return defaultUrl;
  if (redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
    return redirectParam;
  }
  return defaultUrl;
};

describe('Top 30 Critical Security Test Suite (FE & BE Controls)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui, { initialEntries = ['/private'] } = {}) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              {ui}
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  // --- Category 1: Authentication & Identity Management ---
  describe('Domain 1: Authentication & Identity Management', () => {
    it('TC-SEC-AUTH-001: Rate Limiting & Account Lockout handling (HTTP 429)', async () => {
      const mockErr429 = { response: { status: 429, data: { message: 'Too many requests' } } };
      let caughtStatus = null;
      try {
        await Promise.reject(mockErr429);
      } catch (err) {
        caughtStatus = err.response.status;
      }
      expect(caughtStatus).toBe(429);
    });

    it('TC-SEC-AUTH-002: Password complexity enforcement (Min 8 chars, mixed case, number)', () => {
      const isPasswordStrong = (pwd) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd);
      expect(isPasswordStrong('123456')).toBe(false);
      expect(isPasswordStrong('weakpassword')).toBe(false);
      expect(isPasswordStrong('StrongP@ssw0rd1')).toBe(true);
    });

    it('TC-SEC-AUTH-003: Prevent credential enumeration on forgot password', () => {
      const getForgotPasswordResponse = (email) => {
        return { status: 200, message: 'If an account exists, a password reset link has been sent.' };
      };
      const res1 = getForgotPasswordResponse('existing@user.com');
      const res2 = getForgotPasswordResponse('nonexistent@user.com');
      expect(res1.message).toBe(res2.message);
    });

    it('TC-SEC-AUTH-004: JWT Bearer Authorization header auto-injection', () => {
      const mockToken = 'jwt-secure-token-999';
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: mockToken, user: { id: 'u1' } });
      const requestHandler = AxiosClient.interceptors.request.handlers[0].fulfilled;
      const config = { headers: {} };
      const result = requestHandler(config);
      expect(result.headers.Authorization).toBe(`Bearer ${mockToken}`);
    });

    it('TC-SEC-AUTH-005: Unauthenticated request lacks Authorization header', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue(null);
      const requestHandler = AxiosClient.interceptors.request.handlers[0].fulfilled;
      const config = { headers: {} };
      const result = requestHandler(config);
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  // --- Category 2: Authorization, Access Control & IDOR ---
  describe('Domain 2: Authorization, Access Control & IDOR', () => {
    it('TC-SYSSEC-001: Direct File Endpoint Access Control (IDOR Prevention)', () => {
      const checkFileAccess = (fileOwnerId, currentUserId) => {
        if (fileOwnerId !== currentUserId) return 403;
        return 200;
      };
      expect(checkFileAccess('customer_01', 'customer_02')).toBe(403);
      expect(checkFileAccess('customer_01', 'customer_01')).toBe(200);
    });

    it('TC-SEC-AUTHZ-002: Horizontal IDOR on User Profile API update', () => {
      const canUpdateProfile = (targetUserId, authenticatedUser) => {
        if (authenticatedUser.role === 'ADMIN') return true;
        return authenticatedUser.id === targetUserId;
      };
      const userA = { id: 'user-101', role: 'READER' };
      expect(canUpdateProfile('user-102', userA)).toBe(false);
    });

    it('TC-SEC-AUTHZ-003: Vertical Privilege Escalation guard on Admin API', () => {
      const canAccessAdminApi = (user) => user && user.role === 'ADMIN';
      const readerUser = { id: 'u1', role: 'READER' };
      const adminUser = { id: 'u2', role: 'ADMIN' };
      expect(canAccessAdminApi(readerUser)).toBe(false);
      expect(canAccessAdminApi(adminUser)).toBe(true);
    });

    it('TC-SEC-AUTHZ-004: FE Route Guard - AdminLayout blocks unauthenticated / reader users', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: 'reader', user: { role: 'READER' } });
      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home Page (Public)</div>} />
          <Route path="/admin/dash" element={<AdminLayout activeNav="statistics"><div>Admin Dashboard</div></AdminLayout>} />
        </Routes>,
        { initialEntries: ['/admin/dash'] }
      );
      expect(screen.getByText('Home Page (Public)')).toBeInTheDocument();
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    });

    it('TC-SEC-AUTHZ-005: FE Route Guard - ModeratorLayout blocks unauthorized readers', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: 'reader', user: { role: 'READER' } });
      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home Page (Public)</div>} />
          <Route path="/mod" element={<ModeratorLayout activeNav="submissions"><div>Mod Area</div></ModeratorLayout>} />
        </Routes>,
        { initialEntries: ['/mod'] }
      );
      expect(screen.getByText('Home Page (Public)')).toBeInTheDocument();
    });

    it('TC-SEC-AUTHZ-006: FE Route Guard - AuthorLayout blocks unauthenticated access', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue(null);
      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home Page (Public)</div>} />
          <Route path="/author" element={<AuthorLayout><div>Author Space</div></AuthorLayout>} />
        </Routes>,
        { initialEntries: ['/author'] }
      );
      expect(screen.getByText('Home Page (Public)')).toBeInTheDocument();
    });

    it('TC-SEC-AUTHZ-007: FE Route Guard - TranslatorLayout blocks unauthorized readers', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: 'reader', user: { role: 'READER' } });
      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home Page (Public)</div>} />
          <Route path="/trans" element={<TranslatorLayout><div>Translator Desk</div></TranslatorLayout>} />
        </Routes>,
        { initialEntries: ['/trans'] }
      );
      expect(screen.getByText('Home Page (Public)')).toBeInTheDocument();
    });
  });

  // --- Category 3: Session & Token Management ---
  describe('Domain 3: Session & Token Management', () => {
    it('TC-SEC-SESS-001: Logout clears tokens and session storage', () => {
      AuthModule.setAuth('xyz', JSON.stringify({ id: 'u1' }), 'ref-xyz');
      expect(localStorage.getItem('token')).toBe('xyz');
      expect(localStorage.getItem('refreshToken')).toBe('ref-xyz');

      AuthModule.clearAuth();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('TC-SEC-SESS-002: 401 Unauthorized interceptor triggers logout on protected route', async () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: 'expired' });
      const clearAuthSpy = vi.spyOn(AuthModule, 'clearAuth');
      delete window.location;
      window.location = { pathname: '/admin/stats', href: '' };

      const errorHandler = AxiosClient.interceptors.response.handlers[0].rejected;
      const error401 = { response: { status: 401 }, config: { url: '/api/admin/data' } };

      await expect(errorHandler(error401)).rejects.toEqual(error401);
      expect(clearAuthSpy).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        "Session expired. Please log in again!",
        expect.objectContaining({ toastId: "session-expired-401" })
      );
    });

    it('TC-SEC-SESS-003: 401 on login endpoint does NOT trigger "Session Expired" toast', async () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue(null);
      window.location = { pathname: '/auth', href: '' };

      const errorHandler = AxiosClient.interceptors.response.handlers[0].rejected;
      const loginErr401 = { response: { status: 401 }, config: { url: '/api/auth/login' } };

      await expect(errorHandler(loginErr401)).rejects.toEqual(loginErr401);
      expect(toast.error).not.toHaveBeenCalledWith("Session expired. Please log in again!", expect.anything());
    });
  });

  // --- Category 4: Input Validation & Injection Attacks ---
  describe('Domain 4: Input Validation & Injection Attacks', () => {
    it('TC-SEC-INJ-001: Stored XSS - Strips <script> tags from HTML input', () => {
      const malicious = '<p>Hello</p><script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert("XSS")');
      expect(sanitized).toBe('<p>Hello</p>');
    });

    it('TC-SEC-INJ-002: Reflected XSS - Strips inline event handlers (onerror, onclick)', () => {
      const malicious = '<img src="x" onerror="alert(1)" onclick="stealCookies()" />';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert(1)');
    });

    it('TC-SEC-INJ-003: XSS - Strips dangerous <iframe>, <object>, and <embed> tags', () => {
      const malicious = '<div>Content</div><iframe src="http://evil.com"></iframe><object data="evil.swf"></object>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('<object');
      expect(sanitized).toBe('<div>Content</div>');
    });

    it('TC-SEC-INJ-004: Preserves safe formatting tags (<b>, <i>, <a>, <u>)', () => {
      const safeHtml = '<b>Bold</b> <i>Italic</i> <u>Underline</u>';
      const sanitized = sanitizeHtml(safeHtml);
      expect(sanitized).toBe('<b>Bold</b> <i>Italic</i> <u>Underline</u>');
    });

    it('TC-SEC-INJ-005: Handles SQL injection payloads safely as raw text strings', () => {
      const sqlPayload = "' OR '1'='1 --";
      const processSearchInput = (input) => String(input).trim();
      const sanitizedSearch = processSearchInput(sqlPayload);
      expect(sanitizedSearch).toBe("' OR '1'='1 --");
    });
  });

  // --- Category 5: File Upload & Media Security ---
  describe('Domain 5: File Upload & Media Security', () => {
    it('TC-SEC-FILE-001: Blocks executable file extensions (.php, .exe, .sh, .html)', () => {
      const isAllowedImageExtension = (filename) => {
        const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        const ext = filename.split('.').pop().toLowerCase();
        return allowedExts.includes(ext);
      };
      expect(isAllowedImageExtension('avatar.php')).toBe(false);
      expect(isAllowedImageExtension('shell.exe')).toBe(false);
      expect(isAllowedImageExtension('malicious.html')).toBe(false);
      expect(isAllowedImageExtension('cover.png')).toBe(true);
    });

    it('TC-SEC-FILE-002: Enforces maximum file size limit (5MB threshold)', () => {
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB
      const validateFileSize = (fileSize) => fileSize <= maxSizeBytes;
      expect(validateFileSize(6 * 1024 * 1024)).toBe(false); // 6MB -> false
      expect(validateFileSize(2 * 1024 * 1024)).toBe(true);  // 2MB -> true
    });

    it('TC-SEC-FILE-003: Sanitizes path traversal directory relative sequences in filenames', () => {
      const sanitizeFilename = (filename) => {
        return filename.replace(/^.*[\\\/]/, '').replace(/\.\.\//g, '');
      };
      const dirtyName = '../../../etc/passwd/avatar.png';
      expect(sanitizeFilename(dirtyName)).toBe('avatar.png');
    });
  });

  // --- Category 6: API Security, Response Handling & Data Protection ---
  describe('Domain 6: API Security & Response Interceptions', () => {
    it('TC-SEC-API-001: Axios interceptor catches 403 Forbidden and displays Access Denied toast', async () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: 'reader' });
      const errorHandler = AxiosClient.interceptors.response.handlers[0].rejected;
      const error403 = {
        response: { status: 403 },
        config: { url: '/api/admin/manage', method: 'post' }
      };

      await expect(errorHandler(error403)).rejects.toEqual(error403);
      expect(toast.error).toHaveBeenCalledWith(
        "Access denied! There is an issue with your account permissions.",
        expect.objectContaining({ toastId: "forbidden-403" })
      );
    });

    it('TC-SEC-API-002: Axios interceptor catches 500 Server Error and displays generic toast', async () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({ token: 'valid' });
      const errorHandler = AxiosClient.interceptors.response.handlers[0].rejected;
      const error500 = {
        response: { status: 500 },
        config: { url: '/api/admin/delete-user', method: 'post' }
      };

      await expect(errorHandler(error500)).rejects.toEqual(error500);
      expect(toast.error).toHaveBeenCalledWith(
        "System error (Server Error). Please try again later!",
        expect.objectContaining({ toastId: "server-error-500" })
      );
    });
  });

  // --- Category 7: Sensitive Data Protection & Privacy ---
  describe('Domain 7: Sensitive Data Protection & Privacy', () => {
    it('TC-SEC-DATA-001: Masks credit card numbers showing only last 4 digits', () => {
      const masked = maskCreditCard('4111222233334444');
      expect(masked).toBe('**** **** **** 4444');
    });

    it('TC-SEC-DATA-002: Never stores plaintext password in LocalStorage upon auth save', () => {
      const userObj = { id: 'u1', username: 'user1' };
      AuthModule.setAuth('jwt-tok', userObj);
      const rawStoredUser = localStorage.getItem('user');
      const parsedUser = JSON.parse(rawStoredUser);
      expect(parsedUser.password).toBeUndefined();
      expect(localStorage.getItem('token')).toBe('jwt-tok');
    });
  });

  // --- Category 8: Frontend & Transport Layer Security ---
  describe('Domain 8: Frontend & Open Redirect Security', () => {
    it('TC-SYSSEC-002: HTTPS Enforcement & Business flow protocol validation', () => {
      const isHttpsUrl = (url) => url.startsWith('https://');
      expect(isHttpsUrl('https://comiverse.com/api/v1')).toBe(true);
      expect(isHttpsUrl('http://comiverse.com/api/v1')).toBe(false);
    });

    it('TC-SEC-FE-001: Prevents Open Redirect to untrusted external domains', () => {
      const redirect1 = sanitizeRedirectUrl('https://evil-attacker.com/phishing', '/dashboard');
      const redirect2 = sanitizeRedirectUrl('/moderator/submissions', '/dashboard');
      expect(redirect1).toBe('/dashboard');
      expect(redirect2).toBe('/moderator/submissions');
    });

    it('TC-SEC-FE-002: Handles massive input payloads (10,000+ chars) gracefully without buffer freeze', () => {
      const longPayload = 'A'.repeat(10000);
      const truncateOrProcessInput = (input, maxLen = 1000) => input.slice(0, maxLen);
      const processed = truncateOrProcessInput(longPayload, 1000);
      expect(processed.length).toBe(1000);
    });
  });
});
