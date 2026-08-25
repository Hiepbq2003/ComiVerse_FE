import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from '../../../hooks/useChat';
import { sendChatMessageApi } from '../../../services/api/ChatApi';
import { uploadImageApi } from '../../../services/api/UploadApi';

vi.mock('../../../services/websocket/StompService', () => ({
  default: {
    isConnected: () => false,
    connect: vi.fn(),
    subscribe: vi.fn(() => 'subscription'),
    unsubscribe: vi.fn(),
    onConnect: vi.fn(() => () => {}),
    onDisconnect: vi.fn(() => () => {}),
  },
}));

vi.mock('../../../services/api/ChatApi', () => ({
  getChatMessagesApi: vi.fn().mockResolvedValue({ data: [] }),
  sendChatMessageApi: vi.fn(),
  deleteChatMessageApi: vi.fn(),
}));

vi.mock('../../../services/api/UploadApi', () => ({
  uploadImageApi: vi.fn(),
}));

vi.mock('../../../services/api/TeamWorkspaceApi', () => ({
  getTeamMessagesApi: vi.fn(),
  createTeamMessageApi: vi.fn(),
  deleteTeamMessageApi: vi.fn(),
}));

vi.mock('../../../services/api/BannedKeywordApi', () => ({
  getBannedKeywordsApi: vi.fn().mockResolvedValue([]),
  checkBannedContent: vi.fn(() => ({ isBanned: false })),
}));

vi.mock('../../../utils/Auth', () => ({
  getAuth: () => ({
    user: {
      id: 'user-1',
      userId: 'user-1',
      username: 'reader',
      fullName: 'Reader One',
    },
  }),
  getUserChatRestriction: () => null,
}));

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn() },
}));

describe('useChat image persistence flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('uploads the file and sends the durable URL to the backend', async () => {
    const file = new File(['image'], 'chat.png', { type: 'image/png' });
    uploadImageApi.mockResolvedValue('https://res.cloudinary.com/comiverse/chat.png');
    sendChatMessageApi.mockResolvedValue({
      id: 'message-1',
      senderId: 'user-1',
      senderName: 'Reader One',
      content: 'Caption',
      imageUrl: 'https://res.cloudinary.com/comiverse/chat.png',
      createdAt: '2026-08-25T10:00:00Z',
    });
    const { result } = renderHook(() => useChat('GLOBAL'));

    let success;
    await act(async () => {
      success = await result.current.sendMessage('Caption', {
        file,
        previewUrl: 'data:image/png;base64,AAAA',
      });
    });

    expect(success).toBe(true);
    expect(uploadImageApi).toHaveBeenCalledWith(file);
    expect(sendChatMessageApi).toHaveBeenCalledWith({
      chatType: 'GLOBAL',
      groupId: undefined,
      content: 'Caption',
      imageUrl: 'https://res.cloudinary.com/comiverse/chat.png',
    });
    await waitFor(() => {
      expect(result.current.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'message-1',
            imageUrl: 'https://res.cloudinary.com/comiverse/chat.png',
          }),
        ])
      );
    });
  });
});
