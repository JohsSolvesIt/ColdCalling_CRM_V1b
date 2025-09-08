import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

const PropertyManagementModal = ({ isOpen, onClose, contact, onPropertiesUpdated }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    zip_code: '',
    price: '',
    price_formatted: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    lot_size: '',
    property_type: '',
    listing_status: '',
    listing_date: '',
    days_on_market: '',
    mls_number: '',
    description: '',
    features: [],
    image_urls: [],
    property_url: '',
    coordinates: {}
  });

  // Clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Helper function to validate image URLs
  const isValidImageUrl = (url) => {
    if (!url || !url.trim()) return false;
    
    // Don't allow API endpoints as image URLs
    if (url.includes('/api/') || url.includes('localhost:5001')) {
      return false;
    }
    
    // Check for common image formats
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?|$)/i;
    const hasImageExtension = imageExtensions.test(url);
    
    // Allow URLs that look like images or from common CDNs
    const isLikelyImage = hasImageExtension || 
                         url.includes('cloudinary.com') ||
                         url.includes('amazonaws.com') ||
                         url.includes('imgix.com') ||
                         url.includes('cdn.') ||
                         url.includes('images.');
    
    return isLikelyImage;
  };

  // Helper function to validate property exists
  const validatePropertyExists = (propertyId) => {
    const exists = properties.some(p => p.id === propertyId);
    if (!exists) {
      console.warn(`🚨 Property ${propertyId} not found in current state`);
      fetchProperties(); // Refresh the list
    }
    return exists;
  };

  // Fetch properties when modal opens
  useEffect(() => {
    if (isOpen && contact?.id) {
      fetchProperties();
    }
  }, [isOpen, contact?.id]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      
      console.log('📥 Fetching properties for contact:', contact.id);
      
  const response = await fetch(`/api/agents/${contact.id}/properties`);
      
      // Handle 404 gracefully - agent might not have properties yet
      if (response.status === 404) {
        console.log('📝 No properties found for this contact');
        setProperties([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Properties fetched:', data.properties.length);
        
        // Debug: Check for problematic image URLs
        data.properties.forEach(property => {
          if (property.image_urls && property.image_urls.length > 0) {
            const invalidUrls = property.image_urls.filter(url => !isValidImageUrl(url));
            if (invalidUrls.length > 0) {
              console.warn(`🚨 Property ${property.id} has invalid image URLs:`, invalidUrls);
            }
          }
        });
        
        setProperties(data.properties || []);
      } else {
        console.error('❌ Failed to fetch properties:', data.error);
        showMessage('error', data.error || 'Failed to fetch properties');
        setProperties([]);
      }
    } catch (error) {
      console.error('❌ Error fetching properties:', error);
      showMessage('error', 'Failed to connect to property service');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      address: '',
      city: '',
      state: '',
      zip_code: '',
      price: '',
      price_formatted: '',
      bedrooms: '',
      bathrooms: '',
      square_feet: '',
      lot_size: '',
      property_type: '',
      listing_status: '',
      listing_date: '',
      days_on_market: '',
      mls_number: '',
      description: '',
      features: [],
      image_urls: [],
      property_url: '',
      coordinates: {}
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.address.trim()) {
        showMessage('error', 'Address is required');
        return;
      }

      setLoading(true);
      
      const propertyData = {
        ...formData,
        agent_id: contact.id,
        features: formData.features.filter(f => f.trim()),
        image_urls: formData.image_urls.filter(url => url.trim() && isValidImageUrl(url))
      };

      // Log invalid URLs for debugging
      const invalidUrls = formData.image_urls.filter(url => url.trim() && !isValidImageUrl(url));
      if (invalidUrls.length > 0) {
        console.warn('🚨 Filtered out invalid image URLs:', invalidUrls);
      }

      let response;
      if (editingId) {
        // Validate property still exists before attempting update
        if (!validatePropertyExists(editingId)) {
          showMessage('warning', 'Property no longer exists. Creating a new one instead.');
          setEditingId(null);
          // Fall through to create new property
        } else {
          // Update existing property
          response = await fetch(`/api/properties/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(propertyData)
          });
          
          // Handle 404 - property might have been deleted
          if (response.status === 404) {
            showMessage('warning', 'Property no longer exists. Creating a new one instead.');
            // Reset editing mode and create new
            setEditingId(null);
            response = await fetch('/api/properties', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(propertyData)
            });
          }
        }
      }
      
      if (!editingId) {
        // Create new property
  response = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(propertyData)
        });
      }
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', data.message);
        resetForm();
        await fetchProperties();
        
        // Notify parent component
        if (onPropertiesUpdated) {
          onPropertiesUpdated();
        }
      } else {
        showMessage('error', data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving property:', error);
      showMessage('error', 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (property) => {
    // Validate that the property still exists in our current state
    const currentProperty = properties.find(p => p.id === property.id);
    if (!currentProperty) {
      showMessage('warning', 'Property no longer exists. Please refresh the list.');
      fetchProperties();
      return;
    }

    setFormData({
      address: property.address || '',
      city: property.city || '',
      state: property.state || '',
      zip_code: property.zip_code || '',
      price: property.price || '',
      price_formatted: property.price_formatted || '',
      bedrooms: property.bedrooms || '',
      bathrooms: property.bathrooms || '',
      square_feet: property.square_feet || '',
      lot_size: property.lot_size || '',
      property_type: property.property_type || '',
      listing_status: property.listing_status || '',
      listing_date: property.listing_date || '',
      days_on_market: property.days_on_market || '',
      mls_number: property.mls_number || '',
      description: property.description || '',
      features: property.features || [],
      image_urls: property.image_urls || [],
      property_url: property.property_url || '',
      coordinates: property.coordinates || {}
    });
    setEditingId(property.id);
    setShowAddForm(true);
  };

  const handleDelete = async (propertyId, address) => {
    // Validate property exists in current state
    if (!validatePropertyExists(propertyId)) {
      showMessage('info', 'Property was already removed from the list');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the property at ${address}?`)) {
      return;
    }

    try {
      setLoading(true);
      
  const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE'
      });
      
      // Handle 404 - property might already be deleted
      if (response.status === 404) {
        showMessage('info', 'Property was already deleted');
        await fetchProperties(); // Refresh the list
        if (onPropertiesUpdated) {
          onPropertiesUpdated();
        }
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'Property deleted successfully');
        await fetchProperties();
        
        // Notify parent component
        if (onPropertiesUpdated) {
          onPropertiesUpdated();
        }
      } else {
        showMessage('error', data.error || 'Failed to delete property');
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      showMessage('error', 'Failed to delete property');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    setFormData(prev => ({
      ...prev,
      image_urls: [...prev.image_urls, '']
    }));
  };

  const handleImageUrlChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.map((url, i) => i === index ? value : url)
    }));
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  const handleAddFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const handleFeatureChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => i === index ? value : feature)
    }));
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const formatPrice = (price) => {
    if (!price) return 'Price N/A';
    if (typeof price === 'string' && price.includes('$')) return price;
    return `$${parseFloat(price).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content property-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏠 Property Management - {contact?.name || 'Contact'}</h2>
          <button className="close-button" onClick={onClose} title="Close (Esc)">×</button>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="modal-body">
          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
              disabled={loading}
            >
              + Add Property
            </button>
            <button
              className="btn btn-secondary"
              onClick={fetchProperties}
              disabled={loading}
            >
              🔄 Refresh
            </button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="property-form">
              <h3>{editingId ? 'Edit Property' : 'Add New Property'}</h3>
              
              <div className="form-grid">
                {/* Basic Information */}
                <div className="form-section">
                  <h4>Basic Information</h4>
                  
                  <div className="form-group">
                    <label>Address *</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                      />
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="CA"
                        maxLength="10"
                      />
                    </div>
                    <div className="form-group">
                      <label>Zip Code</label>
                      <input
                        type="text"
                        value={formData.zip_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div className="form-section">
                  <h4>Property Details</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Price</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="500000"
                      />
                    </div>
                    <div className="form-group">
                      <label>Price Formatted</label>
                      <input
                        type="text"
                        value={formData.price_formatted}
                        onChange={(e) => setFormData(prev => ({ ...prev, price_formatted: e.target.value }))}
                        placeholder="$500,000"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Bedrooms</label>
                      <input
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                        placeholder="3"
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Bathrooms</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                        placeholder="2.5"
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Square Feet</label>
                      <input
                        type="number"
                        value={formData.square_feet}
                        onChange={(e) => setFormData(prev => ({ ...prev, square_feet: e.target.value }))}
                        placeholder="2000"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Property Type</label>
                      <select
                        value={formData.property_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, property_type: e.target.value }))}
                      >
                        <option value="">Select Type</option>
                        <option value="Single Family">Single Family</option>
                        <option value="Condo">Condo</option>
                        <option value="Townhouse">Townhouse</option>
                        <option value="Multi-Family">Multi-Family</option>
                        <option value="Land">Land</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Listing Status</label>
                      <select
                        value={formData.listing_status}
                        onChange={(e) => setFormData(prev => ({ ...prev, listing_status: e.target.value }))}
                      >
                        <option value="">Select Status</option>
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Sold">Sold</option>
                        <option value="Withdrawn">Withdrawn</option>
                        <option value="Expired">Expired</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Lot Size</label>
                      <input
                        type="text"
                        value={formData.lot_size}
                        onChange={(e) => setFormData(prev => ({ ...prev, lot_size: e.target.value }))}
                        placeholder="0.25 acres"
                      />
                    </div>
                  </div>
                </div>

                {/* Listing Information */}
                <div className="form-section">
                  <h4>Listing Information</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Listing Date</label>
                      <input
                        type="date"
                        value={formData.listing_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, listing_date: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Days on Market</label>
                      <input
                        type="number"
                        value={formData.days_on_market}
                        onChange={(e) => setFormData(prev => ({ ...prev, days_on_market: e.target.value }))}
                        placeholder="30"
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>MLS Number</label>
                      <input
                        type="text"
                        value={formData.mls_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, mls_number: e.target.value }))}
                        placeholder="MLS123456"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Property URL</label>
                    <input
                      type="url"
                      value={formData.property_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, property_url: e.target.value }))}
                      placeholder="https://example.com/property"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Property description..."
                      rows="3"
                    />
                  </div>
                </div>

                {/* Images */}
                <div className="form-section">
                  <h4>Property Images</h4>
                  
                  {formData.image_urls.map((url, index) => (
                    <div key={index} className="image-input-group">
                      <div className="image-input-container">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => handleImageUrlChange(index, e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className={url && !isValidImageUrl(url) ? 'url-warning' : ''}
                        />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveImage(index)}
                        >
                          Remove
                        </button>
                      </div>
                      {url && !isValidImageUrl(url) && (
                        <div className="url-warning-text">
                          ⚠️ This URL may not be a valid image. Please use direct image URLs.
                        </div>
                      )}
                      {url && (
                        <div className="image-preview">
                          <img 
                            src={url} 
                            alt={`Property preview ${index + 1}`}
                            onError={(e) => {
                              e.target.parentElement.classList.add('image-error');
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                            onLoad={(e) => {
                              e.target.parentElement.classList.remove('image-error');
                              e.target.style.display = 'block';
                              e.target.nextSibling.style.display = 'none';
                            }}
                          />
                          <div className="image-error-placeholder" style={{ display: 'none' }}>
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                            <span>Invalid image URL</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddImage}
                  >
                    + Add Image URL
                  </button>
                </div>

                {/* Features */}
                <div className="form-section">
                  <h4>Property Features</h4>
                  
                  {formData.features.map((feature, index) => (
                    <div key={index} className="feature-input-group">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder="e.g., Pool, Garage, Fireplace"
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveFeature(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddFeature}
                  >
                    + Add Feature
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingId ? 'Update Property' : 'Add Property')}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Properties List */}
          <div className="properties-list">
            <h3>Properties ({properties.length})</h3>
            
            {loading && !showAddForm && (
              <div className="loading-spinner">Loading properties...</div>
            )}

            {!loading && properties.length === 0 && (
              <div className="no-properties">
                <p>No properties found for this contact.</p>
                <p>Click "Add Property" to get started.</p>
              </div>
            )}

            {properties.map((property) => (
              <div key={property.id} className="property-card">
                <div className="property-header">
                  <div className="property-main-info">
                    <h4 className="property-address">{property.address}</h4>
                    <p className="property-location">
                      {[property.city, property.state, property.zip_code].filter(Boolean).join(', ')}
                    </p>
                    <div className="property-price">{formatPrice(property.price_formatted || property.price)}</div>
                  </div>
                  
                  {property.image_urls && property.image_urls.length > 0 && property.image_urls.some(url => isValidImageUrl(url)) && (
                    <div 
                      className="property-image"
                      onClick={() => setShowImageGallery(property)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view all images"
                    >
                      <img 
                        src={property.image_urls.find(url => isValidImageUrl(url))} 
                        alt={property.address}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                        onLoad={(e) => {
                          e.target.style.display = 'block';
                          e.target.nextSibling.style.display = 'none';
                        }}
                      />
                      <div className="property-image-error" style={{ display: 'none' }}>
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                        <span>No Image</span>
                      </div>
                      {property.image_urls.filter(url => isValidImageUrl(url)).length > 1 && (
                        <div className="image-count-badge">
                          +{property.image_urls.filter(url => isValidImageUrl(url)).length - 1} more
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="property-details">
                  <div className="property-specs">
                    {property.bedrooms && (
                      <span className="spec">{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
                    )}
                    {property.bathrooms && (
                      <span className="spec">{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                    )}
                    {property.square_feet && (
                      <span className="spec">{parseInt(property.square_feet).toLocaleString()} sq ft</span>
                    )}
                  </div>

                  <div className="property-meta">
                    {property.property_type && (
                      <span className="meta">Type: {property.property_type}</span>
                    )}
                    {property.listing_status && (
                      <span className="meta">Status: {property.listing_status}</span>
                    )}
                    {property.days_on_market && (
                      <span className="meta">DOM: {property.days_on_market} days</span>
                    )}
                  </div>

                  {property.description && (
                    <p className="property-description">
                      {property.description.length > 150 
                        ? `${property.description.substring(0, 150)}...` 
                        : property.description}
                    </p>
                  )}

                  {property.features && property.features.length > 0 && (
                    <div className="property-features">
                      <strong>Features:</strong> {property.features.slice(0, 3).join(', ')}
                      {property.features.length > 3 && ` +${property.features.length - 3} more`}
                    </div>
                  )}
                </div>

                <div className="property-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEdit(property)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(property.id, property.address)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                  {property.property_url && (
                    <a
                      href={property.property_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      View Online
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image Gallery Modal */}
        {showImageGallery && (
          <div className="image-gallery-overlay" onClick={() => setShowImageGallery(null)}>
            <div className="image-gallery-modal" onClick={(e) => e.stopPropagation()}>
              <div className="gallery-header">
                <h3>Property Images - {showImageGallery.address}</h3>
                <button 
                  className="close-button"
                  onClick={() => setShowImageGallery(null)}
                >
                  ×
                </button>
              </div>
              <div className="gallery-grid">
                {showImageGallery.image_urls.filter(url => isValidImageUrl(url)).map((url, index) => (
                  <div key={index} className="gallery-image">
                    <img 
                      src={url} 
                      alt={`${showImageGallery.address} - Image ${index + 1}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                      onLoad={(e) => {
                        e.target.style.display = 'block';
                        e.target.nextSibling.style.display = 'none';
                      }}
                    />
                    <div className="gallery-image-error" style={{ display: 'none' }}>
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                      <span>Failed to load image</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          cursor: pointer;
        }

        .property-modal {
          width: 95%;
          max-width: 1200px;
          max-height: 95vh;
          background: #1e1e1e;
          border-radius: 12px;
          border: 1px solid #333;
          color: #fff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          cursor: default;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #333;
          background: #252525;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #fff;
        }

        .close-button {
          background: none;
          border: none;
          color: #ccc;
          font-size: 28px;
          cursor: pointer;
          padding: 4px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
          font-weight: bold;
        }

        .close-button:hover,
        .close-button:focus {
          background: #ff4444;
          color: #fff;
          outline: none;
          transform: scale(1.1);
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .message.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #5b6471;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.875rem;
          min-height: 32px;
        }

        .property-form {
          background: #252525;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .property-form h3 {
          margin: 0 0 24px 0;
          color: #fff;
          font-size: 1.25rem;
        }

        .form-grid {
          display: grid;
          gap: 24px;
        }

        .form-section h4 {
          margin: 0 0 16px 0;
          color: #e5e7eb;
          font-size: 1.1rem;
          border-bottom: 1px solid #333;
          padding-bottom: 8px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 6px;
          color: #d1d5db;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #374151;
          border-radius: 6px;
          background: #1f2937;
          color: #ffffff;
          font-size: 0.875rem;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: #9ca3af;
        }

        .form-group select option {
          background: #1f2937;
          color: #ffffff;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          background: #1f2937;
          color: #ffffff;
        }

        .image-input-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
          padding: 16px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
        }

        .image-input-container {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .image-input-container input {
          flex: 1;
        }

        .image-preview {
          position: relative;
          width: 100%;
          max-width: 300px;
          height: 200px;
          border: 2px dashed #374151;
          border-radius: 8px;
          overflow: hidden;
          background: #111827;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }

        .image-error-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 0.875rem;
          gap: 8px;
        }

        .image-error .image-preview {
          border-color: #ef4444;
          border-style: dashed;
        }

        .url-warning {
          border-color: #f59e0b !important;
          background-color: #fef3c7;
        }

        .url-warning-text {
          color: #f59e0b;
          font-size: 0.875rem;
          margin-top: 4px;
          padding: 4px 8px;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 4px;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .feature-input-group {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          align-items: center;
        }

        .feature-input-group input,
        .image-input-container input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #374151;
          border-radius: 6px;
          background: #1f2937;
          color: #ffffff;
          font-size: 0.875rem;
        }

        .feature-input-group input::placeholder,
        .image-input-container input::placeholder {
          color: #9ca3af;
        }

        .feature-input-group input:focus,
        .image-input-container input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .image-input-group input,
        .feature-input-group input {
          flex: 1;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #333;
        }

        .properties-list h3 {
          margin: 0 0 20px 0;
          color: #fff;
          font-size: 1.25rem;
        }

        .loading-spinner {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
        }

        .no-properties {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
        }

        .property-card {
          background: #252525;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
          transition: all 0.2s;
        }

        .property-card:hover {
          border-color: #3b82f6;
        }

        .property-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .property-main-info {
          flex: 1;
        }

        .property-address {
          margin: 0 0 4px 0;
          color: #fff;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .property-location {
          margin: 0 0 8px 0;
          color: #9ca3af;
          font-size: 0.875rem;
        }

        .property-price {
          color: #10b981;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .property-image {
          position: relative;
          width: 120px;
          height: 80px;
          border-radius: 6px;
          overflow: hidden;
          margin-left: 16px;
          flex-shrink: 0;
          background: #111827;
          border: 1px solid #374151;
        }

        .property-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .property-image-error {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 0.75rem;
          gap: 4px;
        }

        .image-count-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .image-gallery-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10001;
        }

        .image-gallery-modal {
          width: 90%;
          max-width: 1000px;
          max-height: 90vh;
          background: #1e1e1e;
          border-radius: 12px;
          border: 1px solid #333;
          color: #fff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #333;
          background: #252525;
        }

        .gallery-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #fff;
        }

        .gallery-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .gallery-image {
          position: relative;
          aspect-ratio: 4/3;
          border-radius: 8px;
          overflow: hidden;
          background: #111827;
          border: 1px solid #374151;
        }

        .gallery-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }

        .gallery-image:hover img {
          transform: scale(1.05);
        }

        .gallery-image-error {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 0.875rem;
          gap: 8px;
        }

        .property-specs {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }

        .spec {
          color: #e5e7eb;
          font-size: 0.875rem;
          background: #374151;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .property-meta {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }

        .meta {
          color: #9ca3af;
          font-size: 0.875rem;
        }

        .property-description {
          color: #d1d5db;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .property-features {
          color: #d1d5db;
          font-size: 0.875rem;
          margin-bottom: 16px;
        }

        .property-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid #333;
        }

        @media (max-width: 768px) {
          .property-modal {
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .property-header {
            flex-direction: column;
            gap: 16px;
          }

          .property-image {
            width: 100%;
            height: 200px;
            margin-left: 0;
          }

          .property-specs,
          .property-meta {
            flex-wrap: wrap;
          }

          .property-actions {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default PropertyManagementModal;
