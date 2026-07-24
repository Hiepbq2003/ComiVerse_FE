import { useState } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatTabBar from './ChatTabBar';
import MessageList from './MessageList';
import ChatInputBar from './ChatInputBar';
import '../../assets/style/chat.css';

function ChatWidget({ defaultGroupId = null, isEmbedded = false }) {
    const [isOpen, setIsOpen] = useState(false);

    const {
        chatType,
        groupId,
        messages,
        hasMore,
        isLoadingInitial,
        isLoadingMore,
        isSending,
        isConnected,
        currentUser,
        scrollContainerRef,
        isNearBottomRef,
        switchTab,
        fetchOlderMessages,
        sendMessage,
    } = useChat('GLOBAL', defaultGroupId);

    const handleToggleChat = () => {
        setIsOpen((prev) => !prev);
    };

    // If used as an embedded panel (e.g. inside translator dashboard)
    if (isEmbedded) {
        return (
            <div className="cv-chat-drawer" style={{ position: 'relative', bottom: 'auto', right: 'auto', width: '100%', height: '100%', borderRadius: '12px' }}>
                <div className="cv-chat-header">
                    <div className="cv-chat-header-title">
                        <h3>Global Chat</h3>
                    </div>
                </div>

                <MessageList
                    messages={messages}
                    currentUserId={currentUser?.id}
                    currentUser={currentUser}
                    isLoadingInitial={isLoadingInitial}
                    isLoadingMore={isLoadingMore}
                    hasMore={hasMore}
                    isConnected={isConnected}
                    onLoadMore={fetchOlderMessages}
                    scrollContainerRef={scrollContainerRef}
                    isNearBottomRef={isNearBottomRef}
                />

                <ChatInputBar
                    onSendMessage={sendMessage}
                    isSending={isSending}
                />
            </div>
        );
    }

    return (
        <>
            {/* Floating Action Button (FAB) */}
            <button
                type="button"
                className="cv-chat-fab"
                onClick={handleToggleChat}
                aria-label="Toggle ComiVerse Chat"
                title="ComiVerse Community Chat"
            >
                {isOpen ? (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                )}
            </button>

            {/* Chat Drawer Window */}
            {isOpen && (
                <div className="cv-chat-drawer">
                    {/* Header */}
                    <div className="cv-chat-header">
                        <div className="cv-chat-header-title">
                            <h3>Global Chat</h3>
                        </div>

                        <div className="cv-chat-header-actions">
                            <button
                                type="button"
                                className="cv-chat-icon-btn"
                                onClick={handleToggleChat}
                                title="Close Chat"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Message List */}
                    <MessageList
                        messages={messages}
                        currentUserId={currentUser?.id}
                        currentUser={currentUser}
                        isLoadingInitial={isLoadingInitial}
                        isLoadingMore={isLoadingMore}
                        hasMore={hasMore}
                        onLoadMore={fetchOlderMessages}
                        scrollContainerRef={scrollContainerRef}
                        isNearBottomRef={isNearBottomRef}
                    />

                    {/* Input Bar */}
                    <ChatInputBar
                        onSendMessage={sendMessage}
                        isSending={isSending}
                    />
                </div>
            )}
        </>
    );
}

export default ChatWidget;
