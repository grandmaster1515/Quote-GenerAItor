-- Create chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'AWAITING_USER_INTENT',
    user_intent VARCHAR(100),
    session_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_business_id ON chat_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_state ON chat_sessions(state);

-- Add comment for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat session state and conversation history for the AI chat agent';
COMMENT ON COLUMN chat_sessions.state IS 'Current state: AWAITING_USER_INTENT, IN_QNA_FLOW, IDENTIFYING_SERVICES';
COMMENT ON COLUMN chat_sessions.user_intent IS 'Classified user intent: QUESTION_ANSWERING, QUOTE_BUILDING';
COMMENT ON COLUMN chat_sessions.session_data IS 'JSON data containing messages, lead data, and other session information';