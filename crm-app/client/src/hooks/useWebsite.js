import { useState, useCallback } from 'react';

/**
 * Custom hook for website management functionality
 */
export const useWebsite = () => {
  const [websiteLoading, setWebsiteLoading] = useState(false);

  // VvebJS configuration
  const VVEBJS_CONFIG = {
    serverUrl: 'http://localhost:3030',
    editorUrl: 'http://localhost:3030/editor.html',
    generatedPagesPath: '/generated-realtors'
  };

  // Store used slugs to prevent duplicates
  const [usedSlugs] = useState(new Set());

    /**
   * Generate contact ID - use the actual contact ID, not a hash
   */
  const generateContactId = useCallback((contact, database) => {
    // Use the actual contact ID if it exists
    if (contact.id) {
      return contact.id.toString();
    }
    
    // Fallback to a simple default if no ID
    return '0000000';
  }, []);

  /**
   * Generate a random 7-digit ID (fallback)
   */
  const generateRandomId = useCallback(() => {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  }, []);

  /**
   * Generate a URL-safe slug for a realtor with unique ID
   */
  const generateRealtorSlug = useCallback((contact, database) => {
    if (!contact || !database) return null;
    
    // Handle different data structures
    let name = '';
    
    if (typeof contact === 'string') {
      // If contact is just a string, use it directly
      name = contact;
    } else if (contact.data) {
      // Chrome Extension format when directly from the extension: contact.data.name
      name = contact.data.name || contact.data.NAME || '';
    } else {
      // Direct format (from CRM API or SQLite): contact.name or contact.NAME
      name = contact.name || contact.NAME || '';
    }
    
    // Handle placeholder names
    if (!name || name === 'Agent Name Not Found' || name === 'Unknown') {
      // Use company name or fallback
      const companyName = contact.company || contact.data?.company || '';
      if (companyName) {
        name = `agent-at-${companyName}`;
      } else {
        name = `unknown-agent`;
      }
    }
    
    if (!name) {
      console.warn('No name found for contact:', contact);
      return null;
    }
    
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
    
    const dbSlug = (database || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    
    // Generate unique slug with deterministic ID
    let uniqueId = generateContactId(contact, database);
    let baseSlug = `${dbSlug}/${cleanName}-${uniqueId}`;
    
    // Check for duplicates and regenerate if needed
    while (usedSlugs.has(baseSlug)) {
      uniqueId = generateRandomId(); // Fallback to random if hash collision
      baseSlug = `${dbSlug}/${cleanName}-${uniqueId}`;
    }
    
    // Add to used slugs set
    usedSlugs.add(baseSlug);
    
    return baseSlug;
  }, [generateContactId, generateRandomId, usedSlugs]);

  /**
   * Get the website URL for a realtor
   */
  const getRealtorWebsiteUrl = useCallback((contact, database) => {
    // Generate the same slug as VvebJS does - use correct database directory
    let name = contact.name || contact.NAME || 'unknown-agent';
    
    // Handle placeholder names (same logic as VvebJS and CRM server)
    if (!name || name === 'Agent Name Not Found' || name === 'Unknown') {
      const companyName = (contact.company || contact.Company || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      if (companyName) {
        name = `agent-at-${companyName}`;
      } else {
        name = `unknown-agent`;
      }
    }
    
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Generate deterministic ID (simplified version)
    const contactId = generateContactId(contact, database);
    
    // NEW UNIFIED APPROACH: Use contacts directory structure
    const contactDirName = `contact-${cleanName}-${contactId}`;
    return `${VVEBJS_CONFIG.serverUrl}/generated-realtors/contacts/${contactDirName}/index.html`;
  }, [generateContactId]);

  /**
   * Get the VvebJS editor URL for a realtor
   */
  const getRealtorEditorUrl = useCallback((contact, database) => {
    // Generate the same slug as getRealtorWebsiteUrl for consistency
    let name = contact.name || contact.NAME || 'unknown-agent';
    
    // Handle placeholder names (same logic as VvebJS and CRM server)
    if (!name || name === 'Agent Name Not Found' || name === 'Unknown') {
      const companyName = (contact.company || contact.Company || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      if (companyName) {
        name = `agent-at-${companyName}`;
      } else {
        name = `unknown-agent`;
      }
    }
    
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Generate deterministic ID (simplified version)
    const contactId = generateContactId(contact, database);
    
    // VvebJS editor expects 'page' parameter with the full path
    // NEW UNIFIED APPROACH: Use contacts directory structure
    const contactDirName = `contact-${cleanName}-${contactId}`;
    const pagePath = `/generated-realtors/contacts/${contactDirName}/index.html`;
    return `${VVEBJS_CONFIG.editorUrl}?page=${encodeURIComponent(pagePath)}`;
  }, [generateContactId]);

  /**
   * Check if a website exists for a realtor
   */
  const checkWebsiteExists = useCallback(async (contact, database) => {
    try {
      const websiteUrl = getRealtorWebsiteUrl(contact, database);
      if (!websiteUrl) return false;
      
      const response = await fetch(websiteUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Error checking website existence:', error);
      return false;
    }
  }, [getRealtorWebsiteUrl]);

  /**
   * Generate a website for a realtor
   */
  const generateRealtorWebsite = useCallback(async (contact, database) => {
    try {
      setWebsiteLoading(true);
      
      const response = await fetch('/api/generate-realtor-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contact, database }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate website');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error generating website:', error);
      throw error;
    } finally {
      setWebsiteLoading(false);
    }
  }, []);

  /**
   * Open realtor website in new tab - VIEW ONLY (does not generate)
   */
  const openRealtorWebsite = useCallback(async (contact, database) => {
    if (!contact) {
      console.warn('Cannot open website: contact is null or undefined');
      return;
    }
    if (!database) {
      console.warn('Cannot open website: database is null or undefined');
      return;
    }
    
    try {
      setWebsiteLoading(true);
      
      // Just get the URL and open it - DO NOT GENERATE
      const websiteUrl = getRealtorWebsiteUrl(contact, database);
      if (websiteUrl) {
        window.open(websiteUrl, '_blank');
      } else {
        console.warn('Failed to construct website URL');
      }
    } catch (error) {
      console.error('Error opening website:', error);
    } finally {
      setWebsiteLoading(false);
    }
  }, [getRealtorWebsiteUrl]);

  /**
   * Open realtor editor in new tab - only generates if file doesn't exist
   */
  const openRealtorEditor = useCallback(async (contact, database) => {
    if (!contact) {
      console.warn('Cannot open editor: contact is null or undefined');
      return;
    }
    if (!database) {
      console.warn('Cannot open editor: database is null or undefined');
      return;
    }
    
    try {
      setWebsiteLoading(true);
      
      // First check if website already exists
      const websiteExists = await checkWebsiteExists(contact, database);
      
      if (websiteExists) {
        // Website exists, open editor directly without regenerating
        console.log('✅ Website exists, opening editor directly (preserving edits)');
        const editorUrl = getRealtorEditorUrl(contact, database);
        if (editorUrl) {
          window.open(editorUrl, '_blank');
        } else {
          console.warn('Failed to construct editor URL');
        }
      } else {
        // Website doesn't exist, generate it first
        console.log('🔄 Website doesn\'t exist, generating new one');
        const result = await generateRealtorWebsite(contact, database);
        
        if (result.editorUrl) {
          window.open(result.editorUrl, '_blank');
        } else {
          console.warn('Failed to generate editor URL');
        }
      }
    } catch (error) {
      console.error('Error opening editor:', error);
      // Fallback to constructed URL
      const editorUrl = getRealtorEditorUrl(contact, database);
      if (editorUrl) {
        window.open(editorUrl, '_blank');
      }
    } finally {
      setWebsiteLoading(false);
    }
  }, [checkWebsiteExists, getRealtorEditorUrl, generateRealtorWebsite]);

  /**
   * Force regenerate realtor website (overwrite existing edits with fresh data)
   */
  const forceRegenerateRealtorWebsite = useCallback(async (contact, database) => {
    try {
      setWebsiteLoading(true);
      
      const response = await fetch('/api/regenerate-realtor-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contact, database, force: true }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to force regenerate website');
      }
      
      const result = await response.json();
      console.log('✅ Website force regenerated successfully');
      return result;
    } catch (error) {
      console.error('Error force regenerating website:', error);
      throw error;
    } finally {
      setWebsiteLoading(false);
    }
  }, []);

  /**
   * Generate all realtor websites
   */
  const generateAllWebsites = useCallback(async () => {
    try {
      setWebsiteLoading(true);
      
      const response = await fetch('/api/generate-all-websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate all websites');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error generating all websites:', error);
      throw error;
    } finally {
      setWebsiteLoading(false);
    }
  }, []);

  /**
   * Open the generated index page showing all realtors
   */
  const openGeneratedIndex = useCallback(() => {
    const indexUrl = `${VVEBJS_CONFIG.serverUrl}${VVEBJS_CONFIG.generatedPagesPath}/`;
    window.open(indexUrl, '_blank');
  }, []);

  return {
    websiteLoading,
    generateRealtorSlug,
    getRealtorWebsiteUrl,
    getRealtorEditorUrl,
    checkWebsiteExists,
    generateRealtorWebsite,
    forceRegenerateRealtorWebsite,
    generateAllWebsites,
    openRealtorWebsite,
    openRealtorEditor,
    openGeneratedIndex
  };
};
