import { useState, useEffect, useCallback, useRef } from 'react';
import stompService from '../services/websocket/StompService';
import { getChatMessagesApi, sendChatMessageApi } from '../services/api/ChatApi';
import { getTeamMessagesApi, createTeamMessageApi } from '../services/api/TeamWorkspaceApi';
import { getAuth } from '../utils/Auth';

const PAGE_SIZE = 20;

export function useChat(initialChatType = 'GLOBAL', initialGroupId = null) {
    const [chatType, setChatType] = useState(initialChatType); // 'GLOBAL' | 'GROUP'
    const [groupId, setGroupId] = useState(initialGroupId);
    const [messages, setMessages] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingInitial, setIsLoadingInitial] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isConnected, setIsConnected] = useState(stompService.isConnected());

    // Ref to hold message list container element for scroll preservation
    const scrollContainerRef = useRef(null);
    const isNearBottomRef = useRef(true);

    const auth = getAuth();
    const currentUser = auth?.user || null;

    // Sync state if initial props change (e.g. switching selected project team)
    useEffect(() => {
        setChatType(initialChatType);
        setGroupId(initialGroupId);
    }, [initialChatType, initialGroupId]);

    // Helper: Normalize messages array to always be chronological (oldest -> newest)
    const normalizeMessages = (msgList) => {
        if (!Array.isArray(msgList)) return [];
        return [...msgList].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : 0;
            const dateB = b.createdAt ? new Date(b.createdAt) : 0;
            return dateA - dateB;
        });
    };

    // 1. Fetch initial message history (page 1)
    const fetchInitialMessages = useCallback(async (type, gId) => {
        if (type === 'GROUP' && !gId) {
            setMessages([]);
            setIsLoadingInitial(false);
            return;
        }

        setIsLoadingInitial(true);
        setPage(1);
        setHasMore(true);
        try {
            let items = [];
            try {
                const res = await getChatMessagesApi({
                    chatType: type,
                    groupId: type === 'GROUP' ? gId : undefined,
                    page: 1,
                    limit: PAGE_SIZE,
                });

                if (Array.isArray(res)) {
                    items = res;
                } else if (res?.data && Array.isArray(res.data)) {
                    items = res.data;
                } else if (res?.content && Array.isArray(res.content)) {
                    items = res.content;
                }
            } catch (primaryErr) {
                // Secondary fallback to Team Workspace API if group endpoint fails
                if (type === 'GROUP' && gId) {
                    const teamRes = await getTeamMessagesApi(gId);
                    items = Array.isArray(teamRes) ? teamRes : (teamRes?.data || []);
                } else {
                    throw primaryErr;
                }
            }

            const sorted = normalizeMessages(items);
            setMessages(sorted);
            setHasMore(items.length >= PAGE_SIZE);
        } catch (err) {
            console.error('[useChat] Failed to load initial chat history:', err);
            setMessages([]);
        } finally {
            setIsLoadingInitial(false);
        }
    }, []);

    // 2. Fetch older messages (Prepend on scroll to top)
    const fetchOlderMessages = useCallback(async () => {
        if (isLoadingMore || !hasMore || isLoadingInitial) return;

        const container = scrollContainerRef.current;
        const previousScrollHeight = container ? container.scrollHeight : 0;

        setIsLoadingMore(true);
        const nextPage = page + 1;

        try {
            const res = await getChatMessagesApi({
                chatType,
                groupId: chatType === 'GROUP' ? groupId : undefined,
                page: nextPage,
                limit: PAGE_SIZE,
            });

            let olderItems = [];
            if (Array.isArray(res)) {
                olderItems = res;
            } else if (res?.data && Array.isArray(res.data)) {
                olderItems = res.data;
            } else if (res?.content && Array.isArray(res.content)) {
                olderItems = res.content;
            }

            if (olderItems.length === 0) {
                setHasMore(false);
            } else {
                setMessages((prevMessages) => {
                    const existingIds = new Set(prevMessages.map((m) => m.id));
                    const newUniqueOlder = olderItems.filter((m) => !existingIds.has(m.id));
                    const combined = normalizeMessages([...newUniqueOlder, ...prevMessages]);
                    return combined;
                });

                setPage(nextPage);
                setHasMore(olderItems.length >= PAGE_SIZE);

                // Preserve scroll position so view doesn't jump
                requestAnimationFrame(() => {
                    if (container) {
                        const newScrollHeight = container.scrollHeight;
                        container.scrollTop = newScrollHeight - previousScrollHeight;
                    }
                });
            }
        } catch (err) {
            console.error('[useChat] Failed to fetch older messages:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [chatType, groupId, page, hasMore, isLoadingMore, isLoadingInitial]);

    // 3. Real-time Incoming Message Handler from STOMP
    const handleIncomingMessage = useCallback((newMsg) => {
        if (!newMsg || !newMsg.id) return;

        setMessages((prevMessages) => {
            // Prevent duplicate message addition
            if (prevMessages.some((m) => m.id === newMsg.id)) {
                return prevMessages;
            }
            return [...prevMessages, newMsg];
        });

        // Smooth scroll to bottom if user is already near bottom
        requestAnimationFrame(() => {
            const container = scrollContainerRef.current;
            if (container && isNearBottomRef.current) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth',
                });
            }
        });
    }, []);

    // 4. Manage STOMP Subscription & Tab Switching Effect
    useEffect(() => {
        if (!currentUser) return;

        // Determine subscription topic path based on active tab
        const topic = chatType === 'GLOBAL' 
            ? '/topic/chat/global' 
            : (groupId ? `/topic/chat/group/${groupId}` : null);

        // Fetch initial REST message history
        fetchInitialMessages(chatType, groupId);

        // STOMP connection event handlers
        const cleanupConnect = stompService.onConnect(() => setIsConnected(true));
        const cleanupDisconnect = stompService.onDisconnect(() => setIsConnected(false));

        // Connect STOMP if needed
        stompService.connect();
        setIsConnected(stompService.isConnected());

        // Subscribe to current active topic
        let subscribedTopicKey = null;
        if (topic) {
            subscribedTopicKey = stompService.subscribe(topic, handleIncomingMessage);
        }

        // Cleanup: Unsubscribe when tab/groupId changes or unmounts
        return () => {
            if (subscribedTopicKey) {
                stompService.unsubscribe(subscribedTopicKey);
            }
            cleanupConnect();
            cleanupDisconnect();
        };
    }, [chatType, groupId, currentUser?.id, fetchInitialMessages, handleIncomingMessage]);

    // 5. Send Message Handler
    const sendMessage = useCallback(async (content) => {
        if (!content || !content.trim()) return;

        const trimmedContent = content.trim();
        setIsSending(true);

        const payload = {
            chatType,
            groupId: chatType === 'GROUP' ? groupId : undefined,
            content: trimmedContent,
        };

        try {
            // 1. Try sending via WebSocket STOMP (/app/chat/send)
            if (stompService.isConnected()) {
                const sentViaWs = stompService.publish('/app/chat/send', payload);
                if (sentViaWs) {
                    setIsSending(false);
                    return;
                }
            }

            // 2. Fallback to REST API sendChatMessageApi or createTeamMessageApi
            let sentMsg = null;
            try {
                sentMsg = await sendChatMessageApi(payload);
            } catch (restErr) {
                if (chatType === 'GROUP' && groupId) {
                    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    sentMsg = await createTeamMessageApi(groupId, {
                        sender: currentUser?.fullName || currentUser?.username || 'Member',
                        avatar: (currentUser?.fullName || currentUser?.username || 'M').substring(0, 2).toUpperCase(),
                        time,
                        text: trimmedContent,
                        content: trimmedContent,
                    });
                } else {
                    throw restErr;
                }
            }

            if (sentMsg) {
                handleIncomingMessage(sentMsg);
            }
        } catch (err) {
            console.error('[useChat] Error sending message:', err);
            throw err;
        } finally {
            setIsSending(false);
        }
    }, [chatType, groupId, handleIncomingMessage]);

    // 6. Switch Tab Handler
    const switchTab = useCallback((newType, newGroupId = null) => {
        setChatType(newType);
        setGroupId(newGroupId);
    }, []);

    return {
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
        setGroupId,
    };
}
