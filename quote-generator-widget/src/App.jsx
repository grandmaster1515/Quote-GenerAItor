import React from 'react';
import ChatWidget from './components/ChatWidget';
import './App.css'

function App() {
  return (
    <div className="App">
      <div className="demo-content">
        <h1>Quote GenerAItor Demo</h1>
        <p>This is a demo page showing the chat widget in action.</p>
        <p>The chat bubble should appear in the bottom-right corner.</p>
        <p>Click it to start a conversation and test the lead capture form.</p>
        
        <div className="demo-sections">
          <section>
            <h2>About Our Services</h2>
            <p>We provide professional home improvement services including:</p>
            <ul>
              <li>HVAC Installation & Repair</li>
              <li>Plumbing Services</li>
              <li>Electrical Work</li>
              <li>Kitchen & Bathroom Remodeling</li>
              <li>Roofing & Gutters</li>
              <li>Flooring Installation</li>
              <li>Painting Services</li>
              <li>Landscaping</li>
            </ul>
          </section>
          
          <section>
            <h2>How It Works</h2>
            <ol>
              <li>Click the chat bubble to start a conversation</li>
              <li>Ask questions about our services or pricing</li>
              <li>Upload photos of your project if needed</li>
              <li>Fill out the lead form to get a personalized quote</li>
              <li>We'll contact you within 24 hours</li>
            </ol>
          </section>
        </div>
      </div>
      
      <ChatWidget 
        businessId="demo-business-123"
        apiBaseUrl="https://quote-gener-a-itor-backend.vercel.app"
      />
    </div>
  );
}

export default App
