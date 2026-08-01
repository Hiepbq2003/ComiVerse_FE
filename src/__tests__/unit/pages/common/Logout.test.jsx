import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../../../context/AuthContext';
import * as AuthUtils from '../../../../utils/Auth';

const LogoutTestComponent = () => {
  const { isLoggedIn, user, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isLoggedIn ? `Logged in as ${user?.username}` : 'Logged out'}</span>
      {isLoggedIn && (
        <button onClick={logout} data-testid="logout-button">
          Log Out
        </button>
      )}
    </div>
  );
};

describe('Logout Session Termination Unit & Security Tests (Logout.test.jsx)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should execute complete logout session termination, clear storage credentials, and update auth context state', async () => {
    // Pre-set active authenticated user state in localStorage
    AuthUtils.setAuth('active-jwt-token', { id: 'uuid-999', username: 'active_user', role: 'READER' });

    render(
      <AuthProvider>
        <LogoutTestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Logged in as active_user');

    // Trigger logout session termination
    const logoutBtn = screen.getByTestId('logout-button');
    fireEvent.click(logoutBtn);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Logged out');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
