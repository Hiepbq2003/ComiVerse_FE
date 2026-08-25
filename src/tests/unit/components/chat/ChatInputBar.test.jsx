import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatInputBar from '../../../../components/chat/ChatInputBar';

vi.mock('../../../../utils/Auth', () => ({
  getAuth: () => ({ user: { id: 'user-1' } }),
  getUserChatRestriction: () => null,
}));

describe('ChatInputBar image attachment', () => {
  it('passes the original image file and preview to the send handler', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(true);
    const { container } = render(
      <ChatInputBar onSendMessage={onSendMessage} isSending={false} />
    );
    const file = new File(['image-bytes'], 'chat.png', { type: 'image/png' });
    const fileInput = container.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByAltText('Attachment')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
      target: { value: 'See this image' },
    });
    fireEvent.click(screen.getByTitle('Send message'));

    await waitFor(() => expect(onSendMessage).toHaveBeenCalledTimes(1));
    const [content, attachment] = onSendMessage.mock.calls[0];
    expect(content).toBe('See this image');
    expect(attachment.file).toBe(file);
    expect(attachment.previewUrl).toMatch(/^data:image\/png;base64,/);
  });
});
