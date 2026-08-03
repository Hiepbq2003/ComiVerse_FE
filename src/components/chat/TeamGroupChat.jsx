import { useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import { warnTeamMemberApi } from '../../services/api/TeamWorkspaceApi';
import { toast } from 'react-toastify';

function TeamGroupChat({ groupId, onClose, style, isLeader }) {
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
        deleteMessage,
    } = useChat('TEAM', groupId);

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        try {
            await deleteMessage(msgId);
            toast.success("Message deleted");
        } catch (err) {
            toast.error("Failed to delete message");
            console.error(err);
        }
    };

    const handleWarnMember = async (memberName) => {
        if (!window.confirm(`Are you sure you want to warn member ${memberName}?`)) return;
        try {
            await warnTeamMemberApi(groupId, memberName);
            toast.success(`Member ${memberName} warned`);
            // The STOMP socket might broadcast the new warning message, 
            // but if not, user can just see it when they refresh or we can optionally fetch it.
        } catch (err) {
            toast.error("Failed to warn member");
            console.error(err);
        }
    };

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
        <div className="group-chat-sidebar-card" style={style}>
            <div className="chat-card-header">
                <div className="chat-header-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>Group Chat</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="chat-online-badge">
                        <span className="online-dot"></span> Live
                    </span>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            title="Close"
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            <div
                className="chat-messages-container"
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
            >
                {isLoadingMore && (
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '6px 0' }}>
                        Loading older messages...
                    </div>
                )}

                {isLoadingInitial ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '30px 10px', fontSize: '13px' }}>
                        Loading group chat history...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty-state">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p>No messages yet. Send a message to start the group conversation!</p>
                    </div>
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
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                        {time && <span className="chat-time" style={{ margin: 0 }}>{time}</span>}
                                        {isLeader && senderName !== 'SYSTEM' && !String(msg.id).startsWith('temp-') && (
                                            <div className="chat-mod-actions" style={{ display: 'flex', gap: '6px', fontSize: '11px', opacity: 0.7 }}>
                                                <button onClick={() => handleDeleteMessage(msg.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }} title="Delete Message">
                                                    Delete
                                                </button>
                                                {!isMe && (
                                                    <button onClick={() => handleWarnMember(senderName)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: 0 }} title="Warn Member">
                                                        Warn
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
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
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isSending}
                />
                <button type="submit" className="chat-send-btn" disabled={isSending || !inputValue.trim()} title="Send Message">
                    {isSending ? (
                        <span className="send-spinner"></span>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    )}
                </button>
            </form>
        </div>
    );
}

export default TeamGroupChat;