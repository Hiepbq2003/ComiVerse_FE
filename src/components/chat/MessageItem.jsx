import React from 'react';
import { formatTimeAgo } from '../../utils/formatTimeAgo';

function MessageItem({ message, currentUserId, currentUser }) {
    if (!message) return null;

    const userObj = currentUser || (typeof currentUserId === 'object' ? currentUserId : null);
    const userId = userObj?.id || userObj?.userId || (typeof currentUserId !== 'object' ? currentUserId : null);

    const checkIsMine = () => {
        if (message.isMe) return true;
        if (userId && message.senderId && String(message.senderId) === String(userId)) return true;
        if (userId && message.sender_id && String(message.sender_id) === String(userId)) return true;
        if (userObj?.username && (message.senderName === userObj.username || message.sender === userObj.username)) return true;
        if (userObj?.fullName && (message.senderName === userObj.fullName || message.sender === userObj.fullName)) return true;
        return false;
    };

    const isMine = checkIsMine();
    const senderName = message.senderName || message.sender || 'Anonymous';
    const avatarUrl = message.senderAvatar || message.avatar;
    const initial = (senderName || 'U')[0].toUpperCase();

    // Format time (e.g. 14:32 or 5m ago)
    const formatTime = (isoString) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return formatTimeAgo(isoString);
        }
    };

    return (
        <div className={`cv-chat-msg-row ${isMine ? 'mine' : 'others'}`}>
            {!isMine && (
                <div className="cv-chat-avatar" title={senderName}>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={senderName} />
                    ) : (
                        <span>{initial}</span>
                    )}
                </div>
            )}

            <div className="cv-chat-bubble-wrapper">
                {!isMine && <span className="cv-chat-sender-name">{senderName}</span>}
                
                <div className="cv-chat-bubble">
                    {message.content}
                </div>

                <span className="cv-chat-time">
                    {formatTime(message.createdAt)}
                </span>
            </div>
        </div>
    );
}

export default React.memo(MessageItem);
