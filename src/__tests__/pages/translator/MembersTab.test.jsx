import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MembersTab, {
  formatMemberPresence,
  mapTeamMember,
} from '../../../pages/translator/MembersTab'
import { getTeamMembersApi } from '../../../services/api/TeamWorkspaceApi'

vi.mock('../../../services/api/TeamWorkspaceApi', () => ({
  getTeamMembersApi: vi.fn(),
}))

vi.mock('../../../utils/Auth', () => ({
  getAuth: () => ({
    user: { id: 'user-1', fullName: 'Online User' },
  }),
}))

describe('Translator team member presence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not mark a member active without an online presence signal', () => {
    expect(mapTeamMember({ id: 'user-1', name: 'Member' }, '').online).toBe(false)
    expect(formatMemberPresence({ online: false, lastSeenAt: null })).toBe('Offline')
  })

  it('shows active members and relative offline time from the API', async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    getTeamMembersApi.mockResolvedValue([
      { id: 'user-1', name: 'Online User', online: true },
      { id: 'user-2', name: 'Offline User', online: false, lastSeenAt: fiveMinutesAgo },
    ])

    render(
      <MembersTab
        teamId="team-1"
        leaderName="Online User"
        isCurrentLeader={false}
        setMemberSearch={() => {}}
      />,
    )

    expect(await screen.findByText('Active now')).toBeInTheDocument()
    expect(screen.getByText('Offline · 5m ago')).toBeInTheDocument()
  })
})
