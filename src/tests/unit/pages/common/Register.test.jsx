import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../../../../pages/common/Register';
import * as AuthApi from '../../../../services/api/AuthApi';

vi.mock('../../../../services/api/AuthApi', () => ({
  registerApi: vi.fn()
}));

describe('User Registration Component Unit & Security Tests (Register.jsx)', () => {
  const mockOnNavigate = vi.fn();
  const mockOnVerificationRequired = vi.fn();
  const mockShowAlert = vi.fn();
  const mockSetLoading = vi.fn();
  const mockOnOpenModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRegister = (loading = false) => {
    return render(
      <Register
        onNavigate={mockOnNavigate}
        onVerificationRequired={mockOnVerificationRequired}
        showAlert={mockShowAlert}
        loading={loading}
        setLoading={mockSetLoading}
        onOpenModal={mockOnOpenModal}
      />
    );
  };

  it('should render registration form inputs and submit button', () => {
    renderRegister();

    expect(screen.getByPlaceholderText(/enter first name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter last name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/choose a username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should block registration if Terms of Service checkbox is not agreed to', async () => {
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'john_doe' } });
    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), { target: { value: 'john@example.com' } });

    // Submit form without checking terms
    const formElement = screen.getByRole('button', { name: /create account/i }).closest('form');
    fireEvent.submit(formElement);

    expect(mockShowAlert).toHaveBeenCalledWith('error', 'You must agree to the Terms of Service and Privacy Policy.');
    expect(AuthApi.registerApi).not.toHaveBeenCalled();
  });

  it('should block registration if passwords do not match', async () => {
    renderRegister();

    const termsCheckbox = document.querySelector('.terms-checkbox-container input');
    fireEvent.click(termsCheckbox);

    fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'john_doe' } });
    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/create password/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'DifferentPassword123!' } });

    const formElement = screen.getByRole('button', { name: /create account/i }).closest('form');
    fireEvent.submit(formElement);

    expect(mockShowAlert).toHaveBeenCalledWith('error', 'Passwords do not match!');
    expect(AuthApi.registerApi).not.toHaveBeenCalled();
  });

  it('should validate username constraints (must be lowercase 3-20 chars)', async () => {
    renderRegister();

    const termsCheckbox = document.querySelector('.terms-checkbox-container input');
    fireEvent.click(termsCheckbox);

    // Invalid username with uppercase and spaces
    fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'INVALID USERNAME' } });
    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), { target: { value: 'john@example.com' } });

    fireEvent.change(screen.getByPlaceholderText(/create password/i), { target: { value: 'ValidPass123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'ValidPass123!' } });

    const formElement = screen.getByRole('button', { name: /create account/i }).closest('form');
    fireEvent.submit(formElement);

    expect(mockShowAlert).toHaveBeenCalledWith(
      'error',
      'Username must be 3-20 characters, lowercase, numbers, and underscores only.'
    );
    expect(AuthApi.registerApi).not.toHaveBeenCalled();
  });

  it('should block registration for users under 13 years old', async () => {
    renderRegister();

    const termsCheckbox = document.querySelector('.terms-checkbox-container input');
    fireEvent.click(termsCheckbox);

    fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'young_user' } });
    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), { target: { value: 'kid@example.com' } });

    fireEvent.change(screen.getByPlaceholderText(/create password/i), { target: { value: 'ValidPass123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'ValidPass123!' } });

    // Choosing today always represents a user under 13.
    fireEvent.click(screen.getByText('Select date of birth'));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    const formElement = screen.getByRole('button', { name: /create account/i }).closest('form');
    fireEvent.submit(formElement);

    expect(mockShowAlert).toHaveBeenCalledWith('error', 'You must be at least 13 years old to register.');
    expect(AuthApi.registerApi).not.toHaveBeenCalled();
  });

  it('should successfully submit valid registration data and trigger OTP verification page', async () => {
    AuthApi.registerApi.mockResolvedValueOnce({ data: { message: 'Success' } });

    renderRegister();

    fireEvent.change(screen.getByPlaceholderText(/enter first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/enter last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'john_doe' } });
    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), { target: { value: 'john@example.com' } });

    fireEvent.change(screen.getByPlaceholderText(/create password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'ValidPassword123!' } });

    const termsCheckbox = document.querySelector('.terms-checkbox-container input');
    fireEvent.click(termsCheckbox);

    const formElement = screen.getByRole('button', { name: /create account/i }).closest('form');
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(AuthApi.registerApi).toHaveBeenCalledWith({
        username: 'john_doe',
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'ValidPassword123!',
        dateOfBirth: null
      });
      expect(mockOnVerificationRequired).toHaveBeenCalledWith('john@example.com');
      expect(mockShowAlert).toHaveBeenCalledWith('success', 'Account created. Please check your email for the OTP code.');
    });
  });

  it('should handle registration backend API errors gracefully', async () => {
    AuthApi.registerApi.mockRejectedValueOnce({
      response: { data: { message: 'Email already in use.' } }
    });

    renderRegister();

    fireEvent.change(screen.getByPlaceholderText(/enter first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/enter last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'existing_user' } });
    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), { target: { value: 'existing@example.com' } });

    fireEvent.change(screen.getByPlaceholderText(/create password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'ValidPassword123!' } });

    const termsCheckbox = document.querySelector('.terms-checkbox-container input');
    fireEvent.click(termsCheckbox);

    const formElement = screen.getByRole('button', { name: /create account/i }).closest('form');
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('error', 'Email already in use.');
    });
  });

  it('should reject registration if username exceeds boundary limit (21 characters)', async () => {
    renderRegister();

    const termsCheckbox = document.querySelector('.terms-checkbox-container input');
    fireEvent.click(termsCheckbox);

    // Boundary Value Analysis: max length is 20, we input 21 characters
    fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'thisusernameisexactly' } }); // 21 chars
    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), { target: { value: 'john@example.com' } });

    fireEvent.change(screen.getByPlaceholderText(/create password/i), { target: { value: 'ValidPass123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'ValidPass123!' } });

    const formElement = screen.getByRole('button', { name: /create account/i }).closest('form');
    fireEvent.submit(formElement);

    expect(mockShowAlert).toHaveBeenCalledWith(
      'error',
      'Username must be 3-20 characters, lowercase, numbers, and underscores only.'
    );
    expect(AuthApi.registerApi).not.toHaveBeenCalled();
  });

  it('should handle unhandled exceptions from the backend (500 Server Error)', async () => {
    // Error Guessing: What if the API throws a generic Error without response.data?
    AuthApi.registerApi.mockRejectedValueOnce(new Error('Internal Server Error'));

    renderRegister();

    fireEvent.change(screen.getByPlaceholderText(/enter first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/enter last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'server_crash' } });
    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), { target: { value: 'crash@example.com' } });

    fireEvent.change(screen.getByPlaceholderText(/create password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'ValidPassword123!' } });

    const termsCheckbox = document.querySelector('.terms-checkbox-container input');
    fireEvent.click(termsCheckbox);

    const formElement = screen.getByRole('button', { name: /create account/i }).closest('form');
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('error', 'Registration failed.');
    });
  });
});
