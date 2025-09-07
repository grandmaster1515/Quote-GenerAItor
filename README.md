# Quote GenerAItor 🤖💬

A complete AI-powered chat widget solution for home improvement businesses, featuring lead capture, photo uploads, and intelligent Q&A using RAG (Retrieval-Augmented Generation) with LangChain and PostgreSQL.

## 🌟 Features

- **React-based Chat Widget** - Embeddable via simple script tag
- **AI-Powered Responses** - RAG pipeline with LangChain and pgvector
- **Lead Capture** - Intelligent form with project details
- **Photo Upload** - Customer project photos with cloud storage
- **Multi-Business Support** - Isolated data per business
- **Mobile Responsive** - Works on all devices
- **Easy Integration** - Drop-in script for any website

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chat Widget   │◄──►│  Backend API    │◄──►│   PostgreSQL    │
│   (React/JS)    │    │ (Node.js/Express)│    │  + pgvector     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Site   │    │   LangChain     │    │   Embeddings    │
│   (Any HTML)    │    │   RAG Pipeline  │    │ (Sentence-BERT) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd Quote-GenerAItor
```

### 2. Set Up Database
```bash
# Install PostgreSQL and pgvector extension
# See database/setup.md for detailed instructions

# Create database and run schema
createdb quote_generator
psql -d quote_generator -f database/schema.sql
psql -d quote_generator -f database/sample_data.sql
```

### 3. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 4. Build Widget
```bash
cd quote-generator-widget
npm install
npm run build
```

### 5. Test Integration
Open `quote-generator-widget/client-demo.html` in your browser to see the widget in action.

## 📦 Project Structure

```
Quote-GenerAItor/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database configuration
│   ├── routes/             # API endpoints
│   ├── services/           # RAG and business logic
│   └── scripts/            # Utility scripts
├── database/               # PostgreSQL schema and setup
│   ├── schema.sql         # Database tables
│   ├── sample_data.sql    # Test data
│   └── setup.md           # Setup instructions
├── quote-generator-widget/ # React chat widget
│   ├── src/               # Widget source code
│   ├── dist/              # Built widget files
│   └── embed-examples.html # Integration examples
└── development_instructions.md # Original requirements
```

## 🔧 Configuration

### Environment Variables (Backend)
Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quote_generator
DB_USER=postgres
DB_PASSWORD=password
OPENAI_API_KEY=your-openai-key  # Optional
```

### Widget Integration
Basic embedding:
```html
<script 
    src="https://your-cdn.com/quote-generator-chat.js"
    data-business-id="your-business-id"
    data-api-base-url="https://your-api.com">
</script>
```

Advanced configuration:
```javascript
QuoteGeneratorChat.init({
  businessId: 'your-business-id',
  apiBaseUrl: 'https://your-api.com',
  position: 'bottom-right',
  theme: 'default'
});
```

## 🤖 RAG System

The system uses Retrieval-Augmented Generation to provide intelligent responses:

1. **Embeddings**: Sentence-BERT generates vectors for business context
2. **Vector Search**: pgvector finds similar content using cosine similarity
3. **Response Generation**: LangChain + OpenAI/local LLM generates contextual responses
4. **Fallback**: Keyword-based search if vector search fails

### Adding Business Context
```bash
# Via API
curl -X POST http://localhost:3001/chat/context \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "your-business-id",
    "question": "What are your hours?",
    "answer": "We are open Monday-Friday 8AM-6PM",
    "contentType": "hours",
    "keywords": ["hours", "open", "schedule"]
  }'

# Generate embeddings
cd backend
npm run generate-embeddings
```

## 📱 Widget Features

### Chat Interface
- Floating bubble or embedded container
- Message history with timestamps
- Typing indicators and loading states
- Mobile-responsive design

### Lead Capture
- Smart form triggering based on conversation
- Project type and budget selection
- Contact information validation
- Conversation context included

### Photo Upload
- Drag & drop or file picker
- Image validation and compression
- Cloud storage integration
- Preview before sending

## 🔌 API Endpoints

### Chat
- `POST /chat` - Send message and get AI response
- `POST /chat/context` - Add business knowledge
- `GET /chat/health` - Service health check

### Leads
- `POST /lead` - Save lead information
- `GET /lead` - Get leads for business
- `PATCH /lead/:id` - Update lead status

### Upload
- `POST /upload` - Upload project photos
- `DELETE /upload/:filename` - Remove uploaded file

## 🎨 Customization

### Themes
The widget supports custom themes through CSS variables:
```css
.quote-chat-theme-custom {
  --primary-color: #your-color;
  --text-color: #your-text;
  --background-color: #your-bg;
}
```

### Positioning
- `bottom-right` (default)
- `bottom-left`
- `top-right`
- `top-left`
- Custom container via `containerId`

## 🚀 Deployment

### Widget (CDN)
1. Build widget: `npm run build`
2. Upload `dist/` files to CDN
3. Update client script src URLs

### Backend (Production)
1. Set up PostgreSQL with pgvector
2. Configure environment variables
3. Deploy to cloud provider (AWS, GCP, etc.)
4. Set up CORS for client domains

### Database
- Use managed PostgreSQL service
- Enable pgvector extension
- Set up backups and monitoring
- Configure connection pooling

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Widget
```bash
cd quote-generator-widget
npm run dev  # Development server
npm run build  # Production build
```

### Integration Testing
1. Start backend server
2. Open `embed-examples.html`
3. Test all widget features
4. Verify API responses

## 📊 Monitoring

### Health Checks
- `GET /health` - Overall system health
- `GET /chat/health` - Chat service status
- `GET /upload/health` - Upload service status

### Logging
- Structured logging with timestamps
- Chat interactions and lead captures
- Error tracking and debugging
- Performance metrics

## 🔒 Security

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- File upload restrictions
- CORS configuration

### Privacy
- No data shared between businesses
- Optional lead data collection
- Secure file storage
- GDPR compliance ready

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

### Common Issues
- **Widget not loading**: Check script URL and CORS settings
- **API errors**: Verify backend is running and accessible
- **Database issues**: Check PostgreSQL and pgvector setup
- **Mobile problems**: Test responsive design on actual devices

### Getting Help
- Check `embed-examples.html` for integration help
- Review `database/setup.md` for database issues
- Enable debug mode: `localStorage.setItem('quote-chat-debug', 'true')`

## 🎯 Roadmap

- [ ] Multiple LLM providers support
- [ ] Advanced analytics dashboard
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] Multi-language support
- [ ] Voice message support
- [ ] Advanced theming system
- [ ] A/B testing framework
- [ ] Real-time notifications

---

Built with ❤️ for home improvement businesses
