import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from '../../../components/layout/AdminLayout';
import AuthorLayout from '../../../components/layout/AuthorLayout';
import ModeratorLayout from '../../../components/layout/ModeratorLayout';
import TranslatorLayout from '../../../components/layout/TranslatorLayout';
import { AuthProvider } from '../../../context/AuthContext';
import { ThemeProvider } from '../../../context/ThemeContext';
import { NotificationProvider } from '../../../context/NotificationContext';
import * as AuthModule from '../../../utils/Auth';

describe('Role-Based Access Control (RBAC) Security Tests', () => {
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

  describe('Admin Portal Security Access Guard (AdminLayout.jsx)', () => {
    it('should redirect unauthenticated users to home page /', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue(null);

      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home Page (Public)</div>} />
          <Route
            path="/admin/statistics"
            element={
              <AdminLayout activeNav="statistics">
                <div>Admin Dashboard Content</div>
              </AdminLayout>
            }
          />
        </Routes>,
        { initialEntries: ['/admin/statistics'] }
      );

      expect(screen.getByText('Home Page (Public)')).toBeInTheDocument();
      expect(screen.queryByText('Admin Dashboard Content')).not.toBeInTheDocument();
    });

    it('should redirect non-admin users (e.g., READER / AUTHOR) away from AdminLayout to home page /', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({
        token: 'reader-token',
        user: { id: 'uuid-1', username: 'normal_reader', role: 'READER' }
      });

      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home Page (Public)</div>} />
          <Route
            path="/admin/account-management"
            element={
              <AdminLayout activeNav="account-management">
                <div>Admin Account Management</div>
              </AdminLayout>
            }
          />
        </Routes>,
        { initialEntries: ['/admin/account-management'] }
      );

      expect(screen.getByText('Home Page (Public)')).toBeInTheDocument();
      expect(screen.queryByText('Admin Account Management')).not.toBeInTheDocument();
    });

    it('should grant access to users with role "ADMIN"', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({
        token: 'valid-admin-token',
        user: { id: 'admin-uuid-001', username: 'sys_admin', role: 'ADMIN', fullName: 'Super Admin' }
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/admin/statistics"
            element={
              <AdminLayout activeNav="statistics">
                <div>Protected Admin Dashboard Content</div>
              </AdminLayout>
            }
          />
        </Routes>,
        { initialEntries: ['/admin/statistics'] }
      );

      expect(screen.getByText('Protected Admin Dashboard Content')).toBeInTheDocument();
      expect(screen.getByText('Statistics Dashboard')).toBeInTheDocument();
    });
  });

  describe('Author Portal Security Access Guard (AuthorLayout.jsx)', () => {
    it('should redirect unauthenticated users away from AuthorLayout to /', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue(null);

      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home Page (Public)</div>} />
          <Route
            path="/author/comics"
            element={
              <AuthorLayout>
                <div>Author Comics Management</div>
              </AuthorLayout>
            }
          />
        </Routes>,
        { initialEntries: ['/author/comics'] }
      );

      expect(screen.getByText('Home Page (Public)')).toBeInTheDocument();
      expect(screen.queryByText('Author Comics Management')).not.toBeInTheDocument();
    });

    it('should grant access to users with role "AUTHOR"', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({
        token: 'author-token-123',
        user: { id: 'author-uuid-777', username: 'comic_creator', role: 'AUTHOR', fullName: 'Comic Creator' }
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/author/comics"
            element={
              <AuthorLayout>
                <div>Author Comics Management</div>
              </AuthorLayout>
            }
          />
        </Routes>,
        { initialEntries: ['/author/comics'] }
      );

      expect(screen.getByText('Author Comics Management')).toBeInTheDocument();
    });
  });

  describe('Moderator Portal Security Access Guard (ModeratorLayout.jsx)', () => {
    it('should redirect unauthenticated / unauthorized users away from ModeratorLayout to /', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({
        token: 'user-token',
        user: { id: 'user-uuid', username: 'regular_user', role: 'READER' }
      });

      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home Page (Public)</div>} />
          <Route
            path="/moderator/submissions"
            element={
              <ModeratorLayout activeNav="submissions">
                <div>Moderator Submissions Management</div>
              </ModeratorLayout>
            }
          />
        </Routes>,
        { initialEntries: ['/moderator/submissions'] }
      );

      expect(screen.getByText('Home Page (Public)')).toBeInTheDocument();
      expect(screen.queryByText('Moderator Submissions Management')).not.toBeInTheDocument();
    });

    it('should grant access to users with role "MODERATOR" or "STAFF"', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({
        token: 'mod-token-555',
        user: { id: 'mod-uuid-555', username: 'mod_user', role: 'MODERATOR', fullName: 'Mod User' }
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/moderator/submissions"
            element={
              <ModeratorLayout activeNav="submissions">
                <div>Moderator Submissions Management</div>
              </ModeratorLayout>
            }
          />
        </Routes>,
        { initialEntries: ['/moderator/submissions'] }
      );

      expect(screen.getByText('Moderator Submissions Management')).toBeInTheDocument();
    });
  });

  describe('Translator Portal Security Access Guard (TranslatorLayout.jsx)', () => {
    it('should redirect unauthenticated / unauthorized users away from TranslatorLayout to /', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({
        token: 'reader-token',
        user: { id: 'reader-uuid', username: 'reader_user', role: 'READER' }
      });

      renderWithProviders(
        <Routes>
          <Route path="/" element={<div>Home Page (Public)</div>} />
          <Route
            path="/translator/projects"
            element={
              <TranslatorLayout>
                <div>Translator Projects Management</div>
              </TranslatorLayout>
            }
          />
        </Routes>,
        { initialEntries: ['/translator/projects'] }
      );

      expect(screen.getByText('Home Page (Public)')).toBeInTheDocument();
      expect(screen.queryByText('Translator Projects Management')).not.toBeInTheDocument();
    });

    it('should grant access to users with role "TRANSLATOR" or "PROJECT_LEADER"', () => {
      vi.spyOn(AuthModule, 'getAuth').mockReturnValue({
        token: 'translator-token-888',
        user: { id: 'trans-uuid-888', username: 'translator_pro', role: 'TRANSLATOR', fullName: 'Pro Translator' }
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/translator/projects"
            element={
              <TranslatorLayout>
                <div>Translator Projects Management</div>
              </TranslatorLayout>
            }
          />
        </Routes>,
        { initialEntries: ['/translator/projects'] }
      );

      expect(screen.getByText('Translator Projects Management')).toBeInTheDocument();
    });
  });
});
