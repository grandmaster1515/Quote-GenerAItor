import React, { useState, useEffect } from 'react';
import { Plus, X, Edit3 } from 'lucide-react';
import '../styles/AddToCartPopup.css';

const AddToCartPopup = ({
  isOpen,
  onClose,
  onAddToCart,
  serviceData = {},
  onCancel
}) => {
  const [formData, setFormData] = useState({
    serviceName: '',
    quantity: 1,
    measurement: '',
    frequency: 'one-time',
    specifications: [],
    customRequirements: '',
    urgency: 'normal',
    estimatedPrice: null
  });

  const [isModified, setIsModified] = useState(false);

  // Populate form with serviceData when popup opens
  useEffect(() => {
    if (isOpen && serviceData) {
      setFormData({
        serviceName: serviceData.service || '',
        quantity: serviceData.details?.quantity || 1,
        measurement: serviceData.details?.measurement || '',
        frequency: serviceData.details?.frequency || 'one-time',
        specifications: serviceData.details?.specifications || [],
        customRequirements: serviceData.details?.customRequirements || '',
        urgency: serviceData.details?.urgency || 'normal',
        estimatedPrice: serviceData.estimatedPrice || null
      });
      setIsModified(false);
    }
  }, [isOpen, serviceData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsModified(true);
  };

  const handleSpecificationToggle = (spec) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.includes(spec)
        ? prev.specifications.filter(s => s !== spec)
        : [...prev.specifications, spec]
    }));
    setIsModified(true);
  };

  const handleAddToCart = () => {
    const cartItem = {
      serviceName: formData.serviceName,
      serviceType: serviceData.serviceType || 'general',
      details: {
        quantity: formData.quantity,
        measurement: formData.measurement,
        frequency: formData.frequency,
        specifications: formData.specifications,
        customRequirements: formData.customRequirements,
        urgency: formData.urgency
      },
      estimatedPrice: formData.estimatedPrice,
      aiConfidenceScore: serviceData.confidenceScore || 0.8
    };

    onAddToCart(cartItem);
    onClose();
  };

  const frequencyOptions = [
    { value: 'one-time', label: 'One-time service' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' }
  ];

  const urgencyOptions = [
    { value: 'low', label: 'No rush' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Urgent' },
    { value: 'emergency', label: 'Emergency' }
  ];

  // Service-specific specification options
  const getSpecificationOptions = () => {
    const serviceType = serviceData.serviceType || 'general';
    
    const specs = {
      'window-cleaning': ['Interior only', 'Exterior only', 'Both sides', 'Screen cleaning', 'Sill cleaning'],
      'lawn-care': ['Mowing', 'Edging', 'Trimming', 'Leaf removal', 'Fertilizing'],
      'hvac': ['Inspection', 'Cleaning', 'Filter replacement', 'Emergency repair', 'Maintenance'],
      'plumbing': ['Inspection', 'Repair', 'Installation', 'Emergency service', 'Maintenance'],
      'general': ['Standard service', 'Premium service', 'Basic package', 'Comprehensive package']
    };

    return specs[serviceType] || specs.general;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="cart-popup-overlay" onClick={onClose} />
      
      {/* Popup */}
      <div className="cart-popup">
        <div className="cart-popup-header">
          <h3>Add to Service Needs</h3>
          <button 
            className="cart-popup-close"
            onClick={onClose}
            aria-label="Close popup"
          >
            <X size={20} />
          </button>
        </div>

        <div className="cart-popup-content">
          {/* Service Name */}
          <div className="cart-popup-field">
            <label htmlFor="serviceName">Service Name *</label>
            <div className="cart-popup-input-group">
              <input
                id="serviceName"
                type="text"
                value={formData.serviceName}
                onChange={(e) => handleInputChange('serviceName', e.target.value)}
                placeholder="e.g., Lawn Mowing"
                required
              />
              <button 
                className="cart-popup-edit-btn"
                onClick={() => document.getElementById('serviceName').focus()}
                aria-label="Edit service name"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>

          {/* Quantity & Measurement */}
          <div className="cart-popup-row">
            <div className="cart-popup-field cart-popup-field-half">
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="cart-popup-field cart-popup-field-half">
              <label htmlFor="measurement">Measurement</label>
              <input
                id="measurement"
                type="text"
                value={formData.measurement}
                onChange={(e) => handleInputChange('measurement', e.target.value)}
                placeholder="e.g., 3000 sqft, 20 windows"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="cart-popup-field">
            <label htmlFor="frequency">Service Frequency</label>
            <select
              id="frequency"
              value={formData.frequency}
              onChange={(e) => handleInputChange('frequency', e.target.value)}
            >
              {frequencyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Specifications */}
          <div className="cart-popup-field">
            <label>Service Specifications</label>
            <div className="cart-popup-specs">
              {getSpecificationOptions().map(spec => (
                <label key={spec} className="cart-popup-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.specifications.includes(spec)}
                    onChange={() => handleSpecificationToggle(spec)}
                  />
                  <span>{spec}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div className="cart-popup-field">
            <label htmlFor="urgency">Priority</label>
            <select
              id="urgency"
              value={formData.urgency}
              onChange={(e) => handleInputChange('urgency', e.target.value)}
            >
              {urgencyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Requirements */}
          <div className="cart-popup-field">
            <label htmlFor="customRequirements">Additional Notes</label>
            <textarea
              id="customRequirements"
              value={formData.customRequirements}
              onChange={(e) => handleInputChange('customRequirements', e.target.value)}
              placeholder="Any special requirements, preferences, or additional details..."
              rows="3"
            />
          </div>

          {/* Estimated Price Display */}
          {formData.estimatedPrice && (
            <div className="cart-popup-price">
              <span>Estimated Price: <strong>${formData.estimatedPrice.toLocaleString()}</strong></span>
              <small>*Final price may vary based on actual requirements</small>
            </div>
          )}
        </div>

        <div className="cart-popup-footer">
          <button 
            className="cart-popup-cancel"
            onClick={onCancel || onClose}
          >
            Cancel
          </button>
          <button 
            className="cart-popup-add"
            onClick={handleAddToCart}
            disabled={!formData.serviceName.trim()}
          >
            <Plus size={16} />
            Add to Service Needs
          </button>
        </div>
      </div>
    </>
  );
};

export default AddToCartPopup;