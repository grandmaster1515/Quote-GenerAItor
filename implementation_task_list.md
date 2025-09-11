# Quote GenerAItor New Features Implementation Task List

## Feature 1: Configurable Decision Tree UX Implementation

### 1.1 Frontend Chat Interface Components
- [x] **Interactive Message Bubbles Component**
  - [x] Create clickable option bubbles component
  - [x] Implement visual specifications (rounded corners, shadows, brand colors)
  - [x] Add hover states (1.05x scale, darker border)
  - [x] Add selected states (primary color fill, white text)
  - [x] Implement responsive design (80% width mobile, auto-fit desktop)
  - [x] Add smooth animations for appear/disappear
  - [x] Support both bubble clicks AND free text input
  - [x] Add proper spacing (8px between bubbles, 16px from messages)

### 1.2 Decision Tree Structure Implementation
- [x] **Path 1: Get an Estimate Flow**
  - [x] Implement root → "Get an estimate" trigger
  - [x] Add AI response for estimate request
  - [x] Create free text input handler for service description
  - [x] Implement AI analysis and service suggestion logic
  - [x] Add confirmation bubbles (Yes/No)
  - [x] Create "add to cart" functionality
  - [x] Implement timeline selection bubbles (ASAP/Week/Month/Flexible)
  - [x] Add contact information collection flow
  - [x] Create quote request generation

- [x] **Path 2: Our Services Flow**
  - [x] Implement root → "Our services" trigger
  - [x] Create dynamic service bubbles from business configuration
  - [x] Add service selection handler
  - [x] Display pre-configured service descriptions
  - [x] Implement service action bubbles (Yes/No/Tell me more)
  - [x] Create service-specific details collection
  - [x] Add to service needs cart functionality

- [x] **Path 3: FAQ Flow**
  - [x] Implement root → "FAQ" trigger
  - [x] Create dynamic FAQ bubbles from business configuration
  - [x] Add FAQ selection handler
  - [x] Display pre-configured answers
  - [x] Implement follow-up action bubbles
  - [x] Create navigation back to main menu

### 1.3 Backend Configuration System
- [ ] **Database Schema Updates**
  - [ ] Create decision_tree_config table
  - [ ] Create services table with full schema
  - [ ] Create faqs table with categorization
  - [ ] Add business_id foreign key relationships
  - [ ] Create indexes for performance

- [ ] **API Endpoints**
  - [ ] GET /api/decision-tree/config/:businessId
  - [ ] POST/PUT /api/decision-tree/config/:businessId
  - [ ] GET /api/services/:businessId
  - [ ] POST/PUT/DELETE /api/services/:businessId/:serviceId
  - [ ] GET /api/faqs/:businessId
  - [ ] POST/PUT/DELETE /api/faqs/:businessId/:faqId

- [ ] **Dashboard Configuration Interface**
  - [ ] Create services management page
    - [ ] Add/Edit/Delete services form
    - [ ] Rich text editor for descriptions
    - [ ] Service-specific questions configuration
    - [ ] Keywords/triggers management
  - [ ] Create FAQ management page
    - [ ] Add/Edit/Delete FAQ items
    - [ ] Category grouping interface
    - [ ] Order/priority settings
  - [ ] Create decision tree customization page
    - [ ] Welcome message editor
    - [ ] Main option bubble text customization
    - [ ] Follow-up message configuration
    - [ ] Data collection fields setup

### 1.4 State Management
- [x] **Decision Tree State Management**
  - [x] Implement current position tracking
  - [x] Create user selection history
  - [x] Add back navigation functionality
  - [x] Implement session persistence (localStorage)
  - [x] Integrate with existing RAG system
  - [x] Add state reset functionality

## Feature 2: Service Needs Cart Implementation

### 2.1 Cart UI Components
- [ ] **Cart Display Widget**
  - [ ] Create floating cart icon with badge
  - [ ] Implement item count badge styling
  - [ ] Create expandable cart sidebar (desktop)
  - [ ] Create full-screen modal (mobile)
  - [ ] Add service list display with details
  - [ ] Implement edit/remove capabilities
  - [ ] Add running total calculation
  - [ ] Create "Request Quote" CTA button

- [ ] **Visual Specifications**
  - [ ] Fixed bottom-right positioning
  - [ ] Red notification badge with white text
  - [ ] Slide-out panel animation (desktop)
  - [ ] Full-screen modal transition (mobile)
  - [ ] Service item cards design
  - [ ] Responsive layout implementation

### 2.2 Add to Cart Flow
- [ ] **Intelligent Service Recognition**
  - [ ] Implement service mention detection
  - [ ] Add quantity specification parsing
  - [ ] Create area/size measurement extraction
  - [ ] Implement requirement/preference recognition
  - [ ] Add confidence scoring system

- [ ] **Add to Cart Popup Component**
  - [ ] Create contextual popup component
  - [ ] Add editable service name field
  - [ ] Implement auto-extracted details editing
  - [ ] Add quantity selector (when applicable)
  - [ ] Create additional notes text field
  - [ ] Add action buttons (Add/Cancel/Modify)
  - [ ] Implement form validation

