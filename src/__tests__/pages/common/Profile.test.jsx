import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Profile from '../../../pages/common/Profile'
import * as AuthApi from '../../../services/api/AuthApi'
import * as NotificationApi from '../../../services/api/NotificationApi'

const contextMocks = vi.hoisted(() => ({ updateUser: vi.fn() }))

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ updateUser: contextMocks.updateUser }),
}))

vi.mock('../../../services/api/AuthApi', () => ({
  changePasswordApi: vi.fn(),
  getMeApi: vi.fn(),
  getUserInteractionCountsApi: vi.fn().mockResolvedValue({}),
  updateProfileApi: vi.fn(),
  uploadAvatarApi: vi.fn(),
}))

vi.mock('../../../services/api/RatingApi', () => ({
  getUserRatingsApi: vi.fn(),
}))

vi.mock('../../../services/api/NotificationApi', () => ({
  getNotificationPreferencesApi: vi.fn(),
  updateNotificationPreferencesApi: vi.fn(),
}))

vi.mock('../../../components/layout/HomeLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../../components/layout/ModeratorLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../../components/layout/TranslatorLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../../components/layout/AuthorLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../../components/common/CustomDatePicker', () => ({
  default: ({ value, onChange }) => (
    <input type="date" value={value || ''} onChange={event => onChange(event.target.value)} />
  ),
}))

vi.mock('react-toastify', () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

const baseUser = {
  userId: 'user-1',
  username: 'reader1',
  fullName: 'Reader One',
  email: 'reader@example.com',
  role: 'READER',
}

const renderProfile = user => render(
  <MemoryRouter>
    <Profile user={user} />
  </MemoryRouter>,
)

function prepareApi(user = baseUser, preferences = {
  role: user.role,
  availableKeys: ['SYSTEM_BROADCASTS', 'FORUM_ACTIVITY'],
  preferences: { SYSTEM_BROADCASTS: true, FORUM_ACTIVITY: true },
}) {
  AuthApi.getMeApi.mockResolvedValue(user)
  NotificationApi.getNotificationPreferencesApi.mockResolvedValue(preferences)
}

describe('Profile API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the server profile and sends date of birth and bio when saving', async () => {
    const serverUser = {
      ...baseUser,
      dateOfBirth: '2000-04-12',
      bio: 'Original bio',
      avatarUrl: null,
      backgroundImageUrl: null,
    }
    prepareApi(serverUser)
    AuthApi.updateProfileApi.mockResolvedValue({
      ...serverUser,
      dateOfBirth: '2001-05-13',
      bio: 'Updated bio',
    })

    const { container } = renderProfile(baseUser)

    await waitFor(() => expect(AuthApi.getMeApi).toHaveBeenCalled())
    const dateInput = container.querySelector('input[type="date"]')
    const bioInput = container.querySelector('textarea')
    fireEvent.change(dateInput, { target: { value: '2001-05-13' } })
    fireEvent.change(bioInput, { target: { value: 'Updated bio' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(AuthApi.updateProfileApi).toHaveBeenCalledWith(expect.objectContaining({
        fullName: 'Reader One',
        dateOfBirth: '2001-05-13',
        bio: 'Updated bio',
      }))
    })
  })

  it('shows and saves only notification categories available to the current role', async () => {
    const author = { ...baseUser, role: 'AUTHOR' }
    const preferenceResponse = {
      role: 'AUTHOR',
      availableKeys: ['SUBMISSION_STATUS', 'SYSTEM_BROADCASTS', 'FORUM_ACTIVITY'],
      preferences: {
        SUBMISSION_STATUS: true,
        SYSTEM_BROADCASTS: true,
        FORUM_ACTIVITY: true,
      },
    }
    prepareApi(author, preferenceResponse)
    NotificationApi.updateNotificationPreferencesApi.mockResolvedValue({
      ...preferenceResponse,
      preferences: { ...preferenceResponse.preferences, SUBMISSION_STATUS: false },
    })

    renderProfile(author)
    fireEvent.click(screen.getByRole('button', { name: /Notification Settings/i }))

    expect(await screen.findByText('Submission status')).toBeInTheDocument()
    expect(screen.getByText('System broadcasts')).toBeInTheDocument()
    expect(screen.queryByText('Review queue')).not.toBeInTheDocument()
    expect(screen.queryByText('Project opportunities')).not.toBeInTheDocument()

    const submissionToggle = screen.getByText('Submission status')
      .closest('.profile-notif-item')
      .querySelector('input[type="checkbox"]')
    fireEvent.click(submissionToggle)
    fireEvent.click(screen.getByRole('button', { name: 'Save Notification Preferences' }))

    await waitFor(() => {
      expect(NotificationApi.updateNotificationPreferencesApi).toHaveBeenCalledWith(expect.objectContaining({
        SUBMISSION_STATUS: false,
      }))
    })
  })
})
