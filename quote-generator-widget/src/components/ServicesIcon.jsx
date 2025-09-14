import React from 'react';
import { Briefcase, CheckCircle } from 'lucide-react';
import '../styles/ServicesIcon.css';

const ServicesIcon = ({ itemCount = 0, onClick, isExpanded = false }) => {
  return (
    <div className={`services-icon-container ${isExpanded ? 'expanded' : ''}`}>
      <button 
        className="services-icon-button"
        onClick={onClick}
        aria-label={`Selected services (${itemCount} items)`}
        title={`View selected services (${itemCount} items)`}
      >
        <div className="services-icon-content">
          <Briefcase size={20} />
          <span className="services-label">Services</span>
        </div>
        {itemCount > 0 && (
          <div className="services-badge">
            <CheckCircle size={14} className="services-check-icon" />
            <span className="services-count">{itemCount > 99 ? '99+' : itemCount}</span>
          </div>
        )}
      </button>
    </div>
  );
};

export default ServicesIcon;