### 2.3 Cart Interaction Examples Implementation
- [ ] **Example A: Service Selection Flow**
  - [ ] Implement lawn cutting service example
  - [ ] Add pre-filled details popup
  - [ ] Create frequency dropdown
  - [ ] Add special instructions field
  - [ ] Test complete flow

- [ ] **Example B: Natural Language Flow**
  - [ ] Implement window washing example
  - [ ] Add property type dropdown
  - [ ] Create floor selection
  - [ ] Add frequency options
  - [ ] Implement additional needs checkboxes
  - [ ] Test complete flow

### 2.4 Cart Data Management
- [ ] **Database Schema**
  - [ ] Create service_needs_cart table
  - [ ] Create cart_items table with full schema
  - [ ] Add proper relationships and indexes
  - [ ] Implement soft delete functionality

- [ ] **API Endpoints**
  - [ ] GET /api/cart/:sessionId
  - [ ] POST /api/cart/add
  - [ ] PUT /api/cart/item/:itemId
  - [ ] DELETE /api/cart/item/:itemId
  - [ ] POST /api/cart/submit
  - [ ] GET /api/cart/estimate/:cartId

- [ ] **Cart Persistence**
  - [ ] Implement localStorage for guest users
  - [ ] Add database sync for logged-in users
  - [ ] Create cross-session persistence
  - [ ] Add cart clearing after submission

### 2.5 AI Intelligence Layer
- [ ] **Service Recognition Engine**
  - [ ] Implement NLP service type extraction
  - [ ] Add quantity and measurement parsing
  - [ ] Create temporal requirement recognition
  - [ ] Implement location/area specification parsing
  - [ ] Add special requirements detection

- [ ] **Contextual Suggestions**
  - [ ] Create related service suggestion logic
  - [ ] Implement bundle recommendations
  - [ ] Add cost-saving suggestions
  - [ ] Create proactive service suggestions

- [ ] **Validation Rules**
  - [ ] Implement minimum information requirements
  - [ ] Add logical consistency checks
  - [ ] Create duplicate service detection
  - [ ] Add required field validation

## Integration Requirements

### 3.1 Connect to Existing Systems
- [ ] **Lead Database Integration**
  - [ ] Auto-create/update lead records
  - [ ] Link cart data to lead profiles
  - [ ] Track conversation history with cart
  - [ ] Update lead scoring based on cart value

- [ ] **Quote Generation Integration**
  - [ ] Transform cart items to quote line items
  - [ ] Pass structured data to PDF generation
  - [ ] Include specifications and requirements
  - [ ] Calculate pricing based on business rules

- [ ] **Dashboard Integration**
  - [ ] Add real-time cart visibility
  - [ ] Implement cart submission notifications
  - [ ] Create cart contents view in chat transcript
  - [ ] Add quick quote generation from cart

## Technical Implementation

### 4.1 Frontend Framework Updates
- [ ] **Component Architecture**
  - [ ] Ensure compatibility with existing widget
  - [ ] Use component-based architecture
  - [ ] Implement error boundaries
  - [ ] Add loading states for async operations
  - [ ] Ensure accessibility compliance (ARIA, keyboard nav)

### 4.2 Backend Architecture
- [ ] **API Infrastructure**
  - [ ] Create RESTful endpoints for cart operations
  - [ ] Add WebSocket support for real-time updates
  - [ ] Implement rate limiting
  - [ ] Add data validation middleware
  - [ ] Set up error handling and logging

### 4.3 Security Implementation
- [ ] **Security Measures**
  - [ ] Sanitize all user inputs
  - [ ] Implement CSRF protection
  - [ ] Add proper authentication for cart persistence
  - [ ] Encrypt sensitive data
  - [ ] Add rate limiting to prevent abuse

## Testing & Quality Assurance
- [ ] **Unit Tests**
  - [ ] Cart functionality tests
  - [ ] Decision tree navigation tests
  - [ ] Service recognition tests
  - [ ] State management tests

- [ ] **Integration Tests**
  - [ ] End-to-end cart flow tests
  - [ ] Decision tree complete flow tests
  - [ ] Database integration tests
  - [ ] API endpoint tests

- [ ] **User Experience Testing**
  - [ ] Mobile responsiveness testing
  - [ ] Accessibility compliance testing
  - [ ] Cross-browser compatibility testing
  - [ ] Performance testing

## Deployment & Monitoring
- [ ] **Production Deployment**
  - [ ] Database migration scripts
  - [ ] Environment configuration
  - [ ] Feature flag implementation
  - [ ] Rollback procedures

- [ ] **Monitoring & Analytics**
  - [ ] Cart conversion tracking
  - [ ] Decision tree usage analytics
  - [ ] Performance monitoring
  - [ ] Error tracking and alerting

---

**Total Tasks: 0/120 completed**

**Progress by Feature:**
- Feature 1 (Decision Tree): 0/45 completed
- Feature 2 (Service Cart): 0/55 completed
- Integration: 0/12 completed
- Technical Implementation: 0/8 completed

**Estimated Timeline: 4-6 weeks for full implementation**