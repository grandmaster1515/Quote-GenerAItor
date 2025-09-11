import React, { useEffect, useRef } from 'react';
import { Bot, User, Image as ImageIcon, Loader } from 'lucide-react';
import OptionBubbles from './OptionBubbles';
import '../styles/MessageList.css';

const MessageList = ({ messages, isLoading, onOptionSelect, currentOptions = [] }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${message.type === 'user' ? 'user-message' : 'bot-message'}`}
        >
          <div className="message-avatar">
            {message.type === 'user' ? (
              <User size={16} />
            ) : (
              <Bot size={16} />
            )}
          </div>
          
          <div className="message-content">
            <div className="message-bubble">
              {message.photoUrl ? (
                <div className="message-photo">
                  <img 
                    src={message.photoUrl} 
                    alt="Uploaded photo" 
                    className="uploaded-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="photo-placeholder" style={{ display: 'none' }}>
                    <ImageIcon size={24} />
                    <span>Image failed to load</span>
                  </div>
                </div>
              ) : null}
              
              <div className="message-text">
                {message.content}
              </div>
            </div>
            
            <div className="message-time">
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="message bot-message">
          <div className="message-avatar">
            <Bot size={16} />
          </div>
          <div className="message-content">
            <div className="message-bubble loading">
              <div className="typing-indicator">
                <Loader size={16} className="spinner" />
                <span>Typing...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show option bubbles after the last bot message */}
      {!isLoading && currentOptions.length > 0 && messages.length > 0 && (
        <div className="message bot-message">
          <div className="message-avatar">
            <Bot size={16} />
          </div>
          <div className="message-content">
            <OptionBubbles 
              options={currentOptions} 
              onOptionSelect={onOptionSelect}
              disabled={isLoading}
            />
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
