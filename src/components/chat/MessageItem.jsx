import React, { useState } from 'react';
import { formatTimeAgo } from '../../utils/formatTimeAgo';

function MessageItem({ message, currentUserId, currentUser }) {
    const [showLightbox, setShowLightbox] = useState(false);

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
    const imageUrl = message.imageUrl || message.image || message.attachedImage || null;

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

    // Detect if content is only emojis (for larger display)
    // Must NOT match digits, letters, or punctuation — only true pictographic emoji
    const isEmojiOnly = (text) => {
        if (!text || text.trim().length === 0) return false;
        // Strip all actual emoji, variation selectors, ZWJ, modifiers, and whitespace
        const stripped = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\s]/gu, '');
        // If anything remains (letters, digits, punctuation), it's not emoji-only
        return stripped.length === 0 && text.trim().length <= 12;
    };

    const contentText = message.content || message.text || '';
    const emojiOnly = isEmojiOnly(contentText);

    return (
        <>
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

                    {/* Image Message */}
                    {imageUrl && (
                        <div
                            className="cv-chat-image-bubble"
                            onClick={() => setShowLightbox(true)}
                            title="Click to view full size"
                        >
                            <img src={imageUrl} alt="Shared image" />
                        </div>
                    )}

                    {/* Text Content */}
                    {contentText && (
                        <div className={`cv-chat-bubble ${emojiOnly ? 'emoji-only' : ''}`}>
                            {contentText}
                        </div>
                    )}

                    <span className="cv-chat-time">
                        {formatTime(message.createdAt)}
                    </span>
                </div>
            </div>

            {/* Lightbox Modal for Image */}
            {showLightbox && imageUrl && (
                <div className="cv-chat-lightbox" onClick={() => setShowLightbox(false)}>
                    <div className="cv-chat-lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="cv-chat-lightbox-close"
                            onClick={() => setShowLightbox(false)}
                        >
                            ✕
                        </button>
                        <img src={imageUrl} alt="Full size preview" />
                        <div className="cv-chat-lightbox-meta">
                            <span>Sent by {senderName}</span>
                            <span>{formatTime(message.createdAt)}</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default React.memo(MessageItem);
