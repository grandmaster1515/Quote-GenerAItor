-- Add required_info field to services table for storing dynamic requirements
-- This field will store an array of requirement objects in JSON format

-- Add the JSONB column to store dynamic requirements
ALTER TABLE services
ADD COLUMN IF NOT EXISTS required_info JSONB DEFAULT '[]';

-- Add a comment to document the column structure
COMMENT ON COLUMN services.required_info IS 'Array of requirement objects with structure: [{"key": "lot_size", "prompt": "What is the approximate square footage of your lawn?", "required": true, "type": "text"}]';

-- Create an index for efficient querying of required_info
CREATE INDEX IF NOT EXISTS idx_services_required_info ON services USING GIN (required_info);

-- Update sample data to demonstrate the structure
-- Note: This will only update if the services exist
UPDATE services
SET required_info = CASE
  WHEN name = 'HVAC Services' THEN '[
    {"key": "system_type", "prompt": "What type of HVAC system do you have?", "required": true, "type": "text"},
    {"key": "square_footage", "prompt": "What is the approximate square footage of your home?", "required": true, "type": "number"},
    {"key": "issue_description", "prompt": "Please describe the issue you''re experiencing with your HVAC system.", "required": false, "type": "textarea"}
  ]'::jsonb
  WHEN name = 'Plumbing Services' THEN '[
    {"key": "issue_type", "prompt": "What type of plumbing issue are you experiencing?", "required": true, "type": "text"},
    {"key": "location", "prompt": "Where in your home is the plumbing issue located?", "required": true, "type": "text"},
    {"key": "urgency", "prompt": "Is this an emergency situation?", "required": false, "type": "select", "options": ["Yes - Emergency", "No - Can wait"]}
  ]'::jsonb
  WHEN name = 'Kitchen Remodeling' THEN '[
    {"key": "kitchen_size", "prompt": "What is the approximate size of your kitchen?", "required": true, "type": "select", "options": ["Small (under 100 sq ft)", "Medium (100-200 sq ft)", "Large (200+ sq ft)"]},
    {"key": "budget_range", "prompt": "What is your budget range for this project?", "required": true, "type": "select", "options": ["$10,000 - $20,000", "$20,000 - $35,000", "$35,000 - $50,000", "$50,000+"]},
    {"key": "timeline", "prompt": "When would you like to start this project?", "required": false, "type": "text"}
  ]'::jsonb
  ELSE '[]'::jsonb
END
WHERE name IN ('HVAC Services', 'Plumbing Services', 'Kitchen Remodeling');