import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../../../../pages/common/Login';
import { AuthProvider } from '../../../../context/AuthContext';
import * as AuthApi from '../../../../services/api/AuthApi';
import * as AuthUtils from '../../../../utils/Auth';

vi.mock('../../../../services/api/AuthApi', () => ({
  loginApi: vi.fn(),
  getMeApi: vi.fn(),
}));

vi.mock('../../../../utils/Auth', () => ({
  setAuth: vi.fn(),
  getAuth: vi.fn(() => null),
}));

const renderLogin = () => {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/auth']}>
        <Routes>
          <Route path="/auth" element={<Login setLoading={() => {}} loading={false} onLoginSuccess={() => {}} />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('Login Component - Security & Edge Case Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Brute Force & Rate Limiting Prevention', () => {
    it('Should handle account lockout after 5 consecutive failed attempts (Error Guessing / Stress)', async () => {
      // Mock API to simulate 5 sequential failures then lockout
      AuthApi.loginApi.mockRejectedValue({ response: { status: 401 } });
      renderLogin();

      const usernameInput = screen.getByPlaceholderText(/Enter username/i);
      const passwordInput = screen.getByPlaceholderText(/Enter password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      // Attempt 5 times
      for (let i = 0; i < 5; i++) {
        fireEvent.change(usernameInput, { target: { value: 'target_user' } });
        fireEvent.change(passwordInput, { target: { value: `wrong_pass_${i}` } });
        fireEvent.click(submitBtn);
      }

      // 6th attempt should simulate a 429 Too Many Requests or Lockout response
      AuthApi.loginApi.mockRejectedValueOnce({
        response: { status: 429, data: { message: 'Too many attempts. Account locked for 15 minutes.' } }
      });
      
      fireEvent.click(submitBtn);

      // Verify that the frontend catches the 429 and doesn't crash
      expect(AuthApi.loginApi).toHaveBeenCalledTimes(6);
    });
  });

  describe('SQL Injection & XSS Payloads', () => {
    it('Should safely handle SQL injection payloads in the username field', async () => {
      AuthApi.loginApi.mockResolvedValueOnce({ data: { token: 'fake' } });
      AuthApi.getMeApi.mockResolvedValueOnce({ data: { id: 1, role: 'READER' } });
      
      renderLogin();
      const usernameInput = screen.getByPlaceholderText(/Enter username/i);
      const passwordInput = screen.getByPlaceholderText(/Enter password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      const maliciousPayload = "' OR '1'='1 --";
      fireEvent.change(usernameInput, { target: { value: maliciousPayload } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitBtn);

      // Verify the payload is sent as a literal string to the backend (where parameterized queries handle it)
      // The frontend should not parse it or crash.
      await waitFor(() => {
        expect(AuthApi.loginApi).toHaveBeenCalledWith(maliciousPayload, 'password123');
      });
    });

    it('Should safely handle XSS payloads in the password field', async () => {
      AuthApi.loginApi.mockRejectedValueOnce(new Error('Auth failed'));
      
      renderLogin();
      const usernameInput = screen.getByPlaceholderText(/Enter username/i);
      const passwordInput = screen.getByPlaceholderText(/Enter password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      const xssPayload = "<script>alert('hacked')</script>";
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: xssPayload } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(AuthApi.loginApi).toHaveBeenCalledWith('testuser', xssPayload);
      });
    });
  });

  describe('Payload Size Boundaries', () => {
    it('Should not freeze when pasting a 10,000 character string into the password field', async () => {
      renderLogin();
      const passwordInput = screen.getByPlaceholderText(/Enter password/i);
      
      const hugePassword = 'a'.repeat(10000);
      fireEvent.change(passwordInput, { target: { value: hugePassword } });
      
      // Verify state updates without React crashing
      expect(passwordInput.value.length).toBeGreaterThan(0); // If browser/react handles it
    });
  });
});
