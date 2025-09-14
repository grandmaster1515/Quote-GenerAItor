# Intelligent Detail Gathering Implementation

## Overview

This implementation adds intelligent logic to gather service details without asking for the same information twice, ensuring a natural conversational flow while efficiently collecting all necessary information.

## Key Features

### 1. Session-Wide Detail Storage
- **Location**: `session.collected_details` object in main session data
- **Structure**: Each detail is stored with metadata including:
  - `value`: The actual information provided by the user
  - `source`: Where/how this detail was collected (e.g., 'user_input', 'detail_gathering')
  - `collectedAt`: Timestamp when the detail was collected
  - `sessionId`: Reference to the session

```javascript
session.collected_details = {
  address: {
    value: '123 Main St, Springfield, IL',
    source: 'user_input',
    collectedAt: new Date(),
    sessionId: 'session_123'
  }
}
```

### 2. Pre-computation Check Logic
- **Function**: `getCollectedDetails(session, requirements)` in ChatSessionService
- **Process**:
  1. Retrieves service requirements from database (`required_info` JSONB field)
  2. Checks what details are already available in `session.collected_details`
  3. Returns analysis of what's collected vs. what's missing
  4. Determines if all required details are available

### 3. Intelligent Question Generation
- **Function**: `generateNextQuestion()` in ChatSessionService
- **Logic**:
  - Prioritizes required fields over optional ones
  - Adds contextual information for the first question per service
  - Provides progress indicators for multiple required questions
  - Generates natural language questions based on service requirements

### 4. Automatic Detail Extraction
- **Function**: `extractDetailFromResponse()` in ChatSessionService
- **Capabilities**:
  - Extracts details based on current requirement type (text, number, select, textarea)
  - Automatically extracts common details from any response:
    - Address patterns (street addresses)
    - Phone numbers (various formats)
    - Square footage (multiple formats)
    - Email addresses
  - Handles select field option matching

## File Structure

### Modified Files
- `backend/services/chatSessionService.js`: Added session-wide storage and extraction methods
- `backend/routes/chat.js`: Integrated detail gathering service into chat flow

### New Files
- `backend/services/detailGatheringService.js`: Main service handling GATHERING_DETAILS state logic
- `backend/test/test-detail-logic.js`: Comprehensive test suite demonstrating functionality

## Implementation Details

### Database Integration
- Service requirements are stored in the `services.required_info` JSONB column
- Each requirement has structure:
  ```json
  {
    "key": "system_type",
    "prompt": "What type of HVAC system do you have?",
    "required": true,
    "type": "text"
  }
  ```

### State Flow
1. **IDENTIFYING_SERVICES**: Services are identified and added to queue
2. **GATHERING_DETAILS**: For each service in queue:
   - Check existing collected details against requirements
   - Skip questions for already-collected information
   - Ask only for missing required details
   - Extract additional details from user responses
   - Move to next service when complete
3. **QUOTE_READY**: All services have sufficient details

### Cross-Service Detail Reuse
- Details like address, phone, email are collected once and reused across all services
- Common details are automatically extracted from any user response
- System intelligently determines which details apply to multiple services

## Example Scenario

1. **Initial Conversation**: User mentions "I need HVAC and plumbing work at 123 Main St"
   - Address is stored in `session.collected_details.address`

2. **HVAC Service Details**:
   - System checks requirements: `system_type`, `square_footage`, `address`
   - Finds address already collected
   - Only asks: "What type of HVAC system do you have?"

3. **User Response**: "I have a 2000 sq ft home with gas heating"
   - Extracts: `system_type: "gas heating"`, `square_footage: "2000"`
   - HVAC service now complete

4. **Plumbing Service Details**:
   - System checks requirements: `issue_type`, `location`, `address`
   - Finds address already collected
   - Only asks: "What type of plumbing issue are you experiencing?"

## Benefits

- **Reduces Friction**: Users don't repeat information
- **Natural Flow**: Conversation feels more intelligent and personal
- **Efficient**: Minimizes interaction time while maximizing information collection
- **Flexible**: Automatically extracts details from natural language responses
- **Scalable**: Works with any number of services and requirements

## Testing

Run the test suite to verify functionality:
```bash
cd backend
node test/test-detail-logic.js
```

The test covers:
- Session-wide detail storage
- Pre-computation check logic
- Intelligent question generation
- Detail extraction from responses
- Cross-service detail reuse

All tests pass, confirming the implementation meets the specified requirements.