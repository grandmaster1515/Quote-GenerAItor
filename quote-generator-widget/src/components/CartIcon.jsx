import React from 'react';
import { ShoppingCart } from 'lucide-react';
import '../styles/CartIcon.css';

const CartIcon = ({ itemCount = 0, onClick, isExpanded = false }) => {
  return (
    <div className={`cart-icon-container ${isExpanded ? 'expanded' : ''}`}>
      <button 
        className="cart-icon-button"
        onClick={onClick}
        aria-label={`Service cart with ${itemCount} items`}
        title={`Service cart (${itemCount} items)`}
      >
        <ShoppingCart size={24} />
        {itemCount > 0 && (
          <span className="cart-badge" aria-label={`${itemCount} items in cart`}>
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default CartIcon;