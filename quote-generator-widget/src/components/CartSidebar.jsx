import React from 'react';
import { X, Trash2, Edit3, ShoppingCart } from 'lucide-react';
import '../styles/CartSidebar.css';

const CartSidebar = ({ 
  isOpen, 
  onClose, 
  cartItems = [], 
  onRemoveItem, 
  onEditItem, 
  onRequestQuote,
  totalEstimate = 0 
}) => {
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Price on request';
    return `$${price.toLocaleString()}`;
  };

  const formatDetails = (details) => {
    const parts = [];
    if (details.quantity && details.quantity !== 1) {
      parts.push(`Qty: ${details.quantity}`);
    }
    if (details.measurement) {
      parts.push(details.measurement);
    }
    if (details.frequency && details.frequency !== 'one-time') {
      parts.push(`${details.frequency}`);
    }
    return parts.join(' • ');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="cart-overlay" onClick={onClose} />}
      
      {/* Sidebar */}
      <div className={`cart-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="cart-header">
          <div className="cart-title">
            <ShoppingCart size={20} />
            <span>Service Needs</span>
            {cartItems.length > 0 && (
              <span className="cart-count">({cartItems.length})</span>
            )}
          </div>
          <button 
            className="cart-close-btn"
            onClick={onClose}
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="cart-content">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <ShoppingCart size={48} className="cart-empty-icon" />
              <h3>Your service cart is empty</h3>
              <p>Add services from our chat to get started with your quote request.</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-content">
                      <div className="cart-item-header">
                        <h4 className="cart-item-name">{item.serviceName}</h4>
                        <div className="cart-item-actions">
                          <button
                            className="cart-item-edit"
                            onClick={() => onEditItem(item)}
                            aria-label="Edit item"
                            title="Edit item"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="cart-item-remove"
                            onClick={() => onRemoveItem(item.id)}
                            aria-label="Remove item"
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {formatDetails(item.details) && (
                        <div className="cart-item-details">
                          {formatDetails(item.details)}
                        </div>
                      )}
                      
                      {item.details.customRequirements && (
                        <div className="cart-item-notes">
                          <strong>Notes:</strong> {item.details.customRequirements}
                        </div>
                      )}
                      
                      <div className="cart-item-footer">
                        <span className="cart-item-price">
                          {formatPrice(item.estimatedPrice)}
                        </span>
                        <span className="cart-item-added">
                          Added {new Date(item.addedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Section */}
              {totalEstimate > 0 && (
                <div className="cart-total">
                  <div className="cart-total-row">
                    <span>Estimated Total:</span>
                    <span className="cart-total-amount">{formatPrice(totalEstimate)}</span>
                  </div>
                  <div className="cart-total-note">
                    *Final pricing may vary based on actual requirements
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <button 
              className="cart-quote-btn"
              onClick={onRequestQuote}
            >
              Request Quote for {cartItems.length} Service{cartItems.length !== 1 ? 's' : ''}
            </button>
            <div className="cart-footer-note">
              We'll review your needs and provide a detailed quote
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;