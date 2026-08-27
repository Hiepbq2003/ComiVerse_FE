import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import VerifyEmail from '../../../../pages/common/VerifyEmail';
import * as AuthApi from '../../../../services/api/AuthApi';

vi.mock('../../../../services/api/AuthApi', () => ({
  verifyEmailApi: vi.fn(),
  resendVerificationOtpApi: vi.fn(),
}));

describe('VerifyEmail Component', () => {
  let mockOnNavigate;
  let mockShowAlert;
  let mockSetLoading;

  beforeEach(() => {
    vi.clearAllMocks();
    AuthApi.resendVerificationOtpApi.mockResolvedValue({});
    mockOnNavigate = vi.fn();
    mockShowAlert = vi.fn();
    mockSetLoading = vi.fn();
  });

  const renderComponent = (props = {}) => {
    return render(
      <VerifyEmail
        email="test@example.com"
        onNavigate={mockOnNavigate}
        showAlert={mockShowAlert}
        loading={false}
        setLoading={mockSetLoading}
        {...props}
      />
    );
  };

  it('Should render the correct email address and form elements', () => {
    renderComponent();
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument();
    expect(screen.getByText('Verify Email')).toBeInTheDocument();
    expect(AuthApi.resendVerificationOtpApi).not.toHaveBeenCalled();
  });

  it('Should request one fresh OTP when opened from a pending login', async () => {
    renderComponent({ autoSendOtp: true });

    await waitFor(() => {
      expect(AuthApi.resendVerificationOtpApi).toHaveBeenCalledTimes(1);
      expect(AuthApi.resendVerificationOtpApi).toHaveBeenCalledWith('test@example.com');
      expect(mockShowAlert).toHaveBeenCalledWith(
        'success',
        'A verification OTP has been sent to your email.'
      );
    });
  });

  it('Should keep the latest OTP usable when automatic resend is throttled', async () => {
    AuthApi.resendVerificationOtpApi.mockRejectedValueOnce({ response: { status: 429 } });

    renderComponent({ autoSendOtp: true });

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        'info',
        'Your most recent OTP is still valid. Please wait before requesting another code.'
      );
    });
  });

  it('Should handle successful email verification', async () => {
    AuthApi.verifyEmailApi.mockResolvedValueOnce({});

    renderComponent();

    const input = screen.getByPlaceholderText('Enter 6-digit code');
    fireEvent.change(input, { target: { value: '123456' } });

    const verifyBtn = screen.getByText('Verify Email');
    fireEvent.click(verifyBtn);

    expect(mockSetLoading).toHaveBeenCalledWith(true);
    
    await waitFor(() => {
      expect(AuthApi.verifyEmailApi).toHaveBeenCalledWith('test@example.com', '123456');
      expect(mockShowAlert).toHaveBeenCalledWith('success', expect.any(String));
      expect(mockOnNavigate).toHaveBeenCalledWith('signin');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('Should handle verification failure with an error message', async () => {
    AuthApi.verifyEmailApi.mockRejectedValueOnce({
      response: { data: { message: 'OTP Expired' } }
    });

    renderComponent();

    const input = screen.getByPlaceholderText('Enter 6-digit code');
    fireEvent.change(input, { target: { value: '000000' } });

    const verifyBtn = screen.getByText('Verify Email');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('error', 'OTP Expired');
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  it('Should resend OTP successfully', async () => {
    AuthApi.resendVerificationOtpApi.mockResolvedValueOnce({});

    renderComponent();

    const resendBtn = screen.getByText('Resend OTP Code');
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(AuthApi.resendVerificationOtpApi).toHaveBeenCalledWith('test@example.com');
      expect(mockShowAlert).toHaveBeenCalledWith('success', expect.any(String));
    });
  });

  it('Should ask for the account email when login used a username', async () => {
    AuthApi.resendVerificationOtpApi.mockResolvedValueOnce({});
    renderComponent({ email: '' });

    const emailInput = screen.getByPlaceholderText('Enter your account email');
    fireEvent.change(emailInput, { target: { value: ' Pending@Example.com ' } });
    fireEvent.click(screen.getByText('Resend OTP Code'));

    await waitFor(() => {
      expect(AuthApi.resendVerificationOtpApi).toHaveBeenCalledWith('pending@example.com');
      expect(mockShowAlert).toHaveBeenCalledWith('success', expect.any(String));
    });
  });
});
