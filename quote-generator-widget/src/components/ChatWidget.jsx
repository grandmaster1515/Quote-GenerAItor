import React, { useState, useRef, useEffect } from 'react';
import ChatBubble from './ChatBubble';
import MessageList from './MessageList';
import PhotoUpload from './PhotoUpload';
import LeadForm from './LeadForm';
import CartIcon from './CartIcon';
import CartSidebar from './CartSidebar';
import AddToCartPopup from './AddToCartPopup';
import { Send, X, MessageCircle, Camera, ArrowLeft } from 'lucide-react';
import { DecisionTreeState } from '../utils/decisionTree';
import { CartManager } from '../utils/cartManager';
import { ServiceRecognitionEngine } from '../utils/serviceRecognition';
import '../styles/ChatWidget.css';

const ChatWidget = ({ businessId, apiBaseUrl = 'http://localhost:3001' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(true); // Show form first
  const [leadData, setLeadData] = useState(null);
  const [decisionTree, setDecisionTree] = useState(null);
  const [currentOptions, setCurrentOptions] = useState([]);
  
  // Cart-related state
  const [cartManager, setCartManager] = useState(null);
  const [cartData, setCartData] = useState({ cartItems: [], itemCount: 0, totalEstimate: 0 });
  const [showCartSidebar, setShowCartSidebar] = useState(false);
  const [showAddToCartPopup, setShowAddToCartPopup] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState(null);
  const [serviceRecognition, setServiceRecognition] = useState(null);
  
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize decision tree when lead form is submitted
  useEffect(() => {
    if (leadData && !decisionTree) {
      const tree = new DecisionTreeState(undefined, businessId, apiBaseUrl);
      setDecisionTree(tree);
      
      // Load services from database
      const initializeTree = async () => {
        await tree.loadServices();
        setCurrentOptions(tree.getCurrentOptions());
        
        // Load persisted state if available
        const savedState = localStorage.getItem(`decisionTree_${businessId}`);
        if (savedState) {
          try {
            tree.setState(JSON.parse(savedState));
            setCurrentOptions(tree.getCurrentOptions());
          } catch (error) {
            console.warn('Failed to load decision tree state:', error);
          }
        }

        // Initialize cart system with lead data
        initializeCartSystem(tree.dynamicServices);
      };
      
      initializeTree();
    }
  }, [leadData, businessId, decisionTree, apiBaseUrl]);

  // Re-initialize cart system when lead data becomes available
  useEffect(() => {
    if (leadData && decisionTree && !cartManager) {
      initializeCartSystem(decisionTree.dynamicServices || []);
    }
  }, [leadData, decisionTree]);

  // Initialize cart system
  const initializeCartSystem = (availableServices = []) => {
    // Initialize cart manager
    const cart = new CartManager(businessId, leadData?.leadId);
    setCartManager(cart);

    // Initialize service recognition with available services
    const recognition = new ServiceRecognitionEngine(availableServices);
    setServiceRecognition(recognition);

    // Subscribe to cart changes
    const unsubscribe = cart.subscribe((cartData) => {
      setCartData(cartData);
    });

    // Initial cart data
    setCartData(cart.exportCartData());

    // Cleanup subscription on unmount
    return unsubscribe;
  };

  // Save decision tree state to localStorage
  useEffect(() => {
    if (decisionTree && businessId) {
      localStorage.setItem(`decisionTree_${businessId}`, JSON.stringify(decisionTree.getState()));
    }
  }, [decisionTree, businessId]);

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

    // Clear current options when user types
    setCurrentOptions([]);

    try {
      // Check if decision tree should handle this input
      if (decisionTree && decisionTree.expectsTextInput()) {
        const handled = decisionTree.handleTextInput(userMessage);
        if (handled) {
          // Decision tree handled the input, show the next message and options
          const message = decisionTree.getCurrentMessage();
          addMessage('bot', message);
          setCurrentOptions(decisionTree.getCurrentOptions());
          setIsLoading(false);
          return;
        }
      }

      // Regular API call for free-form chat
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

      // Analyze message for service recognition (after bot response)
      if (serviceRecognition && leadData) {
        const analysisResult = serviceRecognition.analyzeMessage(userMessage, messages);
        if (analysisResult && analysisResult.shouldShowPopup) {
          // Wait a moment for the bot response to be seen
          setTimeout(() => {
            setPendingCartItem(analysisResult);
            setShowAddToCartPopup(true);
          }, 1000);
        }
      }

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

  const handleOptionSelect = (option) => {
    if (!decisionTree || isLoading) return;

    // Add user's selection as a message
    addMessage('user', option.text);
    
    // Clear current options immediately
    setCurrentOptions([]);
    setIsLoading(true);

    // Process the selection
    decisionTree.selectOption(option);
    
    // Simulate thinking time for better UX
    setTimeout(() => {
      const message = decisionTree.getCurrentMessage();
      addMessage('bot', message);
      setCurrentOptions(decisionTree.getCurrentOptions());
      setIsLoading(false);
    }, 500);
  };

  const handleGoBack = () => {
    if (!decisionTree) return;

    const canGoBack = decisionTree.goBack();
    if (canGoBack) {
      const message = decisionTree.getCurrentMessage();
      addMessage('bot', `Let me take you back. ${message}`);
      setCurrentOptions(decisionTree.getCurrentOptions());
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
          messages: [] // No previous messages when starting fresh
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save lead');
      }

      setLeadData(leadInfo);
      setShowLeadForm(false);
      
      // Initialize decision tree
      const tree = new DecisionTreeState(undefined, businessId, apiBaseUrl);
      setDecisionTree(tree);
      
      // Initialize tree and load services
      const initializeTree = async () => {
        await tree.loadServices();
        
        // Initialize chat with welcome message and decision tree
        const welcomeMessage = `Hi ${leadInfo.name}! Thanks for providing your information. ${tree.getCurrentMessage()}`;
        setMessages([
          {
            id: 1,
            type: 'bot',
            content: welcomeMessage,
            timestamp: new Date()
          }
        ]);
        
        // Set initial options
        setCurrentOptions(tree.getCurrentOptions());
      };
      
      initializeTree();
    } catch (error) {
      console.error('Error saving lead:', error);
      addMessage('bot', 'Sorry, there was an error saving your information. Please try again.');
    }
  };

  // Cart event handlers
  const handleAddToCart = async (cartItem) => {
    if (cartManager) {
      const addedItem = cartManager.addItem(cartItem);
      addMessage('bot', `✅ Added "${cartItem.serviceName}" to your service needs. You can view your items using the cart icon.`);
      console.log('Added to cart:', addedItem);
      
      // Sync with backend if lead data exists
      if (leadData) {
        try {
          await cartManager.syncWithBackend(apiBaseUrl);
        } catch (error) {
          console.warn('Failed to sync cart with backend:', error);
        }
      }
    }
    setShowAddToCartPopup(false);
    setPendingCartItem(null);
  };

  const handleCartIconClick = () => {
    setShowCartSidebar(!showCartSidebar);
  };

  const handleRemoveFromCart = async (itemId) => {
    if (cartManager) {
      const removed = cartManager.removeItem(itemId);
      if (removed) {
        addMessage('bot', 'Item removed from your service needs.');
        
        // Sync with backend if lead data exists
        if (leadData) {
          try {
            await cartManager.syncWithBackend(apiBaseUrl);
          } catch (error) {
            console.warn('Failed to sync cart with backend:', error);
          }
        }
      }
    }
  };

  const handleEditCartItem = (item) => {
    // Pre-fill the add-to-cart popup with existing item data
    setPendingCartItem({
      service: item.serviceName,
      serviceType: item.serviceType,
      details: item.details,
      estimatedPrice: item.estimatedPrice,
      confidenceScore: item.aiConfidenceScore
    });
    setShowAddToCartPopup(true);
    setShowCartSidebar(false);
  };

  const handleRequestQuote = async () => {
    if (!cartManager || cartData.itemCount === 0) return;

    try {
      setIsLoading(true);
      
      // Export cart data for quote request
      const cartExport = cartManager.exportCartData();
      
      // Create a quote request
      const response = await fetch(`${apiBaseUrl}/cart/quote-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          leadData,
          cartItems: cartExport.cartItems,
          totalEstimate: cartExport.totalEstimate,
          requestType: 'service-cart'
        }),
      });

      if (response.ok) {
        addMessage('bot', `🎉 Quote request submitted! We'll review your ${cartData.itemCount} service${cartData.itemCount !== 1 ? 's' : ''} and get back to you with a detailed quote soon.`);
        setShowCartSidebar(false);
        
        // Optionally clear cart after successful quote request
        // cartManager.clearCart();
      } else {
        throw new Error('Failed to submit quote request');
      }
    } catch (error) {
      console.error('Error submitting quote request:', error);
      addMessage('bot', 'Sorry, there was an error submitting your quote request. Please try again.');
    } finally {
      setIsLoading(false);
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
            {decisionTree && decisionTree.history.length > 0 && (
              <button 
                className="back-button"
                onClick={handleGoBack}
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
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
          {showLeadForm ? (
            <LeadForm 
              onSubmit={handleLeadSubmit}
              onCancel={() => {
                setShowLeadForm(false);
                setIsOpen(false);
              }}
            />
          ) : (
            <MessageList 
              messages={messages} 
              isLoading={isLoading} 
              onOptionSelect={handleOptionSelect}
              currentOptions={currentOptions}
            />
          )}
        </div>

        {!showLeadForm && (
          <div className="chat-footer">
            <div className="input-container">
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) handlePhotoUpload(file);
                  };
                  input.click();
                }}
                className="photo-upload-button"
                disabled={isLoading}
                aria-label="Upload photo"
                title="Upload photo"
              >
                <Camera size={18} />
              </button>
              
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
          </div>
        )}
      </div>

      {/* Cart Components - show only when lead data exists */}
      {leadData && cartManager && (
        <>
          <CartIcon 
            itemCount={cartData.itemCount}
            onClick={handleCartIconClick}
            isExpanded={showCartSidebar}
          />
          
          <CartSidebar
            isOpen={showCartSidebar}
            onClose={() => setShowCartSidebar(false)}
            cartItems={cartData.cartItems}
            onRemoveItem={handleRemoveFromCart}
            onEditItem={handleEditCartItem}
            onRequestQuote={handleRequestQuote}
            totalEstimate={cartData.totalEstimate}
          />
          
          <AddToCartPopup
            isOpen={showAddToCartPopup}
            onClose={() => {
              setShowAddToCartPopup(false);
              setPendingCartItem(null);
            }}
            onAddToCart={handleAddToCart}
            serviceData={pendingCartItem}
            onCancel={() => {
              setShowAddToCartPopup(false);
              setPendingCartItem(null);
            }}
          />
        </>
      )}
    </div>
  );
};

export default ChatWidget;
