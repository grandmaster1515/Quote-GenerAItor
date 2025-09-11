-- Add Shopping Cart Tables to Existing Database
-- Run this on your existing Quote GenerAItor database

-- Create cart_sessions table to track service cart data
CREATE TABLE IF NOT EXISTS cart_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    cart_data JSONB NOT NULL DEFAULT '[]',
    total_estimate DECIMAL(10,2) DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quote_requests table to track cart-based quote requests
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    request_type VARCHAR(50) DEFAULT 'service-cart',
    cart_items JSONB NOT NULL,
    total_estimate DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for the new cart tables
CREATE INDEX IF NOT EXISTS idx_cart_sessions_session_id ON cart_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_business_id ON cart_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_lead_id ON cart_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_updated_at ON cart_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_requests_business_id ON quote_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_lead_id ON quote_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at DESC);

-- Add updated_at triggers for the new tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cart_sessions_updated_at') THEN
        CREATE TRIGGER update_cart_sessions_updated_at BEFORE UPDATE ON cart_sessions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_requests_updated_at') THEN
        CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON quote_requests
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Success message
SELECT 'Shopping cart tables added successfully!' as status;