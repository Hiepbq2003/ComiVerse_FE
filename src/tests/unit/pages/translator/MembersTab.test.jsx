import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MembersTab, {
  formatMemberPresence,
  mapTeamMember,
  getTaskPageCount,
} from '../../../../pages/translator/MembersTab'
import { getTeamMembersApi } from '../../../../services/api/TeamWorkspaceApi'

vi.mock('../../../../services/api/TeamWorkspaceApi', () => ({
  getTeamMembersApi: vi.fn(),
}))

vi.mock('../../../../utils/Auth', () => ({
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

  it('correctly determines page count for various task shapes via getTaskPageCount', () => {
    expect(getTaskPageCount(null)).toBe(0)
    expect(getTaskPageCount({ pagesCount: 30 })).toBe(30)
    expect(getTaskPageCount({ pageCount: 15 })).toBe(15)
    expect(getTaskPageCount({ pages: ['p1', 'p2', 'p3'] })).toBe(3)
    expect(getTaskPageCount({ images: ['img1', 'img2'] })).toBe(2)
    expect(getTaskPageCount({ chapter: { pagesCount: 18 } })).toBe(18)
    expect(getTaskPageCount({})).toBe(24)
  })

  it('maps translator CV url onto the member profile', () => {
    const mapped = mapTeamMember({
      id: 'user-2',
      name: 'Vit Reader',
      cvUrl: 'https://cdn.example.com/vit-cv.pdf',
    }, '')
    expect(mapped.cvUrl).toBe('https://cdn.example.com/vit-cv.pdf')
  })

  it('shows a CV view link in the member profile modal', async () => {
    getTeamMembersApi.mockResolvedValue([
      { id: 'user-1', name: 'Online User', role: 'Group Leader', online: true },
      { id: 'user-2', name: 'Vit Reader', role: 'Member', online: false, cvUrl: 'https://cdn.example.com/vit-cv.pdf' },
    ])

    render(
      <MembersTab
        teamId="team-1"
        leaderName="Online User"
        isCurrentLeader={true}
        setMemberSearch={() => {}}
      />,
    )

    fireEvent.click(await screen.findByText('Vit Reader'))
    expect(await screen.findByRole('link', { name: /view cv/i })).toBeInTheDocument()
  })
})
