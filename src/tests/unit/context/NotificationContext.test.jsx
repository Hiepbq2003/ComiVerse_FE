import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationProvider, useNotification } from '../../../context/NotificationContext'
import { useAuth } from '../../../context/AuthContext'
import { getAuth } from '../../../utils/Auth'
import StompService from '../../../services/websocket/StompService'
import { getMyNotificationsApi } from '../../../services/api/NotificationApi'

vi.mock('../../../context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../../utils/Auth', () => ({ getAuth: vi.fn() }))
vi.mock('../../../services/api/NotificationApi', () => ({
  getMyNotificationsApi: vi.fn(),
  markAsReadApi: vi.fn(),
  markAllAsReadApi: vi.fn(),
}))
vi.mock('../../../services/websocket/StompService', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
}))
vi.mock('react-toastify', () => ({
  toast: { info: vi.fn() },
}))

function NotificationProbe() {
  const { notifications, unreadCount } = useNotification()
  return (
    <div>
      <span data-testid="unread-count">{unreadCount}</span>
      <span data-testid="latest-title">{notifications[0]?.title || ''}</span>
    </div>
  )
}

describe('NotificationContext private delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const user = { id: '019f-user-id', username: 'reader-one' }
    useAuth.mockReturnValue({ isLoggedIn: true, user })
    getAuth.mockReturnValue({ token: 'access-token', user })
    getMyNotificationsApi.mockResolvedValue([])
  })

  it('subscribes only to the authenticated users private topic', async () => {
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    )

    await waitFor(() => expect(StompService.subscribe).toHaveBeenCalled())
    expect(StompService.subscribe).toHaveBeenCalledTimes(1)
    expect(StompService.subscribe).toHaveBeenCalledWith(
      '/topic/notifications/019f-user-id',
      expect.any(Function),
    )
    expect(StompService.subscribe).not.toHaveBeenCalledWith(
      '/topic/notifications',
      expect.any(Function),
    )
    expect(StompService.subscribe).not.toHaveBeenCalledWith(
      '/user/queue/notifications',
      expect.any(Function),
    )
  })

  it('updates the bell count immediately when a private WebSocket message arrives', async () => {
    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>,
    )
    await waitFor(() => expect(StompService.subscribe).toHaveBeenCalled())
    const onMessage = StompService.subscribe.mock.calls[0][1]

    act(() => {
      onMessage({
        id: '019f-notification-id',
        title: 'System maintenance',
        message: 'ComiVerse will restart at midnight.',
        type: 'MAINTENANCE',
        isRead: false,
        createdAt: '2026-08-25T10:00:00Z',
      })
    })

    expect(screen.getByTestId('unread-count')).toHaveTextContent('1')
    expect(screen.getByTestId('latest-title')).toHaveTextContent('System maintenance')
  })
})
