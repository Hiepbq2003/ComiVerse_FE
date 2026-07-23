import { useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { formatTimeAgo } from '../../utils/formatTimeAgo';

function TeamGroupChat({ groupId}) {
    const [inputValue, setInputValue] = useState('');

    const {
        messages,
        hasMore,
        isLoadingInitial,
        isLoadingMore,
        isSending,
        currentUser,
        scrollContainerRef,
        isNearBottomRef,
        fetchOlderMessages,
        sendMessage,
    } = useChat('GROUP', groupId);

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (container.scrollTop < 30 && hasMore && !isLoadingMore && !isLoadingInitial) {
            fetchOlderMessages();
        }

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (isNearBottomRef) {
            isNearBottomRef.current = distanceFromBottom < 80;
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isSending) return;

        const contentToSend = inputValue.trim();
        setInputValue('');

        try {
            await sendMessage(contentToSend);
        } catch (err) {
            console.error('Failed to send group message:', err);
        }
    };

    const isMyMessage = (msg) => {
        if (!msg) return false;
        if (msg.isMe) return true;
        if (currentUser?.id && String(msg.senderId) === String(currentUser.id)) return true;
        if (currentUser?.username && (msg.senderName === currentUser.username || msg.sender === currentUser.username)) return true;
        if (currentUser?.fullName && (msg.senderName === currentUser.fullName || msg.sender === currentUser.fullName)) return true;
        return false;
    };

    const getSenderName = (msg) => {
        return msg.senderName || msg.sender || msg.sender_name || 'Thành viên';
    };

    const getAvatarText = (msg) => {
        if (msg.avatar && typeof msg.avatar === 'string') return msg.avatar.substring(0, 2).toUpperCase();
        const name = getSenderName(msg);
        return name.substring(0, 2).toUpperCase();
    };

    const formatMsgTime = (msg) => {
        if (msg.time) return msg.time;
        if (msg.createdAt) {
            try {
                const date = new Date(msg.createdAt);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) {
                return formatTimeAgo(msg.createdAt);
            }
        }
        return '';
    };

    return (
        <div className="group-chat-sidebar-card">
            <div className="chat-card-header">
                <h3>
                    💬 Group Chat
                </h3>
            </div>

            <div
                className="chat-messages-container"
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                {isLoadingMore && (
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '6px 0' }}>
                        Đang tải tin nhắn cũ hơn...
                    </div>
                )}

                {isLoadingInitial ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '30px 10px' }}>
                        Đang tải lịch sử trò chuyện nhóm...
                    </div>
                ) : messages.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', textAlign: 'center', padding: '30px 10px' }}>
                        Chưa có tin nhắn nào trong nhóm. Hãy nhắn tin đầu tiên!
                    </p>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = isMyMessage(msg);
                        const senderName = getSenderName(msg);
                        const content = msg.content || msg.text || '';
                        const time = formatMsgTime(msg);
                        const key = msg.id || `group-msg-${idx}-${msg.createdAt}`;

                        return (
                            <div className={`chat-message-item ${isMe ? 'me' : ''}`} key={key}>
                                <div className="chat-avatar">
                                    {getAvatarText(msg)}
                                </div>
                                <div className="chat-bubble-wrapper">
                                    {!isMe && <span className="chat-sender-info">{senderName}</span>}
                                    <div className="chat-bubble">{content}</div>
                                    {time && <span className="chat-time">{time}</span>}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <form className="chat-input-wrapper" onSubmit={handleFormSubmit}>
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Nhập tin nhắn..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isSending}
                />
                <button type="submit" className="chat-send-btn" disabled={isSending || !inputValue.trim()}>
                    {isSending ? '...' : '➔'}
                </button>
            </form>
        </div>
    );
}

export default TeamGroupChat;
