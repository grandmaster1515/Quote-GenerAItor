import React from 'react';
import '../styles/OptionBubbles.css';

const OptionBubbles = ({ options, onOptionSelect, disabled = false }) => {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="option-bubbles-container">
      {options.map((option, index) => (
        <button
          key={option.id || index}
          className={`option-bubble ${option.selected ? 'selected' : ''}`}
          onClick={() => !disabled && onOptionSelect(option)}
          disabled={disabled}
          aria-label={`Select option: ${option.text}`}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
};

export default OptionBubbles;