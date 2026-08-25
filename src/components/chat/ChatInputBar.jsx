import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getAuth, getUserChatRestriction } from '../../utils/Auth';

const EMOJI_CATEGORIES = [
  {
    label: '😀 Smileys',
    emojis: ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤩', '😊', '🥳', '😏', '😢', '😭', '🤔', '😱', '🤯', '😤', '🥺', '😴', '🤗', '🫡', '😈', '🤡', '💀', '👻']
  },
  {
    label: '👍 Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🫶', '💪', '👊', '🫰', '🖐️', '👋', '🤙', '🫵', '💅']
  },
  {
    label: '❤️ Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💔']
  },
  {
    label: '🔥 Popular',
    emojis: ['🔥', '⚡', '✨', '💯', '🚀', '🎉', '🎊', '🏆', '⭐', '🌟', '💎', '🎯', '🎮', '📚', '🖊️', '🗡️']
  },
  {
    label: '🐱 Animals',
    emojis: ['🐱', '🐶', '🐺', '🦊', '🐻', '🐼', '🐯', '🦁', '🐲', '🦄', '🐸', '🐰', '🐵', '🦅', '🦋', '🐙']
  }
];

function ChatInputBar({ onSendMessage, isSending, disabled }) {
  const [content, setContent] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((!content.trim() && !attachedImage) || isSending || disabled) return;

    const textToSend = content;
    const imageToSend = attachedImage;
    try {
      const success = await onSendMessage(textToSend, imageToSend);
      if (success !== false) {
        setContent('');
        setAttachedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      setContent(textToSend);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Chat images must be 5MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage({ file, previewUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEmojiClick = (emoji) => {
    setContent(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const canSend = (content.trim() || attachedImage) && !isSending && !disabled;

  // Check active user moderation restriction (BAN or MUTE)
  const auth = getAuth();
  const restriction = getUserChatRestriction(auth?.user);
  const isRestricted = !!(restriction && restriction.isRestricted);

  const getPlaceholder = () => {
    if (disabled) return 'Select group to chat...';
    if (isRestricted) {
      return restriction.type === 'BAN' 
        ? '🚫 Chat access permanently banned' 
        : `🔇 Muted until ${new Date(restriction.until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Type a message...';
  };

  const isInputDisabled = disabled || isSending || isRestricted;

  return (
    <div className="cv-chat-input-wrapper">
      {/* Image Preview Strip */}
      {attachedImage && (
        <div className="cv-chat-attachment-preview">
          <div className="cv-chat-attachment-thumb">
            <img src={attachedImage.previewUrl} alt="Attachment" />
            <button
              type="button"
              className="cv-chat-attachment-remove"
              onClick={handleRemoveImage}
              title="Remove image"
            >
              ✕
            </button>
          </div>
          <span className="cv-chat-attachment-label">Image attached</span>
        </div>
      )}

      <form className="cv-chat-input-bar" onSubmit={handleSubmit}>
        {/* Emoji Picker Button */}
        <div className="cv-chat-action-group" ref={emojiPickerRef}>
          <button
            type="button"
            className={`cv-chat-action-btn ${showEmojiPicker ? 'active' : ''}`}
            onClick={() => setShowEmojiPicker(prev => !prev)}
            title="Emoji"
            disabled={isInputDisabled}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="cv-emoji-picker">
              <div className="cv-emoji-picker-tabs">
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`cv-emoji-tab ${activeEmojiCategory === idx ? 'active' : ''}`}
                    onClick={() => setActiveEmojiCategory(idx)}
                    title={cat.label}
                  >
                    {cat.emojis[0]}
                  </button>
                ))}
              </div>
              <div className="cv-emoji-picker-label">
                {EMOJI_CATEGORIES[activeEmojiCategory].label}
              </div>
              <div className="cv-emoji-grid">
                {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji, eIdx) => (
                  <button
                    key={eIdx}
                    type="button"
                    className="cv-emoji-item"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Image Attach Button */}
        <button
          type="button"
          className="cv-chat-action-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach image"
          disabled={isInputDisabled}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          className="cv-chat-input"
          placeholder={getPlaceholder()}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isInputDisabled}
        />

        {/* Send Button */}
        <button
          type="submit"
          className="cv-chat-send-btn"
          disabled={!canSend}
          title="Send message"
        >
          {isSending ? (
            <div className="cv-chat-spinner" style={{ width: '14px', height: '14px', borderTopColor: '#ffffff' }}></div>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

export default ChatInputBar;
