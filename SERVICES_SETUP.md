# Services Management System Setup Guide

This guide covers the new dynamic services management system with custom requirements builder for the Quote GenerAItor dashboard.

## 📋 Overview

The Services Management system allows business owners to:

- **Create, edit, and delete services** through an intuitive dashboard
- **Define custom requirements** for each service (what information to collect from customers)
- **Configure different field types**: text, textarea, number, select, multiselect, file upload
- **Reorder requirements** with drag-and-drop functionality
- **Validate all inputs** with comprehensive error handling

## 🗄️ Database Changes

### New Field Added to `services` Table

```sql
-- Add required_info field to store dynamic requirements
ALTER TABLE services
ADD COLUMN IF NOT EXISTS required_info JSONB DEFAULT '[]';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_services_required_info ON services USING GIN (required_info);
```

### Required Info Structure

The `required_info` field stores an array of requirement objects:

```json
[
  {
    "key": "lot_size",
    "prompt": "What is the approximate square footage of your lawn?",
    "required": true,
    "type": "number"
  },
  {
    "key": "service_address",
    "prompt": "What is the service address?",
    "required": true,
    "type": "text"
  },
  {
    "key": "house_stories",
    "prompt": "How many stories is your house?",
    "required": true,
    "type": "select",
    "options": ["1 Story", "2 Stories", "3+ Stories"]
  }
]
```

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
# Navigate to backend directory
cd backend

# Run the migration script
node scripts/runServicesMigration.js
```

### 2. Verify Migration

The script will automatically verify that:
- The `required_info` column was added successfully
- Sample data was updated (if it exists)
- All indexes were created

### 3. Access the Dashboard

1. Navigate to your dashboard: `http://localhost:5173`
2. Click on the **"Services"** tab
3. Click **"Add New Service"** to create your first service

## 🎯 Usage Examples

### Example 1: Gutter Cleaning Service

**Service Information:**
- **Name:** Gutter Cleaning
- **Description:** Professional gutter cleaning and maintenance
- **Pricing:** Starting at $150

**Requirements:**
1. **House Stories** (Select)
   - Key: `house_stories`
   - Prompt: "How many stories is your house?"
   - Options: ["1 Story", "2 Stories", "3+ Stories"]
   - Required: Yes

2. **Service Address** (Text)
   - Key: `service_address`
   - Prompt: "What is the service address?"
   - Required: Yes

3. **Additional Notes** (Textarea)
   - Key: `additional_notes`
   - Prompt: "Any additional details about the job?"
   - Required: No

### Example 2: HVAC Service

**Service Information:**
- **Name:** HVAC Services
- **Description:** Heating and cooling system services
- **Pricing:** Starting at $125

**Requirements:**
1. **System Type** (Text)
   - Key: `system_type`
   - Prompt: "What type of HVAC system do you have?"
   - Required: Yes

2. **Square Footage** (Number)
   - Key: `square_footage`
   - Prompt: "What is the approximate square footage of your home?"
   - Required: Yes

3. **Issue Description** (Textarea)
   - Key: `issue_description`
   - Prompt: "Please describe the issue you're experiencing."
   - Required: No

## 🔧 Field Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| `text` | Single-line text input | Names, addresses, simple answers |
| `textarea` | Multi-line text input | Descriptions, detailed information |
| `number` | Numeric input | Square footage, quantities, measurements |
| `select` | Dropdown with single selection | Categories, options, preferences |
| `multiselect` | Multiple selection dropdown | Multiple services, features |
| `file` | File upload | Photos, documents, plans |

## 🎨 UI Features

### Dynamic Requirements Builder

- **Add Requirements**: Click "Add Requirement" to create new fields
- **Reorder**: Drag and drop requirements to change order
- **Edit**: Click on any requirement to modify its properties
- **Delete**: Remove unwanted requirements with the delete button
- **Validation**: Real-time validation ensures data integrity

### Form Validation

The system validates:
- ✅ Service name is required
- ✅ Internal keys are lowercase, alphanumeric + underscores only
- ✅ Customer prompts are required for all fields
- ✅ Select/multiselect fields have at least one option
- ✅ No duplicate internal keys within a service

## 🔗 API Integration

### Updated Endpoints

All existing `/api/services` endpoints now support the `required_info` field:

```javascript
// Create service with requirements
POST /api/services/:businessId
{
  "name": "Gutter Cleaning",
  "description": "Professional gutter cleaning",
  "pricing_info": "Starting at $150",
  "required_info": [
    {
      "key": "house_stories",
      "prompt": "How many stories is your house?",
      "required": true,
      "type": "select",
      "options": ["1 Story", "2 Stories", "3+ Stories"]
    }
  ]
}

// Update service with requirements
PUT /api/services/:businessId/:serviceId
{
  "name": "Updated Service Name",
  "required_info": [...]
}
```

## 🧪 Testing

### Manual Testing Steps

1. **Create a new service** with 2-3 requirements
2. **Edit an existing service** and modify its requirements
3. **Delete a service** and verify it's removed
4. **Test validation** by submitting invalid data
5. **Reorder requirements** using drag and drop
6. **Test different field types** (text, select, etc.)

### Sample Test Service

Create a test service called "Test Service" with these requirements:

```json
[
  {
    "key": "test_text",
    "prompt": "Enter some text:",
    "required": true,
    "type": "text"
  },
  {
    "key": "test_select",
    "prompt": "Choose an option:",
    "required": true,
    "type": "select",
    "options": ["Option 1", "Option 2", "Option 3"]
  },
  {
    "key": "test_textarea",
    "prompt": "Enter additional details:",
    "required": false,
    "type": "textarea"
  }
]
```

## 🐛 Troubleshooting

### Common Issues

1. **Migration fails**
   - Check database connection
   - Ensure user has ALTER TABLE permissions
   - Run: `node scripts/runServicesMigration.js`

2. **Requirements not saving**
   - Check browser console for validation errors
   - Verify API endpoint is accessible
   - Check backend logs for detailed errors

3. **Requirements not displaying**
   - Verify data was saved to database
   - Check that `required_info` field is included in API responses
   - Clear browser cache and refresh

### Debug Commands

```bash
# Check if migration was successful
psql -d your_database -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'required_info';"

# View sample service with requirements
psql -d your_database -c "SELECT name, required_info FROM services WHERE required_info IS NOT NULL AND required_info != '[]'::jsonb LIMIT 1;"
```

## 🎉 Success Criteria

You've successfully set up the Services Management system when:

✅ **Database migration completed** without errors
✅ **Dashboard displays Services tab** with enhanced UI
✅ **Can create new service** "Gutter Cleaning" with custom requirements
✅ **Can add requirements** like "How many stories is your house?"
✅ **Requirements are saved** and persist between sessions
✅ **Form validation works** for invalid inputs
✅ **Can edit/delete services** and their requirements

## 📞 Support

If you encounter any issues:

1. Check the browser console for JavaScript errors
2. Check backend logs for API errors
3. Verify database migration completed successfully
4. Ensure all required dependencies are installed

The system is designed to be intuitive for non-technical users while providing powerful customization options for service requirements.