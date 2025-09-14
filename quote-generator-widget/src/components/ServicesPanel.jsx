import React from 'react';
import { X, Edit3, Trash2, FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';
import '../styles/ServicesPanel.css';

const ServicesPanel = ({ 
  isOpen, 
  onClose, 
  serviceItems = [], 
  onRemoveItem, 
  onEditItem, 
  onRequestQuote, 
  totalEstimate = 0 
}) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatServiceDetails = (service) => {
    const details = [];
    if (service.details?.quantity && service.details.quantity > 1) {
      details.push(`Qty: ${service.details.quantity}`);
    }
    if (service.details?.measurement) {
      details.push(service.details.measurement);
    }
    if (service.details?.urgency && service.details.urgency !== 'normal') {
      details.push(`${service.details.urgency} priority`);
    }
    return details.join(' • ');
  };

  return (
    <>
      {isOpen && <div className="services-overlay" onClick={onClose} />}
      <div className={`services-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="services-header">
          <div className="services-title">
            <CheckCircle size={20} className="services-title-icon" />
            <h2>Selected Services</h2>
            {serviceItems.length > 0 && (
              <span className="services-count-badge">{serviceItems.length}</span>
            )}
          </div>
          <button 
            className="services-close-button"
            onClick={onClose}
            aria-label="Close services panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="services-content">
          {serviceItems.length === 0 ? (
            <div className="services-empty">
              <div className="services-empty-icon">
                <FileText size={48} />
              </div>
              <h3>No Services Selected</h3>
              <p>Continue chatting to add services to your quote request.</p>
            </div>
          ) : (
            <div className="services-list">
              {serviceItems.map((item, index) => (
                <div key={item.id || index} className="service-item">
                  <div className="service-item-header">
                    <div className="service-item-title">
                      <CheckCircle size={16} className="service-item-check" />
                      <h4>{item.serviceName}</h4>
                    </div>
                    <div className="service-item-actions">
                      <button
                        className="service-action-button edit"
                        onClick={() => onEditItem(item)}
                        aria-label="Edit service"
                        title="Edit service details"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="service-action-button remove"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label="Remove service"
                        title="Remove from services"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {formatServiceDetails(item) && (
                    <div className="service-item-details">
                      <Clock size={12} />
                      <span>{formatServiceDetails(item)}</span>
                    </div>
                  )}
                  
                  {item.details?.specifications && (
                    <div className="service-item-specs">
                      {item.details.specifications}
                    </div>
                  )}
                  
                  <div className="service-item-price">
                    <DollarSign size={14} />
                    <span className="service-price">
                      {formatPrice(item.estimatedPrice)} estimate
                    </span>
                    <span className="service-confidence">
                      {Math.round(item.aiConfidenceScore * 100)}% confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {serviceItems.length > 0 && (
          <div className="services-footer">
            <div className="services-total">
              <div className="services-total-label">
                <span>Total Estimate</span>
                <small>{serviceItems.length} service{serviceItems.length !== 1 ? 's' : ''}</small>
              </div>
              <div className="services-total-amount">
                {formatPrice(totalEstimate)}
              </div>
            </div>
            
            <button 
              className="services-quote-button"
              onClick={onRequestQuote}
              aria-label="Request detailed quote"
            >
              <FileText size={18} />
              <span>Request Detailed Quote</span>
            </button>
            
            <div className="services-footer-note">
              <p>Prices are estimates. Final quote may vary based on site conditions and requirements.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ServicesPanel;