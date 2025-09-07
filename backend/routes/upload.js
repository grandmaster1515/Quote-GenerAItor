const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

// Configure multer with options
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: fileFilter
});

// POST /upload - Handle photo uploads
router.post('/', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No photo file uploaded' 
      });
    }

    const businessId = req.body.businessId;
    if (!businessId) {
      return res.status(400).json({ 
        error: 'Business ID is required' 
      });
    }

    // Generate public URL for the uploaded file
    const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    // Log the upload (in production, save to database)
    console.log(`Photo uploaded for business ${businessId}:`, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      photoUrl,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      photoUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload photo',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /upload/health - Health check for upload service
router.get('/health', (req, res) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const uploadsExist = fs.existsSync(uploadsDir);
  
  res.json({
    status: 'OK',
    service: 'Upload Service',
    uploadsDirectory: uploadsExist ? 'exists' : 'missing',
    maxFileSize: '5MB',
    allowedTypes: ['JPEG', 'PNG', 'GIF', 'WebP'],
    timestamp: new Date().toISOString()
  });
});

// DELETE /upload/:filename - Delete uploaded file (for cleanup)
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Security check - ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ 
        error: 'Invalid filename' 
      });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'File not found' 
      });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      filename
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
