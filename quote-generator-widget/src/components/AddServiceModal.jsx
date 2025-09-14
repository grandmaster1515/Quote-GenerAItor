import React, { useState, useEffect } from 'react';
import { X, Plus, CheckCircle, AlertCircle, DollarSign, Clock, Hash } from 'lucide-react';
import '../styles/AddServiceModal.css';

const AddServiceModal = ({ 
  isOpen, 
  onClose, 
  onAddService, 
  serviceData, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    serviceName: '',
    serviceType: '',
    quantity: 1,
    measurement: '',
    urgency: 'normal',
    frequency: 'one-time',
    specifications: '',
    customRequirements: '',
    estimatedPrice: 0
  });

  // Initialize form with service data when modal opens
  useEffect(() => {
    if (isOpen && serviceData) {
      setFormData({
        serviceName: serviceData.service || '',
        serviceType: serviceData.serviceType || '',
        quantity: serviceData.details?.quantity || 1,
        measurement: serviceData.details?.measurement || '',
        urgency: serviceData.details?.urgency || 'normal',
        frequency: serviceData.details?.frequency || 'one-time',
        specifications: serviceData.details?.specifications || '',
        customRequirements: serviceData.details?.customRequirements || '',
        estimatedPrice: serviceData.estimatedPrice || 0
      });
    }
  }, [isOpen, serviceData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.serviceName.trim()) return;

    const serviceItem = {
      id: Date.now().toString(),
      serviceName: formData.serviceName,
      serviceType: formData.serviceType,
      details: {
        quantity: formData.quantity,
        measurement: formData.measurement,
        urgency: formData.urgency,
        frequency: formData.frequency,
        specifications: formData.specifications,
        customRequirements: formData.customRequirements
      },
      estimatedPrice: formData.estimatedPrice,
      aiConfidenceScore: serviceData?.confidenceScore || 0.8,
      addedAt: new Date().toISOString()
    };

    onAddService(serviceItem);
    setFormData({
      serviceName: '',
      serviceType: '',
      quantity: 1,
      measurement: '',
      urgency: 'normal',
      frequency: 'one-time',
      specifications: '',
      customRequirements: '',
      estimatedPrice: 0
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="add-service-overlay">
      <div className="add-service-modal">
        <div className="add-service-header">
          <div className="add-service-title">
            <Plus size={20} className="add-service-icon" />
            <h3>Add Service to Your Request</h3>
          </div>
          <button 
            className="add-service-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-service-form">
          <div className="add-service-content">
            {/* Service Name */}
            <div className="form-group">
              <label htmlFor="serviceName" className="form-label">
                <CheckCircle size={16} />
                Service Name *
              </label>
              <input
                type="text"
                id="serviceName"
                className="form-input"
                value={formData.serviceName}
                onChange={(e) => handleInputChange('serviceName', e.target.value)}
                placeholder="e.g., Window Cleaning, Lawn Mowing"
                required
              />
            </div>

            {/* Quantity & Measurement */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity" className="form-label">
                  <Hash size={16} />
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  className="form-input"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                  min="1"
                  placeholder="1"
                />
              </div>
              <div className="form-group">
                <label htmlFor="measurement" className="form-label">
                  Unit/Measurement
                </label>
                <input
                  type="text"
                  id="measurement"
                  className="form-input"
                  value={formData.measurement}
                  onChange={(e) => handleInputChange('measurement', e.target.value)}
                  placeholder="e.g., windows, sq ft, hours"
                />
              </div>
            </div>

            {/* Urgency & Frequency */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="urgency" className="form-label">
                  <AlertCircle size={16} />
                  Priority
                </label>
                <select
                  id="urgency"
                  className="form-select"
                  value={formData.urgency}
                  onChange={(e) => handleInputChange('urgency', e.target.value)}
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="frequency" className="form-label">
                  <Clock size={16} />
                  Frequency
                </label>
                <select
                  id="frequency"
                  className="form-select"
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                >
                  <option value="one-time">One Time</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>

            {/* Specifications */}
            <div className="form-group">
              <label htmlFor="specifications" className="form-label">
                Service Specifications
              </label>
              <textarea
                id="specifications"
                className="form-textarea"
                value={formData.specifications}
                onChange={(e) => handleInputChange('specifications', e.target.value)}
                placeholder="Any specific requirements or details..."
                rows="3"
              />
            </div>

            {/* Estimated Price */}
            <div className="form-group">
              <label htmlFor="estimatedPrice" className="form-label">
                <DollarSign size={16} />
                Estimated Price
              </label>
              <div className="price-input-wrapper">
                <span className="price-currency">$</span>
                <input
                  type="number"
                  id="estimatedPrice"
                  className="form-input price-input"
                  value={formData.estimatedPrice}
                  onChange={(e) => handleInputChange('estimatedPrice', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="1"
                  placeholder="0"
                />
              </div>
              <small className="form-help">
                This is an estimate. Final pricing will be determined during consultation.
              </small>
            </div>

            {/* Price Preview */}
            {formData.estimatedPrice > 0 && (
              <div className="price-preview">
                <div className="price-preview-content">
                  <span className="price-preview-label">Estimated Total:</span>
                  <span className="price-preview-amount">
                    {formatPrice(formData.estimatedPrice * formData.quantity)}
                  </span>
                </div>
                {formData.frequency !== 'one-time' && (
                  <small className="price-preview-note">
                    Per {formData.frequency.replace('-', ' ')} service
                  </small>
                )}
              </div>
            )}
          </div>

          <div className="add-service-footer">
            <button 
              type="button" 
              className="cancel-button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="add-service-button"
              disabled={!formData.serviceName.trim()}
            >
              <Plus size={16} />
              Add Service
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddServiceModal;