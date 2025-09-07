-- Sample data for Quote GenerAItor
-- Run this after schema.sql to populate the database with test data

-- Insert sample businesses
INSERT INTO businesses (id, name, industry, website, phone, email, address) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'ABC Home Services', 'Home Improvement', 'https://abchomeservices.com', '(555) 123-4567', 'info@abchomeservices.com', '123 Main St, Anytown, ST 12345'),
('550e8400-e29b-41d4-a716-446655440001', 'Quality HVAC Solutions', 'HVAC', 'https://qualityhvac.com', '(555) 234-5678', 'contact@qualityhvac.com', '456 Oak Ave, Somewhere, ST 67890');

-- Insert sample business context for RAG
INSERT INTO business_context (business_id, content_type, question, answer, keywords) VALUES
-- ABC Home Services context
('550e8400-e29b-41d4-a716-446655440000', 'faq', 'What services do you offer?', 'We offer comprehensive home improvement services including HVAC installation and repair, plumbing services, electrical work, kitchen and bathroom remodeling, roofing, flooring installation, painting, and landscaping.', ARRAY['services', 'offer', 'what', 'do']),

('550e8400-e29b-41d4-a716-446655440000', 'pricing', 'How much does HVAC repair cost?', 'HVAC repair costs typically range from $150 for basic diagnostics and minor repairs to $800 for major component replacements. Emergency service calls have an additional $75 fee. We provide free estimates for all work.', ARRAY['hvac', 'repair', 'cost', 'price', 'how much']),

('550e8400-e29b-41d4-a716-446655440000', 'pricing', 'What does kitchen remodeling cost?', 'Kitchen remodeling costs vary based on scope and materials. Basic updates start around $10,000, mid-range remodels range from $15,000-$30,000, and luxury renovations can reach $50,000+. We offer financing options and free consultations.', ARRAY['kitchen', 'remodel', 'cost', 'price', 'renovation']),

('550e8400-e29b-41d4-a716-446655440000', 'service', 'Do you provide emergency services?', 'Yes, we offer 24/7 emergency services for HVAC, plumbing, and electrical issues. Emergency calls have a $75 service fee, but this is waived if you proceed with recommended repairs over $200.', ARRAY['emergency', '24/7', 'urgent', 'after hours']),

('550e8400-e29b-41d4-a716-446655440000', 'policy', 'What is your warranty policy?', 'We provide a 1-year warranty on all labor and honor manufacturer warranties on parts and equipment. HVAC installations come with extended warranties up to 10 years depending on the system.', ARRAY['warranty', 'guarantee', 'policy']),

('550e8400-e29b-41d4-a716-446655440000', 'service', 'How do I schedule an appointment?', 'You can schedule an appointment by calling us at (555) 123-4567, filling out our online form, or through this chat. We typically can schedule within 24-48 hours, with same-day service available for emergencies.', ARRAY['schedule', 'appointment', 'book', 'when']),

('550e8400-e29b-41d4-a716-446655440000', 'pricing', 'Do you offer free estimates?', 'Yes, we provide free estimates for all services. Our technicians will assess your project and provide detailed written estimates with no obligation. Emergency diagnostic fees are waived if you proceed with repairs.', ARRAY['free', 'estimate', 'quote', 'cost']),

-- Quality HVAC Solutions context
('550e8400-e29b-41d4-a716-446655440001', 'service', 'What HVAC services do you provide?', 'We specialize in residential and commercial HVAC services including installation, repair, maintenance, duct cleaning, air quality improvement, and energy efficiency upgrades. We work with all major brands.', ARRAY['hvac', 'services', 'heating', 'cooling', 'air conditioning']),

('550e8400-e29b-41d4-a716-446655440001', 'pricing', 'How much does a new HVAC system cost?', 'New HVAC system costs range from $3,000-$8,000 for basic systems to $10,000-$15,000 for high-efficiency units. Factors include home size, efficiency ratings, and installation complexity. We offer financing with 0% APR for qualified customers.', ARRAY['new', 'hvac', 'system', 'install', 'cost', 'price']),

('550e8400-e29b-41d4-a716-446655440001', 'service', 'Do you provide maintenance plans?', 'Yes, we offer comprehensive maintenance plans starting at $150/year. Plans include bi-annual tune-ups, priority scheduling, 15% discount on repairs, and extended warranties. Regular maintenance extends system life and improves efficiency.', ARRAY['maintenance', 'plan', 'service', 'tune-up']),

('550e8400-e29b-41d4-a716-446655440001', 'policy', 'Are you licensed and insured?', 'Yes, we are fully licensed, bonded, and insured. Our technicians are EPA certified and receive ongoing training. We carry comprehensive liability insurance and offer warranties on all work performed.', ARRAY['licensed', 'insured', 'certified', 'qualified']);

-- Insert sample leads for testing
INSERT INTO leads (business_id, name, email, phone, address, project_type, budget, timeline, notes, status) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'John Smith', 'john.smith@email.com', '(555) 987-6543', '789 Pine St, Testville, ST 11111', 'hvac', '5000-10000', '1-month', 'Need AC repair before summer', 'new'),
('550e8400-e29b-41d4-a716-446655440000', 'Jane Doe', 'jane.doe@email.com', '(555) 876-5432', '321 Elm Ave, Demo City, ST 22222', 'kitchen', '25000-50000', '2-3-months', 'Complete kitchen renovation', 'contacted'),
('550e8400-e29b-41d4-a716-446655440001', 'Bob Johnson', 'bob.johnson@email.com', '(555) 765-4321', '654 Maple Dr, Sample Town, ST 33333', 'hvac', '10000-25000', 'flexible', 'Replace old furnace', 'quoted');

-- Note: Embeddings would be generated by the application using Sentence-BERT
-- For now, we'll leave embedding column NULL and generate them when the RAG system is implemented
