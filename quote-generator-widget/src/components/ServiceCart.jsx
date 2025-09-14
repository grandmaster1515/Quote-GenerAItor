import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Edit3, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import '../styles/ServiceCart.css';

const ServiceCart = ({
  businessId,
  leadId,
  sessionId,
  apiBaseUrl = 'http://localhost:3001',
  isOpen = false,
  onToggle,
  onEditItem,
  onRemoveItem,
  onRequestQuote
}) => {
  const [cartItems, setCartItems] = useState([]);
  const [totalEstimate, setTotalEstimate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Real-time cart synchronization
  useEffect(() => {
    if (sessionId) {
      loadCartItems();

      // Set up polling for real-time updates (every 5 seconds)
      const pollInterval = setInterval(loadCartItems, 5000);

      return () => clearInterval(pollInterval);
    }
  }, [sessionId, businessId]);

  const loadCartItems = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/cart/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load cart items');
      }

      const data = await response.json();
      setCartItems(data.cartItems || []);
      setTotalEstimate(data.totalEstimate || 0);
      setError(null);
    } catch (err) {
      console.error('Error loading cart:', err);
      setError('Failed to load cart items');
    }
  };

  const handleEditItem = async (item, itemIndex) => {
    if (onEditItem) {
      onEditItem(item);
    } else {
      // Default edit behavior - trigger chat with edit intent
      const editMessage = `I want to edit the ${item.serviceName} service in my cart`;
      // This would typically send a message to the chat system
      console.log('Edit item:', editMessage);
    }
  };

  const handleRemoveItem = async (itemIndex) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/cart/item/${sessionId}/${itemIndex}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      // Reload cart after successful removal
      await loadCartItems();

      if (onRemoveItem) {
        onRemoveItem(itemIndex);
      }
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item');
    } finally {
      setLoading(false);
    }
  };

  const showConfirmation = (action, data) => {
    setConfirmAction({ action, data });
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (confirmAction?.action === 'remove') {
      await handleRemoveItem(confirmAction.data);
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Price on request';
    return `$${price.toLocaleString()}`;
  };

  const formatDetails = (details) => {
    if (!details) return '';

    const parts = [];

    // Extract meaningful details from collected details
    Object.entries(details).forEach(([key, valueObj]) => {
      if (valueObj && valueObj.value && key !== 'address') {
        const value = valueObj.value;
        switch (key) {
          case 'square_footage':
            parts.push(`${value} sq ft`);
            break;
          case 'urgency':
            if (value.toLowerCase().includes('emergency')) {
              parts.push('Emergency');
            }
            break;
          case 'frequency':
            if (value !== 'one-time') {
              parts.push(value);
            }
            break;
          case 'quantity':
            if (value !== '1') {
              parts.push(`Qty: ${value}`);
            }
            break;
          default:
            if (value.length < 30) {
              parts.push(value);
            }
        }
      }
    });

    return parts.join(' • ');
  };

  const cartItemCount = cartItems.length;

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay for mobile */}
      <div className="service-cart-overlay" onClick={onToggle} />

      {/* Main Cart Container */}
      <div className={`service-cart ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="service-cart-header">
          <div className="service-cart-title">
            <ShoppingCart size={20} />
            <span>Service Cart</span>
            {cartItemCount > 0 && (
              <span className="service-cart-badge">{cartItemCount}</span>
            )}
          </div>

          <div className="service-cart-controls">
            <button
              className="service-cart-collapse"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand cart' : 'Collapse cart'}
            >
              {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <button
              className="service-cart-close"
              onClick={onToggle}
              aria-label="Close cart"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="service-cart-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        {!isCollapsed && (
          <div className="service-cart-content">
            {cartItemCount === 0 ? (
              <div className="service-cart-empty">
                <ShoppingCart size={48} />
                <h3>Your cart is empty</h3>
                <p>Add services through our chat to get started with your quote.</p>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="service-cart-items">
                  {cartItems.map((item, index) => (
                    <div key={item.serviceId || index} className="service-cart-item">
                      <div className="service-cart-item-header">
                        <h4 className="service-cart-item-name">{item.serviceName}</h4>
                        <div className="service-cart-item-actions">
                          <button
                            className="service-cart-edit-btn"
                            onClick={() => handleEditItem(item, index)}
                            disabled={loading}
                            title="Edit service details"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="service-cart-remove-btn"
                            onClick={() => showConfirmation('remove', index)}
                            disabled={loading}
                            title="Remove from cart"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Service Details */}
                      {formatDetails(item.collectedDetails) && (
                        <div className="service-cart-item-details">
                          {formatDetails(item.collectedDetails)}
                        </div>
                      )}

                      {/* Custom Requirements */}
                      {item.collectedDetails?.custom_requirements?.value && (
                        <div className="service-cart-item-notes">
                          <strong>Notes:</strong> {item.collectedDetails.custom_requirements.value}
                        </div>
                      )}

                      {/* Price and Date */}
                      <div className="service-cart-item-footer">
                        <span className="service-cart-item-price">
                          {formatPrice(item.estimatedPrice)}
                        </span>
                        {item.addedAt && (
                          <span className="service-cart-item-date">
                            Added {new Date(item.addedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Section */}
                {totalEstimate > 0 && (
                  <div className="service-cart-total">
                    <div className="service-cart-total-row">
                      <span>Estimated Total:</span>
                      <span className="service-cart-total-amount">
                        {formatPrice(totalEstimate)}
                      </span>
                    </div>
                    <div className="service-cart-total-note">
                      *Final pricing may vary based on site evaluation
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {!isCollapsed && cartItemCount > 0 && (
          <div className="service-cart-footer">
            <button
              className="service-cart-quote-btn"
              onClick={onRequestQuote}
              disabled={loading}
            >
              Get Quote for {cartItemCount} Service{cartItemCount !== 1 ? 's' : ''}
            </button>
            <div className="service-cart-footer-note">
              We'll provide a detailed estimate within 24 hours
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="service-cart-loading">
            <div className="service-cart-spinner"></div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="service-cart-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="service-cart-modal" onClick={e => e.stopPropagation()}>
            <div className="service-cart-modal-header">
              <h3>Confirm Action</h3>
              <button
                className="service-cart-modal-close"
                onClick={() => setShowConfirmModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="service-cart-modal-content">
              {confirmAction?.action === 'remove' && (
                <>
                  <p>Are you sure you want to remove this service from your cart?</p>
                  <p className="service-cart-modal-warning">
                    <AlertTriangle size={16} />
                    This action cannot be undone.
                  </p>
                </>
              )}
            </div>

            <div className="service-cart-modal-actions">
              <button
                className="service-cart-modal-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="service-cart-modal-confirm"
                onClick={handleConfirmAction}
              >
                {confirmAction?.action === 'remove' ? 'Remove' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceCart;