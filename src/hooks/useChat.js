import { useState, useEffect, useCallback, useRef } from 'react';
import stompService from '../services/websocket/StompService';
import { getChatMessagesApi, sendChatMessageApi, deleteChatMessageApi } from '../services/api/ChatApi';
import { getTeamMessagesApi, createTeamMessageApi, deleteTeamMessageApi } from '../services/api/TeamWorkspaceApi';
import { getAuth, getUserChatRestriction } from '../utils/Auth';
import { getBannedKeywordsApi, checkBannedContent } from '../services/api/BannedKeywordApi';
import { toast } from 'react-toastify';

const PAGE_SIZE = 10;
const OLDER_PAGE_SIZE = 30;

// LocalStorage Persistence Cache Helpers (User-Isolated)
const getCacheKey = (type, gId, userId) => {
    return `comiverse_chat_cache_${userId || 'guest'}_${type}_${gId || 'global'}`;
};

const loadCachedMessages = (type, gId, userId) => {
    try {
        const key = getCacheKey(type, gId, userId);
        const saved = localStorage.getItem(key);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return [...parsed].sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt) : 0;
                    return dateA - dateB;
                });
            }
        }
    } catch (e) {
        console.warn('[useChat] Failed to parse cached chat messages:', e);
    }
    return [];
};

const saveCachedMessages = (type, gId, userId, msgList) => {
    try {
        if (!Array.isArray(msgList)) return;
        const key = getCacheKey(type, gId, userId);
        // Persist up to 100 recent messages
        const slice = msgList.slice(-100);
        localStorage.setItem(key, JSON.stringify(slice));
    } catch (e) {
        console.warn('[useChat] Failed to save chat messages to localStorage:', e);
    }
};

const mergeUniqueMessages = (existing, incoming) => {
    const map = new Map();
    [...existing, ...incoming].forEach(item => {
        if (!item) return;
        const idKey = item.id || `text-${item.senderName || item.sender || item.username}-${item.content || item.text}-${item.createdAt || item.timestamp}`;
        if (!map.has(idKey)) {
            map.set(idKey, item);
        }
    });
    return Array.from(map.values());
};

