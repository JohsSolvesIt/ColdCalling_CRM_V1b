import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { uid } from '../utils/helpers';
import { DEFAULT_STATUS } from '../constants';

/**
 * Custom hook for contact operations
 */
export const useContacts = () => {
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const [contactsResult, headersResult] = await Promise.all([
        api.getContacts(),
        api.getHeaders()
      ]);
      
      if (!mountedRef.current) return;
      
      // contactsResult is already the array of contacts
      setRows(Array.isArray(contactsResult) ? contactsResult : []);
      // headersResult might be an object or array
      setHeaders(Array.isArray(headersResult) ? headersResult : (headersResult.headers || []));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  const addRow = async () => {
    // Chrome Extension database doesn't support creating new contacts
    // Show error message instead
    setSaveStatus('error');
    console.error('Cannot add new contacts to Chrome Extension database. Contacts are managed through the browser extension.');
    
    // Show user-friendly error message
    if (window.alert) {
      alert('Cannot add new contacts to the Chrome Extension database.\n\nContacts are automatically extracted and managed through the browser extension. To add new contacts, use the Chrome Extension to extract data from realtor websites.');
    }
    
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const deleteRow = async (id) => {
    // Find the contact to get its name for the confirmation
    const contact = rows.find(r => r.id === id);
    const contactName = contact?.name || contact?.Name || 'this contact';
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${contactName}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) {
      return; // User cancelled
    }
    
    try {
      await api.deleteContact(id);
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete row:', error);
      // Show error message to user
      alert(`Failed to delete contact: ${error.message}`);
    }
  };

  // Simple debounce helper scoped to this module
const debounce = (fn, wait = 300) => {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

  const debouncedSaveRef = useRef(null);
  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = debounce(async (saveFn) => {
      await saveFn();
    }, 350);
  }

  // Whitelist minimal fields and drop heavy/readonly ones before sending to server
  const allowedKeys = new Set([
    'id','name','title','company','phone','email','address','website','bio','description',
    'experience_years','license_number','license_state','state','license',
  // Allow updating the profile image URL directly from the table editor
  'profile_image_url',
    'crm_notes','crm_status','last_contacted','follow_up_at','texts_sent','emails_sent','follow_up_priority','crm_data',
    'tags','override_profile_image','overrideProfileImage','custom_profile_image_url','customProfileImageUrl',
    'Status','Notes','LastContacted','FollowUpAt','TextsSent','EmailsSent','FollowUpPriority','realtor_url','agent_id'
  ]);
  const dropKeys = new Set([
    'properties','property_details','property_summary','price_range','available_photos','profile_image',
    'total_properties','avg_property_price','min_property_price','max_property_price','cities_served',
    'source','_dbType','_dbName','created_at','updated_at','last_scraped_at','property_count'
  ]);
  const buildClientSanitized = (raw) => {
    const out = {};
    Object.keys(raw || {}).forEach(k => {
      if (!dropKeys.has(k) && allowedKeys.has(k) && raw[k] !== undefined) out[k] = raw[k];
    });
    return out;
  };

  const patchRow = async (id, patch) => {
    // Find the current row first, before optimistic update
    const currentRow = rows.find(r => r.id === id);
    if (!currentRow) {
      console.error('Row not found for id:', id);
      return;
    }
    
    // Optimistic update
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    
    try {
      setSaveStatus('saving');
      // Only send the changed fields plus id to minimize payload size
      const sanitizedPatch = buildClientSanitized(patch);
      if (!sanitizedPatch || Object.keys(sanitizedPatch).length === 0) {
        // Nothing updatable changed; keep optimistic state and skip server call
        setSaveStatus('');
        return;
      }
      const payload = { id, ...sanitizedPatch };
      // Debounce network write to avoid rapid, repeated PUTs during typing
      await new Promise((resolve, reject) => {
        debouncedSaveRef.current(async () => {
          try {
            const response = await api.saveContact(payload);
            if (response && response.agent) {
              setRows(prev => prev.map(r => r.id === id ? response.agent : r));
            }
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 2000);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    } catch (error) {
      console.error('Failed to update row:', error?.response?.data || error.message || error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
      // Revert optimistic update on error
      loadData();
    }
  };

  const handleBulkDelete = async (selectedContacts) => {
    if (!selectedContacts || selectedContacts.size === 0) return;
    
    // Ensure selectedContacts is a Set
    const contactsSet = selectedContacts instanceof Set ? selectedContacts : new Set(selectedContacts);
    
    if (window.confirm(`Delete ${contactsSet.size} selected contact${contactsSet.size > 1 ? 's' : ''}?`)) {
      try {
        const deletePromises = Array.from(contactsSet).map(id => api.deleteContact(id));
        await Promise.all(deletePromises);
        setRows(prev => prev.filter(r => !contactsSet.has(r.id)));
      } catch (error) {
        console.error('Failed to delete contacts:', error);
      }
    }
  };

  const handleMoveContacts = async (selectedContacts, targetDatabase) => {
    if (!selectedContacts || selectedContacts.size === 0) return;
    
    // Ensure selectedContacts is a Set
    const contactsSet = selectedContacts instanceof Set ? selectedContacts : new Set(selectedContacts);
    
    try {
      const contactIds = Array.from(contactsSet);
      await api.moveContacts(contactIds, targetDatabase);
      setRows(prev => prev.filter(r => !contactsSet.has(r.id)));
      return true;
    } catch (error) {
      console.error('Failed to move contacts:', error);
      throw error;
    }
  };

  return {
    rows,
    setRows,
    headers,
    setHeaders,
    saveStatus,
    setSaveStatus,
    loadData,
    addRow,
    deleteRow,
    patchRow,
    handleBulkDelete,
    handleMoveContacts,
    mountedRef
  };
};
