import AxiosClient from './AxiosClient';

/**
 * Fetch paginated chat messages for Global or Group chat.
 * @param {Object} params
 * @param {'GLOBAL' | 'GROUP'} params.chatType - Chat scope type
 * @param {string} [params.groupId] - Required if chatType is 'GROUP'
 * @param {number} [params.page=1] - Page number (1-indexed)
 * @param {number} [params.limit=20] - Number of items per page
 */
export const getChatMessagesApi = ({ chatType, groupId, page = 1, limit = 20 }) => {
    const params = {
        chat_type: chatType,
        page,
        limit,
    };
    if (chatType === 'GROUP' && groupId) {
        params.group_id = groupId;
    }
    return AxiosClient.get('/chat/messages', { params });
};

/**
 * Send a chat message via HTTP REST endpoint.
 * @param {Object} payload
 * @param {'GLOBAL' | 'GROUP'} payload.chatType
 * @param {string} [payload.groupId]
 * @param {string} payload.content
 */
export const sendChatMessageApi = ({ chatType, groupId, content }) => {

    const data = {
        chatType,
        content,
    };
    if (chatType === 'GROUP' && groupId) {
        data.groupId = groupId;
    }
    return AxiosClient.post('/chat/messages', data);
};
