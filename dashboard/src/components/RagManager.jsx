import React, { useState, useEffect } from 'react';

const RagManager = ({ businessId }) => {
  const [formData, setFormData] = useState({ 
    question: '', 
    answer: '', 
    keywords: '',
    contentType: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [existingContext, setExistingContext] = useState([]);

  useEffect(() => {
    // In a real implementation, you'd fetch existing context here
    // For now, we'll just show the form
  }, [businessId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.question.trim() || !formData.answer.trim()) {
      setMessage('Question and answer are required');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:3001/api/chat/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          question: formData.question,
          answer: formData.answer,
          contentType: formData.contentType,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update knowledge base');
      }

      const result = await response.json();
      
      setMessage('Knowledge base updated successfully!');
      setMessageType('success');
      setFormData({ question: '', answer: '', keywords: '', contentType: 'general' });
      
    } catch (error) {
      console.error('Error updating knowledge base:', error);
      setMessage(error.message || 'Failed to update knowledge base');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear message when user starts typing
    if (message) {
      setMessage('');
      setMessageType('');
    }
  };

  const contentTypes = [
    { value: 'general', label: 'General Information' },
    { value: 'faq', label: 'FAQ' },
    { value: 'service', label: 'Service Description' },
    { value: 'pricing', label: 'Pricing Information' },
    { value: 'policy', label: 'Policy/Terms' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Knowledge Base Manager</h2>
        <p className="text-gray-600">
          Add information to help the AI provide better responses to customer inquiries.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          messageType === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {messageType === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-2">
              Content Type
            </label>
            <select
              id="contentType"
              value={formData.contentType}
              onChange={(e) => handleInputChange('contentType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {contentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              Question or Topic
            </label>
            <input
              type="text"
              id="question"
              value={formData.question}
              onChange={(e) => handleInputChange('question', e.target.value)}
              placeholder="What question should this answer? (e.g., 'What are your plumbing rates?')"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
              Answer or Information
            </label>
            <textarea
              id="answer"
              value={formData.answer}
              onChange={(e) => handleInputChange('answer', e.target.value)}
              placeholder="Provide the detailed answer or information that the AI should use when responding to similar questions..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              required
            />
          </div>

          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              id="keywords"
              value={formData.keywords}
              onChange={(e) => handleInputChange('keywords', e.target.value)}
              placeholder="plumbing, rates, emergency, repair, installation"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Add relevant keywords to help the AI find this information when needed
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </div>
                ) : (
                  'Add to Knowledge Base'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setFormData({ question: '', answer: '', keywords: '', contentType: 'general' });
                  setMessage('');
                  setMessageType('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                Clear Form
              </button>
            </div>

            <div className="text-sm text-gray-500">
              Business ID: {businessId}
            </div>
          </div>
        </form>
      </div>

      <div className="mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Tips for Better AI Responses</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Be specific and detailed in your answers</li>
                  <li>Include pricing information when relevant</li>
                  <li>Use keywords that customers might search for</li>
                  <li>Update information regularly to keep it current</li>
                  <li>Consider common variations of questions customers ask</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RagManager;
