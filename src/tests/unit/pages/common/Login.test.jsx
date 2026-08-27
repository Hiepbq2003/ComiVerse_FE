import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../../../../pages/common/Login';
import { AuthProvider } from '../../../../context/AuthContext';
import * as AuthApi from '../../../../services/api/AuthApi';

vi.mock('../../../../services/api/AuthApi', () => ({
  loginApi: vi.fn(),
  getMeApi: vi.fn()
}));

describe('Login Component Unit & Security Tests (Login.test.jsx)', () => {
  const mockOnNavigate = vi.fn();
  const mockOnVerificationRequired = vi.fn();
  const mockOnLoginSuccess = vi.fn();
  const mockShowAlert = vi.fn();
  const mockSetLoading = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderLogin = () => {
    return render(
      <AuthProvider>
        <Login
          onNavigate={mockOnNavigate}
          onVerificationRequired={mockOnVerificationRequired}
          onLoginSuccess={mockOnLoginSuccess}
          showAlert={mockShowAlert}
          loading={false}
          setLoading={mockSetLoading}
        />
      </AuthProvider>
    );
  };

  it('should render username and password input fields and sign in button', () => {
    renderLogin();

    expect(screen.getByPlaceholderText(/enter username or email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should display validation error messages when submitting empty form fields', async () => {
    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Email or username is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(AuthApi.loginApi).not.toHaveBeenCalled();
  });

  it('should execute successful login flow, save authentication tokens, fetch profile, and trigger onLoginSuccess', async () => {
    const mockToken = 'mock-jwt-token-12345';
    const mockRefreshToken = 'mock-refresh-token-67890';
    const mockUserPayload = {
      userId: 'uuid-user-123',
      username: 'hiep_user',
      fullName: 'Hiá»‡p Nguyá»…n',
      email: 'hiep@example.com',
      role: 'READER',
      avatarUrl: 'http://example.com/avatar.png'
    };

    AuthApi.loginApi.mockResolvedValueOnce({
      data: { token: mockToken, refreshToken: mockRefreshToken }
    });

    AuthApi.getMeApi.mockResolvedValueOnce({
      data: mockUserPayload
    });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/enter username or email/i), {
      target: { value: 'hiep_user' }
    });
    fireEvent.change(screen.getByPlaceholderText(/enter password/i), {
      target: { value: 'Password123!' }
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(AuthApi.loginApi).toHaveBeenCalledWith('hiep_user', 'Password123!');
      expect(AuthApi.getMeApi).toHaveBeenCalled();
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUserPayload);
      expect(mockShowAlert).toHaveBeenCalledWith('success', 'Welcome back to ComiVerse!');
    });
  });

  it('should handle invalid login credentials (HTTP 401 error response)', async () => {
    AuthApi.loginApi.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Invalid username or password.' } }
    });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/enter username or email/i), {
      target: { value: 'wrong_user' }
    });
    fireEvent.change(screen.getByPlaceholderText(/enter password/i), {
      target: { value: 'WrongPassword' }
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid username/email or password.')).toBeInTheDocument();
    });
  });

  it('should handle email verification required error (HTTP 403 error response)', async () => {
    AuthApi.loginApi.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Please verify your email before logging in.' } }
    });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/enter username or email/i), {
      target: { value: 'unverified@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/enter password/i), {
      target: { value: 'Password123!' }
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnVerificationRequired).toHaveBeenCalledWith('unverified@example.com');
      expect(mockShowAlert).toHaveBeenCalledWith('info', 'Please verify your email before signing in.');
    });
  });

  it('should use the backend verification code and open OTP for username login', async () => {
    AuthApi.loginApi.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          message: 'Account action required.',
          errors: { code: 'EMAIL_VERIFICATION_REQUIRED' }
        }
      }
    });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/enter username or email/i), {
      target: { value: 'pending_reader' }
    });
    fireEvent.change(screen.getByPlaceholderText(/enter password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnVerificationRequired).toHaveBeenCalledWith('');
      expect(mockShowAlert).toHaveBeenCalledWith('info', 'Please verify your email before signing in.');
    });
  });

  it('should enforce 5 failed login attempts limit and lock account for 10 minutes to prevent spam', async () => {
    AuthApi.loginApi.mockRejectedValue({
      response: { status: 401, data: { message: 'Invalid username or password.' } }
    });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText(/enter username or email/i);
    const passwordInput = screen.getByPlaceholderText(/enter password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    // Try 5 failed attempts sequentially with proper async state waiting
    for (let i = 1; i <= 5; i++) {
      fireEvent.change(usernameInput, { target: { value: 'attacker_user' } });
      fireEvent.change(passwordInput, { target: { value: `WrongPass${i}` } });
      fireEvent.click(submitBtn);

      if (i < 5) {
        await waitFor(() => {
          expect(screen.getByText(new RegExp(`${5 - i} attempt`, 'i'))).toBeInTheDocument();
        });
      }
    }

    await waitFor(() => {
      expect(screen.getByText('You have failed 5 times! Your account login is locked for 10 minutes to prevent spam.')).toBeInTheDocument();
      expect(screen.getByText(/Login Locked:/i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });
  });

  it('should handle banned user login attempt (BANNED status returned)', async () => {
    AuthApi.loginApi.mockResolvedValueOnce({
      data: {
        accessToken: 'fake-jwt-token',
        refreshToken: 'fake-refresh-token',
      }
    });

    AuthApi.getMeApi.mockResolvedValueOnce({
      data: {
        id: 'usr-4',
        username: 'banned_user',
        email: 'banned@example.com',
        role: 'READER',
        status: 'BANNED',
        banned: true
      }
    });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText(/Enter username or email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter password/i);
    fireEvent.change(usernameInput, { target: { value: 'banned_user' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        'error',
        'Your account has been banned. Please contact administration for support.'
      );
    });

    // It should NOT trigger onLoginSuccess for banned users
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });
});


