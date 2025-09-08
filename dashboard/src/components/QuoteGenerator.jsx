import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';

const QuoteGenerator = ({ businessId }) => {
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quoteData, setQuoteData] = useState({
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    notes: '',
    terms: 'Payment due within 30 days',
    validUntil: '',
  });

  useEffect(() => {
    fetchLeads();
    // Set default valid until date (30 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setQuoteData(prev => ({
      ...prev,
      validUntil: futureDate.toISOString().split('T')[0]
    }));
  }, [businessId]);

  const fetchLeads = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/lead?businessId=${businessId}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads');
    }
  };

  const handleLeadSelect = (leadId) => {
    setSelectedLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    setSelectedLead(lead);
    setError('');
    setSuccess('');
  };

  const addQuoteItem = () => {
    setQuoteData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  const removeQuoteItem = (index) => {
    setQuoteData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateQuoteItem = (index, field, value) => {
    const newItems = [...quoteData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate amount for this item
    if (field === 'quantity' || field === 'rate') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity;
      const rate = field === 'rate' ? parseFloat(value) || 0 : newItems[index].rate;
      newItems[index].amount = quantity * rate;
    }
    
    setQuoteData(prev => ({ ...prev, items: newItems }));
  };

  const calculateTotal = () => {
    return quoteData.items.reduce((total, item) => total + (item.amount || 0), 0);
  };

  const generateQuote = async () => {
    if (!selectedLead) {
      setError('Please select a lead first');
      return;
    }

    if (quoteData.items.length === 0 || !quoteData.items[0].description) {
      setError('Please add at least one quote item');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('QUOTE', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Business Info (placeholder - you'd get this from business data)
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text('Your Business Name', 20, yPosition);
      yPosition += 6;
      doc.text('123 Business Street', 20, yPosition);
      yPosition += 6;
      doc.text('City, State 12345', 20, yPosition);
      yPosition += 6;
      doc.text('Phone: (555) 123-4567', 20, yPosition);
      yPosition += 15;

      // Quote Info
      doc.setFont(undefined, 'bold');
      doc.text(`Quote #: Q-${Date.now()}`, 20, yPosition);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, yPosition);
      yPosition += 6;
      doc.text(`Valid Until: ${new Date(quoteData.validUntil).toLocaleDateString()}`, 120, yPosition);
      yPosition += 15;

      // Customer Info
      doc.text('Bill To:', 20, yPosition);
      yPosition += 8;
      doc.setFont(undefined, 'normal');
      doc.text(selectedLead.name, 20, yPosition);
      yPosition += 6;
      doc.text(selectedLead.email, 20, yPosition);
      yPosition += 6;
      doc.text(selectedLead.phone, 20, yPosition);
      yPosition += 6;
      if (selectedLead.address) {
        doc.text(selectedLead.address, 20, yPosition);
        yPosition += 6;
      }
      yPosition += 10;

      // Items table header
      doc.setFont(undefined, 'bold');
      doc.text('Description', 20, yPosition);
      doc.text('Qty', 120, yPosition);
      doc.text('Rate', 140, yPosition);
      doc.text('Amount', 170, yPosition);
      yPosition += 2;
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;

      // Items
      doc.setFont(undefined, 'normal');
      quoteData.items.forEach(item => {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.text(item.description, 20, yPosition);
        doc.text(item.quantity.toString(), 120, yPosition);
        doc.text(`$${item.rate.toFixed(2)}`, 140, yPosition);
        doc.text(`$${item.amount.toFixed(2)}`, 170, yPosition);
        yPosition += 8;
      });

      // Total
      yPosition += 5;
      doc.line(120, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.text(`Total: $${calculateTotal().toFixed(2)}`, 170, yPosition);

      // Notes and Terms
      if (quoteData.notes || quoteData.terms) {
        yPosition += 20;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        
        if (quoteData.notes) {
          doc.text('Notes:', 20, yPosition);
          yPosition += 8;
          doc.setFont(undefined, 'normal');
          const notesLines = doc.splitTextToSize(quoteData.notes, pageWidth - 40);
          doc.text(notesLines, 20, yPosition);
          yPosition += notesLines.length * 6 + 10;
        }
        
        if (quoteData.terms) {
          doc.setFont(undefined, 'bold');
          doc.text('Terms & Conditions:', 20, yPosition);
          yPosition += 8;
          doc.setFont(undefined, 'normal');
          const termsLines = doc.splitTextToSize(quoteData.terms, pageWidth - 40);
          doc.text(termsLines, 20, yPosition);
        }
      }

      // Save the PDF
      const fileName = `quote_${selectedLead.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      doc.save(fileName);

      setSuccess(`Quote generated successfully! Downloaded as ${fileName}`);
      
      // Update lead status to 'quoted' if it's not already
      if (selectedLead.status !== 'quoted') {
        await fetch(`http://localhost:3001/api/lead/${selectedLeadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'quoted' }),
        });
      }

    } catch (error) {
      console.error('Error generating quote:', error);
      setError('Failed to generate quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quote Generator</h2>
        <p className="text-gray-600">
          Generate professional PDF quotes for your leads.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg">
        <div className="p-6 space-y-6">
          {/* Lead Selection */}
          <div>
            <label htmlFor="leadSelect" className="block text-sm font-medium text-gray-700 mb-2">
              Select Lead
            </label>
            <select
              id="leadSelect"
              value={selectedLeadId}
              onChange={(e) => handleLeadSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a lead...</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} - {lead.email} ({lead.projectType || 'No project type'})
                </option>
              ))}
            </select>
          </div>

          {selectedLead && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selected Lead Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {selectedLead.name}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {selectedLead.email}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {selectedLead.phone}
                </div>
                <div>
                  <span className="font-medium">Project:</span> {selectedLead.projectType || 'Not specified'}
                </div>
                {selectedLead.address && (
                  <div className="col-span-2">
                    <span className="font-medium">Address:</span> {selectedLead.address}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quote Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Quote Items</h3>
              <button
                type="button"
                onClick={addQuoteItem}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {quoteData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateQuoteItem(index, 'description', e.target.value)}
                        placeholder="Service or product description"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateQuoteItem(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateQuoteItem(index, 'rate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded text-right">
                        ${item.amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      {quoteData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuoteItem(index)}
                          className="p-2 text-red-600 hover:text-red-800 focus:outline-none"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-right">
              <div className="text-xl font-bold">
                Total: ${calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quote Details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-2">
                Valid Until
              </label>
              <input
                type="date"
                id="validUntil"
                value={quoteData.validUntil}
                onChange={(e) => setQuoteData(prev => ({ ...prev, validUntil: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={quoteData.notes}
              onChange={(e) => setQuoteData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or project details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="terms" className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions
            </label>
            <textarea
              id="terms"
              value={quoteData.terms}
              onChange={(e) => setQuoteData(prev => ({ ...prev, terms: e.target.value }))}
              placeholder="Payment terms, conditions, etc."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Generate Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={generateQuote}
              disabled={!selectedLeadId || loading}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Quote...
                </div>
              ) : (
                'Generate & Download Quote PDF'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteGenerator;
