import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import '../styles/PhotoUpload.css';

const PhotoUpload = ({ onUpload, disabled }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    onUpload(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
    // Reset input value to allow same file selection
    e.target.value = '';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className="photo-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {preview ? (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="preview-image" />
          <button
            onClick={clearPreview}
            className="clear-preview"
            aria-label="Remove preview"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <div className="upload-content">
            <div className="upload-icon">
              <Camera size={20} />
            </div>
            <span className="upload-text">Add Photo</span>
          </div>
        </div>
      )}

      <div className="upload-hint">
        <Upload size={12} />
        <span>Drag & drop or click to upload</span>
      </div>
    </div>
  );
};

export default PhotoUpload;
