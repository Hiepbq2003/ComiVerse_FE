import { useState } from 'react';

function ChatInputBar({ onSendMessage, isSending, disabled }) {
    const [content, setContent] = useState('');

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!content.trim() || isSending || disabled) return;

        const textToSend = content;
        setContent(''); // Clear input immediately for smooth UX

        try {
            await onSendMessage(textToSend);
        } catch (err) {
            // Restore content if send fails
            setContent(textToSend);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <form className="cv-chat-input-bar" onSubmit={handleSubmit}>
            <input
                type="text"
                className="cv-chat-input"
                placeholder={disabled ? "Select group to chat..." : "Type a message..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled || isSending}
            />
            <button
                type="submit"
                className="cv-chat-send-btn"
                disabled={!content.trim() || isSending || disabled}
                title="Send message"
            >
                {isSending ? (
                    <div className="cv-chat-spinner" style={{ width: '14px', height: '14px', borderTopColor: '#ffffff' }}></div>
                ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                )}
            </button>
        </form>
    );
}

export default ChatInputBar;
