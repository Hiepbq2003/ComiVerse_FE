import { useState } from 'react';

function ChatTabBar({ activeTab, groupId, onTabChange }) {
    const [tempGroupId, setTempGroupId] = useState(groupId || '');

    const handleGroupSubmit = (e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
            if (tempGroupId.trim()) {
                onTabChange('GROUP', tempGroupId.trim());
            }
        }
    };

    return (
        <div>
            <div className="cv-chat-tab-bar">
                <button
                    type="button"
                    className={`cv-chat-tab-btn ${activeTab === 'GLOBAL' ? 'active' : ''}`}
                    onClick={() => onTabChange('GLOBAL', null)}
                >
                    <span>🌐</span> Chat Chung
                </button>
                <button
                    type="button"
                    className={`cv-chat-tab-btn ${activeTab === 'GROUP' ? 'active' : ''}`}
                    onClick={() => onTabChange('GROUP', tempGroupId || groupId)}
                >
                    <span>👥</span> Chat Nhóm Dịch
                </button>
            </div>

            {activeTab === 'GROUP' && (
                <div className="cv-chat-group-selector">
                    <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>Group ID:</span>
                    <input
                        type="text"
                        className="cv-chat-group-input"
                        placeholder="Enter Group UUID..."
                        value={tempGroupId}
                        onChange={(e) => setTempGroupId(e.target.value)}
                        onKeyDown={handleGroupSubmit}
                        onBlur={handleGroupSubmit}
                    />
                </div>
            )}
        </div>
    );
}

export default ChatTabBar;
