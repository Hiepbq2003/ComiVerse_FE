import React from 'react'
import { describe, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import BroadcastManagement from '../../../../pages/admin/BroadcastManagement'
import * as BroadcastApi from '../../../../services/api/BroadcastApi'
import * as AccountApi from '../../../../services/api/AccountApi'
import * as ProjectTeamApi from '../../../../services/api/ProjectTeamApi'

vi.mock('../../../../components/layout/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('../../../../components/common/AnimatedButton', () => ({
  AnimatedButton: ({ label, onClick, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{label}</button>
  ),
}))

vi.mock('../../../../services/api/BroadcastApi', () => ({
  getBroadcastHistoryApi: vi.fn(),
  previewBroadcastAudienceApi: vi.fn(),
  revokeBroadcastApi: vi.fn(),
  sendBroadcastApi: vi.fn(),
}))

vi.mock('../../../../services/api/AccountApi', () => ({
  getAllAccountsApi: vi.fn(),
}))

vi.mock('../../../../services/api/ProjectTeamApi', () => ({
  getProjectTeamsPageApi: vi.fn(),
}))

const users = Array.from({ length: 10 }, (_, index) => ({
  id: `user-${index + 1}`,
  fullName: `User ${index + 1}`,
  username: `reader${index + 1}`,
  email: `reader${index + 1}@example.com`,
  role: 'READER',
}))

const fillAnnouncement = () => {
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'System update' } })
  fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'A new feature is now available.' } })
}

describe('BroadcastManagement targeted audiences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    BroadcastApi.getBroadcastHistoryApi.mockResolvedValue([])
    AccountApi.getAllAccountsApi.mockResolvedValue({ data: users })
    ProjectTeamApi.getProjectTeamsPageApi.mockResolvedValue({ data: [] })
  })

  it('shows at most eight dynamic user results and sends only selected accounts', async () => {
    BroadcastApi.previewBroadcastAudienceApi.mockResolvedValue({
      audienceType: 'USERS',
      audienceLabel: '1 SPECIFIC USER',
      matchedRecipientCount: 1,
      enabledRecipientCount: 1,
      optedOutCount: 0,
    })
    BroadcastApi.sendBroadcastApi.mockResolvedValue({
      id: 'broadcast-1',
      audienceLabel: '1 SPECIFIC USER',
      recipientCount: 1,
      type: 'INFO',
      title: 'System update',
      message: 'A new feature is now available.',
    })

    render(<BroadcastManagement />)
    fireEvent.click(screen.getByRole('button', { name: /specific users/i }))

    const searchInput = screen.getByPlaceholderText(/search by name, username, or email/i)
    fireEvent.focus(searchInput)

    await waitFor(() => expect(AccountApi.getAllAccountsApi).toHaveBeenCalledWith({
      page: 1,
      size: 8,
      status: 'ACTIVE',
    }))
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(8))

    fireEvent.change(searchInput, { target: { value: 'reader1' } })
    await waitFor(() => expect(AccountApi.getAllAccountsApi).toHaveBeenCalledWith({
      page: 1,
      size: 8,
      status: 'ACTIVE',
      search: 'reader1',
    }))

    fireEvent.click(screen.getByRole('option', { name: /User 1/i }))
    expect(screen.getByRole('button', { name: /remove User 1/i })).toBeInTheDocument()

    fillAnnouncement()
    fireEvent.click(screen.getByRole('button', { name: /review and send/i }))

    await waitFor(() => expect(BroadcastApi.previewBroadcastAudienceApi).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceType: 'USERS',
        targetUserIds: ['user-1'],
      }),
    ))
    expect(await screen.findByText('Will receive')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /yes, send to 1/i }))
    await waitFor(() => expect(BroadcastApi.sendBroadcastApi).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceType: 'USERS',
        targetUserIds: ['user-1'],
      }),
    ))
  })

  it('supports combining roles including project leader', async () => {
    BroadcastApi.previewBroadcastAudienceApi.mockResolvedValue({
      audienceType: 'ROLES',
      audienceLabel: 'PROJECT_LEADER',
      matchedRecipientCount: 2,
      enabledRecipientCount: 2,
      optedOutCount: 0,
    })

    render(<BroadcastManagement />)
    fireEvent.click(screen.getByRole('button', { name: /by role/i }))
    fireEvent.click(screen.getByRole('button', { name: /^reader$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^project leader$/i }))
    fillAnnouncement()
    fireEvent.click(screen.getByRole('button', { name: /review and send/i }))

    await waitFor(() => expect(BroadcastApi.previewBroadcastAudienceApi).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceType: 'ROLES',
        targetRoles: ['PROJECT_LEADER'],
      }),
    ))
  })

  it('searches project teams and previews leaders plus active members', async () => {
    const team = {
      id: 'team-1',
      title: 'Moonlight Team',
      comicName: 'Moonlight Story',
      membersCount: 5,
      sourceLang: 'Japanese',
      targetLang: 'Vietnamese',
    }
    ProjectTeamApi.getProjectTeamsPageApi.mockResolvedValue({ data: [team] })
    BroadcastApi.previewBroadcastAudienceApi.mockResolvedValue({
      audienceType: 'PROJECT_TEAMS',
      audienceLabel: 'PROJECT TEAM: Moonlight Team',
      matchedRecipientCount: 5,
      enabledRecipientCount: 4,
      optedOutCount: 1,
    })

    render(<BroadcastManagement />)
    fireEvent.click(screen.getByRole('button', { name: /project teams/i }))
    const searchInput = screen.getByPlaceholderText(/search by project or comic name/i)
    fireEvent.change(searchInput, { target: { value: 'moon' } })

    await waitFor(() => expect(ProjectTeamApi.getProjectTeamsPageApi).toHaveBeenCalledWith(1, 8, 'moon'))
    fireEvent.click(await screen.findByRole('option', { name: /Moonlight Team/i }))
    fillAnnouncement()
    fireEvent.click(screen.getByRole('button', { name: /review and send/i }))

    await waitFor(() => expect(BroadcastApi.previewBroadcastAudienceApi).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceType: 'PROJECT_TEAMS',
        targetTeamIds: ['team-1'],
      }),
    ))
    expect(await screen.findByText('Opted out')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('does not allow confirmation when every matched account opted out', async () => {
    BroadcastApi.previewBroadcastAudienceApi.mockResolvedValue({
      audienceType: 'ALL',
      audienceLabel: 'ALL USERS',
      matchedRecipientCount: 3,
      enabledRecipientCount: 0,
      optedOutCount: 3,
    })

    render(<BroadcastManagement />)
    fillAnnouncement()
    fireEvent.click(screen.getByRole('button', { name: /review and send/i }))

    expect(await screen.findByText(/no selected account currently allows system broadcasts/i))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: /yes, send to 0/i })).toBeDisabled()
    expect(BroadcastApi.sendBroadcastApi).not.toHaveBeenCalled()
  })
})
