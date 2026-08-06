import React from 'react'
import { render, screen } from '@testing-library/react'
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

describe('Translator team member presence & contributions', () => {
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

  it('calculates member contribution based on published translated page count', async () => {
    getTeamMembersApi.mockResolvedValue([
      { id: 'user-1', name: 'Leader User', role: 'Group Leader' },
      { id: 'user-2', name: 'Translator Alice', role: 'Translator' },
    ])

    const mockTasks = [
      { id: 'task-1', assigneeId: 'user-2', status: 'completed', pagesCount: 12 },
      { id: 'task-2', assigneeId: 'user-2', status: 'done', pages: ['p1', 'p2', 'p3', 'p4', 'p5'] },
      { id: 'task-3', assigneeId: 'user-2', status: 'in_progress', pagesCount: 20 }, // not completed
    ]

    render(
      <MembersTab
        teamId="team-1"
        leaderName="Leader User"
        isCurrentLeader={true}
        setMemberSearch={() => {}}
        tasks={mockTasks}
      />,
    )

    // Total published pages for user-2: 12 + 5 = 17 pages
    expect(await screen.findByText('17 pages')).toBeInTheDocument()
  })

  it('credits partial translated pages accurately when task is reassigned midway', async () => {
    getTeamMembersApi.mockResolvedValue([
      { id: 'user-1', name: 'Leader User', role: 'Group Leader' },
      { id: 'user-a', name: 'Translator Alice', role: 'Translator' },
      { id: 'user-b', name: 'Translator Bob', role: 'Translator' },
    ])

    // Task 1 was originally worked on by user-a (pages 1-5 translated), then reassigned to user-b who finished pages 6-15 (10 pages)
    const mockTasks = [
      {
        id: 'task-reassigned-1',
        assigneeId: 'user-b',
        status: 'completed',
        pages: [
          // 5 pages translated by user-a
          { pageId: 'p1', translatedBy: 'user-a', status: 'DONE' },
          { pageId: 'p2', translatedBy: 'user-a', status: 'DONE' },
          { pageId: 'p3', translatedBy: 'user-a', status: 'DONE' },
          { pageId: 'p4', translatedBy: 'user-a', status: 'DONE' },
          { pageId: 'p5', translatedBy: 'user-a', status: 'DONE' },
          // 10 pages translated by user-b
          { pageId: 'p6', translatedBy: 'user-b', status: 'DONE' },
          { pageId: 'p7', translatedBy: 'user-b', status: 'DONE' },
          { pageId: 'p8', translatedBy: 'user-b', status: 'DONE' },
          { pageId: 'p9', translatedBy: 'user-b', status: 'DONE' },
          { pageId: 'p10', translatedBy: 'user-b', status: 'DONE' },
          { pageId: 'p11', translatedBy: 'user-b', status: 'DONE' },
          { pageId: 'p12', translatedBy: 'user-b', status: 'DONE' },
          { pageId: 'p13', translatedBy: 'user-b', status: 'DONE' },
          { pageId: 'p14', translatedBy: 'user-b', status: 'DONE' },
          { pageId: 'p15', translatedBy: 'user-b', status: 'DONE' },
        ]
      }
    ]

    render(
      <MembersTab
        teamId="team-1"
        leaderName="Leader User"
        isCurrentLeader={true}
        setMemberSearch={() => {}}
        tasks={mockTasks}
      />,
    )

    // User A should get credited for 5 pages translated before quitting/reassignment
    expect(await screen.findByText('5 pages')).toBeInTheDocument()
    // User B should get credited for 10 pages translated after takeover
    expect(await screen.findByText('10 pages')).toBeInTheDocument()
  })
})
