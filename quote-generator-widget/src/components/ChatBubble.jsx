import React from 'react';
import { MessageCircle, Zap } from 'lucide-react';
import '../styles/ChatBubble.css';

const ChatBubble = ({ onClick, businessId }) => {
  return (
    <div className="chat-bubble-container">
      <div 
        className="chat-bubble"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick();
          }
        }}
        aria-label="Open chat"
      >
        <div className="bubble-icon">
          <MessageCircle size={24} />
        </div>
        <div className="bubble-pulse"></div>
      </div>
      
      <div className="bubble-tooltip">
        <div className="tooltip-content">
          <Zap size={16} />
          <span>Get instant quotes!</span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
