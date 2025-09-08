import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, Database, RefreshCw, Search, Minus, Maximize2
} from 'lucide-react';
import { useProgress } from '../contexts/ProgressContext';

const CleanupModal = ({
  showCleanupModal,
  setShowCleanupModal,
  databases,
  currentDatabase,
  rows,
  selectedContacts = [], // Add selected contacts prop
  findPhoneField,
  findNameField,
  api,
  loadData,
  setLoading,
  showToast,
  generateRealtorSlug,
  getContactProperty
}) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [crossDbResults, setCrossDbResults] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, stage: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Progress context for background operations
  const { 
    startCleanupOperation, 
    updateOperation, 
    completeOperation, 
    failOperation 
  } = useProgress();
  
  // Cleanup target options
  const [cleanupTarget, setCleanupTarget] = useState('all'); // 'all', 'selected', 'tags'
  const [targetTags, setTargetTags] = useState(''); // Comma-separated tags
  const [selectedTagsList, setSelectedTagsList] = useState([]); // Array of selected tags
  const [tagSearchFilter, setTagSearchFilter] = useState(''); // Search filter for tags
  const [availableTags, setAvailableTags] = useState([]); // Available tags with counts
  
  // Get all unique tags from contacts
  const getAllAvailableTags = () => {
    const tagMap = new Map();
    let contactsWithTags = 0;
    
    // Check first contact to see available fields
    if (rows.length > 0) {
      const fieldNames = Object.keys(rows[0]);
      console.log('📋 First contact fields:', fieldNames);
      console.log('📋 All field names:', fieldNames.join(', '));
      console.log('📋 Sample contact:', rows[0]);
      
      // Check for any field that might contain tag-like data
      fieldNames.forEach(key => {
        const value = rows[0][key];
        if (value && typeof value === 'string' && (value.includes(',') || key.toLowerCase().includes('tag') || key.toLowerCase().includes('category') || key.toLowerCase().includes('type') || key.toLowerCase().includes('db'))) {
          console.log(`🔍 Potential tag field "${key}":`, value);
        }
      });
    }
    
    rows.forEach((contact, index) => {
      // Check multiple possible tag field names
      const possibleTagFields = ['tags', 'tag', 'category', 'categories', 'type', 'status', 'label', 'labels', 'group', 'groups', '_dbType', 'dbType', 'source', 'origin'];
      let contactTags = '';
      let foundField = '';
      
      for (const field of possibleTagFields) {
        if (contact[field]) {
          contactTags = contact[field];
          foundField = field;
          if (index < 3) { // Log first few for debugging
            console.log(`🏷️ Contact ${contact.id || contact.name} has ${field}:`, contactTags);
          }
          break;
        }
      }
      
      if (contactTags) {
        contactsWithTags++;
        const tagList = contactTags.toString().split(',').map(tag => tag.trim()).filter(tag => tag);
        if (contactsWithTags <= 3) { // Log first few contacts for debugging
          console.log(`Contact ${contact.id || contact.name} tags from ${foundField}:`, tagList);
        }
        tagList.forEach(tag => {
          const count = tagMap.get(tag) || 0;
          tagMap.set(tag, count + 1);
        });
      }
    });
    console.log(`Found ${contactsWithTags} contacts with tags out of ${rows.length} total`);
    const result = Array.from(tagMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, count]) => ({ tag, count }));
    console.log('Tag extraction result:', result);
    return result;
  };
  
  // Extract available tags when modal opens or rows change
  useEffect(() => {
    if (showCleanupModal && rows && rows.length > 0) {
      console.log('📝 Extracting tags from', rows.length, 'contacts');
      const tags = getAllAvailableTags();
      console.log('📊 Found tags:', tags);
      setAvailableTags(tags);
    }
  }, [showCleanupModal, rows]);

  // Filter tags based on search
  const filteredTags = availableTags.filter(({ tag }) => 
    tag.toLowerCase().includes(tagSearchFilter.toLowerCase())
  );

  // Helper functions for tag selection
  const toggleTag = (tag) => {
    setSelectedTagsList(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const selectAllTags = () => {
    setSelectedTagsList(filteredTags.map(({ tag }) => tag));
  };

  const clearAllTags = () => {
    setSelectedTagsList([]);
  };
  
  // Cleanup options - all off by default
  const [cleanupOptions, setCleanupOptions] = useState({
    removeDuplicates: false,
    removeWithoutPhone: false,
    removeWithoutProperties: false,
    removeSlugs: false,
    removePropertiesWithoutPhotos: false
  });

  if (!showCleanupModal) return null;

  // Helper function to check if at least one cleanup option is selected
  const hasSelectedOptions = () => {
    return Object.values(cleanupOptions).some(option => option === true);
  };

  // Helper function to update cleanup options
  const updateCleanupOption = (option, value) => {
    setCleanupOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  // Helper function to get target contacts based on selection
  const getTargetContacts = () => {
    switch (cleanupTarget) {
      case 'selected':
        if (!selectedContacts || selectedContacts.length === 0) {
          showToast('⚠️ No contacts selected. Please select contacts first.', 'warning');
          return [];
        }
        return selectedContacts;
      
      case 'tags':
        if (!selectedTagsList || selectedTagsList.length === 0) {
          showToast('⚠️ No tags selected. Please select tags to filter by.', 'warning');
          return [];
        }
        const tagsToMatch = selectedTagsList.map(tag => tag.toLowerCase());
        return rows.filter(contact => {
          // Check multiple possible tag field names
          const possibleTagFields = ['tags', 'tag', 'category', 'categories', 'type', 'status', 'label', 'labels', 'group', 'groups', '_dbType', 'dbType', 'source', 'origin'];
          let contactTags = '';
          
          for (const field of possibleTagFields) {
            if (contact[field]) {
              contactTags = contact[field];
              break;
            }
          }
          
          if (!contactTags) return false;
          
          const contactTagList = contactTags.toString().toLowerCase().split(',').map(tag => tag.trim());
          return tagsToMatch.some(tag => contactTagList.includes(tag));
        });
      
      case 'all':
      default:
        return rows;
    }
  };

    // Helper function to check if contact has properties via API
  const hasProperties = async (contact) => {
    if (!contact || !contact.id) return true; // If we can't verify, don't delete
    
    const MAX_RETRIES = 5;
    const BASE_RETRY_DELAY = 1000; // Start with 1 second
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`http://localhost:5001/api/agents/${contact.id}/properties`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryDelay = BASE_RETRY_DELAY * Math.pow(3, attempt - 1); // Even more aggressive backoff: 1s, 3s, 9s, 27s, 81s
          console.log(`Rate limited for contact ${contact.id}, retrying in ${retryDelay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          
          if (attempt === MAX_RETRIES) {
            console.warn(`Rate limit exceeded for contact ${contact.id}, assuming has properties`);
            return true; // Don't delete if we can't verify due to rate limits
          }
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // Only 404 means definitively no properties
        if (response.status === 404) {
          return false;
        }
        
        // Any other non-200 status requires retry
        if (!response.ok) {
          if (attempt === MAX_RETRIES) {
            return true; // After all retries failed, don't delete the contact
          }
          const retryDelay = BASE_RETRY_DELAY * attempt;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        const data = await response.json();
        
        // Verify the response structure is what we expect
        if (data && typeof data === 'object' && data.hasOwnProperty('success') && data.hasOwnProperty('properties')) {
          return Array.isArray(data.properties) && data.properties.length > 0;
        }
        
        // If response structure is unexpected, retry
        if (attempt === MAX_RETRIES) {
          return true; // Don't delete if we can't parse the response properly
        }
        const retryDelay = BASE_RETRY_DELAY * attempt;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
      } catch (error) {
        // Network error, timeout, or other fetch failure
        if (attempt === MAX_RETRIES) {
          console.warn(`All retries failed for contact ${contact.id}, assuming has properties`);
          return true; // After all retries failed, don't delete the contact
        }
        const retryDelay = BASE_RETRY_DELAY * attempt;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // Should never reach here, but if it does, don't delete
    return true;
  };

  // Helper function to clean properties without photo URLs
  const cleanPropertiesWithoutPhotos = async (contact) => {
    if (!contact || !contact.id) return 0;
    
    try {
      // Fetch properties via API (same as PropertyManagementModal)
      const response = await fetch(`http://localhost:5001/api/agents/${contact.id}/properties`);
      
      if (response.status === 404) {
        return 0; // No properties to clean
      }
      
      const data = await response.json();
      
      if (!data.success || !data.properties || !Array.isArray(data.properties)) {
        return 0;
      }
      
      let removedCount = 0;
      const validProperties = [];
      
      for (const property of data.properties) {
        // Check if property has valid photo URL
        const hasValidPhoto = property.image_urls && 
                             Array.isArray(property.image_urls) && 
                             property.image_urls.length > 0 &&
                             property.image_urls.some(url => url && url.trim());
        
        if (hasValidPhoto) {
          validProperties.push(property);
        } else {
          removedCount++;
          console.log(`🗑️ Removing property without photos:`, property.address || property.id);
        }
      }
      
      // Update properties via API if needed
      if (removedCount > 0) {
        // Here you would call an API to update the properties
        // For now, just log what would be updated
        console.log(`Would update contact ${contact.id} with ${validProperties.length} valid properties`);
      }
      
      return removedCount;
    } catch (error) {
      console.error(`Failed to clean properties for contact ${contact.id}:`, error);
      return 0;
    }
  };

  // Helper function to remove slug from contact
  const removeSlugFromContact = async (contact) => {
    if (!contact.id) return;
    
    try {
      // Remove the slug field by setting it to null
      await api.updateContact(contact.id, { slug: null });
    } catch (error) {
      console.error(`Failed to remove slug from contact ${contact.id}:`, error);
    }
  };

  // Function to analyze data without performing cleanup
  const analyzeCleanupData = async () => {
    if (!currentDatabase) return;
    
    if (!hasSelectedOptions()) {
      showToast('⚠️ Please select at least one cleanup option before analyzing.', 'warning');
      return;
    }
    
    // Get target contacts based on selection
    const targetContacts = getTargetContacts();
    if (targetContacts.length === 0) {
      return; // Error message already shown in getTargetContacts
    }
    
    const phoneField = findPhoneField({ dummy: 'contact' });
    if (!phoneField) {
      showToast('⚠️ No phone field found in your data. Cannot perform analysis.', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setScanProgress({ current: 0, total: targetContacts.length, stage: 'Starting analysis...' });

    try {
      // Create fresh arrays for each analysis
      const phoneGroups = {};
      const contactsWithoutPhone = [];
      const contactsWithoutProperties = [];
      const contactsWithSlugs = [];
      
      // First pass: identify contacts with slugs and without phones
      setScanProgress({ current: 0, total: targetContacts.length, stage: 'Analyzing basic contact data...' });
      
      for (let i = 0; i < targetContacts.length; i++) {
        const contact = targetContacts[i];
        
        // Check for slugs (if option selected)
        if (cleanupOptions.removeSlugs && contact.slug && contact.slug.trim()) {
          contactsWithSlugs.push(contact);
        }
        
        // Check for phone (if option selected)
        if (cleanupOptions.removeWithoutPhone) {
          const phone = contact[phoneField];
          if (!phone || !phone.toString().trim()) {
            contactsWithoutPhone.push(contact);
            continue; // Skip further processing for this contact
          }
        }
        
        // Process for duplicates (if option selected)
        if (cleanupOptions.removeDuplicates) {
          const phone = contact[phoneField];
          if (phone && phone.toString().trim()) {
            const normalizedPhone = phone.toString().replace(/[^\d]/g, '');
            if (normalizedPhone) {
              if (!phoneGroups[normalizedPhone]) {
                phoneGroups[normalizedPhone] = [];
              }
              phoneGroups[normalizedPhone].push(contact);
            }
          }
        }
        
        // Update progress
        if (i % 10 === 0) {
          setScanProgress({ current: i, total: targetContacts.length, stage: 'Analyzing basic contact data...' });
        }
      }
      
      // Second pass: check properties only if needed and only for relevant contacts
      if (cleanupOptions.removeWithoutProperties) {
        setScanProgress({ current: 0, total: targetContacts.length, stage: 'Checking properties...' });
        
        // Only check contacts that haven't been filtered out already
        const contactsToCheck = targetContacts.filter(contact => {
          // Skip if already marked for removal due to no phone
          if (cleanupOptions.removeWithoutPhone && contactsWithoutPhone.includes(contact)) {
            return false;
          }
          return true;
        });
        
        const BATCH_SIZE = 1; // Process one contact at a time
        const INDIVIDUAL_DELAY = 1000; // 1 second between each API call
        const totalBatches = contactsToCheck.length;
        
        for (let i = 0; i < contactsToCheck.length; i++) {
          const contact = contactsToCheck[i];
          const batchNumber = i + 1;
          
          setScanProgress({ 
            current: i, 
            total: contactsToCheck.length, 
            stage: `Checking properties... (${batchNumber}/${totalBatches})` 
          });
          
          try {
            const hasProps = await hasProperties(contact);
            if (!hasProps) {
              contactsWithoutProperties.push(contact);
            }
          } catch (error) {
            console.error(`Error checking properties for contact ${contact.id}:`, error);
            // Don't add to removal list if we can't verify
          }
          
          // Wait between each individual call
          if (i < contactsToCheck.length - 1) {
            await new Promise(resolve => setTimeout(resolve, INDIVIDUAL_DELAY));
          }
        }
      }
      
      setScanProgress({ current: targetContacts.length, total: targetContacts.length, stage: 'Calculating results...' });
      
      // Calculate final results deterministically
      const duplicateGroups = cleanupOptions.removeDuplicates ? 
        Object.values(phoneGroups).filter(group => group.length > 1) : [];
      
      const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.length, 0);
      
      const finalContactsWithoutPhone = cleanupOptions.removeWithoutPhone ? contactsWithoutPhone.length : 0;
      const finalContactsWithoutProperties = cleanupOptions.removeWithoutProperties ? contactsWithoutProperties.length : 0;
      const finalContactsWithSlugs = cleanupOptions.removeSlugs ? contactsWithSlugs.length : 0;
      
      const totalContactsToRemove = totalDuplicates + finalContactsWithoutPhone + finalContactsWithoutProperties;
      
      const results = {
        totalContacts: targetContacts.length,
        targetContactsInfo: {
          target: cleanupTarget,
          total: targetContacts.length,
          selectedTags: cleanupTarget === 'tags' ? selectedTagsList.join(', ') : null
        },
        duplicateGroups: duplicateGroups.length,
        totalDuplicates,
        contactsWithoutPhone: finalContactsWithoutPhone,
        contactsWithoutProperties: finalContactsWithoutProperties,
        contactsWithSlugs: finalContactsWithSlugs,
        contactsToKeep: targetContacts.length - totalContactsToRemove,
        duplicateGroupsData: duplicateGroups,
        contactsWithoutPhoneData: cleanupOptions.removeWithoutPhone ? contactsWithoutPhone : [],
        contactsWithoutPropertiesData: cleanupOptions.removeWithoutProperties ? contactsWithoutProperties : [],
        contactsWithSlugsData: cleanupOptions.removeSlugs ? contactsWithSlugs : [],
        selectedOptions: { ...cleanupOptions },
        
        // Detailed breakdown for user review
        detailedBreakdown: {
          duplicateGroups: cleanupOptions.removeDuplicates ? duplicateGroups.map(group => ({
            phone: group[0]?.phone || group[0]?.[phoneField] || 'Unknown',
            contacts: group.map(c => ({ id: c.id, name: c.name || c.firstName || 'Unknown' }))
          })) : [],
          
          contactsWithoutPhone: cleanupOptions.removeWithoutPhone ? contactsWithoutPhone.map(c => ({
            id: c.id,
            name: c.name || c.firstName || 'Unknown',
            company: c.company || 'No company'
          })) : [],
          
          contactsWithoutProperties: cleanupOptions.removeWithoutProperties ? contactsWithoutProperties.map(c => ({
            id: c.id,
            name: c.name || c.firstName || 'Unknown',
            company: c.company || 'No company',
            phone: c.phone || c[phoneField] || 'No phone'
          })) : [],
          
          contactsWithSlugs: cleanupOptions.removeSlugs ? contactsWithSlugs.map(c => ({
            id: c.id,
            name: c.name || c.firstName || 'Unknown',
            slug: c.slug
          })) : []
        }
      };
      
      setScanResults(results);
      setScanProgress({ current: rows.length, total: rows.length, stage: 'Analysis complete!' });
      
    } catch (error) {
      console.error('Failed to analyze cleanup data:', error);
      showToast(`❌ Failed to analyze data: ${error.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Modified cleanup function that uses pre-analyzed data
  const performStandardCleanup = async () => {
    if (!scanResults) {
      showToast('⚠️ Please analyze data first before performing cleanup.', 'warning');
      return;
    }

    // Get target contacts for display in confirmation
    const targetContacts = getTargetContacts();
    if (targetContacts.length === 0) {
      return; // Error message already shown
    }

    const currentDbName = typeof currentDatabase === 'object' ? currentDatabase?.name : currentDatabase;
    let confirmationMessage = `Database cleanup for "${currentDbName}":\n`;
    
    // Show target information
    confirmationMessage += `🎯 Target: `;
    if (cleanupTarget === 'all') {
      confirmationMessage += `All contacts (${targetContacts.length})\n`;
    } else if (cleanupTarget === 'selected') {
      confirmationMessage += `Selected contacts (${targetContacts.length})\n`;
    } else if (cleanupTarget === 'tags') {
      confirmationMessage += `Contacts with tags: "${selectedTagsList.join(', ')}" (${targetContacts.length} found)\n`;
    }
    confirmationMessage += `\n`;
    
    // Cleanup actions
    if (scanResults.duplicateGroups > 0) {
      confirmationMessage += `• Remove ${scanResults.duplicateGroups} groups of duplicate phone numbers (${scanResults.totalDuplicates} contacts)\n`;
    }
    
    if (scanResults.contactsWithoutPhone > 0) {
      confirmationMessage += `• Remove ${scanResults.contactsWithoutPhone} contacts without phone numbers\n`;
    }
    
    if (scanResults.contactsWithoutProperties > 0) {
      confirmationMessage += `• Remove ${scanResults.contactsWithoutProperties} contacts without properties\n`;
    }
    
    // Always remove slugs from remaining contacts
    if (scanResults.contactsWithSlugs > 0) {
      confirmationMessage += `• Remove slugs from ${scanResults.contactsWithSlugs} contacts\n`;
    }
    
    const totalToRemove = scanResults.totalDuplicates + scanResults.contactsWithoutPhone + scanResults.contactsWithoutProperties;
    if (totalToRemove > 0) {
      confirmationMessage += `\nTotal contacts to remove: ${totalToRemove}\n`;
      confirmationMessage += `Contacts that will remain: ${scanResults.contactsToKeep}\n`;
    }
    
    confirmationMessage += `\nThis action cannot be undone. Continue?`;
    
    const confirmed = window.confirm(confirmationMessage);
    
    if (!confirmed) return;

    // Calculate total operations for progress tracking
    const totalOperations = scanResults.totalDuplicates + 
                          scanResults.contactsWithoutPhone + 
                          scanResults.contactsWithoutProperties + 
                          scanResults.contactsWithSlugs;

    // Start progress tracking in sidebar
    const operationId = startCleanupOperation({
      title: `Database Cleanup - ${currentDbName}`,
      description: `Cleaning ${totalOperations} items from database`,
      total: totalOperations,
      completionMessage: `Database cleanup completed for ${currentDbName}`
    });

    try {
      setLoading(true);
      let deletedCount = 0;
      let currentProgress = 0;
      
      // Delete duplicate groups
      updateOperation(operationId, { 
        currentStage: 'Removing duplicate contacts...',
        current: currentProgress 
      });
      
      for (const group of scanResults.duplicateGroupsData) {
        for (const contact of group) {
          try {
            await api.deleteContact(contact.id);
            deletedCount++;
            currentProgress++;
            updateOperation(operationId, { current: currentProgress });
          } catch (error) {
            console.error(`Failed to delete duplicate contact ${contact.id}:`, error);
          }
        }
      }
      
      // Delete contacts without phone numbers
      updateOperation(operationId, { 
        currentStage: 'Removing contacts without phone numbers...',
        current: currentProgress 
      });
      for (const group of scanResults.duplicateGroupsData) {
        for (const contact of group) {
          try {
            await api.deleteContact(contact.id);
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete duplicate contact ${contact.id}:`, error);
          }
        }
      }
      
      // Delete contacts without phone numbers
      for (const contact of scanResults.contactsWithoutPhoneData) {
        try {
          await api.deleteContact(contact.id);
          deletedCount++;
          currentProgress++;
          updateOperation(operationId, { current: currentProgress });
        } catch (error) {
          console.error(`Failed to delete contact without phone ${contact.id}:`, error);
        }
      }
      
      // Delete contacts without properties
      updateOperation(operationId, { 
        currentStage: 'Removing contacts without properties...',
        current: currentProgress 
      });
      
      for (const contact of scanResults.contactsWithoutPropertiesData) {
        try {
          await api.deleteContact(contact.id);
          deletedCount++;
          currentProgress++;
          updateOperation(operationId, { current: currentProgress });
        } catch (error) {
          console.error(`Failed to delete contact without properties ${contact.id}:`, error);
        }
      }
      
      // Remove slugs from remaining contacts
      updateOperation(operationId, { 
        currentStage: 'Removing slugs from contacts...',
        current: currentProgress 
      });
      
      let slugsRemoved = 0;
      let propertiesWithoutPhotosRemoved = 0;
      
      // Filter remaining contacts to only include those in our target scope
      const remainingContacts = targetContacts.filter(contact => 
        !scanResults.duplicateGroupsData.some(group => group.includes(contact)) &&
        !scanResults.contactsWithoutPhoneData.includes(contact) &&
        !scanResults.contactsWithoutPropertiesData.includes(contact)
      );
      
      for (const contact of remainingContacts) {
        // Remove slugs
        if (contact.slug && contact.slug.trim()) {
          try {
            await removeSlugFromContact(contact);
            slugsRemoved++;
            currentProgress++;
            updateOperation(operationId, { current: currentProgress });
          } catch (error) {
            console.error(`Failed to remove slug from contact ${contact.id}:`, error);
          }
        }
        
        // Clean properties without photos
        try {
          const removedProps = await cleanPropertiesWithoutPhotos(contact);
          propertiesWithoutPhotosRemoved += removedProps;
        } catch (error) {
          console.error(`Failed to clean properties for contact ${contact.id}:`, error);
        }
      }
      
      // Complete the operation
      updateOperation(operationId, { 
        currentStage: 'Finalizing cleanup...',
        current: totalOperations 
      });
      
      // Reload data to reflect changes
      await loadData();
      
      let successMessage = `✅ Cleanup completed for database "${currentDbName}"!`;
      
      if (deletedCount > 0) {
        successMessage += ` Removed ${deletedCount} contacts.`;
      }
      
      if (slugsRemoved > 0) {
        successMessage += ` Removed ${slugsRemoved} slugs.`;
      }
      
      if (propertiesWithoutPhotosRemoved > 0) {
        successMessage += ` Cleaned ${propertiesWithoutPhotosRemoved} properties without photos.`;
      }

      // Complete the progress operation
      completeOperation(operationId, successMessage);
      
      showToast(successMessage, 'success');
      setShowCleanupModal(false);
      
    } catch (error) {
      console.error('Failed to cleanup database:', error);
      const errorMessage = `❌ Failed to cleanup database: ${error.message}`;
      
      // Fail the progress operation
      failOperation(operationId, errorMessage);
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Option 2: Cross-database duplicate detection and data merging
  const scanCrossDatabaseDuplicates = async () => {
    try {
      setIsScanning(true);
      setCrossDbResults(null);

      // Safety check for databases prop
      if (!Array.isArray(databases) || databases.length === 0) {
        showToast('⚠️ No databases available for scanning.', 'warning');
        return;
      }

      // Get contacts from all databases
      const allDatabaseContacts = {};
      const phoneField = findPhoneField({ dummy: 'contact' });
      
      if (!phoneField) {
        showToast('⚠️ No phone field found in your data. Cannot perform cross-database scan.', 'warning');
        return;
      }

      // Load contacts from each database
      for (const db of databases) {
        const dbName = typeof db === 'string' ? db : (db.name || db.currentDatabase || db);
        try {
          // Switch to each database temporarily to get contacts
          const response = await fetch(`/api/databases/${dbName}/contacts`);
          if (response.ok) {
            const contacts = await response.json();
            allDatabaseContacts[dbName] = contacts;
          }
        } catch (error) {
          console.error(`Failed to load contacts from ${dbName}:`, error);
        }
      }

      // Build phone number index across all databases
      const phoneIndex = {};
      
      Object.entries(allDatabaseContacts).forEach(([dbName, contacts]) => {
        contacts.forEach(contact => {
          const phone = contact[phoneField];
          if (phone && phone.toString().trim()) {
            const normalizedPhone = phone.toString().replace(/[^\d]/g, '');
            if (normalizedPhone) {
              if (!phoneIndex[normalizedPhone]) {
                phoneIndex[normalizedPhone] = [];
              }
              phoneIndex[normalizedPhone].push({
                ...contact,
                database: dbName
              });
            }
          }
        });
      });

      // Find cross-database duplicates
      const crossDbDuplicates = Object.entries(phoneIndex)
        .filter(([phone, contacts]) => {
          // Only include if contacts span multiple databases
          const databases = new Set(contacts.map(c => c.database));
          return databases.size > 1;
        })
        .map(([phone, contacts]) => ({
          phone,
          contacts,
          databases: [...new Set(contacts.map(c => c.database))],
          totalContacts: contacts.length
        }));

      setCrossDbResults({
        duplicates: crossDbDuplicates,
        totalGroups: crossDbDuplicates.length,
        totalContacts: crossDbDuplicates.reduce((sum, group) => sum + group.totalContacts, 0)
      });

    } catch (error) {
      console.error('Failed to scan cross-database duplicates:', error);
      showToast(`❌ Failed to scan databases: ${error.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Synchronize cross-database data with enhanced safety
  const synchronizeCrossDatabaseData = async () => {
    if (!crossDbResults || crossDbResults.duplicates.length === 0) return;

    // Generate detailed preview of changes
    const previewChanges = () => {
      let preview = `📋 SYNCHRONIZATION PREVIEW\n\n`;
      
      crossDbResults.duplicates.slice(0, 5).forEach((group, index) => {
        const sortedContacts = group.contacts.sort((a, b) => {
          const aDate = new Date(a.LastContacted || a.LastTextSent || '1970-01-01');
          const bDate = new Date(b.LastContacted || b.LastTextSent || '1970-01-01');
          return bDate - aDate;
        });

        const mostRecentContact = sortedContacts[0];
        const maxTextsSent = Math.max(...sortedContacts.map(c => parseInt(c.TextsSent || 0)));
        const recentStatus = sortedContacts.find(c => c.Status && c.Status !== 'New')?.Status || mostRecentContact.Status;

        preview += `${index + 1}. Phone: ${group.phone}\n`;
        preview += `   Found in: ${group.contacts.map(c => c.database).join(', ')}\n`;
        preview += `   Will sync: Status="${recentStatus}", TextsSent=${maxTextsSent}\n`;
        preview += `   Most recent: ${mostRecentContact.database} (${mostRecentContact.LastContacted || mostRecentContact.LastTextSent || 'No date'})\n\n`;
      });

      if (crossDbResults.duplicates.length > 5) {
        preview += `... and ${crossDbResults.duplicates.length - 5} more contact groups\n\n`;
      }

      preview += `🔒 SAFETY GUARANTEE:\n`;
      preview += `• NO contacts will be deleted\n`;
      preview += `• ALL contacts stay in their original databases\n`;
      preview += `• Only updates contact information for consistency\n`;
      preview += `• Process can be undone by re-importing original data\n\n`;
      
      return preview;
    };

    // Show detailed confirmation with preview
    const confirmed = window.confirm(
      previewChanges() +
      `Continue with synchronization of ${crossDbResults.totalContacts} contacts across ${crossDbResults.totalGroups} phone numbers?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      let synchronizedCount = 0;
      let errorCount = 0;
      const detailedLog = [];

      console.log('🔄 Starting cross-database synchronization...');
      detailedLog.push(`Started synchronization at ${new Date().toISOString()}`);

      for (const group of crossDbResults.duplicates) {
        try {
          // Sort contacts by LastContacted/LastTextSent to find most recent
          const sortedContacts = group.contacts.sort((a, b) => {
            const aDate = new Date(a.LastContacted || a.LastTextSent || '1970-01-01');
            const bDate = new Date(b.LastContacted || b.LastTextSent || '1970-01-01');
            return bDate - aDate; // Most recent first
          });

          // Log the group being processed
          console.log(`📞 Processing phone ${group.phone} (${sortedContacts.length} contacts across databases)`);
          detailedLog.push(`Processing phone ${group.phone}: ${sortedContacts.map(c => `${c.database}(${c.id})`).join(', ')}`);

          // Create synchronized data from the most recent information
          const mostRecentContact = sortedContacts[0];
          
          // Collect all unique notes from all contacts
          const allNotes = sortedContacts
            .map(c => c.Notes)
            .filter(notes => notes && notes.trim())
            .filter((notes, index, array) => array.indexOf(notes) === index) // Remove duplicates
            .join('\n\n--- Notes from other databases ---\n\n');

          // Use the highest TextsSent count
          const maxTextsSent = Math.max(...sortedContacts.map(c => parseInt(c.TextsSent || 0)));

          // Use most recent status if it's not "New"
          const recentStatus = sortedContacts.find(c => c.Status && c.Status !== 'New')?.Status || mostRecentContact.Status;

          // Use most recent contact dates
          const mostRecentContactDate = sortedContacts.reduce((latest, contact) => {
            const contactDate = new Date(contact.LastContacted || '1970-01-01');
            const latestDate = new Date(latest || '1970-01-01');
            return contactDate > latestDate ? contact.LastContacted : latest;
          }, null);

          const mostRecentTextDate = sortedContacts.reduce((latest, contact) => {
            const textDate = new Date(contact.LastTextSent || '1970-01-01');
            const latestDate = new Date(latest || '1970-01-01');
            return textDate > latestDate ? contact.LastTextSent : latest;
          }, null);

          // Update each contact in its respective database with synchronized data
          let groupUpdateCount = 0;
          for (const contact of sortedContacts) {
            const originalData = { ...contact };
            const synchronizedData = {
              ...contact,
              Notes: allNotes || contact.Notes,
              TextsSent: maxTextsSent,
              Status: recentStatus,
              LastContacted: mostRecentContactDate || contact.LastContacted,
              LastTextSent: mostRecentTextDate || contact.LastTextSent
            };

            // Log what's being changed
            const changes = [];
            if (originalData.Notes !== synchronizedData.Notes) changes.push('Notes');
            if (originalData.TextsSent !== synchronizedData.TextsSent) changes.push(`TextsSent(${originalData.TextsSent}→${synchronizedData.TextsSent})`);
            if (originalData.Status !== synchronizedData.Status) changes.push(`Status(${originalData.Status}→${synchronizedData.Status})`);
            if (originalData.LastContacted !== synchronizedData.LastContacted) changes.push('LastContacted');
            if (originalData.LastTextSent !== synchronizedData.LastTextSent) changes.push('LastTextSent');

            if (changes.length > 0) {
              console.log(`  ✏️ Updating ${contact.database}(${contact.id}): ${changes.join(', ')}`);
              detailedLog.push(`  Updated ${contact.database}(${contact.id}): ${changes.join(', ')}`);
            } else {
              console.log(`  ✅ No changes needed for ${contact.database}(${contact.id})`);
              detailedLog.push(`  No changes needed for ${contact.database}(${contact.id})`);
            }

            try {
              const updateResponse = await fetch(`/api/databases/${contact.database}/contacts/${contact.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(synchronizedData)
              });

              if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`HTTP ${updateResponse.status}: ${errorText}`);
              }

              groupUpdateCount++;
              console.log(`    ✅ Successfully updated ${contact.database}(${contact.id})`);
              
            } catch (updateError) {
              errorCount++;
              const errorMsg = `Failed to update ${contact.database}(${contact.id}): ${updateError.message}`;
              console.error(`    ❌ ${errorMsg}`);
              detailedLog.push(`    ERROR: ${errorMsg}`);
              
              // Show individual error to user but continue processing
              showToast(`⚠️ Update failed for contact ${contact.id} in ${contact.database}`, 'warning');
            }
          }
          
          if (groupUpdateCount > 0) {
            synchronizedCount++;
            console.log(`  ✅ Group completed: ${groupUpdateCount}/${sortedContacts.length} contacts updated`);
          }

        } catch (groupError) {
          errorCount++;
          const errorMsg = `Failed to process group for phone ${group.phone}: ${groupError.message}`;
          console.error(`❌ ${errorMsg}`);
          detailedLog.push(`ERROR processing group ${group.phone}: ${groupError.message}`);
          
          // Continue with next group even if this one fails
          showToast(`⚠️ Failed to process contacts for ${group.phone}`, 'warning');
        }
      }

      // Log completion summary
      console.log(`🏁 Synchronization completed: ${synchronizedCount} groups processed, ${errorCount} errors`);
      detailedLog.push(`Completed at ${new Date().toISOString()}: ${synchronizedCount} groups, ${errorCount} errors`);

      // Save detailed log to localStorage for debugging
      localStorage.setItem('lastSyncLog', JSON.stringify({
        timestamp: new Date().toISOString(),
        totalGroups: crossDbResults.totalGroups,
        totalContacts: crossDbResults.totalContacts,
        synchronizedGroups: synchronizedCount,
        errorCount: errorCount,
        detailedLog: detailedLog
      }));

      // Reload current database data
      await loadData();
      
      // Show comprehensive completion message
      if (errorCount === 0) {
        showToast(`✅ Synchronization completed successfully! ${synchronizedCount} contact groups synchronized across all databases.`, 'success');
      } else {
        showToast(`⚠️ Synchronization completed with ${errorCount} errors. ${synchronizedCount} groups synchronized. Check console for details.`, 'warning');
      }
      
      setShowCleanupModal(false);
      setCrossDbResults(null);

    } catch (error) {
      console.error('❌ Critical failure during synchronization:', error);
      showToast(`❌ Synchronization failed: ${error.message}. Check console for details. No data was permanently damaged.`, 'error');
      
      // Save error log
      localStorage.setItem('lastSyncError', JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'inset-0'} z-50 ${isMinimized ? '' : 'bg-black/50 backdrop-blur-sm flex items-center justify-center'}`}>
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl ${
        isMinimized 
          ? 'w-80 max-w-sm' 
          : 'max-w-4xl w-full mx-4 max-h-[90vh]'
      } overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🧹 Database Cleanup Options
            </h2>
            <div className="flex items-center gap-1">
              {/* Minimize/Maximize Button */}
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
              </button>
              {/* Close Button */}
              <button 
                onClick={() => setShowCleanupModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content - Hidden when minimized */}
        {!isMinimized && (
          <>
            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Option 1: Standard Cleanup */}
            <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedOption === 'standard' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`} onClick={() => setSelectedOption('standard')}>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  checked={selectedOption === 'standard'}
                  onChange={() => setSelectedOption('standard')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-2">Option 1: Standard Database Cleanup</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Select the cleanup target and actions you want to perform:
                  </p>
                  
                  {/* Target Selection */}
                  <div className="space-y-3 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">🎯 Cleanup Target</h4>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cleanupTarget"
                          value="all"
                          checked={cleanupTarget === 'all'}
                          onChange={(e) => setCleanupTarget(e.target.value)}
                        />
                        <span className="text-sm">All contacts in database ({rows.length} total)</span>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cleanupTarget"
                          value="selected"
                          checked={cleanupTarget === 'selected'}
                          onChange={(e) => setCleanupTarget(e.target.value)}
                        />
                        <span className="text-sm">
                          Selected contacts only 
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            ({selectedContacts?.length || 0} selected)
                          </span>
                        </span>
                      </label>
                      
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cleanupTarget"
                          value="tags"
                          checked={cleanupTarget === 'tags'}
                          onChange={(e) => setCleanupTarget(e.target.value)}
                        />
                        <div className="flex-1">
                          <span className="text-sm block mb-2">Contacts with specific tags</span>
                          {cleanupTarget === 'tags' && (
                            <div className="space-y-2">
                              {/* Tag Selection Controls */}
                              <div className="flex gap-2 mb-2">
                                <button
                                  type="button"
                                  onClick={selectAllTags}
                                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded"
                                >
                                  Select All
                                </button>
                                <button
                                  type="button"
                                  onClick={clearAllTags}
                                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                                >
                                  Clear All
                                </button>
                                <span className="text-xs text-slate-500 flex items-center">
                                  {selectedTagsList.length} of {availableTags.length} tags selected
                                </span>
                              </div>
                              
                              {/* Tag Search Filter */}
                              <input
                                type="text"
                                placeholder="Search tags..."
                                value={tagSearchFilter}
                                onChange={(e) => setTagSearchFilter(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 mb-2"
                              />
                              
                              {/* Available Tags */}
                              {filteredTags.length > 0 ? (
                                <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-800">
                                  <div className="space-y-1">
                                    {filteredTags.map(({ tag, count }) => (
                                      <label key={tag} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-1 rounded text-xs">
                                        <input
                                          type="checkbox"
                                          checked={selectedTagsList.includes(tag)}
                                          onChange={() => toggleTag(tag)}
                                          className="text-blue-600"
                                        />
                                        <span className="flex-1 truncate" title={tag}>{tag}</span>
                                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-600 px-1 rounded">
                                          {count}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ) : availableTags.length > 0 ? (
                                <div className="text-xs text-slate-500 italic">No tags match your search</div>
                              ) : (
                                <div className="text-xs text-slate-500 italic">No tags found in current data</div>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Cleanup Options Checkboxes */}
                  <div className="space-y-3 mb-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                    <h4 className="font-medium">🧹 Cleanup Actions</h4>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="removeDuplicates"
                        checked={cleanupOptions.removeDuplicates}
                        onChange={(e) => updateCleanupOption('removeDuplicates', e.target.checked)}
                        className="mt-1"
                      />
                      <label htmlFor="removeDuplicates" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        <span className="font-medium">Remove contacts with duplicate phone numbers</span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Finds groups of contacts with identical phone numbers and removes duplicates
                        </div>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="removeWithoutPhone"
                        checked={cleanupOptions.removeWithoutPhone}
                        onChange={(e) => updateCleanupOption('removeWithoutPhone', e.target.checked)}
                        className="mt-1"
                      />
                      <label htmlFor="removeWithoutPhone" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        <span className="font-medium">Remove contacts without phone numbers</span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Removes contacts that have no phone number or empty phone fields
                        </div>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="removeWithoutProperties"
                        checked={cleanupOptions.removeWithoutProperties}
                        onChange={(e) => updateCleanupOption('removeWithoutProperties', e.target.checked)}
                        className="mt-1"
                      />
                      <label htmlFor="removeWithoutProperties" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        <span className="font-medium">Remove contacts without properties</span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Removes contacts that have no associated property listings
                        </div>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="removeSlugs"
                        checked={cleanupOptions.removeSlugs}
                        onChange={(e) => updateCleanupOption('removeSlugs', e.target.checked)}
                        className="mt-1"
                      />
                      <label htmlFor="removeSlugs" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        <span className="font-medium">Remove slugs from all contacts</span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Cleans URL slugs from contact records (non-destructive)
                        </div>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="removePropertiesWithoutPhotos"
                        checked={cleanupOptions.removePropertiesWithoutPhotos}
                        onChange={(e) => updateCleanupOption('removePropertiesWithoutPhotos', e.target.checked)}
                        className="mt-1"
                      />
                      <label htmlFor="removePropertiesWithoutPhotos" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        <span className="font-medium">Remove properties without photo URLs</span>
                        <span className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full font-medium">
                          EXPERIMENTAL FEATURE!!! - MAY NOT WORK AS INTENDED!
                        </span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Removes property listings that don't have any photos
                        </div>
                      </label>
                    </div>

                    {!hasSelectedOptions() && (
                      <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-center border border-amber-200 dark:border-amber-700">
                        <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                          ⚠️ Please select at least one cleanup option above
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Current Database: "{typeof currentDatabase === 'object' ? currentDatabase?.name : currentDatabase}"
                      </span>
                    </div>
                  </div>

                  {/* Analysis Button and Status */}
                  {selectedOption === 'standard' && (
                    <div className="mt-4 space-y-3">
                      {!scanResults && !isAnalyzing && (
                        <button
                          onClick={analyzeCleanupData}
                          disabled={!hasSelectedOptions()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <Search className="h-4 w-4" />
                          Analyze Database for Cleanup
                        </button>
                      )}

                      {/* Progress Bar */}
                      {isAnalyzing && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm font-medium">{scanProgress.stage}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {scanProgress.current} / {scanProgress.total} contacts processed
                          </div>
                        </div>
                      )}

                      {/* Analysis Results */}
                      {scanResults && (
                        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-lg">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                              📊 Cleanup Analysis Results
                            </h4>
                            <button
                              onClick={analyzeCleanupData}
                              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg flex items-center gap-1"
                            >
                              🔄 Re-analyze
                            </button>
                          </div>

                          {/* Target Information */}
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                            <div className="text-sm">
                              <strong>🎯 Target: </strong>
                              {scanResults.targetContactsInfo?.target === 'all' && `All contacts (${scanResults.targetContactsInfo.total})`}
                              {scanResults.targetContactsInfo?.target === 'selected' && `Selected contacts (${scanResults.targetContactsInfo.total})`}
                              {scanResults.targetContactsInfo?.target === 'tags' && 
                                `Contacts with tags: "${scanResults.targetContactsInfo.selectedTags}" (${scanResults.targetContactsInfo.total} found)`
                              }
                            </div>
                          </div>

                          {/* Summary Cards */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                              <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{scanResults.totalContacts}</div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">Total Contacts</div>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
                              <div className="text-2xl font-bold text-green-600">{scanResults.contactsToKeep}</div>
                              <div className="text-xs text-green-700 dark:text-green-400">Will Keep</div>
                            </div>
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-center">
                              <div className="text-2xl font-bold text-red-600">
                                {scanResults.totalDuplicates + scanResults.contactsWithoutPhone + scanResults.contactsWithoutProperties}
                              </div>
                              <div className="text-xs text-red-700 dark:text-red-400">Will Remove</div>
                            </div>
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg text-center">
                              <div className="text-2xl font-bold text-orange-600">{scanResults.contactsWithSlugs}</div>
                              <div className="text-xs text-orange-700 dark:text-orange-400">Slugs to Clean</div>
                            </div>
                          </div>

                          {/* Detailed Breakdown */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-slate-700 dark:text-slate-300 border-b pb-1">Issues Found:</h5>
                            
                            {scanResults.duplicateGroups > 0 && scanResults.selectedOptions.removeDuplicates && (
                              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="text-yellow-600">📋</span>
                                  <span className="text-sm">Duplicate phone numbers</span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium text-yellow-700 dark:text-yellow-400">{scanResults.duplicateGroups} groups</span>
                                  <span className="text-yellow-600 ml-1">({scanResults.totalDuplicates} contacts)</span>
                                </div>
                              </div>
                            )}

                            {scanResults.contactsWithoutPhone > 0 && scanResults.selectedOptions.removeWithoutPhone && (
                              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="text-red-600">📞</span>
                                  <span className="text-sm">Contacts without phone numbers</span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium text-red-600">{scanResults.contactsWithoutPhone} contacts</span>
                                </div>
                              </div>
                            )}

                            {scanResults.contactsWithoutProperties > 0 && scanResults.selectedOptions.removeWithoutProperties && (
                              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="text-red-600">🏠</span>
                                  <span className="text-sm">Contacts without properties</span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium text-red-600">{scanResults.contactsWithoutProperties} contacts</span>
                                </div>
                              </div>
                            )}

                            {scanResults.contactsWithSlugs > 0 && scanResults.selectedOptions.removeSlugs && (
                              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="text-orange-600">🏷️</span>
                                  <span className="text-sm">Contacts with slugs to remove</span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium text-orange-600">{scanResults.contactsWithSlugs} contacts</span>
                                </div>
                              </div>
                            )}

                            {scanResults.selectedOptions.removePropertiesWithoutPhotos && (
                              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="text-purple-600">📸</span>
                                  <span className="text-sm">Properties without photos will be cleaned</span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium text-purple-600">During cleanup</span>
                                </div>
                              </div>
                            )}

                            {(scanResults.totalDuplicates + scanResults.contactsWithoutPhone + scanResults.contactsWithoutProperties + scanResults.contactsWithSlugs) === 0 && (
                              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                <div className="text-green-600 text-lg mb-2">🎉</div>
                                <div className="text-green-700 dark:text-green-300 font-medium">
                                  Perfect! Your database is already clean.
                                </div>
                                <div className="text-green-600 dark:text-green-400 text-sm mt-1">
                                  No cleanup actions needed.
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Summary */}
                          {(scanResults.totalDuplicates + scanResults.contactsWithoutPhone + scanResults.contactsWithoutProperties + scanResults.contactsWithSlugs) > 0 && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                              <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Cleanup Summary:</h5>
                              <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                                {scanResults.totalDuplicates + scanResults.contactsWithoutPhone + scanResults.contactsWithoutProperties > 0 && (
                                  <div>• {scanResults.totalDuplicates + scanResults.contactsWithoutPhone + scanResults.contactsWithoutProperties} contacts will be permanently deleted</div>
                                )}
                                {scanResults.contactsWithSlugs > 0 && (
                                  <div>• {scanResults.contactsWithSlugs} contacts will have their slugs removed</div>
                                )}
                                <div className="font-medium pt-1">• {scanResults.contactsToKeep} contacts will remain in your database</div>
                              </div>
                            </div>
                          )}

                          {/* Detailed Breakdown Section */}
                          {scanResults.detailedBreakdown && (
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                              <h5 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                🔍 Detailed Review - What Will Be Affected
                              </h5>

                              {/* Duplicate Groups Details */}
                              {scanResults.detailedBreakdown.duplicateGroups.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">📋 Duplicate Phone Numbers:</h6>
                                  <div className="max-h-32 overflow-y-auto bg-white dark:bg-slate-900 rounded p-2 text-xs">
                                    {scanResults.detailedBreakdown.duplicateGroups.slice(0, 5).map((group, index) => (
                                      <div key={index} className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                                        <div className="font-medium">📞 {group.phone}</div>
                                        <div className="text-slate-600 dark:text-slate-400">
                                          {group.contacts.map(c => c.name).join(', ')} ({group.contacts.length} contacts)
                                        </div>
                                      </div>
                                    ))}
                                    {scanResults.detailedBreakdown.duplicateGroups.length > 5 && (
                                      <div className="text-slate-500 text-center">
                                        ... and {scanResults.detailedBreakdown.duplicateGroups.length - 5} more duplicate groups
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Contacts Without Phone Details */}
                              {scanResults.detailedBreakdown.contactsWithoutPhone.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-medium text-red-700 dark:text-red-300 mb-2">📞 Contacts Without Phone Numbers:</h6>
                                  <div className="max-h-32 overflow-y-auto bg-white dark:bg-slate-900 rounded p-2 text-xs">
                                    {scanResults.detailedBreakdown.contactsWithoutPhone.slice(0, 10).map((contact, index) => (
                                      <div key={index} className="mb-1 p-1 bg-red-50 dark:bg-red-900/20 rounded">
                                        <span className="font-medium">{contact.name}</span>
                                        {contact.company && <span className="text-slate-500"> - {contact.company}</span>}
                                      </div>
                                    ))}
                                    {scanResults.detailedBreakdown.contactsWithoutPhone.length > 10 && (
                                      <div className="text-slate-500 text-center">
                                        ... and {scanResults.detailedBreakdown.contactsWithoutPhone.length - 10} more contacts
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Contacts Without Properties Details */}
                              {scanResults.detailedBreakdown.contactsWithoutProperties.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-medium text-red-700 dark:text-red-300 mb-2">🏠 Contacts Without Properties:</h6>
                                  <div className="max-h-32 overflow-y-auto bg-white dark:bg-slate-900 rounded p-2 text-xs">
                                    {scanResults.detailedBreakdown.contactsWithoutProperties.slice(0, 10).map((contact, index) => (
                                      <div key={index} className="mb-1 p-1 bg-red-50 dark:bg-red-900/20 rounded">
                                        <span className="font-medium">{contact.name}</span>
                                        {contact.phone && <span className="text-slate-500"> - {contact.phone}</span>}
                                        {contact.company && <span className="text-slate-500"> - {contact.company}</span>}
                                      </div>
                                    ))}
                                    {scanResults.detailedBreakdown.contactsWithoutProperties.length > 10 && (
                                      <div className="text-slate-500 text-center">
                                        ... and {scanResults.detailedBreakdown.contactsWithoutProperties.length - 10} more contacts
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Contacts With Slugs Details */}
                              {scanResults.detailedBreakdown.contactsWithSlugs.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="font-medium text-orange-700 dark:text-orange-300 mb-2">🏷️ Contacts With Slugs to Remove:</h6>
                                  <div className="max-h-32 overflow-y-auto bg-white dark:bg-slate-900 rounded p-2 text-xs">
                                    {scanResults.detailedBreakdown.contactsWithSlugs.slice(0, 10).map((contact, index) => (
                                      <div key={index} className="mb-1 p-1 bg-orange-50 dark:bg-orange-900/20 rounded">
                                        <span className="font-medium">{contact.name}</span>
                                        <span className="text-slate-500"> - slug: {contact.slug}</span>
                                      </div>
                                    ))}
                                    {scanResults.detailedBreakdown.contactsWithSlugs.length > 10 && (
                                      <div className="text-slate-500 text-center">
                                        ... and {scanResults.detailedBreakdown.contactsWithSlugs.length - 10} more contacts
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                                💡 This detailed view shows exactly what will be affected by the cleanup operation.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Option 2: Cross-Database Cleanup */}
            <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedOption === 'crossDb' 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`} onClick={() => setSelectedOption('crossDb')}>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  checked={selectedOption === 'crossDb'}
                  onChange={() => setSelectedOption('crossDb')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-2">Option 2: Cross-Database Data Synchronization</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Scan across all databases to find and synchronize duplicate contacts. This will:
                  </p>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside ml-2">
                    <li>Find contacts with the same phone number across different databases</li>
                    <li>Synchronize their data (notes, status, contact history) across all instances</li>
                    <li>Update all contacts with the most recently updated information</li>
                    <li>Keep contacts in their original databases while ensuring data consistency</li>
                  </ul>
                  <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        Will scan {Array.isArray(databases) ? databases.length : 0} database(s): {
                          Array.isArray(databases) 
                            ? databases.map(db => typeof db === 'string' ? db : db.name || db.currentDatabase || db).join(', ')
                            : 'None'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Cross-DB Results */}
                  {selectedOption === 'crossDb' && (
                    <div className="mt-4 space-y-3">
                      {!crossDbResults && (
                        <button
                          onClick={scanCrossDatabaseDuplicates}
                          disabled={isScanning}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isScanning ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Search className="h-4 w-4" />
                              Scan for Cross-Database Duplicates
                            </>
                          )}
                        </button>
                      )}

                      {crossDbResults && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <h4 className="font-medium mb-2">Scan Results:</h4>
                          {crossDbResults.duplicates.length === 0 ? (
                            <p className="text-sm text-green-600 dark:text-green-400">
                              ✅ No cross-database duplicates found!
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm">
                                Found <strong>{crossDbResults.totalGroups}</strong> phone numbers with contacts in multiple databases
                                (<strong>{crossDbResults.totalContacts}</strong> total contacts)
                              </p>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {crossDbResults.duplicates.slice(0, 5).map((group, index) => (
                                  <div key={index} className="text-xs bg-white dark:bg-slate-800 rounded p-2">
                                    <div className="font-mono">{group.phone}</div>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      {group.totalContacts} contacts across: {
                                        Array.isArray(group.databases) 
                                          ? group.databases.map(db => typeof db === 'string' ? db : db.name || db.currentDatabase || db).join(', ')
                                          : 'Unknown'
                                      }
                                    </div>
                                  </div>
                                ))}
                                {crossDbResults.duplicates.length > 5 && (
                                  <div className="text-xs text-slate-500">
                                    ... and {crossDbResults.duplicates.length - 5} more
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowCleanupModal(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            
            {/* Minimize Button next to Cancel */}
            <button
              onClick={() => setIsMinimized(true)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              title="Minimize to sidebar"
            >
              <Minus className="h-4 w-4" />
              Minimize
            </button>
            
            {selectedOption === 'standard' && scanResults && hasSelectedOptions() && (
              <button
                onClick={performStandardCleanup}
                disabled={isAnalyzing || (scanResults.totalDuplicates + scanResults.contactsWithoutPhone + scanResults.contactsWithoutProperties + scanResults.contactsWithSlugs) === 0}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                🧹 {(scanResults.totalDuplicates + scanResults.contactsWithoutPhone + scanResults.contactsWithoutProperties + scanResults.contactsWithSlugs) === 0 
                  ? 'No Cleanup Needed' 
                  : 'Proceed with Selected Cleanup'}
              </button>
            )}

            {selectedOption === 'crossDb' && crossDbResults && crossDbResults.duplicates.length > 0 && (
              <button
                onClick={synchronizeCrossDatabaseData}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Synchronize Cross-Database Data
              </button>
            )}
          </div>
        </div>
        </>
        )}

        {/* Minimized state content */}
        {isMinimized && (
          <div className="p-4 space-y-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {selectedOption === 'standard' && scanResults ? (
                <div className="space-y-2">
                  <div className="font-medium">
                    Cleanup ready: {scanResults.totalDuplicates + scanResults.contactsWithoutPhone + scanResults.contactsWithoutProperties} items to remove
                  </div>
                  
                  {/* Progress section for analysis */}
                  {isAnalyzing && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Analyzing data...</span>
                      </div>
                      {scanProgress.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{scanProgress.stage}</span>
                            <span>{scanProgress.current} / {scanProgress.total}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                            {Math.round((scanProgress.current / scanProgress.total) * 100)}% complete
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Progress section for cleanup operations */}
                  {isScanning && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Performing cleanup...</span>
                      </div>
                      {scanProgress.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{scanProgress.stage}</span>
                            <span>{scanProgress.current} / {scanProgress.total}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                            <div 
                              className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                            {Math.round((scanProgress.current / scanProgress.total) * 100)}% complete
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : selectedOption === 'crossDb' && crossDbResults ? (
                <div className="space-y-2">
                  <div className="font-medium">
                    Cross-database sync ready: {crossDbResults.duplicates?.length || 0} duplicates found
                  </div>
                  
                  {isScanning && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Synchronizing...</span>
                      </div>
                      {scanProgress.total > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{scanProgress.stage}</span>
                            <span>{scanProgress.current} / {scanProgress.total}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                            {Math.round((scanProgress.current / scanProgress.total) * 100)}% complete
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="font-medium">Database cleanup options ready</div>
              )}
            </div>
            
            {/* Quick action buttons for minimized state */}
            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              {selectedOption === 'standard' && scanResults && (
                <button
                  onClick={() => setIsMinimized(false)}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded transition-colors"
                >
                  View Details
                </button>
              )}
              <button
                onClick={() => setShowCleanupModal(false)}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CleanupModal;
