import React, { useState } from 'react';

const RequirementsBuilder = ({ requirements = [], onRequirementsChange }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Field types available for requirements
  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number Input' },
    { value: 'select', label: 'Dropdown Select' },
    { value: 'multiselect', label: 'Multiple Select' },
    { value: 'file', label: 'File Upload' }
  ];

  // Add a new requirement
  const addRequirement = () => {
    const newRequirement = {
      id: Date.now().toString(),
      key: '',
      prompt: '',
      required: true,
      type: 'text',
      options: []
    };

    onRequirementsChange([...requirements, newRequirement]);
  };

  // Update a requirement
  const updateRequirement = (index, field, value) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };

    // Clear options if type is not select/multiselect
    if (field === 'type' && !['select', 'multiselect'].includes(value)) {
      updated[index].options = [];
    }

    // Auto-generate key from prompt if key is empty
    if (field === 'prompt' && !updated[index].key) {
      updated[index].key = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
    }

    onRequirementsChange(updated);
  };

  // Delete a requirement
  const deleteRequirement = (index) => {
    const updated = requirements.filter((_, i) => i !== index);
    onRequirementsChange(updated);
  };

  // Move requirement up
  const moveUp = (index) => {
    if (index === 0) return;
    const updated = [...requirements];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onRequirementsChange(updated);
  };

  // Move requirement down
  const moveDown = (index) => {
    if (index === requirements.length - 1) return;
    const updated = [...requirements];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onRequirementsChange(updated);
  };

  // Handle option management for select/multiselect fields
  const updateOptions = (reqIndex, optionIndex, value) => {
    const updated = [...requirements];
    updated[reqIndex].options[optionIndex] = value;
    onRequirementsChange(updated);
  };

  const addOption = (reqIndex) => {
    const updated = [...requirements];
    if (!updated[reqIndex].options) {
      updated[reqIndex].options = [];
    }
    updated[reqIndex].options.push('');
    onRequirementsChange(updated);
  };

  const deleteOption = (reqIndex, optionIndex) => {
    const updated = [...requirements];
    updated[reqIndex].options.splice(optionIndex, 1);
    onRequirementsChange(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const updated = [...requirements];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    onRequirementsChange(updated);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Required Information</h3>
          <p className="text-sm text-gray-600">
            Define what information the AI will collect from customers for this service.
          </p>
        </div>
        <button
          type="button"
          onClick={addRequirement}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Requirement
        </button>
      </div>

      {requirements.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No requirements defined</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add requirements to collect specific information from customers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requirements.map((requirement, index) => (
            <div
              key={requirement.id || index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`border border-gray-200 rounded-lg p-4 bg-white transition-all ${
                draggedIndex === index ? 'opacity-50' : 'hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center cursor-move text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"></path>
                    </svg>
                  </div>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-700">Requirement {index + 1}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === requirements.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRequirement(index)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="Delete requirement"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Internal Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Internal Key *
                  </label>
                  <input
                    type="text"
                    value={requirement.key}
                    onChange={(e) => updateRequirement(index, 'key', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., lot_size"
                    pattern="[a-z0-9_]+"
                    title="Only lowercase letters, numbers, and underscores allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Used internally (lowercase, underscores only)
                  </p>
                </div>

                {/* Field Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Field Type *
                  </label>
                  <select
                    value={requirement.type}
                    onChange={(e) => updateRequirement(index, 'type', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {fieldTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer Prompt */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Customer Prompt *
                </label>
                <textarea
                  value={requirement.prompt}
                  onChange={(e) => updateRequirement(index, 'prompt', e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., What is the approximate square footage of your lawn?"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This is exactly what the AI will ask the customer
                </p>
              </div>

              {/* Required Toggle */}
              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  id={`required-${index}`}
                  checked={requirement.required}
                  onChange={(e) => updateRequirement(index, 'required', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`required-${index}`} className="ml-2 block text-sm text-gray-700">
                  Required field
                </label>
              </div>

              {/* Options for select/multiselect */}
              {['select', 'multiselect'].includes(requirement.type) && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    {requirement.options?.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOptions(index, optionIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => deleteOption(index, optionIndex)}
                          className="p-2 text-red-400 hover:text-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(index)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Option
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {requirements.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Preview</h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  The AI will ask these questions in order when a customer selects this service.
                  You can drag and drop to reorder requirements.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsBuilder;