import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountManagement from '../../../../pages/admin/AccountManagement';
import { AuthProvider } from '../../../../context/AuthContext';
import { ThemeProvider } from '../../../../context/ThemeContext';
import { NotificationProvider } from '../../../../context/NotificationContext';
import * as AccountApi from '../../../../services/api/AccountApi';
import * as AuthUtils from '../../../../utils/Auth';

vi.mock('../../../../services/api/AccountApi', () => ({
  getAllAccountsApi: vi.fn(),
  registerStaffApi: vi.fn(),
  banUserApi: vi.fn(),
  unbanUserApi: vi.fn(),
  resetUserPasswordApi: vi.fn(),
  updateUserApi: vi.fn(),
  approveAuthorLicenseApi: vi.fn(),
  rejectAuthorLicenseApi: vi.fn(),
  reopenAuthorLicenseApi: vi.fn(),
}));

describe('Admin Account Management Unit & Integration Tests (AccountManagement.jsx)', () => {
  const mockAccountsData = [
    {
      id: 'usr-1',
      userId: 'USR-0001',
      fullName: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
      role: 'READER',
      status: 'ACTIVE',
      createdDate: '2023-01-15'
    },
    {
      id: 'usr-2',
      userId: 'USR-0002',
      fullName: 'Bùi Việt Hùng',
      username: 'translator_hung',
      email: 'hung@example.com',
      role: 'TRANSLATOR',
      status: 'BANNED',
      createdDate: '2023-03-02'
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Authenticate as ADMIN
    AuthUtils.setAuth('admin-jwt-token', {
      id: 'admin-uuid-001',
      username: 'admin_user',
      role: 'ADMIN',
      fullName: 'System Admin'
    });

    AccountApi.getAllAccountsApi.mockResolvedValue({
      data: mockAccountsData,
      metadata: { totalPages: 1, totalElements: 2 }
    });
  });

  const renderAccountManagement = () => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <AccountManagement />
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('should fetch and display user accounts list from API', async () => {
    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(AccountApi.getAllAccountsApi).toHaveBeenCalled();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('USR-0001')).toBeInTheDocument();
    expect(screen.getByText('Bùi Việt Hùng')).toBeInTheDocument();
    expect(screen.getByText('hung@example.com')).toBeInTheDocument();
    expect(screen.getByText('USR-0002')).toBeInTheDocument();
  });

  it('should filter user accounts by search input query', async () => {
    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name, email, username/i);
    fireEvent.change(searchInput, { target: { value: 'Bùi Việt Hùng' } });

    await waitFor(() => {
      expect(AccountApi.getAllAccountsApi).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Bùi Việt Hùng' })
      );
    });
  });

  it('should trigger Ban User action modal and invoke banUserApi', async () => {
    AccountApi.banUserApi.mockResolvedValue({ data: { success: true } });

    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find Ban button for active user (John Doe)
    const banButtons = screen.getAllByRole('button', { name: /ban/i });
    fireEvent.click(banButtons[0]);

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByText(/ban this account\?/i)).toBeInTheDocument();
    });

    // Confirm ban
    const confirmBanBtn = screen.getByRole('button', { name: /yes, ban/i });
    fireEvent.click(confirmBanBtn);

    await waitFor(() => {
      expect(AccountApi.banUserApi).toHaveBeenCalledWith('usr-1');
    });
  });

  it('should trigger Unban User action modal and invoke unbanUserApi', async () => {
    AccountApi.unbanUserApi.mockResolvedValue({ data: { success: true } });

    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('Bùi Việt Hùng')).toBeInTheDocument();
    });

    // Find Unban button for banned user
    const unbanButton = screen.getByRole('button', { name: /unban/i });
    fireEvent.click(unbanButton);

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByText(/unban this account\?/i)).toBeInTheDocument();
    });

    const confirmUnbanBtn = screen.getByRole('button', { name: /yes, unban/i });
    fireEvent.click(confirmUnbanBtn);

    await waitFor(() => {
      expect(AccountApi.unbanUserApi).toHaveBeenCalledWith('usr-2');
    });
  });

  it('should open Create Account modal, validate required fields, and submit via registerStaffApi', async () => {
    AccountApi.registerStaffApi.mockResolvedValue({ data: { success: true } });

    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click Create Account / Add User button
    const createBtn = screen.getByRole('button', { name: /\+ create user account/i });
    fireEvent.click(createBtn);

    expect(screen.getAllByText(/create user account/i).length).toBeGreaterThan(0);

    // Fill form inside modal
    fireEvent.change(screen.getByPlaceholderText(/^enter username$/i), { target: { value: 'new_staff' } });
    fireEvent.change(screen.getByPlaceholderText(/^enter full name$/i), { target: { value: 'New Staff User' } });
    fireEvent.change(screen.getByPlaceholderText(/staff@comiverse\.com/i), { target: { value: 'staff@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/min\. 6 characters/i), { target: { value: 'StaffPass123!' } });

    // Submit form button inside modal
    const submitStaffBtn = screen.getByRole('button', { name: /^create account$/i });
    fireEvent.click(submitStaffBtn);

    await waitFor(() => {
      expect(AccountApi.registerStaffApi).toHaveBeenCalledWith({
        username: 'new_staff',
        password: 'StaffPass123!',
        fullName: 'New Staff User',
        email: 'staff@example.com',
        role: 'READER'
      });
    });
  });

  it('should open Edit User modal and submit updated fullName and role via updateUserApi', async () => {
    AccountApi.updateUserApi.mockResolvedValue({ data: { success: true } });

    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click Edit button for John Doe
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    expect(screen.getByText(/edit user account/i)).toBeInTheDocument();

    // Change full name to "John Updated"
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'John Updated' } });

    // Submit edit form
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(AccountApi.updateUserApi).toHaveBeenCalledWith('usr-1', {
        fullName: 'John Updated',
        role: 'READER'
      });
    });
  });
  it('should review an Author license in a popup and verify strictly with AuthorEntity.id', async () => {
    AccountApi.getAllAccountsApi.mockResolvedValue({
      data: [{
        id: 'user-uuid-author',
        userId: 'user-uuid-author',
        authorId: 'author-entity-uuid',
        fullName: 'Licensed Author',
        username: 'licensed_author',
        email: 'author@example.com',
        role: 'AUTHOR',
        status: 'ACTIVE',
        authorLicenseStatus: 'PENDING_VERIFICATION',
        licenseUrl: 'https://cdn.example.com/license.pdf',
        licenseOriginalFilename: 'license.pdf',
        licenseUploadedAt: '2026-08-18T07:00:00Z',
      }],
      metadata: { totalPages: 1, totalElements: 1 },
    });
    AccountApi.approveAuthorLicenseApi.mockResolvedValue({ data: { success: true } });

    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('Licensed Author')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /^verify$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /review/i }));

    expect(screen.getByText(/review author license/i)).toBeInTheDocument();
    expect(screen.getByTitle(/license document for licensed author/i)).toHaveAttribute(
      'src',
      'https://cdn.example.com/license.pdf'
    );

    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() => {
      expect(AccountApi.approveAuthorLicenseApi).toHaveBeenCalledWith('author-entity-uuid');
    });
    expect(AccountApi.approveAuthorLicenseApi).not.toHaveBeenCalledWith('user-uuid-author');
  });

  it('should require a reason and reject from the Author license review popup', async () => {
    AccountApi.getAllAccountsApi.mockResolvedValue({
      data: [{
        id: 'user-uuid-author',
        userId: 'user-uuid-author',
        authorId: 'author-entity-uuid',
        fullName: 'Licensed Author',
        username: 'licensed_author',
        email: 'author@example.com',
        role: 'AUTHOR',
        status: 'ACTIVE',
        authorLicenseStatus: 'PENDING_VERIFICATION',
        licenseUrl: 'https://cdn.example.com/license.pdf',
      }],
      metadata: { totalPages: 1, totalElements: 1 },
    });
    AccountApi.rejectAuthorLicenseApi.mockResolvedValue({ data: { success: true } });

    renderAccountManagement();
    await waitFor(() => expect(screen.getByText('Licensed Author')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    fireEvent.change(screen.getByPlaceholderText(/explain what the author needs to correct/i), {
      target: { value: 'Please upload a complete copyright certificate.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));

    await waitFor(() => {
      expect(AccountApi.rejectAuthorLicenseApi).toHaveBeenCalledWith('author-entity-uuid', {
        reason: 'Please upload a complete copyright certificate.',
        deadlineDays: 7,
      });
    });
  });

  // UNHAPPY PATHS & ERROR GUESSING
  it('Error Guessing: Should handle failure to fetch accounts list on mount', async () => {
    AccountApi.getAllAccountsApi.mockRejectedValueOnce(new Error('Network Error'));
    renderAccountManagement();

    await waitFor(() => {
      expect(AccountApi.getAllAccountsApi).toHaveBeenCalled();
    });
  });

  it('Error Guessing: Should handle API failure when registering a user', async () => {
    AccountApi.registerStaffApi.mockRejectedValueOnce(new Error('500 Internal Server Error'));
    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /\+ create user account/i });
    fireEvent.click(createBtn);

    fireEvent.change(screen.getByPlaceholderText(/^enter username$/i), { target: { value: 'new_staff' } });
    fireEvent.change(screen.getByPlaceholderText(/^enter full name$/i), { target: { value: 'New Staff User' } });
    fireEvent.change(screen.getByPlaceholderText(/staff@comiverse\.com/i), { target: { value: 'staff@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/min\. 6 characters/i), { target: { value: 'StaffPass123!' } });

    const submitStaffBtn = screen.getByRole('button', { name: /^create account$/i });
    fireEvent.click(submitStaffBtn);

    await waitFor(() => {
      expect(AccountApi.registerStaffApi).toHaveBeenCalled();
    });
  });

  it('Error Guessing: Should handle API failure when banning a user', async () => {
    AccountApi.banUserApi.mockRejectedValueOnce(new Error('500 Internal Server Error'));
    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const banButtons = screen.getAllByRole('button', { name: /ban/i });
    fireEvent.click(banButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/ban this account\?/i)).toBeInTheDocument();
    });

    const confirmBanBtn = screen.getByRole('button', { name: /yes, ban/i });
    fireEvent.click(confirmBanBtn);

    await waitFor(() => {
      expect(AccountApi.banUserApi).toHaveBeenCalled();
    });
  });

  it('Boundary & Equivalence Testing: Staff Creation Form Validation', async () => {
    renderAccountManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const addStaffBtn = screen.getByRole('button', { name: /\+ Create User Account/i });
    fireEvent.click(addStaffBtn);

    const submitStaffBtn = screen.getByRole('button', { name: /^create account$/i });
    fireEvent.click(submitStaffBtn);

    // Wait for form validation to prevent API call
    await waitFor(() => {
      expect(AccountApi.registerStaffApi).not.toHaveBeenCalled();
    });
  });
});

