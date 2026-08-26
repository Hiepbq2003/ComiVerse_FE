import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatInputBar from '../../../../components/chat/ChatInputBar';

vi.mock('../../../../utils/Auth', () => ({
  getAuth: () => ({ user: { id: 'user-1' } }),
  getUserChatRestriction: () => null,
}));

describe('ChatInputBar', () => {
  it('sends text without exposing an image attachment control', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(true);
    const { container } = render(
      <ChatInputBar onSendMessage={onSendMessage} isSending={false} />
    );
    expect(container.querySelector('input[type="file"]')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Attach image')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
      target: { value: 'Hello Global Chat' },
    });
    fireEvent.click(screen.getByTitle('Send message'));

    await waitFor(() => expect(onSendMessage).toHaveBeenCalledTimes(1));
    expect(onSendMessage).toHaveBeenCalledWith('Hello Global Chat');
  });
});
