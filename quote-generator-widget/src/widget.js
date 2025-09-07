import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './components/ChatWidget';
import './index.css';

// Widget initialization function
window.QuoteGeneratorChat = {
  init: function(config = {}) {
    const {
      businessId = 'demo-business-123',
      apiBaseUrl = 'http://localhost:3001',
      containerId = null,
      theme = 'default',
      position = 'bottom-right',
      ...otherConfig
    } = config;

    // Validate required config
    if (!businessId) {
      console.error('QuoteGeneratorChat: businessId is required');
      return;
    }

    // Create container element
    let container;
    if (containerId) {
      container = document.getElementById(containerId);
      if (!container) {
        console.error(`QuoteGeneratorChat: Container with id "${containerId}" not found`);
        return;
      }
    } else {
      // Create default container
      container = document.createElement('div');
      container.id = 'quote-generator-chat-widget';
      container.style.position = 'fixed';
      container.style.zIndex = '10000';
      
      // Set position
      switch (position) {
        case 'bottom-left':
          container.style.bottom = '20px';
          container.style.left = '20px';
          break;
        case 'top-right':
          container.style.top = '20px';
          container.style.right = '20px';
          break;
        case 'top-left':
          container.style.top = '20px';
          container.style.left = '20px';
          break;
        case 'bottom-right':
        default:
          container.style.bottom = '20px';
          container.style.right = '20px';
          break;
      }
      
      document.body.appendChild(container);
    }

    // Apply theme if specified
    if (theme && theme !== 'default') {
      container.classList.add(`quote-chat-theme-${theme}`);
    }

    // Create React root and render widget
    const root = createRoot(container);
    root.render(
      React.createElement(ChatWidget, {
        businessId,
        apiBaseUrl,
        theme,
        position,
        ...otherConfig
      })
    );

    // Store reference for potential cleanup
    window.QuoteGeneratorChat._instance = {
      root,
      container,
      config: { businessId, apiBaseUrl, theme, position, ...otherConfig }
    };

    console.log('✅ Quote Generator Chat Widget initialized', { businessId, apiBaseUrl });
    
    return window.QuoteGeneratorChat._instance;
  },

  // Destroy widget instance
  destroy: function() {
    if (window.QuoteGeneratorChat._instance) {
      const { root, container } = window.QuoteGeneratorChat._instance;
      
      // Unmount React component
      root.unmount();
      
      // Remove container if we created it
      if (container && container.id === 'quote-generator-chat-widget') {
        document.body.removeChild(container);
      }
      
      // Clear instance
      window.QuoteGeneratorChat._instance = null;
      
      console.log('✅ Quote Generator Chat Widget destroyed');
    }
  },

  // Update widget configuration
  updateConfig: function(newConfig) {
    if (window.QuoteGeneratorChat._instance) {
      const currentConfig = window.QuoteGeneratorChat._instance.config;
      const updatedConfig = { ...currentConfig, ...newConfig };
      
      // Destroy and recreate with new config
      this.destroy();
      this.init(updatedConfig);
    }
  },

  // Get current instance
  getInstance: function() {
    return window.QuoteGeneratorChat._instance;
  }
};

// Auto-initialize if data attributes are present on script tag
document.addEventListener('DOMContentLoaded', function() {
  const scripts = document.getElementsByTagName('script');
  let autoInitConfig = null;
  
  // Look for our script tag with data attributes
  for (let script of scripts) {
    if (script.src && script.src.includes('quote-generator-chat')) {
      const businessId = script.getAttribute('data-business-id');
      const apiBaseUrl = script.getAttribute('data-api-base-url');
      const theme = script.getAttribute('data-theme');
      const position = script.getAttribute('data-position');
      
      if (businessId) {
        autoInitConfig = {
          businessId,
          apiBaseUrl: apiBaseUrl || undefined,
          theme: theme || undefined,
          position: position || undefined
        };
        break;
      }
    }
  }
  
  // Auto-initialize if config found
  if (autoInitConfig) {
    window.QuoteGeneratorChat.init(autoInitConfig);
  }
});

// Export for potential module usage
export default window.QuoteGeneratorChat;
