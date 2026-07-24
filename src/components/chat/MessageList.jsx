import { useEffect } from 'react';
import MessageItem from './MessageItem';

function MessageList({
    messages = [],
    currentUserId,
    currentUser,
    isLoadingInitial,
    isLoadingMore,
    hasMore,
    isConnected = true,
    onLoadMore,
    scrollContainerRef,
    isNearBottomRef,
}) {
    // Detect scroll to top for infinite scroll pagination
    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Check if user is scrolled near top (less than 30px from top)
        if (container.scrollTop < 30 && hasMore && !isLoadingMore && !isLoadingInitial) {
            onLoadMore();
        }

        // Track if user is near bottom (within 80px of bottom)
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (isNearBottomRef) {
            isNearBottomRef.current = distanceFromBottom < 80;
        }
    };

    // Auto-scroll to bottom on initial message load
    useEffect(() => {
        if (!isLoadingInitial && messages.length > 0) {
            const container = scrollContainerRef.current;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [isLoadingInitial, messages.length, scrollContainerRef]);

    return (
        <div 
            className="cv-chat-message-list" 
            ref={scrollContainerRef}
            onScroll={handleScroll}
        >
            {/* Top Loading Spinner for Older Messages */}
            {isLoadingMore && (
                <div className="cv-chat-top-loader">
                    <div className="cv-chat-spinner"></div>
                    <span>Loading older messages...</span>
                </div>
            )}

            {/* Initial Loading or Connection State */}
            {isLoadingInitial || (!isConnected && messages.length === 0) ? (
                <div className="cv-chat-empty-state">
                    <div className="cv-chat-spinner" style={{ margin: '0 auto 8px', width: '24px', height: '24px' }}></div>
                    <span>{isLoadingInitial ? 'Loading chat history...' : 'Connecting to chat server...'}</span>
                </div>
            ) : messages.length === 0 ? (
                <div className="cv-chat-empty-state">
                    <span className="cv-chat-empty-icon">💬</span>
                    <p style={{ margin: 0 }}>No messages yet. Be the first to start the conversation!</p>
                </div>
            ) : (
                messages.map((msg) => (
                    <MessageItem
                        key={msg.id || `${msg.senderId}-${msg.createdAt}`}
                        message={msg}
                        currentUserId={currentUserId}
                        currentUser={currentUser}
                    />
                ))
            )}
        </div>
    );
}

export default MessageList;
