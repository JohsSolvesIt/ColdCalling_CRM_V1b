import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import axios from "axios";
import { 
  Download, Upload, FileUp, FileDown, Search, ChevronLeft, ChevronRight, 
  Phone, Trash2, Save, Filter, X, Check, Link as LinkIcon, 
  Image as ImageIcon, FileText, Plus, Calendar, Star, RefreshCw,
  Database, Settings, MessageSquare, Edit2, Copy, Activity, 
  Smartphone, Wifi, WifiOff, CheckCircle, XCircle, AlertCircle,
  Clock, FileCheck, Users, Info, AlertTriangle, Building, MapPin,
  Globe, Zap, Edit, MoreVertical, Tag
} from "lucide-react";
import DatabaseManager from "./components/DatabaseManager";
import MoveToDbModal from "./components/MoveToDbModal";
import BatchTextPanel from "./components/BatchTextPanel";
import TemplateManager from "./components/TemplateManager";
import StatusPanel from "./components/StatusPanel";
import CleanupModal from "./components/CleanupModal";
import TagsModal from "./components/TagsModal";
import ColumnMapper from "./components/ColumnMapper";
import SmsPanel from "./components/SmsPanel";
import QueuePanel from "./components/QueuePanel";
import { DataTable, Pagination } from "./components/DataTable";
import ContactDetailPanel from "./components/ContactDetailPanel";
import ModularWebsiteGenerator from "./components/ModularWebsiteGenerator";
import ReviewManagementModal from "./components/ReviewManagementModal";
import PropertyManagementModal from "./components/PropertyManagementModal";
import SimpleBatchModal from "./components/SimpleBatchModal";
import BioEditorModal from "./components/BioEditorModal";
import { UserProvider } from "./contexts/UserContext";
import { ProgressProvider } from "./contexts/ProgressContext";
import LoginModal from "./components/LoginModal";
import PermissionGuard, { AdminOnly } from "./components/PermissionGuard";
import UserManagementModal from "./components/UserManagementModal";
import LeftSidebar from "./components/LeftSidebar";
import DashboardPage from "./pages/DashboardPage";
import ToastNotification from "./components/ToastNotification";
import { PERMISSIONS } from "./utils/userRoles";
import { isUrl, isImageUrl, titleCase, uid, formatDateTimeLocal } from "./utils/helpers";
import { formatPhoneForCalling } from "./utils/phoneUtils";
import { DEFAULT_STATUS, DEFAULT_COLUMNS, STATUS_OPTIONS } from "./constants";
import { api } from "./services/api";
import { useDatabase } from "./hooks/useDatabase";
import { useContacts } from "./hooks/useContacts";
import { useSMS } from "./hooks/useSMS";
import { useBatchTexting } from "./hooks/useBatchTexting";
import { useWebsite } from "./hooks/useWebsite";
import { useProgressOperations } from "./hooks/useProgressOperations";
import { 
  getCurrentDatabaseType, 
  getNormalizedHeaders, 
  getContactProperty,
  formatPropertyValue,
  safeFieldAccess,
  findPhoneField,
  findNameField,
  getCommunicationCount,
  formatFollowUpDate,
  getFilteredRows,
  getFollowUpRows,
  getSortedRows
} from "./utils/dataProcessing";

/**
 * CSV‑to‑CRM — Local Database Edition
 * Features:
 * - SQLite local database storage
 * - Multiple database support with easy switching
 * - CSV import/export with database persistence
 * - All original CRM features with database backing
 */

export default function App() {
  // Use custom hooks
  const { 
    databases, 
    setDatabases, 
    rawDatabases,
    setRawDatabases,
    currentDatabase, 
    setCurrentDatabase,
    loading,
    setLoading,
    loadDatabases,
    switchToDatabase,
    clearDatabaseStorage,
    mountedRef
  } = useDatabase();

  const {
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
    handleMoveContacts
  } = useContacts();

  const {
    smsDevices,
    setSmsDevices,
    smsConnected,
    setSmsConnected,
    smsDeviceInfo,
    setSmsDeviceInfo,
    smsTemplates,
    setSmsTemplates,
    smsHistory,
    setSmsHistory,
    smsLoading,
    setSmsLoading,
    loadSmsDevices,
    loadSmsTemplates,
    loadSmsHistory,
    connectSmsDevice,
    sendSmsToContact,
    addCustomTemplate,
    findPhoneField: smsPhoneField,
    getFirstName
  } = useSMS();

  const {
    selectedContacts,
    setSelectedContacts,
    textQueue,
    setTextQueue,
    queueStatus,
    setQueueStatus,
    queueStatusRef,
    currentQueueIndex,
    setCurrentQueueIndex,
    queueResults,
    setQueueResults,
    completionReport,
    setCompletionReport,
    toggleContactSelection,
    selectAllContacts,
    selectAllContactsAllPages,
    clearAllSelections,
    createTextQueue,
    executeQueue,
    pauseQueue,
    resumeQueue,
    clearQueue
  } = useBatchTexting();

  const {
    websiteLoading,
    generateRealtorSlug,
    getRealtorWebsiteUrl,
    getRealtorEditorUrl,
    openRealtorEditor,
    openGeneratedIndex
  } = useWebsite();

  // Basic UI state
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState({ key: null, dir: "asc" });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [dark, setDark] = useState(true);
  
  // Left Sidebar state
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [currentSidebarTab, setCurrentSidebarTab] = useState('databases');
  const [currentView, setCurrentView] = useState('main'); // 'main' | 'dashboard'
  
  // Modal states
  const [showDatabaseManager, setShowDatabaseManager] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customTemplate, setCustomTemplate] = useState("");
  const [showSmsHistory, setShowSmsHistory] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showBatchTextPanel, setShowBatchTextPanel] = useState(false);
  const [showModularWebsitePanel, setShowModularWebsitePanel] = useState(false);
  const [batchMessage, setBatchMessage] = useState("");
  const [forceScrapeInProgress, setForceScrapeInProgress] = useState(null); // Contact ID being force scraped
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [columnMapping, setColumnMapping] = useState({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showFollowUpQueue, setShowFollowUpQueue] = useState(false);
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [showMoveToDbModal, setShowMoveToDbModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpContact, setFollowUpContact] = useState(null);
  const [manualFollowUpDate, setManualFollowUpDate] = useState('');
  const [manualFollowUpPriority, setManualFollowUpPriority] = useState('Medium');
  const [systemStatus, setSystemStatus] = useState(null);
  const [showBulkActionsMenu, setShowBulkActionsMenu] = useState(false);
  const [showMainActionsMenu, setShowMainActionsMenu] = useState(false);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  
  // Review Management Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedContactForReviews, setSelectedContactForReviews] = useState(null);
  
  // Property Management Modal State
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [selectedContactForProperties, setSelectedContactForProperties] = useState(null);
  
  // Simple Batch Processing Modal State
  const [showSimpleBatchModal, setShowSimpleBatchModal] = useState(false);
  
  // Bio Editor Modal State
  const [showBioModal, setShowBioModal] = useState(false);
  const [selectedContactForBio, setSelectedContactForBio] = useState(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // System status functions
  const loadSystemStatus = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      setStatusLoading(true);
      const status = await api.getStatus();
      
      if (!mountedRef.current) return;
      
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to load system status:', error);
    } finally {
      if (mountedRef.current) {
        setStatusLoading(false);
      }
    }
  }, []);

  const refreshStatus = () => {
    loadSystemStatus();
  };

  // Get current database type using utility function
  const getCurrentDatabaseTypeFn = useCallback(() => {
    return getCurrentDatabaseType(systemStatus, rows);
  }, [systemStatus, rows]);

  // Derived data using utility functions
  const normalizedHeaders = useMemo(() => {
    return getNormalizedHeaders(headers, rows, getCurrentDatabaseTypeFn);
  }, [headers, rows, getCurrentDatabaseTypeFn]);

  // Universal property accessor that works with both data structures
  const getContactProperty = useCallback((contact, fieldType, fallback = null) => {
    if (!contact) return fallback;
    
    const dbType = contact._dbType || contact.source || getCurrentDatabaseType(systemStatus, rows);
    
    // Define field mappings for different field types
    const fieldMappings = {
      name: ['name', 'full_name', 'fullname', 'first_name', 'firstname', 'agent_name'],
      phone: ['phone', 'mobile', 'cell', 'telephone', 'tel', 'office_phone', 'mobile_phone'],
      email: ['email', 'email_address', 'emailaddress', 'e_mail'],
      company: ['company', 'office', 'brokerage', 'agency', 'firm'],
      address: ['address', 'street_address', 'full_address'],
      website: ['website', 'url', 'site'],
      bio: ['bio', 'description', 'about', 'summary'],
      title: ['title', 'position', 'role'],
      experience: ['experience', 'years_experience', 'experience_years'],
      areas: ['areas_served', 'service_areas', 'areas', 'markets'],
      license: ['license', 'license_number', 'license_state'],
      specialties: ['specialties', 'specializations', 'focus_areas'],
      // Chrome Extension property fields
      total_properties: ['total_properties', 'property_count', 'properties'],
      avg_property_price: ['avg_property_price', 'average_price', 'avg_price'],
      min_property_price: ['min_property_price', 'minimum_price', 'min_price'],
      max_property_price: ['max_property_price', 'maximum_price', 'max_price'],
      cities_served: ['cities_served', 'cities', 'service_cities'],
      // Chrome Extension rich profile fields
      bio: ['bio', 'description', 'about', 'summary'],
      experience_years: ['experience_years', 'years_experience', 'experience'],
      specializations: ['specializations', 'specialties', 'focus_areas'],
      ratings: ['ratings', 'rating', 'reviews'],
      social_media: ['social_media', 'social', 'social_links'],
      website: ['website', 'url', 'site'],
      profile_image_url: ['profile_image_url', 'profile_image', 'image', 'photo']
    };

    const fieldsToCheck = fieldMappings[fieldType] || [fieldType];
    
    // For Chrome Extension (flat structure), check direct properties
    if (dbType === 'chrome_extension') {
      for (const field of fieldsToCheck) {
        if (contact[field] !== undefined && contact[field] !== null && contact[field] !== '') {
          return contact[field];
        }
      }
    } else {
      // For SQLite (embedded JSON), check both direct properties and data object
      for (const field of fieldsToCheck) {
        // Check direct properties first
        if (contact[field] !== undefined && contact[field] !== null && contact[field] !== '') {
          return contact[field];
        }
        // Check data object if it exists
        if (contact.data && contact.data[field] !== undefined && contact.data[field] !== null && contact.data[field] !== '') {
          return contact.data[field];
        }
      }
    }
    
    return fallback;
  }, [systemStatus, rows]);
  
  // Format property values for display
  const formatPropertyValue = useCallback((contact, field) => {
    const value = getContactProperty(contact, field);
    
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    
    // Format price fields
    if (field.includes('price')) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return '-';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue);
    }
    
    // Format property arrays
    if (field === 'properties' || field === 'property_details') {
      if (Array.isArray(value) && value.length > 0) {
        // Show summary of properties with key details
        const summary = value.map((prop, index) => {
          if (typeof prop === 'object' && prop !== null) {
            const address = prop.address || `Property ${index + 1}`;
            const price = prop.price_formatted || prop.price || '';
            const priceText = price ? ` - ${price}` : '';
            return `${address}${priceText}`;
          }
          return String(prop);
        }).join('; ');
        return `${value.length} properties: ${summary}`;
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Single property object
        const address = value.address || 'Property';
        const price = value.price_formatted || value.price || '';
        const priceText = price ? ` - ${price}` : '';
        return `${address}${priceText}`;
      }
      return 'No properties';
    }
    
    // Format property summary
    if (field === 'property_summary') {
      return value || 'No properties';
    }
    
    // Format price range
    if (field === 'price_range') {
      return value || 'N/A';
    }
    
    // Format property count
    if (field === 'property_count') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue === 0) return '0 properties';
      return `${numValue} ${numValue === 1 ? 'property' : 'properties'}`;
    }
    
    // Format cities served
    if (field === 'cities_served') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue === 0) return '0';
      return `${numValue} ${numValue === 1 ? 'city' : 'cities'}`;
    }
    
    // Format experience years
    if (field === 'experience_years') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue === 0) return 'N/A';
      return `${numValue} years`;
    }
    
    // Format texts sent
    if (field === 'texts_sent') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue === 0) return '0';
      return `${numValue} sent`;
    }
    
    // Format emails sent
    if (field === 'emails_sent') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue === 0) return '0';
      return `${numValue} sent`;
    }
    
    // Format array fields
    if (['specializations', 'languages', 'certifications', 'service_areas', 'available_photos', 'features', 'image_urls'].includes(field)) {
      if (Array.isArray(value)) {
        if (value.length === 0) return 'None';
        if (field === 'available_photos' || field === 'image_urls') {
          return `${value.length} photo${value.length === 1 ? '' : 's'}`;
        }
        if (field === 'features') {
          return `${value.length} feature${value.length === 1 ? '' : 's'}`;
        }
        // Handle arrays of objects vs arrays of strings
        const formatted = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            // For property objects, extract meaningful fields
            if (item.address) return item.address;
            if (item.name) return item.name;
            if (item.title) return item.title;
            if (item.description) return item.description;
            if (item.price) return `$${item.price}`;
            // For other objects, show key info
            return Object.keys(item).map(k => {
              const val = item[k];
              if (typeof val === 'object') return `${k}: [object]`;
              return `${k}: ${val}`;
            }).join('; ');
          }
          return String(item);
        });
        return formatted.join(', ');
      }
      return value || 'None';
    }
    
    // Format coordinate objects
    if (field === 'coordinates') {
      if (typeof value === 'object' && value !== null) {
        const keys = Object.keys(value);
        if (keys.length === 0) return 'None';
        if (value.lat && value.lng) return `${value.lat}, ${value.lng}`;
        if (value.latitude && value.longitude) return `${value.latitude}, ${value.longitude}`;
        return `${keys.length} coordinate${keys.length === 1 ? '' : 's'}`;
      }
      return 'None';
    }
    
    // Format ratings object
    if (field === 'ratings') {
      if (typeof value === 'object') {
        if (value.count !== undefined) {
          const count = parseInt(value.count);
          return count > 0 ? `${count} reviews` : 'No reviews';
        }
        const keys = Object.keys(value);
        if (keys.length > 0) {
          return keys.map(k => `${k}: ${value[k]}`).join(', ');
        }
      }
      return 'No reviews';
    }
    
    // Format social media object
    if (field === 'social_media') {
      if (typeof value === 'object') {
        const platforms = Object.keys(value).filter(k => value[k]);
        if (platforms.length > 0) {
          return platforms.join(', ');
        }
      }
      return 'None';
    }
    
    // Format CRM data object
    if (field === 'crm_data') {
      if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length > 0) {
          return `${keys.length} field${keys.length === 1 ? '' : 's'}`;
        }
      }
      return 'None';
    }
    
    // Format timestamps
    if (['created_at', 'updated_at', 'last_scraped_at', 'last_contacted', 'follow_up_at'].includes(field)) {
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
      }
      return 'Never';
    }
    
    // Format boolean fields
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Handle any remaining arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None';
      const formatted = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          // For property objects, extract key information
          if (item.address) return `Property: ${item.address}`;
          if (item.price) return `$${item.price}`;
          if (item.name) return item.name;
          if (item.title) return item.title;
          if (item.description) return item.description;
          // For other objects, show summary
          const keys = Object.keys(item);
          return `Object with ${keys.length} field${keys.length === 1 ? '' : 's'}`;
        }
        return String(item);
      });
      return formatted.join(', ');
    }
    
    // Handle any remaining objects
    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      if (keys.length === 0) return 'None';
      return keys.map(k => {
        const val = value[k];
        if (typeof val === 'object' && val !== null) {
          if (Array.isArray(val)) {
            return `${k}: ${val.length} items`;
          } else {
            return `${k}: object`;
          }
        }
        return `${k}: ${val}`;
      }).join(', ');
    }
    
    return value;
  }, [getContactProperty]);

  // Safe field access with fallback
  const safeFieldAccess = useCallback((contact, fieldName, fallback = '') => {
    if (!contact) return fallback;
    
    const dbType = contact._dbType || contact.source || getCurrentDatabaseType(systemStatus, rows);
    
    // For Chrome Extension, direct access
    if (dbType === 'chrome_extension') {
      return contact[fieldName] !== undefined ? contact[fieldName] : fallback;
    } else {
      // For SQLite, check both direct and data object
      if (contact[fieldName] !== undefined) {
        return contact[fieldName];
      }
      if (contact.data && contact.data[fieldName] !== undefined) {
        return contact.data[fieldName];
      }
      return fallback;
    }
  }, [systemStatus, rows]);

  // ============================================================================
  // REALTOR.COM URL HELPER FUNCTIONS
  // ============================================================================
  
  // Get the realtor.com URL from contact data
  const getRealtorComUrl = useCallback((contact) => {
    if (!contact) return null;
    
    // Check common URL fields
    const urlFields = [
      'url', 'website', 'profile_url', 'realtor_url', 'agent_url',
      'URL', 'Website', 'PROFILE_URL', 'REALTOR_URL', 'AGENT_URL'
    ];
    
    for (const field of urlFields) {
      const url = contact[field];
      if (url && typeof url === 'string' && url.includes('realtor.com')) {
        return url;
      }
    }
    
    return null;
  }, []);
  
  // Open realtor.com website for contact (clean URL, no modifications)
  const openRealtorComWebsite = useCallback((contact) => {
    const url = getRealtorComUrl(contact);
    if (url) {
      // Remove any existing autoExtract parameters to ensure clean URL
      const cleanUrl = url.split('?')[0]; // Remove all query parameters
      window.open(cleanUrl, '_blank');
    } else {
      console.warn('No realtor.com URL found for contact:', contact);
    }
  }, [getRealtorComUrl]);

  // Force scrape functionality - opens realtor.com, waits, then triggers extension
  const handleForceScrape = useCallback(async (contact) => {
    try {
      const url = getRealtorComUrl(contact);
      if (!url) {
        console.warn('No realtor.com URL found for contact:', contact);
        return;
      }

      console.log('🚀 Starting force scrape for:', contact.name);
      setForceScrapeInProgress(contact.id);
      
      // Create URL with auto-extract parameter
      const autoExtractUrl = url + (url.includes('?') ? '&' : '?') + 'autoExtract=true';
      
      // Open realtor.com page in new tab with auto-extract parameter
      const newTab = window.open(autoExtractUrl, '_blank');
      
      if (!newTab) {
        console.error('Failed to open new tab - popup blocker?');
        setForceScrapeInProgress(null);
        return;
      }

      console.log('⏳ Tab opened with auto-extraction, waiting for completion...');
      
      // Listen for completion message from the extension
      const handleForceScrapComplete = (event) => {
        if (event.data && event.data.type === 'FORCE_SCRAPE_COMPLETE') {
          console.log('🎉 Force scrape completed:', event.data);
          
          // Clean up listener
          window.removeEventListener('message', handleForceScrapComplete);
          
          // Clear progress state
          setForceScrapeInProgress(null);
          
          // Play notification sound
          try {
            const audio = new Audio('/Notification2.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
          } catch (error) {
            console.log('Failed to play notification sound:', error);
          }

          // Wait a moment then open generator modal
          setTimeout(() => {
            setSelectedContact(contact);
            setShowModularWebsitePanel(true);
          }, 1000);
        }
      };
      
      // Add event listener for completion
      window.addEventListener('message', handleForceScrapComplete);
      
      // Fallback timeout in case no message is received
      setTimeout(() => {
        console.log('🔄 Fallback timeout - opening generator anyway');
        window.removeEventListener('message', handleForceScrapComplete);
        setForceScrapeInProgress(null);
        
        // Play notification sound
        try {
          const audio = new Audio('/Notification2.mp3');
          audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (error) {
          console.log('Failed to play notification sound:', error);
        }
        
        // Open generator modal
        setSelectedContact(contact);
        setShowModularWebsitePanel(true);
      }, 20000); // 20 second fallback

    } catch (error) {
      console.error('Error in force scrape:', error);
      setForceScrapeInProgress(null);
    }
  }, [getRealtorComUrl]);

  // ============================================================================
  // PHASE 2A: ENHANCED FIELD DETECTION - Works with both database types
  // ============================================================================

  // Helper functions for finding fields
  const findPhoneField = useCallback((contact) => {
    if (!contact) return null;
    
    const dbType = contact._dbType || contact.source || getCurrentDatabaseType(systemStatus, rows);
    const phoneFields = ['phone', 'mobile', 'cell', 'telephone', 'tel', 'office_phone', 'mobile_phone'];
    
    if (dbType === 'chrome_extension') {
      // For Chrome Extension, check object keys directly
      return Object.keys(contact).find(key => 
        phoneFields.some(field => key.toLowerCase().includes(field.toLowerCase()))
      );
    } else {
      // For SQLite, use headers-based detection
      return headers.find(h => 
        phoneFields.some(field => h.toLowerCase().includes(field.toLowerCase()))
      );
    }
  }, [headers, systemStatus, rows]);

  const findNameField = useCallback((contact) => {
    if (!contact) return null;
    
    const dbType = contact._dbType || contact.source || getCurrentDatabaseType(systemStatus, rows);
    const nameFields = ['name', 'first_name', 'firstname', 'full_name', 'fullname', 'agent_name'];
    
    if (dbType === 'chrome_extension') {
      // For Chrome Extension, check object keys directly
      return Object.keys(contact).find(key => 
        nameFields.some(field => key.toLowerCase().includes(field.toLowerCase()))
      );
    } else {
      // For SQLite, use headers-based detection
      return headers.find(h => 
        nameFields.some(field => h.toLowerCase().includes(field.toLowerCase()))
      );
    }
  }, [headers, systemStatus, rows]);

  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Apply status filter first
    if (statusFilter) {
      filtered = filtered.filter(row => row.Status === statusFilter);
    }

    // Apply tag filter
    if (tagFilter) {
      filtered = filtered.filter(row => {
        if (!row.tags) return false;
        try {
          let tags;
          if (Array.isArray(row.tags)) {
            tags = row.tags;
          } else if (typeof row.tags === 'string') {
            // Handle both JSON array format and comma-separated format
            if (row.tags.startsWith('[') && row.tags.endsWith(']')) {
              tags = JSON.parse(row.tags);
            } else {
              // Split comma-separated tags and clean them
              tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            }
          } else {
            tags = [];
          }
          return tags.includes(tagFilter);
        } catch (e) {
          // Handle malformed tag data by trying comma-separated parsing
          if (typeof row.tags === 'string') {
            const tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            return tags.includes(tagFilter);
          }
          return false;
        }
      });
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      
      // Check if search looks like a phone number (contains mostly digits)
      const isPhoneSearch = /^\+?[\d\s\-().]+$/.test(search) && search.replace(/\D/g, '').length >= 3;
      
      if (isPhoneSearch) {
        // Normalize search term for phone comparison
        const normalizedSearch = search.replace(/\D/g, '');
        
        filtered = filtered.filter((r) => {
          // Check phone fields specifically
          const phoneField = findPhoneField(r);
          if (phoneField && r[phoneField]) {
            const normalizedPhone = r[phoneField].toString().replace(/\D/g, '');
            return normalizedPhone.includes(normalizedSearch);
          }
          
          // Also check other fields as fallback
          return normalizedHeaders.some((h) => 
            String(r[h] ?? "").toLowerCase().includes(q)
          );
        });
      } else {
        // Regular text search across all fields
        filtered = filtered.filter((r) => 
          normalizedHeaders.some((h) => 
            String(r[h] ?? "").toLowerCase().includes(q)
          )
        );
      }
    }

    return filtered;
  }, [rows, search, statusFilter, tagFilter, normalizedHeaders, findPhoneField]);

  // Get all available tags for filtering
  const availableTags = useMemo(() => {
    const tagSet = new Set();
    rows.forEach(row => {
      if (row.tags) {
        try {
          let tags;
          if (Array.isArray(row.tags)) {
            tags = row.tags;
          } else if (typeof row.tags === 'string') {
            // Handle both JSON array format and comma-separated format
            if (row.tags.startsWith('[') && row.tags.endsWith(']')) {
              tags = JSON.parse(row.tags);
            } else {
              // Split comma-separated tags and clean them
              tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            }
          } else {
            tags = [];
          }
          tags.forEach(tag => tagSet.add(tag));
        } catch (e) {
          // Handle malformed tag data by trying comma-separated parsing
          if (typeof row.tags === 'string') {
            const tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            tags.forEach(tag => tagSet.add(tag));
          }
        }
      }
    });
    return Array.from(tagSet).sort();
  }, [rows]);

  // Follow-up filtered rows
  const followUpRows = useMemo(() => {
    if (!showFollowUpQueue) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let filtered = rows.filter(row => row.FollowUpAt); // Only rows with follow-up dates
    
    switch (followUpFilter) {
      case 'due':
        filtered = filtered.filter(row => {
          const followUpDate = new Date(row.FollowUpAt);
          return followUpDate <= now;
        });
        break;
      case 'overdue':
        filtered = filtered.filter(row => {
          const followUpDate = new Date(row.FollowUpAt);
          return followUpDate < today;
        });
        break;
      case 'today':
        filtered = filtered.filter(row => {
          const followUpDate = new Date(row.FollowUpAt);
          const followUpDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());
          return followUpDay.getTime() === today.getTime();
        });
        break;
      default: // 'all'
        break;
    }
    
    // Sort by follow-up priority and date
    filtered.sort((a, b) => {
      // Priority order: High > Medium > Low
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      const aPriority = priorityOrder[a.FollowUpPriority] || 2;
      const bPriority = priorityOrder[b.FollowUpPriority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // If same priority, sort by follow-up date (earlier first)
      const aDate = new Date(a.FollowUpAt);
      const bDate = new Date(b.FollowUpAt);
      return aDate - bDate;
    });
    
    return filtered;
  }, [rows, showFollowUpQueue, followUpFilter]);

  // Helper function to get communication count from notes and TextsSent field
  const getCommunicationCount = useCallback((contact) => {
    // Use TextsSent field if available, otherwise count from notes
    if (contact.TextsSent && !isNaN(parseInt(contact.TextsSent))) {
      return parseInt(contact.TextsSent);
    }
    
    // Fallback to counting SMS entries in notes
    const notes = contact.Notes || '';
    const smsMatches = notes.match(/\[\d{2}:\d{2}\] SMS/g);
    return smsMatches ? smsMatches.length : 0;
  }, []);

  // Helper function to format follow-up date
  const formatFollowUpDate = useCallback((dateString) => {
    if (!dateString) return '';
    
    const followUpDate = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const followUpDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());
    
    const diffDays = Math.floor((followUpDay - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `🔴 ${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      return `🟡 Today`;
    } else if (diffDays === 1) {
      return `🟢 Tomorrow`;
    } else {
      return `🟢 ${diffDays}d`;
    }
  }, []);

  // Toast notification function
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setToastVisible(true);
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToastMessage(null), 300); // Wait for fade out
    }, 4000);
  };

  const handleGenerateWebsites = useCallback(async () => {
    try {
      console.log('🔄 Generating websites for all contacts...');
      
      // Show a loading toast
      showToast('🔄 Generating websites for all contacts...', 'info');
      
      // Call the generate all websites API
      const response = await fetch('/api/generate-all-websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate websites');
      }
      
      const result = await response.json();
      
      if (result.success) {
        const propertyInfo = result.propertyDataSummary ? 
          ` - ${result.propertyDataSummary.totalPropertiesIncluded} properties included!` : '';
        
        showToast(`✅ Generated ${result.totalGenerated} websites with COMPLETE Chrome Extension data${propertyInfo}`, 'success');
        
        // Open the generated index
        openGeneratedIndex();
      } else {
        throw new Error(result.error || 'Website generation failed');
      }
    } catch (error) {
      console.error('Website generation error:', error);
      showToast(`❌ Website generation failed: ${error.message}`, 'error');
      
      // Fallback: just open the index page
      openGeneratedIndex();
    }
  }, [openGeneratedIndex, showToast]);

  // Generate website for a single contact with confirmation dialog
  const handleGenerateWebsiteForContact = useCallback(async (contact) => {
    // Show confirmation dialog
    const contactName = contact.name || 'Unknown Contact';
    const propertiesInfo = contact.properties?.length > 0 ? ` (${contact.properties.length} properties)` : '';
    
    const confirmed = window.confirm(
      `Generate Website for ${contactName}${propertiesInfo}?\n\n` +
      `This will generate/regenerate a comprehensive website using ALL Chrome Extension data including:\n` +
      `• Agent details and bio\n` +
      `• All property listings with prices\n` +
      `• Professional information\n` +
      `• Contact information\n\n` +
      `Continue with website generation?`
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      console.log('🔄 Generating website for contact:', contactName);
      
      // Show a loading toast
      showToast(`🔄 Generating website for ${contactName}...`, 'info');
      
      // Call the generate websites API with this single contact
      const response = await fetch('/api/generate-websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: [contact],
          template: 'realtor'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate website');
      }
      
      const result = await response.json();
      
      if (result.success && result.results.length > 0) {
        const contactResult = result.results[0];
        
        if (contactResult.success) {
          const propertyInfo = contactResult.propertiesIncluded > 0 ? 
            ` with ${contactResult.propertiesIncluded} properties` : '';
          
          showToast(`✅ Website generated for ${contactName}${propertyInfo}!`, 'success');
          
          // Open the generated website for this contact
          if (contactResult.websiteUrl) {
            const fullUrl = `http://localhost:3030${contactResult.websiteUrl}`;
            window.open(fullUrl, '_blank');
          }
        } else {
          throw new Error(contactResult.error || 'Website generation failed for contact');
        }
      } else {
        throw new Error(result.error || 'Website generation failed');
      }
    } catch (error) {
      console.error('Single website generation error:', error);
      showToast(`❌ Failed to generate website for ${contactName}: ${error.message}`, 'error');
    }
  }, [showToast]);

  const sortedRows = useMemo(() => {
    const sourceRows = showFollowUpQueue ? followUpRows : filteredRows;
    const arr = [...sourceRows];
    
    // If showing follow-up queue, it's already sorted by priority and date
    if (showFollowUpQueue && !sortBy.key) return arr;
    
    if (!sortBy.key) return arr;
    arr.sort((a, b) => {
      const va = (a[sortBy.key] ?? "").toString().toLowerCase();
      const vb = (b[sortBy.key] ?? "").toString().toLowerCase();
      if (va < vb) return sortBy.dir === "asc" ? -1 : 1;
      if (va > vb) return sortBy.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredRows, followUpRows, showFollowUpQueue, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / perPage));
  const pageRows = useMemo(() => sortedRows.slice((page - 1) * perPage, page * perPage), [sortedRows, page, perPage]);

  // Load databases on mount
  useEffect(() => {
    const loadInitialDatabases = async () => {
      try {
        const result = await loadDatabases();
        
        // Show info toast if localStorage was used as fallback
        if (result?.fallbackUsed) {
          showToast('📁 Database selection restored from local storage. Reconnecting to server...', 'info');
        } else if (result?.error) {
          showToast(`⚠️ Could not connect to server: ${result.error}. Using stored data.`, 'warning');
        }
        
        // Show success toast if database was remembered
        if (currentDatabase && !result?.fallbackUsed) {
          showToast(`✅ Reconnected to database: ${currentDatabase.name}`, 'success');
        }
      } catch (error) {
        console.error('Error loading initial databases:', error);
      }
    };
    
    loadInitialDatabases();
  }, []);

  // Load SMS devices and templates on mount
  useEffect(() => {
    loadSmsDevices();
    loadSmsTemplates();
  }, []); // Only run on mount

  // Load data when database changes
  useEffect(() => {
    if (currentDatabase) {
      loadData();
      loadSmsTemplates(); // Reload templates when database changes
    }
  }, [currentDatabase]); // Only depend on currentDatabase

  // Load status on mount and when database changes
  useEffect(() => {
    loadSystemStatus();
  }, []); // Only run on mount

  useEffect(() => {
    if (currentDatabase) {
      loadSystemStatus();
    }
  }, [currentDatabase]); // Only run when currentDatabase changes

  // Close bulk actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBulkActionsMenu && !event.target.closest('.bulk-actions-menu')) {
        setShowBulkActionsMenu(false);
      }
      if (showMainActionsMenu && !event.target.closest('.main-actions-menu')) {
        setShowMainActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBulkActionsMenu, showMainActionsMenu]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [totalPages, page, setPage]);

  // Debug currentDatabase
  useEffect(() => {
    console.log('🔍 currentDatabase changed:', {
      currentDatabase,
      hasName: !!currentDatabase?.name,
      name: currentDatabase?.name,
      type: typeof currentDatabase?.name,
      keys: currentDatabase ? Object.keys(currentDatabase) : 'null'
    });
  }, [currentDatabase]);

  // Import CSV
  const onFiles = async (files) => {
    if (!files?.length || !currentDatabase) return;
    
    try {
      setLoading(true);
      
      // First, read and parse the CSV to check headers
      const file = files[0];
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }
      
      // Parse CSV headers
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Check if headers match expected CRM fields
      const expectedFields = ['firstName', 'lastName', 'name', 'company', 'phone', 'email'];
      const hasStandardHeaders = expectedFields.some(field => 
        headers.some(header => header.toLowerCase().includes(field.toLowerCase()))
      );
      
      if (!hasStandardHeaders && headers.length > 1) {
        // Headers don't match - show column mapper
        const csvRows = [];
        for (let i = 1; i < Math.min(lines.length, 100); i++) { // Parse first 100 rows for preview
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          csvRows.push(row);
        }
        
        setCsvHeaders(headers);
        setCsvData(csvRows);
        setColumnMapping({});
        setShowColumnMapper(true);
        setLoading(false);
        return;
      }
      
      // Standard import if headers match
      const result = await api.uploadCSV(files[0]);
      showToast(`✅ Successfully imported ${result.imported} records`, 'success');
      await loadData();
    } catch (error) {
      console.error('CSV import failed:', error);
      showToast(`❌ CSV import failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle mapped CSV import
  const handleMappedImport = async () => {
    try {
      setLoading(true);
      setShowColumnMapper(false);
      
      // Transform CSV data using the column mapping
      const transformedData = csvData.map(row => {
        const transformedRow = {
          id: uid(),
          Status: DEFAULT_STATUS,
          Notes: "",
          TextsSent: 0,
          FollowUpPriority: "Medium"
        };
        
        // Apply column mapping - directly map to the exact CRM field names
        Object.entries(columnMapping).forEach(([crmField, csvColumn]) => {
          if (csvColumn && row[csvColumn]) {
            transformedRow[crmField] = row[csvColumn];
          }
        });
        
        return transformedRow;
      });
      
      // Save transformed data to database
      let imported = 0;
      for (const contact of transformedData) {
        try {
          await api.saveContact(contact);
          imported++;
        } catch (error) {
          console.error('Failed to save contact:', error);
        }
      }
      
      showToast(`✅ Successfully imported ${imported} records using column mapping`, 'success');
      await loadData();
      
      // Reset mapper state
      setCsvData(null);
      setCsvHeaders([]);
      setColumnMapping({});
      
    } catch (error) {
      console.error('Mapped import failed:', error);
      showToast(`❌ Import failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const exportCsv = () => {
    const exportHeaders = normalizedHeaders;
    const csvContent = [
      exportHeaders.join(','),
      ...rows.map(r => exportHeaders.map(h => {
        const value = r[h] ?? '';
        // Escape quotes and wrap in quotes if contains comma
        return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dbName = typeof currentDatabase === 'object' ? currentDatabase?.name : currentDatabase;
    a.download = `${dbName}_export_${dayjs().format("YYYY-MM-DD_HH-mm")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper functions for field detection using utility functions
  const findPhoneFieldFn = useCallback((contact) => {
    return findPhoneField(contact, headers, getCurrentDatabaseTypeFn);
  }, [headers, getCurrentDatabaseTypeFn]);

  const findNameFieldFn = useCallback((contact) => {
    return findNameField(contact, headers, getCurrentDatabaseTypeFn);
  }, [headers, getCurrentDatabaseTypeFn]);



  // All duplicate functions have been removed and modularized into custom hooks

  const openSmsForContact = (contact) => {
    // Clear any existing selections and select this specific contact
    setSelectedContacts(new Set([contact.id]));
    setShowBatchTextPanel(true);
    
    // Pre-populate with contact info for personalized message
    const firstName = getFirstName(contact);
    if (firstName !== 'there') {
      setBatchMessage(`Hi ${firstName}, `);
    }
  };

  // Manual follow-up functions
  const openFollowUpModal = (contact) => {
    setFollowUpContact(contact);
    
    // Pre-populate with existing follow-up date if available
    if (contact.FollowUpAt) {
      // Format existing follow-up date for date input (YYYY-MM-DD)
      const followUpDate = new Date(contact.FollowUpAt);
      const year = followUpDate.getFullYear();
      const month = String(followUpDate.getMonth() + 1).padStart(2, '0');
      const day = String(followUpDate.getDate()).padStart(2, '0');
      setManualFollowUpDate(`${year}-${month}-${day}`);
    } else {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      setManualFollowUpDate(`${year}-${month}-${day}`);
    }
    
    setManualFollowUpPriority(contact.FollowUpPriority || 'Medium');
    setShowFollowUpModal(true);
  };

  // Properties modal functions
  const saveManualFollowUp = async () => {
    if (!followUpContact || !manualFollowUpDate) {
      alert('Please select a follow-up date');
      return;
    }

    try {
      const followUpDateTime = new Date(manualFollowUpDate + 'T09:00:00').toISOString();
      
      await patchRow(followUpContact.id, {
        FollowUpAt: followUpDateTime,
        FollowUpPriority: manualFollowUpPriority,
        Notes: (followUpContact.Notes || '') + `\n[${new Date().toLocaleTimeString()}] Manual follow-up scheduled for ${new Date(followUpDateTime).toLocaleDateString()}`
      });

      setShowFollowUpModal(false);
      setFollowUpContact(null);
      setManualFollowUpDate('');
      setManualFollowUpPriority('Medium');
      
      showToast('✅ Follow-up scheduled successfully!', 'success');
    } catch (error) {
      console.error('Failed to schedule follow-up:', error);
      alert('Failed to schedule follow-up: ' + error.message);
    }
  };

  const removeFollowUp = async (contact) => {
    try {
      await patchRow(contact.id, {
        FollowUpAt: null,
        FollowUpPriority: null,
        Notes: (contact.Notes || '') + `\n[${new Date().toLocaleTimeString()}] Follow-up removed`
      });

      showToast('🗑️ Follow-up removed', 'success');
    } catch (error) {
      console.error('Failed to remove follow-up:', error);
      alert('Failed to remove follow-up: ' + error.message);
    }
  };

  // Bio Editor functions
  const openBioEditor = (contact) => {
    setSelectedContactForBio(contact);
    setShowBioModal(true);
  };

  const handleBioUpdated = async (contactId, newBio) => {
    try {
      // Update the contact in the local data
      setRows(prevRows => 
        prevRows.map(contact => 
          contact.id === contactId 
            ? { ...contact, bio: newBio }
            : contact
        )
      );
      
      showToast('✅ Bio updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update bio in UI:', error);
      showToast('❌ Failed to update bio display', 'error');
    }
  };

  // Sidebar tab change handler
  const handleSidebarTabChange = useCallback((tabId) => {
    setCurrentSidebarTab(tabId);
    
    // Handle tab-specific actions
    switch (tabId) {
      case 'dashboard':
        setCurrentView('dashboard');
        break;
      case 'databases':
        setCurrentView('main'); // Go to main view (this IS the database view)
        // Don't automatically open the database manager modal
        break;
      default:
        console.log(`Unknown sidebar tab: ${tabId}`);
    }
  }, []);

  // Navigate back to main view
  const handleBackToMain = useCallback(() => {
    setCurrentView('main');
    setCurrentSidebarTab('databases'); // Set to databases tab since that's the main view
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Try to load the MP3 file first
      const audio = new Audio('/Notification2.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback to Web Audio API generated sound
        playGeneratedNotificationSound();
      });
    } catch (error) {
      // Fallback to Web Audio API generated sound
      playGeneratedNotificationSound();
    }
  };

  // Generate notification sound using Web Audio API
  const playGeneratedNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a pleasant notification sound (C major chord with fade)
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
      const duration = 0.3;
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        // Fade in and out
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + duration + index * 0.1);
      });
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  // Play queue completion sound
  const playQueueCompletionSound = () => {
    try {
      const audio = new Audio('/sting_econsuc2.mp3');
      audio.volume = 0.7;
      audio.play().catch(error => {
        console.warn('Could not play queue completion sound, trying fallback:', error);
        // Fallback to generated notification sound
        playGeneratedNotificationSound();
      });
    } catch (error) {
      console.warn('Could not load queue completion sound, using fallback:', error);
      // Fallback to generated notification sound
      playGeneratedNotificationSound();
    }
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest("input,textarea")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nav(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nav(-1);
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        exportCsv();
      } else if (e.key === "/") {
        e.preventDefault();
        // Focus search input
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) searchInput.focus();
      } else if (e.key === "Escape") {
        // Clear filters on Escape
        if (search || statusFilter || tagFilter) {
          e.preventDefault();
          clearFilters();
        }
      } else if (e.key === "1") setStatus("No Answer");
      else if (e.key === "2") setStatus("Left Voicemail");
      else if (e.key === "3") setStatus("Interested");
      else if (e.key === "4") setStatus("Not Interested");
      else if (e.key === "5") setStatus("SENT TEXT");
      else if (e.key === "6") setStatus("Texted and Called");
      else if (e.key === "7") setStatus("Initial Followup");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTagFilter("");
    setPage(1);
  };

  const selected = rows.find((r) => r.id === selectedId) || null;
  const nav = (delta) => {
    if (!selected) return;
    const idx = sortedRows.findIndex((r) => r.id === selected.id);
    const next = sortedRows[Math.min(sortedRows.length - 1, Math.max(0, idx + delta))];
    if (next) setSelectedId(next.id);
  };

  const setStatus = (status) => {
    if (!selected) return;
    patchRow(selected.id, { Status: status, LastContacted: dayjs().format("YYYY-MM-DD HH:mm") });
  };

  const onFollowUp = (dt) => {
    if (!selected) return;
    // Convert datetime-local format to ISO string
    const isoDateTime = dt ? new Date(dt).toISOString() : null;
    patchRow(selected.id, { FollowUpAt: isoDateTime });
  };

  // Renderers
  const Cell = ({ h, v, contact }) => {
    // Special handling for phone number fields - make them larger and more readable
    const phoneFields = ['phone', 'mobile', 'cell', 'telephone', 'tel', 'office_phone', 'mobile_phone'];
    const isPhoneField = phoneFields.some(field => h.toLowerCase().includes(field.toLowerCase()));
    
    if (isPhoneField && v && v.toString().trim()) {
      const phoneValue = v.toString().trim();
      // Check if this looks like a phone number (has digits)
      const hasDigits = /\d/.test(phoneValue);
      
      if (hasDigits) {
        return (
          <div className="flex items-center justify-center text-center">
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border-2 border-blue-200 dark:border-blue-700 font-mono tracking-wide">
              {phoneValue}
            </span>
          </div>
        );
      }
    }
    
    // Special handling for property array fields
    if (['properties', 'property_details'].includes(h)) {
      const formattedValue = formatPropertyValue(contact, h);
      const properties = getContactProperty(contact, h);
      
      if (Array.isArray(properties) && properties.length > 0) {
        return (
          <div className="max-w-xs">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium mb-1">
              <Building className="h-3 w-3" />
              {properties.length} properties
            </span>
            <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {formattedValue}
            </div>
          </div>
        );
      }
      return <span className="text-slate-400 text-sm">No properties</span>;
    }
    
    // Special handling for Chrome Extension property fields
    if (['total_properties', 'avg_property_price', 'min_property_price', 'max_property_price', 'cities_served'].includes(h)) {
      const formattedValue = formatPropertyValue(contact, h);
      
      // Add styling for property data
      if (h === 'total_properties') {
        const count = parseInt(getContactProperty(contact, h)) || 0;
        if (count === 0) {
          return <span className="text-slate-400 text-sm">No properties</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
            <Building className="h-3 w-3" />
            {formattedValue}
          </span>
        );
      }
      
      if (h.includes('price')) {
        const numValue = parseFloat(getContactProperty(contact, h));
        if (isNaN(numValue) || numValue === 0) {
          return <span className="text-slate-400 text-sm">-</span>;
        }
        
        // Color code by price range
        let colorClass = 'text-green-600 dark:text-green-400'; // Default green for good prices
        if (h === 'avg_property_price') {
          if (numValue >= 1000000) colorClass = 'text-purple-600 dark:text-purple-400'; // Purple for luxury
          else if (numValue >= 500000) colorClass = 'text-blue-600 dark:text-blue-400'; // Blue for high-end
          else if (numValue >= 200000) colorClass = 'text-green-600 dark:text-green-400'; // Green for mid-range
          else colorClass = 'text-orange-600 dark:text-orange-400'; // Orange for lower-end
        }
        
        return (
          <span className={`font-medium ${colorClass}`}>
            {formattedValue}
          </span>
        );
      }
      
      if (h === 'cities_served') {
        const count = parseInt(getContactProperty(contact, h)) || 0;
        if (count === 0) {
          return <span className="text-slate-400 text-sm">0 cities</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
            <MapPin className="h-3 w-3" />
            {formattedValue}
          </span>
        );
      }
      
      return <span className="text-sm">{formattedValue}</span>;
    }
    
    // Special handling for Chrome Extension rich profile fields
    if (['bio', 'experience_years', 'specializations', 'ratings', 'social_media', 'website', 'profile_image_url'].includes(h)) {
      const formattedValue = formatPropertyValue(contact, h);
      
      // Profile image
      if (h === 'profile_image_url') {
        const imageUrl = getContactProperty(contact, h);
        if (imageUrl) {
          return (
            <div className="flex items-center gap-2">
              <img src={imageUrl} alt="Profile" className="h-8 w-8 object-cover rounded-full" />
              <span className="text-xs text-slate-500">Photo</span>
            </div>
          );
        }
        return <span className="text-slate-400 text-sm">No photo</span>;
      }
      
      // Website
      if (h === 'website') {
        const website = getContactProperty(contact, h);
        if (website) {
          return (
            <a href={website} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-300 underline inline-flex items-center gap-1 text-sm">
              <LinkIcon className="h-3 w-3" />
              Website
            </a>
          );
        }
        return <span className="text-slate-400 text-sm">No website</span>;
      }
      
      // Bio
      if (h === 'bio') {
        const bio = getContactProperty(contact, h);
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm flex-1" title={bio}>
              {bio ? (bio.length > 50 ? bio.substring(0, 50) + '...' : bio) : 'No bio'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openBioEditor(contact);
              }}
              className="text-gray-400 hover:text-blue-600 transition-colors p-1"
              title="Edit Bio"
            >
              <Edit className="h-3 w-3" />
            </button>
          </div>
        );
      }
      
      // Experience years
      if (h === 'experience_years') {
        const years = parseInt(getContactProperty(contact, h)) || 0;
        if (years === 0) {
          return <span className="text-slate-400 text-sm">N/A</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium">
            <Clock className="h-3 w-3" />
            {formattedValue}
          </span>
        );
      }
      
      // Specializations
      if (h === 'specializations') {
        const specs = getContactProperty(contact, h);
        if (Array.isArray(specs) && specs.length > 0) {
          return (
            <span className="text-sm" title={specs.join(', ')}>
              {specs.length} specialization{specs.length !== 1 ? 's' : ''}
            </span>
          );
        }
        return <span className="text-slate-400 text-sm">None listed</span>;
      }
      
      // Ratings
      if (h === 'ratings') {
        const ratings = getContactProperty(contact, h);
        if (ratings && typeof ratings === 'object' && ratings.count && ratings.count > 0) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-medium">
              <Star className="h-3 w-3" />
              {formattedValue}
            </span>
          );
        }
        return <span className="text-slate-400 text-sm">No reviews</span>;
      }
      
      // Social media
      if (h === 'social_media') {
        const social = getContactProperty(contact, h);
        if (social && typeof social === 'object' && social.facebook) {
          return (
            <a href={social.facebook} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-300 underline text-sm">
              Facebook
            </a>
          );
        }
        return <span className="text-slate-400 text-sm">N/A</span>;
      }
      
      return <span className="text-sm">{formattedValue}</span>;
    }
    
    // Special handling for TextsSent column
    if (h === 'TextsSent') {
      const count = getCommunicationCount(contact);
      if (count === 0) {
        return <span className="text-slate-400 text-sm">No texts</span>;
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
          <MessageSquare className="h-3 w-3" />
          {count} text{count !== 1 ? 's' : ''}
        </span>
      );
    }
    
    // Special handling for FollowUpAt column
    if (h === 'FollowUpAt' && v) {
      return (
        <span className="text-sm">
          {formatFollowUpDate(v)}
        </span>
      );
    }
    
    // Special handling for FollowUpPriority column
    if (h === 'FollowUpPriority' && v) {
      const priorityColors = {
        'High': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        'Medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        'Low': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      };
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityColors[v] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
          {v}
        </span>
      );
    }
    
    if (isUrl(v)) {
      if (isImageUrl(v)) {
        return (
          <a href={v} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
            <img src={v} alt="img" className="h-10 w-10 object-cover rounded" />
            <span className="underline truncate max-w-[240px]">{v}</span>
          </a>
        );
      }
      return (
        <a href={v} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-300 underline inline-flex items-center gap-1">
          <LinkIcon className="h-4 w-4" /> <span className="truncate max-w-[280px]">{v}</span>
        </a>
      );
    }
    
    // Check if this is an array or object that needs formatting
    if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
      const formattedValue = formatPropertyValue(contact, h);
      
      // For arrays, show count and formatted content
      if (Array.isArray(v)) {
        if (v.length === 0) {
          return <span className="text-slate-400 text-sm">None</span>;
        }
        return (
          <div className="max-w-xs">
            <span className="text-xs text-slate-500 mb-1 block">{v.length} item{v.length !== 1 ? 's' : ''}</span>
            <span className="text-sm line-clamp-2" title={formattedValue}>{formattedValue}</span>
          </div>
        );
      }
      
      // For objects, show formatted content
      return <span className="text-sm" title={formattedValue}>{formattedValue}</span>;
    }
    
    return <span className="truncate block max-w-[320px]" title={String(v ?? "")}>{String(v ?? "")}</span>;
  };

  // SMS Panel Modal
  const SmsPanel = () => {
    const currentContact = selectedContact || (selectedId ? rows.find(r => r.id === selectedId) : null);
    const phoneField = findPhoneField(currentContact);
    const nameField = findNameField(currentContact);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Management
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSmsHistory(!showSmsHistory)}
                className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                {showSmsHistory ? 'Hide History' : 'Show History'}
              </button>
              <button 
                onClick={() => setShowSmsPanel(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - SMS Sending */}
            <div>
              {/* Connection Status */}
              <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Device Status</span>
                  <span className={`text-sm px-2 py-1 rounded ${smsConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                    {smsConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {smsDeviceInfo && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {smsDeviceInfo.model} (Android {smsDeviceInfo.androidVersion})
                  </p>
                )}
                {smsConnected && (
                  <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded border-l-4 border-blue-500">
                    <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
                      <span className="text-xs font-semibold">🚀 ENHANCED AUTO-CLICK SYSTEM ACTIVE</span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      • Advanced Send button detection with multiple methods<br/>
                      • Strict verification to prevent false positives<br/>
                      • Comprehensive debugging and UI analysis<br/>
                      • Multiple coordinate fallback attempts
                    </p>
                  </div>
                )}
              </div>

              {/* Device List */}
              {!smsConnected && (
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Available Devices</h3>
                  {smsDevices.length === 0 ? (
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        No devices found. Please:
                      </p>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 ml-4 list-disc">
                        <li>Connect your Android phone via USB</li>
                        <li>Enable USB Debugging in Developer Options</li>
                        <li>Accept the ADB authorization prompt</li>
                      </ul>
                      <button 
                        onClick={loadSmsDevices}
                        className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                      >
                        Refresh
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {smsDevices.map(device => (
                        <div key={device.id} className="flex items-center justify-between p-2 border border-slate-200 dark:border-slate-600 rounded">
                          <div>
                            <div className="text-sm font-medium">{device.model || device.device || 'Unknown Device'}</div>
                            <div className="text-xs text-slate-500 font-mono">{device.id}</div>
                          </div>
                          <button 
                            onClick={() => connectSmsDevice(device.id)}
                            disabled={smsLoading}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                          >
                            {smsLoading ? 'Connecting...' : 'Connect'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SMS Sending */}
              {smsConnected && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Send SMS</h3>
                    {currentContact && phoneField && currentContact[phoneField] ? (
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mb-3">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Contact: <strong>{currentContact[nameField] || currentContact.id}</strong>
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Phone: <strong>{currentContact[phoneField]}</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mb-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          {!currentContact ? 'Select a contact from the table to send SMS' : 
                           !phoneField ? 'No phone field found in your data' : 
                           'Selected contact has no phone number'}
                        </p>
                      </div>
                    )}

                    {/* Templates */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">Quick Templates</label>
                      <select 
                        value={selectedTemplate}
                        onChange={(e) => {
                          setSelectedTemplate(e.target.value);
                          setSmsMessage(e.target.value);
                        }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                      >
                        <option value="">Select a template...</option>
                        {smsTemplates.map((template, index) => {
                          const templateContent = typeof template === 'string' ? template : template.content;
                          const templateName = typeof template === 'object' && template.name ? template.name : null;
                          
                          return (
                            <option key={index} value={templateContent}>
                              {templateName ? `${templateName}: ` : ''}{templateContent.substring(0, 50)}{templateContent.length > 50 ? '...' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Template Management */}
                    <div className="mb-3 flex items-center justify-between">
                      <label className="block text-sm font-medium">SMS Templates</label>
                      <button 
                        onClick={() => setShowTemplateManager(true)}
                        className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 inline-flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Manage ({smsTemplates.length})
                      </button>
                    </div>
                    
                    <textarea
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Enter your message... Use {name}, {firstName}, {company} for personalization"
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                      rows={4}
                    />
                    
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-slate-500">
                        {smsMessage.length} characters {smsMessage.length > 160 ? `(${Math.ceil(smsMessage.length / 160)} SMS segments)` : ''}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            if (currentContact) {
                              const sampleMessage = "Hey, would you mind doing me a favor and taking a look at this sample :\n\nhttps://ai-listing-videos-funnel.netlify.app/silicode_ai_listing_videos_single_page_app.html";
                              setSmsMessage(sampleMessage);
                              // Auto-send the sample message
                              await sendSmsToContact(currentContact, sampleMessage);
                            }
                          }}
                          disabled={!currentContact || !phoneField || !currentContact[phoneField] || smsLoading}
                          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium flex items-center gap-1"
                        >
                          <LinkIcon className="w-4 h-4" />
                          Send Sample
                        </button>
                        <button 
                          onClick={async () => {
                            if (currentContact && smsMessage.trim()) {
                              try {
                                await sendSmsToContact(currentContact, smsMessage);
                                // Clear the message after successful send
                                setSmsMessage('');
                              } catch (error) {
                                console.error('Failed to send SMS:', error);
                                alert('Failed to send SMS: ' + error.message);
                              }
                            }
                          }}
                          disabled={!currentContact || !phoneField || !currentContact[phoneField] || !smsMessage.trim() || smsLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                        >
                          {smsLoading ? 'Sending...' : 'Send Text'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <button 
                      onClick={async () => {
                        await api.disconnectSms();
                        setSmsConnected(false);
                        setSmsDeviceInfo(null);
                      }}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Disconnect Device
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - SMS History */}
            {showSmsHistory && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">SMS History</h3>
                  <button 
                    onClick={loadSmsHistory}
                    className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg">
                  {smsHistory.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      No SMS history yet
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-600">
                      {smsHistory.map((entry) => {
                        // Enhanced status display
                        let statusConfig = {};
                        switch(entry.status) {
                          case 'sending':
                            statusConfig = {
                              bg: 'bg-blue-100 dark:bg-blue-900/30',
                              text: 'text-blue-700 dark:text-blue-300',
                              label: '🚀 Sending...',
                              icon: '⏳'
                            };
                            break;
                          case 'sent_automatically':
                            statusConfig = {
                              bg: 'bg-green-100 dark:bg-green-900/30',
                              text: 'text-green-700 dark:text-green-300',
                              label: '✅ Auto-Sent',
                              icon: '🚀'
                            };
                            break;
                          case 'opened_auto_click_attempted':
                            statusConfig = {
                              bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                              text: 'text-yellow-700 dark:text-yellow-300',
                              label: '⚠️ Auto-Click Attempted',
                              icon: '🎯'
                            };
                            break;
                          case 'auto_click_failed':
                            statusConfig = {
                              bg: 'bg-red-100 dark:bg-red-900/30',
                              text: 'text-red-700 dark:text-red-300',
                              label: '❌ Auto-Click Failed',
                              icon: '🔧'
                            };
                            break;
                          case 'opened':
                            statusConfig = {
                              bg: 'bg-blue-100 dark:bg-blue-900/30',
                              text: 'text-blue-700 dark:text-blue-300',
                              label: '📱 App Opened',
                              icon: '📱'
                            };
                            break;
                          default:
                            statusConfig = {
                              bg: 'bg-slate-100 dark:bg-slate-700',
                              text: 'text-slate-700 dark:text-slate-300',
                              label: entry.status,
                              icon: '📝'
                            };
                        }
                        
                        return (
                          <div key={entry.id} className="p-3">
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-medium text-sm">{entry.phoneNumber}</span>
                              <span className={`text-xs px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.text}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                              {statusConfig.icon} {entry.message.substring(0, 100)}{entry.message.length > 100 ? '...' : ''}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-slate-500">
                                {new Date(entry.timestamp).toLocaleString()}
                              </p>
                              {(entry.status === 'sent_automatically' || entry.status === 'opened_auto_click_attempted') && (
                                <span className="text-xs bg-gradient-to-r from-emerald-500 to-green-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse"></span>
                                  {entry.status === 'sent_automatically' ? 'Sent Successfully' : 'App Opened'}
                                </span>
                              )}
                              {entry.status === 'sending' && (
                                <span className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Sending...
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Queue Completion Modal
  const QueueCompletionModal = () => {
    if (!completionReport) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Queue Complete
            </h2>
            <button 
              onClick={() => setShowCompletionModal(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {completionReport.totalProcessed}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Total</div>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {completionReport.successCount}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Success</div>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {completionReport.failedCount}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">Failed</div>
              </div>
            </div>

            {/* Success Rate */}
            <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Success Rate</span>
                <span className="text-lg font-bold">{completionReport.successRate}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionReport.successRate}%` }}
                ></div>
              </div>
            </div>

            {/* Completion Time */}
            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
              Completed at {completionReport.endTime.toLocaleTimeString()}
            </div>

            {/* Debug Info - Status Breakdown */}
            {completionReport.statusBreakdown && (
              <div className="border-t pt-4">
                <h3 className="font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Status Breakdown
                </h3>
                <div className="text-xs space-y-1">
                  {Object.entries(completionReport.statusBreakdown).map(([status, count]) => {
                    // Determine if this status is a success or failure
                    const isSuccess = ['sent', 'sent_automatically', 'opened_auto_click_attempted'].includes(status);
                    const isFailure = status === 'failed';
                    const isPending = ['pending', 'sending'].includes(status);
                    
                    let colorClasses = 'text-slate-600 dark:text-slate-400'; // default
                    if (isSuccess) {
                      colorClasses = 'text-green-600 dark:text-green-400';
                    } else if (isFailure) {
                      colorClasses = 'text-red-600 dark:text-red-400';
                    } else if (isPending) {
                      colorClasses = 'text-blue-600 dark:text-blue-400';
                    }
                    
                    return (
                      <div key={status} className="flex justify-between">
                        <span className={`font-mono ${colorClasses}`}>
                          {status}:
                          {isSuccess && ' ✅'}
                          {isFailure && ' ❌'}
                          {isPending && ' ⏳'}
                        </span>
                        <span className={colorClasses}>{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  ✅ = Success (counted in success rate) • ❌ = Failed • ⏳ = Processing
                </div>
              </div>
            )}

            {/* Failed Items */}
            {completionReport.failedCount > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">
                  Failed Messages ({completionReport.failedCount})
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {completionReport.failedItems.map((item, index) => (
                    <div key={index} className="text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <div className="font-medium">{item.contact}</div>
                      <div className="text-slate-600 dark:text-slate-400">{item.phone}</div>
                      <div className="text-red-600 dark:text-red-400">{item.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Done
              </button>
              {completionReport.failedCount > 0 && (
                <button 
                  onClick={() => {
                    setShowCompletionModal(false);
                    setShowQueuePanel(true);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Queue Panel Modal
  const QueuePanel = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 ${queueStatus === 'running' ? 'animate-spin' : ''}`} />
            Text Message Queue
          </h2>
          <div className="flex gap-2">
            {queueStatus === 'idle' && (
              <button 
                onClick={() => executeQueue(sendSmsToContact, patchRow, null, playQueueCompletionSound)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start Queue
              </button>
            )}
            {queueStatus === 'running' && (
              <button 
                onClick={pauseQueue}
                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Pause
              </button>
            )}
            {queueStatus === 'paused' && (
              <button 
                onClick={() => resumeQueue(sendSmsToContact, patchRow, null, playQueueCompletionSound)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Resume
              </button>
            )}
            <button 
              onClick={clearQueue}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear Queue
            </button>
            <button 
              onClick={() => setShowQueuePanel(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Queue Status: </span>
              <span className={`px-2 py-1 rounded text-sm ${
                queueStatus === 'idle' ? 'bg-gray-200 text-gray-700' :
                queueStatus === 'running' ? 'bg-blue-200 text-blue-700' :
                queueStatus === 'paused' ? 'bg-yellow-200 text-yellow-700' :
                'bg-green-200 text-green-700'
              }`}>
                {queueStatus.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Progress: {currentQueueIndex} / {textQueue.length}
            </div>
          </div>
          {queueStatus === 'running' && (
            <div className="mt-2">
              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentQueueIndex / textQueue.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {textQueue.map((item, index) => (
            <div key={item.id} className={`p-3 border rounded-lg ${
              index === currentQueueIndex && queueStatus === 'running' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
              ['sent', 'sent_automatically', 'opened_auto_click_attempted'].includes(item.status) ? 'border-green-300 bg-green-50 dark:bg-green-900/20' :
              item.status === 'failed' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
              item.status === 'sending' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
              'border-slate-300 dark:border-slate-600'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    {item.contact[findNameField(item.contact)] || item.contact.id}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {item.contact[findPhoneField(item.contact)]}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {item.message.substring(0, 100)}{item.message.length > 100 ? '...' : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded text-xs ${
                    item.status === 'pending' ? 'bg-gray-200 text-gray-700' :
                    item.status === 'sending' ? 'bg-yellow-200 text-yellow-700' :
                    ['sent', 'sent_automatically', 'opened_auto_click_attempted'].includes(item.status) ? 'bg-green-200 text-green-700' :
                    'bg-red-200 text-red-700'
                  }`}>
                    {item.status.toUpperCase()}
                  </div>
                  {item.timestamp && (
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
              {item.status === 'failed' && item.result?.error && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Error: {item.result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Toast Notification Component
  const ToastNotification = () => {
    if (!toastMessage) return null;

    return (
      <div className={`fixed bottom-4 left-4 z-50 transition-all duration-300 transform ${
        toastVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}>
        <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] ${
          toastMessage.type === 'success' 
            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' 
            : toastMessage.type === 'error'
            ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
        }`}>
          {toastMessage.type === 'success' && (
            <div className="bg-white/20 rounded-full p-1">
              <Check className="h-5 w-5" />
            </div>
          )}
          {toastMessage.type === 'error' && (
            <div className="bg-white/20 rounded-full p-1">
              <X className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1">
            <p className="font-medium text-sm leading-tight">{toastMessage.message}</p>
            <div className="text-xs opacity-90 mt-1">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
          <button 
            onClick={() => setToastVisible(false)}
            className="bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <ProgressProvider>
      <UserProvider>
        <div className={"min-h-screen " + (dark ? "dark" : "")}>
          <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen">
            {/* Left Sidebar - Always visible floating navigation */}
            <LeftSidebar 
              isOpen={leftSidebarOpen}
              setIsOpen={setLeftSidebarOpen}
              currentTab={currentView === 'dashboard' ? 'dashboard' : 'databases'}
              onTabChange={handleSidebarTabChange}
            />
            
            {/* Login Modal */}
            <LoginModal />
        
        {/* Conditional rendering based on current view */}
        {currentView === 'dashboard' ? (
          <DashboardPage
            rows={rows}
            currentDatabase={currentDatabase}
            systemStatus={{
              database: { connected: !!currentDatabase, contactCount: rows.length },
              sms: { connected: !!smsConnected },
              adb: { connected: false } // ADB status to be implemented
            }}
            smsHistory={smsHistory}
            onBack={handleBackToMain}
            api={api}
          />
        ) : (
          <>
            {showDatabaseManager && rawDatabases && Object.keys(rawDatabases).length > 0 && (
          <DatabaseManager 
            databases={rawDatabases}
            currentDatabase={currentDatabase}
            newDatabaseName={newDatabaseName}
            loading={loading}
            setLoading={setLoading}
            setNewDatabaseName={setNewDatabaseName}
            setShowDatabaseManager={setShowDatabaseManager}
            switchToDatabase={switchToDatabase}
            api={api}
            loadDatabases={loadDatabases}
            showToast={showToast}
            clearDatabaseStorage={clearDatabaseStorage}
          />
        )}
        {showDatabaseManager && (!rawDatabases || Object.keys(rawDatabases).length === 0) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading databases...</p>
              </div>
            </div>
          </div>
        )}
        
        {showSmsPanel && <SmsPanel />}
        {showBatchTextPanel && (
          <PermissionGuard permission={PERMISSIONS.BATCH_OPERATIONS}>
            <BatchTextPanel 
              selectedContacts={selectedContacts}
              setShowBatchTextPanel={setShowBatchTextPanel}
              rows={rows}
              findNameField={findNameField}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              setBatchMessage={setBatchMessage}
              smsTemplates={smsTemplates}
              batchMessage={batchMessage}
              createTextQueue={createTextQueue}
              findPhoneField={smsPhoneField}
              setShowQueuePanel={setShowQueuePanel}
              getFirstName={getFirstName}
              // SMS Device Integration
              smsConnected={smsConnected}
              smsDeviceInfo={smsDeviceInfo}
              smsDevices={smsDevices}
              onConnectDevice={connectSmsDevice}
              onSearchDevices={loadSmsDevices}
              smsLoading={smsLoading}
            />
          </PermissionGuard>
        )}
        {showModularWebsitePanel && <ModularWebsiteGenerator 
          selectedContact={selectedContact || (selectedContacts.size === 1 ? rows.find(r => r.id === Array.from(selectedContacts)[0]) : null)}
          onWebsiteGenerated={(result) => {
            setToastMessage({
              type: 'success',
              title: 'Website Generated!',
              message: `${result.layout} layout with ${result.theme} theme`,
              details: result.websiteUrl
            });
            setToastVisible(true);
          }}
          onClose={() => {
            setShowModularWebsitePanel(false);
            setSelectedContact(null); // Clear the directly selected contact when closing
          }}
        />}
        {showMoveToDbModal && <MoveToDbModal 
          showMoveToDbModal={showMoveToDbModal}
          setShowMoveToDbModal={setShowMoveToDbModal}
          databases={databases}
          currentDatabase={currentDatabase}
          selectedContacts={selectedContacts}
          handleMoveContacts={handleMoveContacts}
          loading={loading}
        />}
        {showTemplateManager && <TemplateManager 
          showTemplateManager={showTemplateManager}
          setShowTemplateManager={setShowTemplateManager}
          smsTemplates={smsTemplates}
          setSmsTemplates={setSmsTemplates}
          api={api}
          showToast={showToast}
          onClose={async () => {
            await loadSmsTemplates();
          }}
        />}

        {/* User Management Modal */}
        {showUserManagement && (
          <UserManagementModal
            isOpen={showUserManagement}
            onClose={() => setShowUserManagement(false)}
          />
        )}
        
        <StatusPanel 
          showStatusPanel={showStatusPanel}
          setShowStatusPanel={setShowStatusPanel}
          systemStatus={systemStatus}
          statusLoading={statusLoading}
          refreshStatus={refreshStatus}
        />

        <CleanupModal
          showCleanupModal={showCleanupModal}
          setShowCleanupModal={setShowCleanupModal}
          databases={databases}
          currentDatabase={currentDatabase}
          rows={rows}
          selectedContacts={Array.from(selectedContacts).map(id => rows.find(r => r.id === id)).filter(Boolean)}
          findPhoneField={findPhoneField}
          findNameField={findNameField}
          api={api}
          loadData={loadData}
          setLoading={setLoading}
          showToast={showToast}
          generateRealtorSlug={generateRealtorSlug}
          getContactProperty={getContactProperty}
        />

        <TagsModal
          showTagsModal={showTagsModal}
          setShowTagsModal={setShowTagsModal}
          selectedContacts={Array.from(selectedContacts).map(id => rows.find(r => r.id === id)).filter(Boolean)}
          rows={rows}
          api={api}
          patchRow={patchRow}
          loadData={loadData}
          showToast={showToast}
        />

        <ReviewManagementModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedContactForReviews(null);
          }}
          contact={selectedContactForReviews}
          onReviewsUpdated={loadData}
        />

        <PropertyManagementModal
          isOpen={showPropertyModal}
          onClose={() => {
            setShowPropertyModal(false);
            setSelectedContactForProperties(null);
          }}
          contact={selectedContactForProperties}
          onPropertiesUpdated={loadData}
        />

        <BioEditorModal
          isOpen={showBioModal}
          onClose={() => {
            setShowBioModal(false);
            setSelectedContactForBio(null);
          }}
          contact={selectedContactForBio}
          onBioUpdated={handleBioUpdated}
        />

        <PermissionGuard permission={PERMISSIONS.BATCH_OPERATIONS}>
          <SimpleBatchModal
            isOpen={showSimpleBatchModal}
            onClose={() => setShowSimpleBatchModal(false)}
            showToast={showToast}
          />
        </PermissionGuard>
        
        {showColumnMapper && <ColumnMapper 
          csvHeaders={csvHeaders}
          csvData={csvData}
          columnMapping={columnMapping}
          setColumnMapping={setColumnMapping}
          onConfirm={handleMappedImport}
          onCancel={() => {
            setShowColumnMapper(false);
            setCsvData(null);
            setCsvHeaders([]);
            setColumnMapping({});
          }}
          normalizedHeaders={normalizedHeaders}
        />}
        
        {showQueuePanel && <QueuePanel 
          showQueuePanel={showQueuePanel}
          setShowQueuePanel={setShowQueuePanel}
          textQueue={textQueue}
          queueStatus={queueStatus}
          currentQueueIndex={currentQueueIndex}
          onExecuteQueue={() => executeQueue(sendSmsToContact, patchRow, null, playQueueCompletionSound)}
          onPauseQueue={pauseQueue}
          onResumeQueue={resumeQueue}
          onClearQueue={clearQueue}
          findNameField={findNameField}
          findPhoneField={smsPhoneField}
          // SMS Device Integration
          smsConnected={smsConnected}
          smsDeviceInfo={smsDeviceInfo}
          smsDevices={smsDevices}
          onConnectDevice={connectSmsDevice}
          smsLoading={smsLoading}
        />}
        {showCompletionModal && <QueueCompletionModal />}
        <ToastNotification />
        
        {/* Follow-Up Modal */}
        {showFollowUpModal && followUpContact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Schedule Follow-Up
                </h2>
                <button 
                  onClick={() => setShowFollowUpModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Contact:</strong> {findNameField(followUpContact) ? followUpContact[findNameField(followUpContact)] : followUpContact.id}
                </p>
                {findPhoneField(followUpContact) && followUpContact[findPhoneField(followUpContact)] && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Phone: {followUpContact[findPhoneField(followUpContact)]}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Follow-Up Date</label>
                  <input
                    type="date"
                    value={manualFollowUpDate}
                    onChange={(e) => setManualFollowUpDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority Level</label>
                  <select
                    value={manualFollowUpPriority}
                    onChange={(e) => setManualFollowUpPriority(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                  >
                    <option value="High">🔴 High Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="Low">🟢 Low Priority</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end">
                  {followUpContact.FollowUpAt && (
                    <button 
                      onClick={() => {
                        removeFollowUp(followUpContact);
                        setShowFollowUpModal(false);
                      }}
                      className="px-4 py-2 border border-red-300 text-red-600 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Remove Follow-Up
                    </button>
                  )}
                  <button 
                    onClick={() => setShowFollowUpModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveManualFollowUp}
                    disabled={!manualFollowUpDate}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    Schedule Follow-Up
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <header className="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-screen-2xl mx-auto pl-20 pr-6 py-3 flex items-center gap-4">
            {/* App Title & Database Info */}
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">CSV‑to‑CRM</h1>
              <span className="text-xs opacity-60">Local Database Edition</span>
              
              {currentDatabase ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-sm">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">{currentDatabase.name}</span>
                  <span className="text-xs text-slate-500">
                    {systemStatus?.database?.contactCount ? `${systemStatus.database.contactCount} contacts` : ''}
                  </span>
                  {loading && (
                    <RefreshCw className="h-3 w-3 animate-spin text-slate-400" title="Syncing with server..." />
                  )}
                  {/* Debug info */}
                  <span className="text-xs text-blue-500" title={`Debug: ${JSON.stringify(currentDatabase)}`}>
                    {currentDatabase.name ? '✓' : '✗'}
                  </span>
                </div>
              ) : loading ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-slate-500">Loading databases...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700 dark:text-amber-300">No database selected</span>
                </div>
              )}
              
              {/* Compact Status Indicators */}
              <div className="flex items-center gap-1" title="System Status: Database | ADB | SMS">
                <div className={`h-2 w-2 rounded-full ${systemStatus?.database?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className={`h-2 w-2 rounded-full ${systemStatus?.adb?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className={`h-2 w-2 rounded-full ${systemStatus?.sms?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            </div>
            
            {/* Selection Actions - Only show when contacts are selected */}
            {selectedContacts.size > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-blue-700 dark:text-blue-300 whitespace-nowrap font-medium">{selectedContacts.size} selected:</span>
                
                {/* Select All Pages button - only show if not all are selected */}
                {selectedContacts.size < sortedRows.length && (
                  <button 
                    onClick={() => selectAllContactsAllPages(sortedRows)}
                    className="px-3 py-1 text-sm rounded border border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200 inline-flex items-center gap-1 whitespace-nowrap"
                    title={`Select all ${sortedRows.length} contacts across all pages`}
                  >
                    <Users className="h-3 w-3"/> All ({sortedRows.length})
                  </button>
                )}
                
                {/* Primary action buttons - always visible */}
                <PermissionGuard permission={PERMISSIONS.BATCH_OPERATIONS}>
                  <button 
                    onClick={() => setShowBatchTextPanel(true)}
                    className="px-3 py-1 text-sm rounded border border-green-300 bg-green-100 text-green-700 hover:bg-green-200 inline-flex items-center gap-1 whitespace-nowrap"
                    title="Send batch text messages to selected contacts"
                  >
                    <MessageSquare className="h-3 w-3"/> Text
                  </button>
                </PermissionGuard>
                
                <button 
                  onClick={() => setShowTagsModal(true)} 
                  className="px-3 py-1 text-sm rounded border border-purple-300 bg-purple-100 text-purple-700 hover:bg-purple-200 inline-flex items-center gap-1 whitespace-nowrap"
                  title={`Manage tags for ${selectedContacts.size} selected contacts`}
                >
                  <Tag className="h-3 w-3"/> Tags
                </button>
                
                <button 
                  onClick={() => setSelectedContacts(new Set())}
                  className="px-3 py-1 text-sm rounded border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <X className="h-3 w-3"/> Clear
                </button>
                
                {/* More actions dropdown */}
                <div className="relative bulk-actions-menu">
                  <button 
                    onClick={() => setShowBulkActionsMenu(!showBulkActionsMenu)}
                    className="px-3 py-1 text-sm rounded border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center gap-1 whitespace-nowrap"
                    title="More bulk actions"
                  >
                    <MoreVertical className="h-3 w-3"/> More
                  </button>
                  
                  {showBulkActionsMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50 min-w-48">
                      <button 
                        onClick={() => {
                          if (selectedContacts.size === 1) {
                            const contactId = Array.from(selectedContacts)[0];
                            const contact = rows.find(r => r.id === contactId);
                            openFollowUpModal(contact);
                          } else {
                            // Bulk follow-up logic
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const followUpDateTime = new Date(tomorrow.toISOString().split('T')[0] + 'T09:00:00').toISOString();
                            
                            const confirmed = window.confirm(
                              `Schedule follow-up for ${selectedContacts.size} selected contacts?\n\n` +
                              `Date: ${tomorrow.toLocaleDateString()}\n` +
                              `Priority: Medium`
                            );
                            
                            if (confirmed) {
                              Array.from(selectedContacts).forEach(async (contactId) => {
                                const contact = rows.find(r => r.id === contactId);
                                if (contact) {
                                  await patchRow(contact.id, {
                                    FollowUpAt: followUpDateTime,
                                    FollowUpPriority: 'Medium',
                                    Notes: (contact.Notes || '') + `\n[${new Date().toLocaleTimeString()}] Bulk follow-up scheduled for ${tomorrow.toLocaleDateString()}`
                                  });
                                }
                              });
                              showToast(`✅ Follow-up scheduled for ${selectedContacts.size} contacts!`, 'success');
                              setSelectedContacts(new Set());
                            }
                          }
                          setShowBulkActionsMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4 text-orange-600"/> Schedule Follow-Up
                      </button>
                      
                      <hr className="my-1 border-slate-200 dark:border-slate-600" />
                      
                      <button 
                        onClick={async () => {
                          try {
                            await handleBulkDelete(selectedContacts);
                            setSelectedContacts(new Set());
                          } catch (error) {
                            console.error('Bulk delete failed:', error);
                          }
                          setShowBulkActionsMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center gap-2 text-red-700 dark:text-red-400"
                        title={`Delete ${selectedContacts.size} selected contact${selectedContacts.size > 1 ? 's' : ''}`}
                      >
                        <Trash2 className="h-4 w-4"/> Delete ({selectedContacts.size})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Main Actions */}
            <div className="ml-auto flex items-center gap-2">
              {/* Critical Actions - Always Visible */}
              <div className="flex items-center gap-2">
                {/* Follow-Up Queue - Critical for workflow */}
                <button 
                  onClick={() => setShowFollowUpQueue(!showFollowUpQueue)}
                  className={`px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2 ${showFollowUpQueue ? 'bg-orange-100 text-orange-700' : ''}`}
                  disabled={!currentDatabase || rows.length === 0}
                  title="Follow-Up Queue"
                >
                  <Calendar className="h-4 w-4"/>
                  <span className="hidden sm:inline">Follow-Ups</span>
                  {followUpRows.length > 0 && <span className="text-xs bg-orange-600 text-white rounded-full px-1">{followUpRows.length}</span>}
                </button>
                
                {/* Batch Processing - Critical for bulk operations */}
                <PermissionGuard permission={PERMISSIONS.BATCH_OPERATIONS}>
                  <button 
                    onClick={() => setShowSimpleBatchModal(true)}
                    className="px-3 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-2"
                    title="Batch Process URLs from CSV"
                  >
                    <Zap className="h-4 w-4"/>
                    <span className="hidden sm:inline">Batch</span>
                  </button>
                </PermissionGuard>
                
                {/* Theme Toggle - Always accessible */}
                <button 
                  onClick={() => setDark((d) => !d)} 
                  className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
                  title={`Switch to ${dark ? 'Light' : 'Dark'} Mode`}
                >
                  {dark ? "☀️" : "🌙"}
                </button>
              </div>
              
              {/* Secondary Actions - Show individual buttons when NO contacts selected, dropdown when contacts ARE selected */}
              {selectedContacts.size === 0 ? (
                <div className="flex items-center gap-2">
                  {/* Database & Settings */}
                  <button 
                    onClick={() => {
                      setShowDatabaseManager(true);
                      if (!rawDatabases || Object.keys(rawDatabases).length === 0) {
                        loadDatabases();
                      }
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2"
                    title="Database & Settings"
                  >
                    <Settings className="h-4 w-4"/>
                  </button>
                  
                  {/* Import CSV */}
                  <PermissionGuard permission={PERMISSIONS.IMPORT_DATA}>
                    <label className={`px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 cursor-pointer inline-flex items-center gap-2 ${!currentDatabase ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <Upload className="h-4 w-4"/>
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={(e) => onFiles(e.target.files)} 
                        className="hidden" 
                        disabled={!currentDatabase} 
                      />
                    </label>
                  </PermissionGuard>
                  
                  {/* Export CSV */}
                  <PermissionGuard permission={PERMISSIONS.EXPORT_DATA}>
                    <button 
                      onClick={exportCsv} 
                      disabled={!currentDatabase || rows.length === 0}
                      className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2 disabled:opacity-50"
                      title="Export to CSV"
                    >
                      <Download className="h-4 w-4"/>
                    </button>
                  </PermissionGuard>
                  
                  {/* SMS Templates */}
                  <button 
                    onClick={() => setShowTemplateManager(true)}
                    className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2"
                    title="Manage SMS templates"
                  >
                    <MessageSquare className="h-4 w-4"/>
                  </button>
                  
                  {/* System Status */}
                  <button 
                    onClick={() => setShowStatusPanel(true)} 
                    className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2"
                    title="System Status"
                  >
                    <Activity className="h-4 w-4"/>
                  </button>
                </div>
              ) : (
                /* Consolidated Menu when contacts are selected */
                <div className="relative main-actions-menu">
                  <button 
                    onClick={() => setShowMainActionsMenu(!showMainActionsMenu)}
                    className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 inline-flex items-center gap-2"
                    title="More actions"
                  >
                    <MoreVertical className="h-4 w-4"/>
                  </button>
                  
                  {showMainActionsMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50 min-w-48">
                      <button 
                        onClick={() => {
                          setShowDatabaseManager(true);
                          if (!rawDatabases || Object.keys(rawDatabases).length === 0) {
                            loadDatabases();
                          }
                          setShowMainActionsMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4"/> Database & Settings
                      </button>
                      
                      <PermissionGuard permission={PERMISSIONS.IMPORT_DATA}>
                        <label className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer inline-flex items-center gap-2 ${!currentDatabase ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Upload className="h-4 w-4"/> Import CSV
                        <input 
                          type="file" 
                          accept=".csv,text/csv" 
                          className="hidden" 
                          onChange={(e) => {
                            onFiles(e.target.files);
                            setShowMainActionsMenu(false);
                          }}
                          disabled={!currentDatabase}
                        />
                      </label>
                      </PermissionGuard>
                      
                      <PermissionGuard permission={PERMISSIONS.EXPORT_DATA}>
                        <button 
                          onClick={() => {
                            exportCsv();
                            setShowMainActionsMenu(false);
                          }}
                          disabled={!currentDatabase || rows.length === 0}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download className="h-4 w-4"/> Export CSV
                        </button>
                      </PermissionGuard>
                      
                      <button 
                        onClick={() => {
                          setShowTemplateManager(true);
                          setShowMainActionsMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4"/> SMS Templates
                        {smsTemplates && smsTemplates.length > 0 && (
                          <span className="text-xs text-slate-500 ml-auto">({smsTemplates.length})</span>
                        )}
                      </button>
                      
                      <AdminOnly>
                        <button 
                          onClick={() => {
                            setShowUserManagement(true);
                            setShowMainActionsMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
                        >
                          <Users className="h-4 w-4"/> User Management
                        </button>
                      </AdminOnly>
                      
                      <button 
                        onClick={() => {
                          setShowStatusPanel(true);
                          setShowMainActionsMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
                      >
                        <Activity className="h-4 w-4"/> System Status
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {loading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Loading...
            </div>
          </div>
        )}

        <main className="max-w-screen-2xl mx-auto pl-20 pr-6 py-4 grid grid-cols-12 gap-4">
          {/* Left: Table */}
          <section className="col-span-12 lg:col-span-7 xl:col-span-8 2xl:col-span-8">
            {/* Enhanced Search and Filter Section */}
            <div className="mb-3 space-y-3">
              {/* Main search row */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60"/>
                  <input 
                    value={search} 
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
                    placeholder="Search any field or phone number…" 
                    className="w-full pl-9 pr-10 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" 
                  />
                  {(search || statusFilter || tagFilter) && (
                    <button
                      onClick={clearFilters}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                      title="Clear all filters"
                    >
                      <X className="h-4 w-4 opacity-60" />
                    </button>
                  )}
                </div>
                <button 
                  onClick={addRow} 
                  disabled={!currentDatabase}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4"/> Add Row
                </button>
                <button 
                  onClick={() => setShowCleanupModal(true)} 
                  disabled={!currentDatabase || rows.length === 0}
                  className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-2 disabled:opacity-50"
                  title="Open cleanup options - remove duplicates and clean data"
                >
                  🧹 Cleanup
                </button>
              </div>

              {/* Quick Status Filters */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">Quick Filters:</span>
                <button
                  onClick={() => { setStatusFilter(""); setTagFilter(""); setPage(1); }}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full transition-colors whitespace-nowrap ${
                    !statusFilter && !tagFilter
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                  }`}
                >
                  All ({rows.length})
                </button>
                {STATUS_OPTIONS.map(status => {
                  const count = rows.filter(row => row.Status === status).length;
                  
                  return (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status === statusFilter ? "" : status); setTagFilter(""); setPage(1); }}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full transition-colors whitespace-nowrap ${
                        statusFilter === status 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                          : count === 0
                            ? 'bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                      }`}
                    >
                      {status} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Tag Filters */}
              {availableTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">Tags:</span>
                  {availableTags.map(tag => {
                    const count = rows.filter(row => {
                      if (!row.tags) return false;
                      try {
                        let tags;
                        if (Array.isArray(row.tags)) {
                          tags = row.tags;
                        } else if (typeof row.tags === 'string') {
                          // Handle both JSON array format and comma-separated format
                          if (row.tags.startsWith('[') && row.tags.endsWith(']')) {
                            tags = JSON.parse(row.tags);
                          } else {
                            // Split comma-separated tags and clean them
                            tags = row.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
                          }
                        } else {
                          tags = [];
                        }
                        return tags.includes(tag);
                      } catch (e) {
                        // Handle malformed tag data by trying comma-separated parsing
                        if (typeof row.tags === 'string') {
                          const tags = row.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
                          return tags.includes(tag);
                        }
                        return false;
                      }
                    }).length;
                    
                    return (
                      <button
                        key={tag}
                        onClick={() => { setTagFilter(tag === tagFilter ? "" : tag); setStatusFilter(""); setPage(1); }}
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full transition-colors inline-flex items-center gap-1 whitespace-nowrap ${
                          tagFilter === tag 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                        }`}
                        title={`${tag} (${count} contacts)`}
                      >
                        🏷️ <span className="hidden sm:inline">{tag} ({count})</span>
                        <span className="sm:hidden">{tag.length > 8 ? tag.substring(0, 8) + '...' : tag} ({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Follow-Up Queue Filters - only show when follow-up queue is active */}
              {showFollowUpQueue && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Follow-Up Filters:</span>
                  <button
                    onClick={() => setFollowUpFilter('all')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      followUpFilter === 'all'
                        ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' 
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-150 dark:bg-orange-900/40 dark:text-orange-400 dark:hover:bg-orange-900/60'
                    }`}
                  >
                    All ({followUpRows.length})
                  </button>
                  <button
                    onClick={() => setFollowUpFilter('overdue')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      followUpFilter === 'overdue'
                        ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' 
                        : 'bg-red-100 text-red-700 hover:bg-red-150 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60'
                    }`}
                  >
                    🔴 Overdue ({rows.filter(row => {
                      if (!row.FollowUpAt) return false;
                      const followUpDate = new Date(row.FollowUpAt);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return followUpDate < today;
                    }).length})
                  </button>
                  <button
                    onClick={() => setFollowUpFilter('today')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      followUpFilter === 'today'
                        ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' 
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-150 dark:bg-yellow-900/40 dark:text-yellow-400 dark:hover:bg-yellow-900/60'
                    }`}
                  >
                    🟡 Today ({rows.filter(row => {
                      if (!row.FollowUpAt) return false;
                      const followUpDate = new Date(row.FollowUpAt);
                      const today = new Date();
                      const followUpDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());
                      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      return followUpDay.getTime() === todayDay.getTime();
                    }).length})
                  </button>
                  <button
                    onClick={() => setFollowUpFilter('due')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      followUpFilter === 'due'
                        ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' 
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-150 dark:bg-orange-900/40 dark:text-orange-400 dark:hover:bg-orange-900/60'
                    }`}
                  >
                    📅 Due Now ({rows.filter(row => {
                      if (!row.FollowUpAt) return false;
                      const followUpDate = new Date(row.FollowUpAt);
                      return followUpDate <= new Date();
                    }).length})
                  </button>
                </div>
              )}

              {/* Search Results Info */}
              {((search || statusFilter || tagFilter) && !showFollowUpQueue) && (
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                  <div>
                    Showing {filteredRows.length} of {rows.length} contacts
                    {search && (
                      <span className="ml-2">
                        • Search: "<span className="font-medium">{search}</span>"
                      </span>
                    )}
                    {statusFilter && (
                      <span className="ml-2">
                        • Status: <span className="font-medium">{statusFilter}</span>
                      </span>
                    )}
                    {tagFilter && (
                      <span className="ml-2">
                        • Tag: <span className="font-medium">🏷️ {tagFilter}</span>
                      </span>
                    )}
                  </div>
                  {(search || statusFilter || tagFilter) && (
                    <button
                      onClick={clearFilters}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {/* Follow-Up Queue Results Info */}
              {showFollowUpQueue && (
                <div className="flex items-center justify-between text-sm text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div>
                    Showing {followUpRows.length} follow-up contacts
                    <span className="ml-2">
                      • Filter: <span className="font-medium capitalize">{followUpFilter.replace('_', ' ')}</span>
                    </span>
                    {followUpRows.length > 0 && (
                      <span className="ml-2">
                        • Sorted by priority and date
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFollowUpQueue(false)}
                    className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                  >
                    Exit Follow-Up Queue
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left w-16">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={pageRows.length > 0 && pageRows.every(row => selectedContacts instanceof Set ? selectedContacts.has(row.id) : false)}
                          onChange={(e) => e.target.checked ? selectAllContacts(pageRows) : clearAllSelections()}
                          className="rounded border-slate-300 dark:border-slate-600"
                        />
                        <span className="text-xs">All</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left">Actions</th>
                    {normalizedHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap select-none cursor-pointer" onClick={() => setSortBy((s) => ({ key: h, dir: s.key === h && s.dir === "asc" ? "desc" : "asc" }))}>
                        <div className="flex items-center gap-1">
                          <span>{titleCase(h)}</span>
                          {sortBy.key === h && <span className="opacity-60">{sortBy.dir === "asc" ? "▲" : "▼"}</span>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    // Status-based row coloring
                    let statusColorClass = "";
                    const status = r.Status || "";
                    
                    if (status === "No Answer") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-orange-200/90 dark:bg-orange-900/40" 
                        : "bg-orange-100 dark:bg-orange-900/25 hover:bg-orange-150 dark:hover:bg-orange-900/35";
                    } else if (status === "Left Voicemail") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-yellow-200/90 dark:bg-yellow-900/40" 
                        : "bg-yellow-100 dark:bg-yellow-900/25 hover:bg-yellow-150 dark:hover:bg-yellow-900/35";
                    } else if (status === "Interested") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-green-300/90 dark:bg-green-800/60" 
                        : "bg-green-200 dark:bg-green-800/50 hover:bg-green-250 dark:hover:bg-green-800/55";
                    } else if (status === "Not Interested") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-red-200/90 dark:bg-red-900/40" 
                        : "bg-red-100 dark:bg-red-900/25 hover:bg-red-150 dark:hover:bg-red-900/35";
                    } else if (status === "Callback Requested") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-blue-200/90 dark:bg-blue-900/40" 
                        : "bg-blue-100 dark:bg-blue-900/25 hover:bg-blue-150 dark:hover:bg-blue-900/35";
                    } else if (status === "Initial Followup") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-teal-200/90 dark:bg-teal-900/60" 
                        : "bg-teal-100 dark:bg-teal-900/50 hover:bg-teal-150 dark:hover:bg-teal-900/55";
                    } else if (status === "Wrong Number" || status === "Do Not Call") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-gray-200/90 dark:bg-gray-900/40" 
                        : "bg-gray-100 dark:bg-gray-900/25 hover:bg-gray-150 dark:hover:bg-gray-900/35";
                    } else if (status === "SOLD!") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-green-300/90 dark:bg-green-800/60" 
                        : "bg-green-200 dark:bg-green-800/40 hover:bg-green-250 dark:hover:bg-green-800/50";
                    } else if (status === "SENT TEXT") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-blue-300/90 dark:bg-blue-800/60" 
                        : "bg-blue-200 dark:bg-blue-800/40 hover:bg-blue-250 dark:hover:bg-blue-800/50";
                    } else if (status === "Texted and Called") {
                      statusColorClass = selectedId === r.id 
                        ? "bg-purple-300/90 dark:bg-purple-800/60" 
                        : "bg-purple-200 dark:bg-purple-800/40 hover:bg-purple-250 dark:hover:bg-purple-800/50";
                    } else {
                      // Default/New status
                      statusColorClass = selectedId === r.id 
                        ? "bg-slate-200/90 dark:bg-slate-800/60" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/40";
                    }
                    
                    return (
                      <tr key={r.id} className={`border-t border-slate-100 dark:border-slate-800 ${statusColorClass}`}>
                        <td className="px-3 py-2">
                          <input 
                            type="checkbox" 
                            checked={selectedContacts instanceof Set ? selectedContacts.has(r.id) : false}
                            onChange={() => toggleContactSelection(r.id)}
                            className="rounded border-slate-300 dark:border-slate-600"
                          />
                        </td>
                        <td className="px-3 py-2 text-left whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            <button className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700" onClick={() => setSelectedId(r.id)}>Open</button>
                            {smsConnected && headers.find(h => h.toLowerCase().includes('phone')) && r[headers.find(h => h.toLowerCase().includes('phone'))] && (
                              <>
                                <PermissionGuard permission={PERMISSIONS.BATCH_OPERATIONS}>
                                  <button 
                                    className="px-2 py-1 rounded border border-green-300 text-green-600 dark:border-green-700" 
                                    onClick={() => {
                                      // Add this contact to the queue and open batch text panel
                                      setSelectedContacts(new Set([r.id]));
                                      setShowBatchTextPanel(true);
                                    }}
                                  >
                                    <MessageSquare className="inline h-4 w-4 mr-1"/>SMS
                                  </button>
                                </PermissionGuard>
                              </>
                            )}
                            {r.FollowUpAt ? (
                              <button 
                                className="px-2 py-1 rounded border border-orange-300 text-orange-600 dark:border-orange-700" 
                                onClick={() => openFollowUpModal(r)}
                                title="Edit follow-up"
                              >
                                <Calendar className="inline h-4 w-4 mr-1"/>Edit F/U
                              </button>
                            ) : (
                              <button 
                                className="px-2 py-1 rounded border border-orange-300 text-orange-600 dark:border-orange-700" 
                                onClick={() => openFollowUpModal(r)}
                                title="Mark for follow-up"
                              >
                                <Calendar className="inline h-4 w-4 mr-1"/>Follow-Up
                              </button>
                            )}
                            
                            {/* Review Management */}
                            <button 
                              className="px-2 py-1 rounded border border-blue-300 text-blue-600 dark:border-blue-700" 
                              onClick={() => {
                                setSelectedContactForReviews(r);
                                setShowReviewModal(true);
                              }}
                              title="Manage Reviews"
                            >
                              <MessageSquare className="inline h-4 w-4 mr-1"/>Reviews
                            </button>
                            
                            {/* Property Management */}
                            <button 
                              className="px-2 py-1 rounded border border-green-300 text-green-600 dark:border-green-700" 
                              onClick={() => {
                                setSelectedContactForProperties(r);
                                setShowPropertyModal(true);
                              }}
                              title="Manage Properties"
                            >
                              <Building className="inline h-4 w-4 mr-1"/>Properties
                            </button>
                            
                            {/* Bio Editor */}
                            <button 
                              className="px-2 py-1 rounded border border-orange-300 text-orange-600 dark:border-orange-700" 
                              onClick={() => {
                                setSelectedContactForBio(r);
                                setShowBioModal(true);
                              }}
                              title="Edit Bio"
                            >
                              <Edit className="inline h-4 w-4 mr-1"/>Bio
                            </button>
                            
                            {/* Website Actions */}
                            <button 
                              className="px-2 py-1 rounded border border-purple-300 text-purple-600 dark:border-purple-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                              onClick={() => {
                                console.log('Realtor.com button clicked:', { contact: r });
                                openRealtorComWebsite(r);
                              }}
                              title={getRealtorComUrl(r) ? "View realtor.com profile" : "No realtor.com URL available"}
                              disabled={!getRealtorComUrl(r)}
                            >
                              <Globe className="inline h-4 w-4 mr-1"/>View Realtor.com
                            </button>

                            {/* Force Scrape Button */}
                            <button 
                              className={`px-2 py-1 rounded border ${
                                forceScrapeInProgress === r.id 
                                  ? 'border-orange-500 text-orange-800 bg-orange-100 dark:bg-orange-900/40' 
                                  : 'border-orange-300 text-orange-600 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              onClick={() => {
                                console.log('Force Scrape button clicked:', { contact: r });
                                handleForceScrape(r);
                              }}
                              title={
                                forceScrapeInProgress === r.id 
                                  ? "Force scraping in progress..." 
                                  : getRealtorComUrl(r) 
                                    ? "Open realtor.com page and auto-scrape data" 
                                    : "No realtor.com URL available"
                              }
                              disabled={!getRealtorComUrl(r) || forceScrapeInProgress === r.id}
                            >
                              {forceScrapeInProgress === r.id ? (
                                <>
                                  <div className="inline w-4 h-4 mr-1 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
                                  Scraping...
                                </>
                              ) : (
                                <>
                                  <Zap className="inline h-4 w-4 mr-1"/>Force Scrape
                                </>
                              )}
                            </button>

                            <button 
                              className="px-2 py-1 rounded border border-indigo-300 text-indigo-600 dark:border-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                              onClick={() => {
                                console.log('Edit Site button clicked:', { contact: r, database: currentDatabase?.name, currentDatabase });
                                openRealtorEditor(r, currentDatabase?.name);
                              }}
                              title={currentDatabase?.name ? "Edit website in VvebJS" : "Select a database first"}
                              disabled={!currentDatabase?.name}
                            >
                              <Edit2 className="inline h-4 w-4 mr-1"/>Edit Site
                              <span className="text-xs ml-1" title={`Debug: ${currentDatabase?.name ? 'enabled' : 'disabled'} (${!!currentDatabase?.name})`}>
                                {currentDatabase?.name ? '✓' : '✗'}
                              </span>
                            </button>
                            
                            {/* Generate Website Button */}
                            <button 
                              className="px-2 py-1 rounded border border-blue-300 text-blue-600 dark:border-blue-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 dark:hover:bg-blue-900/20" 
                              onClick={() => {
                                setSelectedContact(r);
                                setShowModularWebsitePanel(true);
                              }}
                              title="Generate website for this contact (no checkbox selection needed)"
                              disabled={!currentDatabase?.name || loading}
                            >
                              <Globe className="inline h-4 w-4 mr-1"/>Generator
                              {r.properties?.length > 0 && (
                                <span className="text-xs ml-1 bg-blue-100 dark:bg-blue-800 px-1 rounded" title={`${r.properties.length} properties available`}>
                                  {r.properties.length}
                                </span>
                              )}
                            </button>
                            
                            <button className="px-2 py-1 rounded border border-rose-300 text-rose-600 dark:border-rose-700" onClick={() => deleteRow(r.id)}><Trash2 className="inline h-4 w-4 mr-1"/>Delete</button>
                          </div>
                        </td>
                        {normalizedHeaders.map((h) => (
                          <td key={h} className="px-3 py-2 align-top max-w-[360px]">
                            <Cell h={h} v={r[h]} contact={r} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={normalizedHeaders.length + 2} className="px-3 py-8 text-center">
                        {!currentDatabase ? (
                          <div className="opacity-70">
                            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            Select or create a database to get started.
                          </div>
                        ) : rows.length === 0 ? (
                          <div className="opacity-70">
                            <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            Import a CSV to get started.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="opacity-70">
                              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              No results match your search criteria.
                            </div>
                            {(search || statusFilter || tagFilter) && (
                              <button
                                onClick={clearFilters}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                              >
                                Clear filters to see all {rows.length} contacts
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm opacity-70">{sortedRows.length} records</div>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"><ChevronLeft className="h-4 w-4"/></button>
                <span className="text-sm">Page {page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"><ChevronRight className="h-4 w-4"/></button>
                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="ml-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-700">
                  {[10, 25, 50, 100, 250].map(n => <option key={n} value={n}>{n}/page</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Right: Inspector / Call cockpit */}
          <aside className="col-span-12 lg:col-span-5 xl:col-span-4 2xl:col-span-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sticky top-16">
              {!selected ? (
                <div className="text-center opacity-70 py-12">
                  {!currentDatabase ? "Select a database to begin." : "Select a record to begin calling."}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Record</div>
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700" onClick={() => nav(-1)}><ChevronLeft className="h-4 w-4"/></button>
                      <button className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700" onClick={() => nav(1)}><ChevronRight className="h-4 w-4"/></button>
                    </div>
                  </div>

                  {/* Hero area: image + name + phone if detected */}
                  <div className="flex items-start gap-3">
                    <div className="h-20 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                      {Object.values(selected).some(isImageUrl) ? (
                        <img src={(Object.values(selected).find(isImageUrl))} className="h-full w-full object-cover"/>
                      ) : (
                        <ImageIcon className="h-8 w-8 opacity-50"/>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold truncate">{(() => {
                          // Use the same improved name detection logic as ContactDetailPanel
                          const nameField = findNameField(selected);
                          let contactName = null;
                          if (nameField && selected[nameField]) {
                            contactName = selected[nameField];
                          } else {
                            // Fallback: look for common name fields directly
                            const possibleNameFields = ['name', 'Name', 'NAME', 'agent_name', 'Agent_Name', 'first_name', 'firstName', 'FirstName'];
                            for (const field of possibleNameFields) {
                              if (selected[field] && selected[field] !== 'Agent Name Not Found') {
                                contactName = selected[field];
                                break;
                              }
                            }
                          }
                          // Final fallback: use a truncated version of the ID instead of full UUID
                          return contactName || `Contact-${selected.id.substring(0, 8)}...`;
                        })()}</div>
                        {selected.LastTextSent && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                            <MessageSquare className="h-3 w-3" />
                            <span>
                              {(() => {
                                const lastTextTime = new Date(selected.LastTextSent);
                                const now = new Date();
                                const diffMs = now - lastTextTime;
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHours = Math.floor(diffMs / 3600000);
                                const diffDays = Math.floor(diffMs / 86400000);
                                
                                if (diffMins < 1) return 'Just now';
                                if (diffMins < 60) return `${diffMins}m ago`;
                                if (diffHours < 24) return `${diffHours}h ago`;
                                if (diffDays < 7) return `${diffDays}d ago`;
                                return lastTextTime.toLocaleDateString();
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm opacity-70 truncate">{selected.AGENCY || selected.Company || selected.Brokerage || ""}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {(() => {
                          const phoneEntries = Object.entries(selected).filter(([k, v]) => /phone|mobile|tel/i.test(k) && v);
                          if (phoneEntries.length === 0) return null;
                          
                          const primaryPhone = phoneEntries[0][1]; // Use first phone number for calling
                          const cleanedPhone = formatPhoneForCalling(primaryPhone);
                          
                          // Debug logging
                          console.log('Phone for calling:');
                          console.log('- Original:', primaryPhone);
                          console.log('- Cleaned:', cleanedPhone);
                          
                          return (
                            <div className="flex gap-1">
                              <a href={`tel:${cleanedPhone}`} className="inline-flex items-center gap-2 px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                                <Phone className="h-4 w-4"/> Call
                              </a>
                              <button 
                                onClick={() => openSmsForContact(selected)}
                                className="inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                              >
                                <MessageSquare className="h-4 w-4"/> Text
                              </button>
                            </div>
                          );
                        })()}
                        {(() => {
                          const phoneEntries = Object.entries(selected).filter(([k, v]) => /phone|mobile|tel/i.test(k) && v);
                          if (phoneEntries.length === 0) return null;
                          
                          return (
                            <div className="text-xs text-slate-600 dark:text-slate-400 self-center">
                              {phoneEntries.map(([k, v]) => v).join(' • ')}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Quick fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs opacity-70">Status</label>
                      <select value={selected.Status || ""} onChange={(e) => patchRow(selected.id, { Status: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs opacity-70">Follow‑Up</label>
                      <input type="datetime-local" value={formatDateTimeLocal(selected.FollowUpAt)} onChange={(e) => onFollowUp(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"/>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs opacity-70">Notes</label>
                    <textarea value={selected.Notes || ""} onChange={(e) => patchRow(selected.id, { Notes: e.target.value })} placeholder="Free‑form call notes…" rows={6} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"/>
                  </div>

                  {/* All fields editable */}
                  <details className="group">
                    <summary className="cursor-pointer select-none text-sm font-semibold">All Fields</summary>
                    <div className="mt-2 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50">
                      <div className="grid grid-cols-1 gap-2">
                        {normalizedHeaders.filter(h => h !== "id").map((h) => (
                          <div key={h}>
                            <label className="text-xs opacity-70">{titleCase(h)}</label>
                            <input value={selected[h] ?? ""} onChange={(e) => patchRow(selected.id, { [h]: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"/>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setStatus("No Answer")} className="px-3 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/40">No Answer (1)</button>
                    <button onClick={() => setStatus("Left Voicemail")} className="px-3 py-2 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 dark:hover:bg-yellow-900/40">Left VM (2)</button>
                    <button onClick={() => setStatus("Interested")} className="px-3 py-2 rounded-lg border border-green-400 bg-green-100 text-green-800 hover:bg-green-200 dark:border-green-600 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/60">Interested (3)</button>
                    <button onClick={() => setStatus("Not Interested")} className="px-3 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40">Not Interested (4)</button>
                    <button onClick={() => setStatus("SENT TEXT")} className="px-3 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40">📱 Sent Text (5)</button>
                    <button onClick={() => setStatus("Texted and Called")} className="px-3 py-2 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40">📞📱 Texted & Called (6)</button>
                    <button onClick={() => setStatus("Initial Followup")} className="px-3 py-2 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-900/60">🔄 Initial Followup (7)</button>
                  </div>
                  
                  {/* SOLD! button - prominent placement */}
                  <div className="mt-2">
                    <button onClick={() => setStatus("SOLD!")} className="w-full px-4 py-3 rounded-lg border-2 border-green-500 bg-green-500 text-white font-bold text-lg hover:bg-green-600 hover:border-green-600 dark:border-green-400 dark:bg-green-500 dark:hover:bg-green-600 shadow-lg transform hover:scale-105 transition-all duration-200">💰 SOLD! 💰</button>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs opacity-70">Last Contacted: {selected.LastContacted || "—"}</div>
                      {selected.LastTextSent && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>
                            Last Text: {new Date(selected.LastTextSent).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      
                      {/* SMS History for this contact */}
                      {smsHistory.length > 0 && (() => {
                        const phoneField = findPhoneField(selected);
                        const contactPhone = phoneField ? selected[phoneField] : null;
                        const contactHistory = contactPhone ? 
                          smsHistory.filter(sms => 
                            sms.phoneNumber === contactPhone || 
                            sms.phone_number === contactPhone ||
                            (sms.contactData && sms.contactData.id === selected.id)
                          ).slice(0, 3) : []; // Show last 3 SMS for this contact
                        
                        if (contactHistory.length === 0) return null;
                        
                        return (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                              Recent SMS History ({contactHistory.length})
                            </div>
                            <div className="space-y-1">
                              {contactHistory.map((sms, index) => (
                                <div key={index} className="text-xs text-blue-600 dark:text-blue-400">
                                  <div className="truncate">{sms.message}</div>
                                  <div className="text-blue-500 dark:text-blue-500">
                                    {new Date(sms.timestamp || sms.sent_at || sms.created_at).toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {contactHistory.length >= 3 && (
                              <button 
                                onClick={() => openSmsForContact(selected)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mt-1"
                              >
                                View all SMS history →
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-xs flex items-center gap-1">
                      {saveStatus === 'saving' && (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span className="text-blue-600">Saving...</span>
                        </>
                      )}
                      {saveStatus === 'saved' && (
                        <>
                          <Check className="h-3 w-3" />
                          <span className="text-emerald-600">Saved to database</span>
                        </>
                      )}
                      {saveStatus === 'error' && (
                        <>
                          <X className="h-3 w-3" />
                          <span className="text-red-600">Save failed</span>
                        </>
                      )}
                      {!saveStatus && (
                        <span className="text-slate-500">Auto-save enabled</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </main>

        {/* Help footer */}
        <footer className="max-w-screen-2xl mx-auto pl-20 pr-6 py-8 text-sm opacity-70">
          <details>
            <summary className="cursor-pointer">Help & Shortcuts</summary>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><b>Database:</b> Create multiple databases for different campaigns or clients. Switch between them easily.</li>
              <li><b>Import:</b> Click <i>Import CSV</i> and select your file. Data is automatically saved to the current database.</li>
              <li><b>Images & Links:</b> Any cell with an <code>http://</code> or <code>https://</code> URL is clickable; image URLs show thumbnails.</li>
              <li><b>Call Cockpit:</b> Use the right panel to update Status, Notes, Last Contacted, and Follow‑Up. Changes save automatically.</li>
              <li><b>Export:</b> Click <i>Export CSV</i> to download your data with all updates and notes.</li>
              <li><b>Keyboard:</b> ←/→ navigate; <b>S</b> export CSV; 1/2/3/4 set common statuses.</li>
              <li><b>Storage:</b> All data is stored locally in SQLite databases in the `databases/` folder.</li>
            </ul>
          </details>
        </footer>
          </>
        )}
      </div>
    </div>
    </UserProvider>
    </ProgressProvider>
  );
}
