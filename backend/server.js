const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import route handlers
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const leadRoutes = require('./routes/lead');
const servicesRoutes = require('./routes/services');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  process.env.DASHBOARD_URL,
  process.env.WIDGET_URL
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, allow any localhost origin
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist (only in non-serverless environments)
const uploadsDir = path.join(__dirname, 'uploads');
if (process.env.NODE_ENV !== 'production' && !fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (error) {
    console.warn('Could not create uploads directory:', error.message);
  }
}

// Serve static files from uploads directory (only if directory exists)
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Quote GenerAItor Backend',
    openaiConfigured: !!process.env.OPENAI_API_KEY // Check if OpenAI is configured
  });
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/lead', leadRoutes);
app.use('/api/services', servicesRoutes);

// For backward compatibility with frontend expecting routes without /api prefix
app.use('/chat', chatRoutes);
app.use('/upload', uploadRoutes);
app.use('/lead', leadRoutes);
app.use('/services', servicesRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 5MB.' 
      });
    }
    return res.status(400).json({ 
      error: 'File upload error: ' + error.message 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Quote GenerAItor Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Chat API: http://localhost:${PORT}/chat`);
  console.log(`📁 Upload API: http://localhost:${PORT}/upload`);
  console.log(`👤 Lead API: http://localhost:${PORT}/lead`);
  console.log(`🔑 OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;