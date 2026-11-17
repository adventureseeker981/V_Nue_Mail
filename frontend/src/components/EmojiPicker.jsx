// src/components/EmojiPicker.jsx — Fast, Lightweight Emoji Picker for Encrypto
import React, { useState } from 'react';

const EMOJI_CATEGORIES = {
  'Smileys & Emotion': [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳',
    '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫',
  ],
  'Gestures & People': [
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
    '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
    '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
    '🙏', '💪', '🧠', '🫀', '👀', '👁️', '🧑‍💻', '👨‍💼', '👩‍💼', '🚀',
  ],
  'Hearts & Symbols': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '⭐',
    '🌟', '💫', '🔥', '💥', '💯', '✅', '❌', '⚠️', '⚡', '🔒',
  ],
  'Work & Productivity': [
    '📁', '📂', '📄', '📜', '📊', '📈', '📉', '📋', '📌', '📎',
    '🔒', '🔑', '🛡️', '💻', '🖥️', '📱', '✉️', '📧', '📥', '📤',
    '📦', '🏷️', '📅', '📆', '⏰', '⏱️', '⏳', '💡', '🔍', '🔎',
  ],
};

export default function EmojiPicker({ isOpen, onClose, onSelect }) {
  const [activeCategory, setActiveCategory] = useState('Smileys & Emotion');

  if (!isOpen) return null;

  return (
    <div className="emoji-picker-popover" onMouseDown={(e) => e.stopPropagation()}>
      <div className="emoji-picker-tabs">
        {Object.keys(EMOJI_CATEGORIES).map((cat) => (
          <button
            key={cat}
            type="button"
            className={`emoji-tab-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="emoji-grid">
        {EMOJI_CATEGORIES[activeCategory].map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            className="emoji-btn"
            onClick={() => {
              onSelect(emoji);
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