export function useChat(initialChatType = 'GLOBAL', initialGroupId = null) {
    const auth = getAuth();
    const currentUser = auth?.user || null;
    const userId = currentUser?.id || currentUser?.username || 'guest';

    const [chatType, setChatType] = useState(initialChatType); // 'GLOBAL' | 'GROUP'
    const [groupId, setGroupId] = useState(initialGroupId);
    const [messages, setMessages] = useState(() => loadCachedMessages(initialChatType, initialGroupId, userId));
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingInitial, setIsLoadingInitial] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isConnected, setIsConnected] = useState(stompService.isConnected());

    // Ref to hold message list container element for scroll preservation
    const scrollContainerRef = useRef(null);
    const isNearBottomRef = useRef(true);

    // Sync state if initial props or user account changes
    useEffect(() => {
        setChatType(initialChatType);
        setGroupId(initialGroupId);
        setMessages(loadCachedMessages(initialChatType, initialGroupId, userId));

        // Fetch banned keywords to sync local cache with DB
        getBannedKeywordsApi().catch(err => console.warn('Failed to sync banned keywords:', err));
    }, [initialChatType, initialGroupId, userId]);

    // Helper: Normalize messages array to always be chronological (oldest -> newest)
    const normalizeMessages = (msgList) => {
        if (!Array.isArray(msgList)) return [];
        return [...msgList].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : (a.timestamp ? new Date(a.timestamp) : 0);
            const dateB = b.createdAt ? new Date(b.createdAt) : (b.timestamp ? new Date(b.timestamp) : 0);
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

        const currentAuth = getAuth();
        const currentUserId = currentAuth?.user?.id || currentAuth?.user?.username || 'guest';

        // Load cached messages first so UI is never blank
        const cached = loadCachedMessages(type, gId, currentUserId);
        if (cached.length > 0) {
            setMessages(cached);
        }

        setIsLoadingInitial(true);
        setPage(1);
        setHasMore(true);
        try {
            let items = [];
            try {
                let res;
                if (type === 'TEAM' && gId) {
                    res = await getTeamMessagesApi(gId).catch(() => []);
                } else {
                    res = await getChatMessagesApi({
                        chatType: type,
                        groupId: type === 'GROUP' ? gId : undefined,
                        page: 1,
                        limit: PAGE_SIZE,
                    }).catch(() => null);
                }

                if (Array.isArray(res)) {
                    items = res;
                } else if (res?.data && Array.isArray(res.data)) {
                    items = res.data;
                } else if (res?.content && Array.isArray(res.content)) {
                    items = res.content;
                }
            } catch (primaryErr) {
                console.warn('[useChat] Primary chat fetch unavailable, relying on local cache:', primaryErr);
            }

            if (Array.isArray(items)) {
                // REPLACE cached messages with server data (source of truth).
                // This ensures deleted messages don't linger as ghosts from localStorage.
                const sorted = normalizeMessages(items);
                saveCachedMessages(type, gId, currentUserId, sorted);
                setMessages(sorted);
                setHasMore(items.length >= PAGE_SIZE);
            } else if (cached.length > 0) {
                setMessages(cached);
            }
        } catch (err) {
            console.warn('[useChat] REST chat history fetch unavailable/timed out. Preserving local cached history:', err?.message || err);
            setMessages((prev) => (prev.length > 0 ? prev : cached));
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
            let res;
            if (chatType === 'TEAM' && groupId) {
                // TeamMessage API currently doesn't support pagination, so we don't fetch older messages
                setHasMore(false);
                setIsLoadingMore(false);
                return;
            } else {
                res = await getChatMessagesApi({
                    chatType,
                    groupId: chatType === 'GROUP' ? groupId : undefined,
                    page: nextPage,
                    limit: OLDER_PAGE_SIZE,
                });
            }

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
                    saveCachedMessages(chatType, groupId, userId, combined);
                    return combined;
                });

                setPage(nextPage);
                setHasMore(olderItems.length >= OLDER_PAGE_SIZE);

                // Preserve scroll position so view doesn't jump
                requestAnimationFrame(() => {
                    if (container) {
                        const newScrollHeight = container.scrollHeight;
                        container.scrollTop = newScrollHeight - previousScrollHeight;
                    }
                });
            }
        } catch (err) {
            console.warn('[useChat] Failed to fetch older messages:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [chatType, groupId, page, hasMore, isLoadingMore, isLoadingInitial, userId]);

    // 3. Real-time Incoming Message Handler from STOMP
    const handleIncomingMessage = useCallback((newMsg) => {
        if (!newMsg) return;

        const senderName = newMsg.senderName || newMsg.sender || newMsg.username || newMsg.submittedBy || 'Member';
        const senderId = newMsg.senderId || newMsg.userId || null;
        const contentText = newMsg.content || newMsg.text || '';

        const safeMsg = {
            id: newMsg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            sender: senderName,
            senderName: senderName,
            senderId: senderId,
            avatar: newMsg.avatar || newMsg.senderAvatar || newMsg.userAvatar || null,
            time: newMsg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: contentText,
            content: contentText,
            createdAt: newMsg.createdAt || newMsg.timestamp || new Date().toISOString(),
            ...newMsg
        };

        setMessages((prevMessages) => {
            // Search if a temporary optimistic message exists with matching content
            const tempIdx = prevMessages.findIndex(m =>
                String(m.id).startsWith('temp-') &&
                (m.content || m.text) === contentText
            );

            if (tempIdx !== -1) {
                // Replace temporary optimistic message in-place with real server message!
                const updated = [...prevMessages];
                updated[tempIdx] = safeMsg;
                const sorted = normalizeMessages(updated);
                saveCachedMessages(chatType, groupId, userId, sorted);
                return sorted;
            }

            // Check if exact ID or duplicate message exists
            const isDup = prevMessages.some((m) =>
                m.id === safeMsg.id ||
                ((m.content || m.text) === contentText &&
                    Math.abs(new Date(m.createdAt || 0) - new Date(safeMsg.createdAt || 0)) < 4000)
            );
            if (isDup) return prevMessages;

            const updated = normalizeMessages([...prevMessages, safeMsg]);
            saveCachedMessages(chatType, groupId, userId, updated);
            return updated;
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
    }, [chatType, groupId, userId]);

    // 4. Manage STOMP Subscription & Tab Switching Effect
    useEffect(() => {
        if (!currentUser) return;

        // Determine subscription topic path based on active tab
        const topic = chatType === 'GLOBAL'
            ? '/topic/chat/global'
            : (chatType === 'TEAM' && groupId ? `/topic/team-workspace/${groupId}`
               : (groupId ? `/topic/chat/group/${groupId}` : null));

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

    const removeMessage = useCallback((msgId) => {
        setMessages((prev) => {
            const updated = prev.filter(m => m.id !== msgId);
            saveCachedMessages(chatType, groupId, currentUser?.id, updated);
            return updated;
        });
    }, [chatType, groupId, currentUser]);

    const deleteMessage = useCallback(async (msgId) => {
        try {
            if (chatType === 'TEAM' && groupId) {
                await deleteTeamMessageApi(groupId, msgId);
            } else {
                await deleteChatMessageApi(msgId);
            }
            removeMessage(msgId);
            return true;
        } catch (err) {
            if (err?.response?.status === 404) {
                removeMessage(msgId);
                return true;
            }
            throw err;
        }
    }, [chatType, groupId, removeMessage]);

    // 5. Send Message Handler
    const sendMessage = useCallback(async (content, imageData = null) => {
        if ((!content || !content.trim()) && !imageData) return;

        // Check if user has active moderation restriction (BAN or MUTE)
        const restriction = getUserChatRestriction(currentUser);
        if (restriction && restriction.isRestricted) {
            if (restriction.type === 'BAN') {
                toast.error(`🚫 Chat Access Banned: ${restriction.reason || 'Permanently banned by Moderator'}`);
                setIsSending(false);
                return false;
            }
            if (restriction.type === 'MUTE') {
                const untilStr = new Date(restriction.until).toLocaleString();
                toast.error(`🔇 Chat Privileges Muted until ${untilStr}: ${restriction.reason || 'Muted by Moderator'}`);
                setIsSending(false);
                return false;
            }
        }

        const trimmedContent = (content || '').trim();

        // 0ms Instant Client-Side Keyword Pre-filter (text only)
        if (trimmedContent) {
            const filterCheck = checkBannedContent(trimmedContent);
            if (filterCheck.isBanned) {
                toast.error(`🚫 Message blocked by Client Pre-filter! Contains banned keyword: "${filterCheck.matchedWord}" (${filterCheck.category})`);
                setIsSending(false);
                return false;
            }
        }

        setIsSending(true);

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const localOptimisticMsg = {
            id: `temp-${Date.now()}`,
            sender: currentUser?.fullName || currentUser?.username || 'Member',
            senderName: currentUser?.fullName || currentUser?.username || 'Member',
            senderId: currentUser?.id || currentUser?.userId || null,
            sender_id: currentUser?.id || currentUser?.userId || null,
            avatar: currentUser?.avatarUrl || null,
            time: timeStr,
            text: trimmedContent,
            content: trimmedContent,
            imageUrl: imageData || null,
            createdAt: new Date().toISOString(),
            chatType,
            groupId: chatType === 'GROUP' ? groupId : undefined
        };

        // Instantly display message in local UI (Optimistic UI update)
        handleIncomingMessage(localOptimisticMsg);

        const payload = {
            chatType,
            groupId: chatType === 'GROUP' ? groupId : undefined,
            content: trimmedContent,
            imageUrl: imageData || undefined,
        };

        try {
            // 1. Try sending via WebSocket STOMP (/app/chat/send)
            // Note: For TEAM chat, we just use REST directly because TeamWorkspaceController doesn't have an @MessageMapping yet. 
            // The REST call will broadcast it to /topic/team-workspace via SimpMessagingTemplate.
            if (chatType !== 'TEAM' && stompService.isConnected()) {
                const sentViaWs = stompService.publish('/app/chat/send', payload);
                if (sentViaWs) {
                    setIsSending(false);
                    return;
                }
            }

            // 2. Fallback to REST API 
            try {
                let sentMsg = null;
                if (chatType === 'TEAM' && groupId) {
                    sentMsg = await createTeamMessageApi(groupId, {
                        sender: currentUser?.fullName || currentUser?.username || 'Member',
                        avatar: currentUser?.avatarUrl || null,
                        time: timeStr,
                        text: trimmedContent
                    }).catch(() => null);
                } else {
                    sentMsg = await sendChatMessageApi(payload).catch(() => null);
                }

                if (sentMsg) {
                    // Normalize TeamMessageEntity schema to our generic chat format if needed
                    handleIncomingMessage(sentMsg);
                }
            } catch (restErr) {
                console.warn('[useChat] REST send fallback preserved message in local cache:', restErr);
            }
        } catch (err) {
            console.error('[useChat] Error sending message:', err);
        } finally {
            setIsSending(false);
        }
    }, [chatType, groupId, handleIncomingMessage, currentUser]);

    // 6. Switch Tab Handler
    const switchTab = useCallback((newType, newGroupId = null) => {
        setChatType(newType);
        setGroupId(newGroupId);
        setMessages(loadCachedMessages(newType, newGroupId, userId));
    }, [userId]);

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
        removeMessage,
        deleteMessage,
        setGroupId,
        setMessages,
    };
}
