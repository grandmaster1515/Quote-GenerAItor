import React, { useState, useRef, useEffect } from 'react';
import ChatBubble from './ChatBubble';
import MessageList from './MessageList';
import PhotoUpload from './PhotoUpload';
import LeadForm from './LeadForm';
import { Send, X, MessageCircle } from 'lucide-react';
import '../styles/ChatWidget.css';

const ChatWidget = ({ businessId, apiBaseUrl = 'http://localhost:3001' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hi! How can I help you today? Feel free to ask about our services or upload photos of your project.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const addMessage = (type, content, photoUrl = null) => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      photoUrl,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage,
          businessId,
          leadData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      addMessage('bot', data.response);

      // Check if we should show lead form based on bot response
      if (data.shouldCollectLead && !leadData) {
        setShowLeadForm(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('bot', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePhotoUpload = async (file) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('businessId', businessId);

      const response = await fetch(`${apiBaseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const data = await response.json();
      addMessage('user', 'Photo uploaded', data.photoUrl);
      
      // Auto-generate a response about the photo
      addMessage('bot', 'Thanks for the photo! I can see your project. How can I help you with this?');
    } catch (error) {
      console.error('Error uploading photo:', error);
      addMessage('bot', 'Sorry, there was an error uploading your photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadSubmit = async (leadInfo) => {
    try {
      const response = await fetch(`${apiBaseUrl}/lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...leadInfo,
          businessId,
          messages: messages.slice(-5) // Include recent conversation context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save lead');
      }

      setLeadData(leadInfo);
      setShowLeadForm(false);
      addMessage('bot', `Thanks ${leadInfo.name}! I've saved your information. How else can I help you today?`);
    } catch (error) {
      console.error('Error saving lead:', error);
      addMessage('bot', 'Sorry, there was an error saving your information. Please try again.');
    }
  };

  if (!isOpen) {
    return (
      <ChatBubble 
        onClick={() => setIsOpen(true)}
        businessId={businessId}
      />
    );
  }

  return (
    <div className="chat-widget-container">
      <div className="chat-widget">
        <div className="chat-header">
          <div className="chat-header-content">
            <MessageCircle size={20} />
            <span>Chat with us</span>
          </div>
          <button 
            className="close-button"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="chat-body">
          <MessageList messages={messages} isLoading={isLoading} />
          
          {showLeadForm && (
            <LeadForm 
              onSubmit={handleLeadSubmit}
              onCancel={() => setShowLeadForm(false)}
            />
          )}
        </div>

        <div className="chat-footer">
          <PhotoUpload 
            onUpload={handlePhotoUpload}
            disabled={isLoading}
          />
          
          <div className="input-container">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="message-input"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="send-button"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>

          {!leadData && (
            <button
              onClick={() => setShowLeadForm(true)}
              className="lead-form-trigger"
            >
              Get a Quote
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
