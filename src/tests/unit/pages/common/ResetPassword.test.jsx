import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ResetPassword from '../../../../pages/common/ResetPassword';
import * as AuthApi from '../../../../services/api/AuthApi';

vi.mock('../../../../services/api/AuthApi', () => ({
  forgotPasswordApi: vi.fn(),
  resetPasswordApi: vi.fn(),
}));

describe('ResetPassword validation', () => {
  const props = () => ({
    email: 'reader@example.com',
    onNavigate: vi.fn(),
    showAlert: vi.fn(),
    loading: false,
    setLoading: vi.fn(),
  });

  beforeEach(() => vi.clearAllMocks());

  it('blocks invalid OTP and passwords shorter than 8 characters', () => {
    const componentProps = props();
    render(<ResetPassword {...componentProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit code'), {
      target: { value: '12345' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
      target: { value: '1234567' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: '1234567' },
    });
    const form = screen.getByRole('button', { name: /reset password/i }).closest('form');
    fireEvent.submit(form);

    expect(componentProps.showAlert).toHaveBeenCalledWith(
      'error',
      'Enter the 6-digit recovery code',
    );
    expect(AuthApi.resetPasswordApi).not.toHaveBeenCalled();

    componentProps.showAlert.mockClear();
    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit code'), {
      target: { value: '123456' },
    });
    fireEvent.submit(form);
    expect(componentProps.showAlert).toHaveBeenCalledWith(
      'error',
      'New password must be between 8 and 128 characters.',
    );
    expect(AuthApi.resetPasswordApi).not.toHaveBeenCalled();
  });

  it('submits a valid 6-digit OTP and 8-character password', async () => {
    AuthApi.resetPasswordApi.mockResolvedValue({ data: { success: true } });
    const componentProps = props();
    render(<ResetPassword {...componentProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit code'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
      target: { value: '12345678' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(AuthApi.resetPasswordApi).toHaveBeenCalledWith(
        'reader@example.com',
        '123456',
        '12345678',
      );
    });
  });
});
