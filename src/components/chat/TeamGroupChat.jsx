import { useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import { warnTeamMemberApi } from '../../services/api/TeamWorkspaceApi';
import { toast } from 'react-toastify';

const PRESET_WARN_REASONS = [
    'Spam or flooding the group chat',
    'Inappropriate language or toxicity',
    'Missed translation deadlines without notice',
    'Poor translation quality or guideline violation'
];

function TeamGroupChat({ groupId, teamName, onClose, style, isLeader }) {
    const [inputValue, setInputValue] = useState('');
    const [warnModal, setWarnModal] = useState({
        isOpen: false,
        memberName: '',
        memberId: null,
        messageSnippet: '',
        reason: PRESET_WARN_REASONS[0],
        customReason: '',
        isSubmitting: false
    });

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
            toast.success("Message deleted from group chat");
        } catch (err) {
            toast.error("Failed to delete message");
            console.error(err);
        }
    };

    const handleOpenWarnModal = (msg) => {
        const targetName = getSenderName(msg);
        const targetId = msg.senderId || msg.sender_id || msg.userId || null;
        const snippet = (msg.content || msg.text || '').substring(0, 80);

        setWarnModal({
            isOpen: true,
            memberName: targetName,
            memberId: targetId,
            messageSnippet: snippet,
            reason: PRESET_WARN_REASONS[0],
            customReason: '',
            isSubmitting: false
        });
    };

    const handleCloseWarnModal = () => {
        setWarnModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
    };

    const handleConfirmWarnMember = async () => {
        if (!warnModal.memberName) return;
        const finalReason = warnModal.reason === 'CUSTOM'
            ? warnModal.customReason.trim()
            : warnModal.reason;

        if (!finalReason) {
            toast.error('Please specify a warning reason.');
            return;
        }

        setWarnModal(prev => ({ ...prev, isSubmitting: true }));
        try {
            await warnTeamMemberApi(groupId, warnModal.memberName, finalReason, warnModal.memberId);
            toast.success(`⚠️ Official warning issued to @${warnModal.memberName} and saved to database!`);
            handleCloseWarnModal();
        } catch (err) {
            console.error('Failed to warn team member:', err);
            toast.error('Failed to issue warning. Please check connection and try again.');
            setWarnModal(prev => ({ ...prev, isSubmitting: false }));
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
        return msg.senderName || msg.sender || msg.sender_name || 'Member';
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
            {/* Header */}
            <div className="chat-card-header">
                <div className="chat-header-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>{teamName ? `${teamName} Chat` : 'Group Workspace Chat'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="chat-online-badge">
                        <span className="online-dot"></span> Live
                    </span>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            title="Close Chat"
                            className="chat-close-btn"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Feed */}
            <div
                className="chat-messages-container"
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                {isLoadingMore && (
                    <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#94a3b8', padding: '6px 0' }}>
                        Loading older messages...
                    </div>
                )}

                {isLoadingInitial ? (
                    <div className="chat-loading-state">
                        <div className="chat-spinner"></div>
                        <p>Connecting to group workspace chat...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty-state">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p>No messages yet. Say hi to your team to start collaborating!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = isMyMessage(msg);
                        const senderName = getSenderName(msg);
                        const content = msg.content || msg.text || '';
                        const time = formatMsgTime(msg);
                        const key = msg.id || `group-msg-${idx}-${msg.createdAt}`;
                        const isSystem = senderName === 'SYSTEM' || msg.sender === 'SYSTEM' || content.includes('[CẢNH BÁO') || content.includes('[WARNING]');

                        if (isSystem) {
                            return (
                                <div className="chat-system-warning-banner" key={key}>
                                    <div className="system-warning-icon">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                            <line x1="12" y1="9" x2="12" y2="13"></line>
                                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                        </svg>
                                    </div>
                                    <div className="system-warning-body">
                                        <div className="system-warning-text">{content}</div>
                                        {time && <div className="system-warning-time">{time}</div>}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div className={`chat-message-item ${isMe ? 'me' : ''}`} key={key}>
                                <div className="chat-avatar">
                                    {getAvatarText(msg)}
                                </div>
                                <div className="chat-bubble-wrapper">
                                    {!isMe && <span className="chat-sender-info">{senderName}</span>}
                                    <div className="chat-bubble">{content}</div>
                                    <div className="chat-meta-row">
                                        {time && <span className="chat-time">{time}</span>}
                                        {isLeader && !String(msg.id).startsWith('temp-') && (
                                            <div className="chat-mod-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="chat-mod-btn delete"
                                                    title="Delete message for all members"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                    <span>Delete</span>
                                                </button>
                                                {!isMe && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenWarnModal(msg)}
                                                        className="chat-mod-btn warn"
                                                        title="Issue official warning to member"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                            <line x1="12" y1="9" x2="12" y2="13"></line>
                                                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                                        </svg>
                                                        <span>Warn</span>
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

            {/* Input Composer */}
            <form className="chat-input-wrapper" onSubmit={handleFormSubmit}>
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Type a team message..."
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

            {/* Interactive Warn Member Modal Dialog */}
            {warnModal.isOpen && (
                <div className="trans-modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="trans-modal-card warn-modal-card" style={{ maxWidth: '460px', width: '92%' }}>
                        <div className="trans-modal-header" style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.25)', paddingBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '8px', 
                                    background: 'rgba(245, 158, 11, 0.15)', 
                                    border: '1px solid rgba(245, 158, 11, 0.35)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    color: '#f59e0b' 
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--trans-text-primary, #f1f5f9)' }}>
                                    Issue Leader Warning
                                </h3>
                            </div>
                            <button className="trans-modal-close-btn" onClick={handleCloseWarnModal} disabled={warnModal.isSubmitting}>×</button>
                        </div>

                        <div className="trans-modal-body" style={{ paddingTop: '16px' }}>
                            <div style={{ 
                                background: 'rgba(245, 158, 11, 0.08)', 
                                border: '1px solid rgba(245, 158, 11, 0.2)', 
                                borderRadius: '10px', 
                                padding: '12px 14px', 
                                marginBottom: '16px' 
                            }}>
                                <div style={{ fontSize: '13px', color: 'var(--trans-text-primary, #e2e8f0)', marginBottom: '4px' }}>
                                    Target Member: <strong style={{ color: '#fbbf24', fontSize: '14px' }}>@{warnModal.memberName}</strong>
                                </div>
                                {warnModal.messageSnippet && (
                                    <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>
                                        " {warnModal.messageSnippet}... "
                                    </div>
                                )}
                            </div>

                            <label className="trans-form-label" style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                                Select Warning Reason:
                            </label>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                                {PRESET_WARN_REASONS.map(reason => (
                                    <label 
                                        key={reason} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px', 
                                            padding: '8px 12px', 
                                            borderRadius: '8px', 
                                            background: warnModal.reason === reason ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
                                            border: warnModal.reason === reason ? '1px solid #a855f7' : '1px solid var(--trans-border, rgba(255,255,255,0.08))', 
                                            cursor: 'pointer',
                                            fontSize: '12.5px',
                                            color: 'var(--trans-text-primary, #f1f5f9)',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="warnReasonPreset"
                                            checked={warnModal.reason === reason}
                                            onChange={() => setWarnModal(prev => ({ ...prev, reason }))}
                                            style={{ accentColor: '#a855f7' }}
                                        />
                                        <span>{reason}</span>
                                    </label>
                                ))}

                                <label 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '10px', 
                                        padding: '8px 12px', 
                                        borderRadius: '8px', 
                                        background: warnModal.reason === 'CUSTOM' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
                                        border: warnModal.reason === 'CUSTOM' ? '1px solid #a855f7' : '1px solid var(--trans-border, rgba(255,255,255,0.08))', 
                                        cursor: 'pointer',
                                        fontSize: '12.5px',
                                        color: 'var(--trans-text-primary, #f1f5f9)'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="warnReasonPreset"
                                        checked={warnModal.reason === 'CUSTOM'}
                                        onChange={() => setWarnModal(prev => ({ ...prev, reason: 'CUSTOM' }))}
                                        style={{ accentColor: '#a855f7' }}
                                    />
                                    <span>Other custom reason...</span>
                                </label>
                            </div>

                            {warnModal.reason === 'CUSTOM' && (
                                <div className="trans-form-group" style={{ marginBottom: '0' }}>
                                    <textarea
                                        className="trans-form-input textarea"
                                        placeholder="Explain the specific violation or instructions for this member..."
                                        value={warnModal.customReason}
                                        onChange={(e) => setWarnModal(prev => ({ ...prev, customReason: e.target.value }))}
                                        style={{ minHeight: '70px', fontSize: '13px' }}
                                    />
                                </div>
                            )}

                            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                                <span>This warning is saved to the database and sends a direct push notification.</span>
                            </div>
                        </div>

                        <div className="trans-modal-footer" style={{ borderTop: '1px solid var(--trans-border, rgba(255,255,255,0.08))', paddingTop: '14px', marginTop: '16px' }}>
                            <button
                                type="button"
                                className="trans-btn secondary"
                                onClick={handleCloseWarnModal}
                                disabled={warnModal.isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="chat-warn-submit-btn"
                                onClick={handleConfirmWarnMember}
                                disabled={warnModal.isSubmitting}
                            >
                                {warnModal.isSubmitting ? (
                                    <span className="send-spinner" style={{ width: '14px', height: '14px' }}></span>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                            <line x1="12" y1="9" x2="12" y2="13"></line>
                                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                        </svg>
                                        <span>Issue Warning</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeamGroupChat;