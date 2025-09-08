import { DEFAULT_COLUMNS } from '../constants';

/**
 * Data processing utilities for CRM
 */

// Get current database type from system status or contacts
export const getCurrentDatabaseType = (systemStatus, rows) => {
  if (systemStatus?.database?.currentDatabase) {
    return systemStatus.database.type || 'sqlite';
  }
  
  // Check from contact data if available
  if (rows && Array.isArray(rows) && rows.length > 0 && rows[0]._dbType) {
    return rows[0]._dbType;
  }
  
  // Check from contact source
  if (rows && Array.isArray(rows) && rows.length > 0 && rows[0].source === 'chrome_extension') {
    return 'chrome_extension';
  }
  
  // Default to SQLite
  return 'sqlite';
};

// Normalized headers with database-aware columns
export const getNormalizedHeaders = (headers, rows, getCurrentDatabaseTypeFn) => {
  const base = [...new Set([...(headers || [])])];
  DEFAULT_COLUMNS.forEach((c) => {
    if (!base.includes(c)) base.push(c);
  });
  
  // Add Chrome Extension specific ALL available fields when viewing Chrome Extension data
  const currentDbType = getCurrentDatabaseTypeFn();
  if (currentDbType === 'chrome_extension') {
    const chromeExtensionFields = [
      // Core identification fields
      'id', 'agent_id',
      
      // Basic contact information
      'name', 'title', 'company', 'phone', 'email', 'address', 'website',
      
      // Professional details
      'bio', 'experience_years', 'license_number', 'license_state',
      
      // Enhanced data arrays
      'specializations', 'languages', 'certifications', 'service_areas',
      
      // Social media and ratings
      'social_media', 'ratings', 'profile_image_url', 'profile_image', 
      'realtor_url', 'available_photos',
      
      // CRM integration fields
      'crm_notes', 'crm_status', 'last_contacted', 'follow_up_at',
      'texts_sent', 'emails_sent', 'follow_up_priority', 'crm_data',
      'notes', 'status',
      
      // Property statistics
      'total_properties', 'avg_property_price', 'min_property_price', 
      'max_property_price', 'cities_served',
      
      // Legacy CRM fields
      'Notes', 'Status', 'LastContacted', 'FollowUpAt', 'TextsSent', 'FollowUpPriority',
      
      // Timestamps and metadata
      'created_at', 'updated_at', 'last_scraped_at', 'source',
      
      // Database metadata
      '_dbType', '_dbName'
    ];
    
    chromeExtensionFields.forEach(field => {
      if (!base.includes(field)) base.push(field);
    });
  }
  
  return base;
};

// Universal property accessor that works with both data structures
export const getContactProperty = (contact, fieldType, fallback = null, getCurrentDatabaseTypeFn) => {
  if (!contact) return fallback;
  
  const dbType = contact._dbType || contact.source || getCurrentDatabaseTypeFn();
  
  // Define field mappings for different field types
  const fieldMappings = {
    sqlite: {
      name: ['Name', 'name', 'Agent', 'FirstName', 'first_name'],
      phone: ['Phone', 'phone', 'Mobile', 'mobile', 'Tel', 'tel'],
      email: ['Email', 'email', 'agent_email'],
      address: ['Address', 'address', 'property_address'],
      city: ['City', 'city', 'property_city'],
      state: ['State', 'state', 'property_state'],
      company: ['Company', 'company', 'Brokerage', 'brokerage']
    },
    chrome_extension: {
      name: ['name', 'agent_name', 'Name'],
      phone: ['phone', 'agent_phone', 'Phone'],
      email: ['email', 'agent_email', 'Email'],
      address: ['address', 'property_address', 'Address'],
      city: ['property_city', 'city', 'City'],
      state: ['license_state', 'state', 'property_state', 'State'],
      company: ['company', 'brokerage', 'Company', 'Brokerage'],
      title: ['title', 'Title'],
      website: ['website', 'realtor_url', 'Website'],
      bio: ['bio', 'description', 'Bio'],
      license: ['license_number', 'license', 'License'],
      experience: ['experience_years', 'experience'],
      specializations: ['specializations', 'Specializations'],
      languages: ['languages', 'Languages'],
      certifications: ['certifications', 'Certifications'],
      service_areas: ['service_areas', 'ServiceAreas'],
      social_media: ['social_media', 'SocialMedia'],
      ratings: ['ratings', 'Ratings'],
      profile_image: ['profile_image_url', 'ProfileImage'],
      properties_count: ['total_properties', 'PropertiesCount'],
      avg_price: ['avg_property_price', 'AvgPrice'],
      cities_served: ['cities_served', 'CitiesServed']
    }
  };
  
  const fields = fieldMappings[dbType] || fieldMappings.sqlite;
  const possibleFields = fields[fieldType] || [];
  
  for (const field of possibleFields) {
    if (contact[field]) {
      return contact[field];
    }
  }
  
  return fallback;
};

// Format property values for display
export const formatPropertyValue = (contact, field) => {
  const value = contact[field];
  if (!value) return '';
  
  // Handle arrays (specializations, languages, certifications, service_areas)
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '';
  }
  
  // Handle objects (social_media, ratings)
  if (typeof value === 'object' && value !== null) {
    // For social media, show platform names
    if (field === 'social_media') {
      const platforms = Object.keys(value).filter(key => value[key]);
      return platforms.length > 0 ? platforms.join(', ') : '';
    }
    
    // For ratings, show average or formatted rating
    if (field === 'ratings') {
      if (value.average) return `${value.average}/5`;
      if (value.rating) return `${value.rating}/5`;
      if (value.score) return `${value.score}`;
      return JSON.stringify(value);
    }
    
    // For other objects, show as formatted JSON
    try {
      return JSON.stringify(value, null, 1).replace(/[\{\}\"]/g, '').replace(/,\s*/g, ', ');
    } catch {
      return String(value);
    }
  }
  
  // Format dates
  if (field.toLowerCase().includes('date') || field.toLowerCase().includes('at') || 
      field === 'created_at' || field === 'updated_at' || field === 'last_scraped_at') {
    try {
      const date = new Date(value);
      if (date.getFullYear() > 1900) {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }
    } catch {
      return value;
    }
  }
  
  // Format prices and numeric property values
  if (field.toLowerCase().includes('price') || 
      field === 'avg_property_price' || field === 'min_property_price' || field === 'max_property_price') {
    const numValue = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
    if (!isNaN(numValue) && numValue > 0) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue);
    }
  }
  
  // Format numeric fields
  if (field === 'total_properties' || field === 'cities_served' || field === 'experience_years') {
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      return numValue.toLocaleString();
    }
  }
  
  // Format square footage
  if (field === 'sqft' || field.toLowerCase().includes('square')) {
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      return `${numValue.toLocaleString()} sqft`;
    }
  }
  
  return value;
};

// Safe field access with fallback
export const safeFieldAccess = (contact, fieldName, fallback = '', getCurrentDatabaseTypeFn) => {
  if (!contact || !fieldName) return fallback;
  
  // Direct field access first
  if (contact[fieldName] !== undefined && contact[fieldName] !== null && contact[fieldName] !== '') {
    return contact[fieldName];
  }
  
  // Try case-insensitive search
  const dbType = getCurrentDatabaseTypeFn();
  const keys = Object.keys(contact);
  const matchingKey = keys.find(key => key.toLowerCase() === fieldName.toLowerCase());
  
  if (matchingKey && contact[matchingKey] !== undefined && contact[matchingKey] !== null && contact[matchingKey] !== '') {
    return contact[matchingKey];
  }
  
  return fallback;
};

// Helper functions for finding fields
export const findPhoneField = (contact, headers, getCurrentDatabaseTypeFn) => {
  const phoneFields = [
    'phone', 'agent_phone', 'Phone', 'Agent_Phone', 'PHONE', 'AGENT_PHONE',
    'mobile', 'Mobile', 'MOBILE', 'tel', 'Tel', 'TEL',
    'phone_number', 'PhoneNumber', 'PHONE_NUMBER'
  ];
  
  // Check headers first
  const headerPhoneField = headers.find(h => phoneFields.some(pf => h.toLowerCase().includes(pf.toLowerCase())));
  if (headerPhoneField && contact[headerPhoneField]) {
    return headerPhoneField;
  }
  
  // Check contact fields directly
  return phoneFields.find(field => contact[field]);
};

export const findNameField = (contact, headers, getCurrentDatabaseTypeFn) => {
  const nameFields = [
    'name', 'agent_name', 'Name', 'Agent_Name', 'NAME', 'AGENT_NAME',
    'Agent', 'AGENT', 'FirstName', 'first_name', 'FIRST_NAME',
    'full_name', 'FullName', 'FULL_NAME'
  ];
  
  // Check headers first
  const headerNameField = headers.find(h => nameFields.some(nf => h.toLowerCase().includes(nf.toLowerCase())));
  if (headerNameField && contact[headerNameField]) {
    return headerNameField;
  }
  
  // Check contact fields directly
  return nameFields.find(field => contact[field]);
};

// Get communication count from notes and TextsSent field
export const getCommunicationCount = (contact) => {
  const textsSent = parseInt(contact.TextsSent) || 0;
  const notesCount = contact.Notes ? (contact.Notes.match(/\n/g) || []).length + 1 : 0;
  return textsSent + notesCount;
};

// Format follow-up date
export const formatFollowUpDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  } catch {
    return dateString;
  }
};

// Filter rows based on search and status
export const getFilteredRows = (rows, search, statusFilter, normalizedHeaders, findPhoneFieldFn) => {
  if (!search && !statusFilter) return rows;
  
  return rows.filter(row => {
    // Status filter
    if (statusFilter && row.Status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      
      // Search in all normalized headers
      const matchesField = normalizedHeaders.some(header => {
        const value = row[header];
        return value && value.toString().toLowerCase().includes(searchLower);
      });
      
      // Special phone number search
      const phoneField = findPhoneFieldFn(row);
      const phoneValue = phoneField ? row[phoneField] : '';
      const matchesPhone = phoneValue && phoneValue.toString().replace(/[^\d]/g, '').includes(search.replace(/[^\d]/g, ''));
      
      return matchesField || matchesPhone;
    }
    
    return true;
  });
};

// Get follow-up filtered rows
export const getFollowUpRows = (rows, showFollowUpQueue, followUpFilter) => {
  if (!showFollowUpQueue) return [];
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return rows.filter(row => {
    if (!row.FollowUpAt) return false;
    
    const followUpDate = new Date(row.FollowUpAt);
    const followUpDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());
    
    switch (followUpFilter) {
      case 'overdue':
        return followUpDay < today;
      case 'today':
        return followUpDay.getTime() === today.getTime();
      case 'due':
        return followUpDay <= today;
      default:
        return true;
    }
  }).sort((a, b) => {
    // Sort by priority first, then by date
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const aPriority = priorityOrder[a.FollowUpPriority] ?? 1;
    const bPriority = priorityOrder[b.FollowUpPriority] ?? 1;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    return new Date(a.FollowUpAt) - new Date(b.FollowUpAt);
  });
};

// Sort rows
export const getSortedRows = (rows, sortBy) => {
  if (!sortBy.key) return rows;
  
  return [...rows].sort((a, b) => {
    let aVal = a[sortBy.key] ?? '';
    let bVal = b[sortBy.key] ?? '';
    
    // Handle numeric sorting
    if (!isNaN(aVal) && !isNaN(bVal)) {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    } else {
      aVal = aVal.toString().toLowerCase();
      bVal = bVal.toString().toLowerCase();
    }
    
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortBy.dir === 'asc' ? comparison : -comparison;
  });
};
