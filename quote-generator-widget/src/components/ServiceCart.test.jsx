// ServiceCart Component Test File
// This is a simple test to verify component functionality

import React from 'react';
import ServiceCart from './ServiceCart';

// Mock data for testing
const mockCartItems = [
  {
    serviceId: 'hvac-1',
    serviceName: 'HVAC Services',
    estimatedPrice: 450,
    collectedDetails: {
      address: { value: '123 Main St' },
      system_type: { value: 'Gas Furnace' },
      square_footage: { value: '1800' },
      urgency: { value: 'Normal' }
    },
    addedAt: new Date().toISOString()
  },
  {
    serviceId: 'plumbing-1',
    serviceName: 'Plumbing Services',
    estimatedPrice: 250,
    collectedDetails: {
      address: { value: '123 Main St' },
      issue_type: { value: 'Leak repair' },
      urgency: { value: 'Yes - Emergency' },
      custom_requirements: { value: 'Kitchen sink is completely blocked' }
    },
    addedAt: new Date(Date.now() - 86400000).toISOString() // Yesterday
  }
];

// Test Component
const ServiceCartTest = () => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [cartItems, setCartItems] = React.useState(mockCartItems);

  // Mock API calls for testing
  React.useEffect(() => {
    // Override fetch for testing
    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {
      console.log('Mock API call:', { url, options });

      // Mock GET cart items
      if (url.includes('/api/cart/') && options?.method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            cartItems,
            totalEstimate: cartItems.reduce((sum, item) => sum + item.estimatedPrice, 0)
          })
        };
      }

      // Mock DELETE cart item
      if (url.includes('/api/cart/item/') && options?.method === 'DELETE') {
        const urlParts = url.split('/');
        const itemIndex = parseInt(urlParts[urlParts.length - 1]);
        const newItems = cartItems.filter((_, index) => index !== itemIndex);
        setCartItems(newItems);

        return {
          ok: true,
          json: async () => ({ success: true })
        };
      }

      // Default mock response
      return {
        ok: true,
        json: async () => ({ success: true })
      };
    };

    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, [cartItems]);

  const handleEditItem = (item) => {
    console.log('Edit item:', item);
    alert(`Edit ${item.serviceName} - This would open edit dialog or chat`);
  };

  const handleRemoveItem = (itemIndex) => {
    console.log('Remove item at index:', itemIndex);
  };

  const handleRequestQuote = () => {
    console.log('Request quote for items:', cartItems);
    alert(`Quote requested for ${cartItems.length} services!`);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1>ServiceCart Component Test</h1>

      <button onClick={handleToggle} style={{ marginBottom: '20px', padding: '10px 20px' }}>
        {isOpen ? 'Close' : 'Open'} Cart
      </button>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Features:</h3>
        <ul>
          <li>✅ Collapsible UI with expand/collapse controls</li>
          <li>✅ Service item display with details and pricing</li>
          <li>✅ Edit and Remove buttons (with confirmation modal)</li>
          <li>✅ Real-time cart synchronization (mocked)</li>
          <li>✅ Professional e-commerce-like styling</li>
          <li>✅ Total estimation calculation</li>
          <li>✅ Empty cart state</li>
          <li>✅ Loading states and error handling</li>
          <li>✅ Mobile responsive design</li>
          <li>✅ Accessibility features (focus states, ARIA labels)</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Actions:</h3>
        <button onClick={() => setCartItems([])}>Clear Cart (Test Empty State)</button>
        {' '}
        <button onClick={() => setCartItems(mockCartItems)}>Restore Cart Items</button>
      </div>

      <ServiceCart
        businessId="test-business-123"
        leadId="test-lead-456"
        sessionId="test-session-789"
        apiBaseUrl="http://localhost:3001"
        isOpen={isOpen}
        onToggle={handleToggle}
        onEditItem={handleEditItem}
        onRemoveItem={handleRemoveItem}
        onRequestQuote={handleRequestQuote}
      />

      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxWidth: '300px'
      }}>
        <h4>Component Status:</h4>
        <p><strong>Cart Items:</strong> {cartItems.length}</p>
        <p><strong>Total:</strong> ${cartItems.reduce((sum, item) => sum + item.estimatedPrice, 0)}</p>
        <p><strong>Cart Open:</strong> {isOpen ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

// Usage Instructions
console.log(`
🧪 ServiceCart Component Test Suite

This test file demonstrates all the key features of the ServiceCart component:

1. **Collapsible Design**: Click the collapse/expand button in the cart header
2. **Edit Functionality**: Click edit buttons to test edit handlers
3. **Remove Functionality**: Click remove buttons to test confirmation modal
4. **Real-time Sync**: Cart state updates automatically (mocked API)
5. **Empty State**: Use "Clear Cart" button to test empty cart display
6. **Professional Styling**: Modern, e-commerce-like design
7. **Mobile Responsive**: Resize window to test mobile layout
8. **Error Handling**: Network failures are handled gracefully
9. **Loading States**: Loading spinner during API operations
10. **Accessibility**: Keyboard navigation and screen reader support

🎯 Integration Notes:
- Component expects sessionId for cart API operations
- Real-time sync polls every 5 seconds when sessionId is provided
- Edit operations can integrate with chat system or modal dialogs
- Remove operations call DELETE /api/cart/item/:sessionId/:itemIndex
- Quote requests trigger onRequestQuote callback for business logic

🔧 API Integration:
- GET /api/cart/:sessionId - Load cart items
- DELETE /api/cart/item/:sessionId/:itemIndex - Remove specific item
- PATCH /api/cart/item/:sessionId/:itemIndex - Update item (future)

This component is designed to integrate seamlessly with the existing
quote generator chat system while providing a modern, professional
cart experience similar to leading e-commerce platforms.
`);

export default ServiceCartTest;