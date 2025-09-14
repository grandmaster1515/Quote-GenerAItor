import React, { useState, useEffect } from 'react';
import RequirementsBuilder from './RequirementsBuilder';

const ServicesManager = ({ businessId }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pricing_info: '',
    required_info: []
  });

  // API base URL
  const API_BASE_URL = 'https://quote-gener-a-itor-backend.vercel.app';

  // Load services on component mount
  useEffect(() => {
    loadServices();
  }, [businessId]);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/services/${businessId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setServices(data.services);
      } else {
        throw new Error('Failed to load services');
      }
    } catch (err) {
      console.error('Error loading services:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError(null);

      // Validate form data
      if (!formData.name?.trim()) {
        setError('Service name is required');
        return;
      }

      // Validate requirements
      const validationErrors = [];
      formData.required_info.forEach((req, index) => {
        if (!req.key?.trim()) {
          validationErrors.push(`Requirement ${index + 1}: Internal key is required`);
        } else if (!/^[a-z0-9_]+$/.test(req.key)) {
          validationErrors.push(`Requirement ${index + 1}: Internal key can only contain lowercase letters, numbers, and underscores`);
        }

        if (!req.prompt?.trim()) {
          validationErrors.push(`Requirement ${index + 1}: Customer prompt is required`);
        }

        if (['select', 'multiselect'].includes(req.type) && (!req.options || req.options.length === 0 || req.options.every(opt => !opt?.trim()))) {
          validationErrors.push(`Requirement ${index + 1}: At least one option is required for ${req.type} fields`);
        }
      });

      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        return;
      }
      
      const url = editingService 
        ? `${API_BASE_URL}/api/services/${businessId}/${editingService.id}`
        : `${API_BASE_URL}/api/services/${businessId}`;
      
      const method = editingService ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingService ? 'update' : 'create'} service`);
      }
      
      const data = await response.json();
      if (data.success) {
        // Reload services to get updated list
        await loadServices();
        
        // Reset form
        setFormData({ name: '', description: '', pricing_info: '', required_info: [] });
        setIsEditing(false);
        setEditingService(null);
      }
    } catch (err) {
      console.error('Error saving service:', err);
      setError(err.message);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      pricing_info: service.pricing_info || '',
      required_info: service.required_info || []
    });
    setIsEditing(true);
  };

  const handleDelete = async (serviceId) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }
    
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/services/${businessId}/${serviceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete service');
      }
      
      // Reload services
      await loadServices();
    } catch (err) {
      console.error('Error deleting service:', err);
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', pricing_info: '', required_info: [] });
    setIsEditing(false);
    setEditingService(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle requirements change
  const handleRequirementsChange = (newRequirements) => {
    setFormData(prev => ({ ...prev, required_info: newRequirements }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Services Management</h1>
          <p className="mt-2 text-gray-600">
            Manage the services displayed in your chat widget decision tree.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error.split('\n').map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Services List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Current Services</h2>
              <p className="text-sm text-gray-600">
                {services.length} service{services.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            
            <div className="p-6">
              {services.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No services</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new service.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service, index) => (
                    <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-3">
                              {index + 1}
                            </span>
                            <h3 className="text-sm font-medium text-gray-900">{service.name}</h3>
                          </div>
                          {service.description && (
                            <p className="mt-1 text-sm text-gray-600 ml-9">{service.description}</p>
                          )}
                          {service.pricing_info && (
                            <p className="mt-1 text-sm text-green-600 font-medium ml-9">{service.pricing_info}</p>
                          )}
                          {service.required_info && service.required_info.length > 0 && (
                            <p className="mt-1 text-xs text-blue-600 ml-9">
                              {service.required_info.length} requirement{service.required_info.length !== 1 ? 's' : ''} configured
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400 ml-9">
                            Created: {new Date(service.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleEdit(service)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add/Edit Service Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingService ? 'Edit Service' : 'Add New Service'}
                </h2>
                <p className="text-sm text-gray-600">
                  {editingService ? 'Update service information and requirements' : 'Create a new service with custom requirements'}
                </p>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Service
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {/* Basic Service Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Service Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Gutter Cleaning"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This will appear in your chat widget's service selection
                    </p>
                  </div>

                  <div>
                    <label htmlFor="pricing_info" className="block text-sm font-medium text-gray-700">
                      Pricing Information
                    </label>
                    <input
                      type="text"
                      id="pricing_info"
                      name="pricing_info"
                      value={formData.pricing_info}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Starting at $150"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional pricing information shown to customers
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Service Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Brief description of what this service includes..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This helps customers understand what's included in the service
                  </p>
                </div>

                {/* Requirements Builder */}
                <div className="border-t border-gray-200 pt-8">
                  <RequirementsBuilder
                    requirements={formData.required_info}
                    onRequirementsChange={handleRequirementsChange}
                  />
                </div>

                {/* Form Actions */}
                <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingService ? 'Update Service' : 'Create Service'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Ready to add a service?</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create services with custom requirements to streamline your quote process.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Your First Service
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">How it works</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Services you add here will automatically appear in your chat widget's decision tree. 
                  Users can select "Our services" and see all active services with their descriptions and pricing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesManager;