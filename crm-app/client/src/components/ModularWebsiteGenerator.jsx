import React, { useState, useEffect, useCallback } from 'react';
import './ModularWebsiteGenerator.css';
import ReviewManagementModal from './ReviewManagementModal';
import PropertyManagementModal from './PropertyManagementModal';

/**
 * Modular Website Generator Component
 * 
 * CONTACT-SPECIFIC SETTINGS FEATURE:
 * - All settings in the 🎨 Website Generation panel are now contact-specific
 * - Settings are saved per contact in localStorage with key: websiteGeneratorSettings_{contactId}
 * - Global defaults can be set and used for new contacts
 * - When switching contacts, their saved settings are automatically loaded
 * - UI shows which contact the settings apply to with a badge and notice
 */

const ModularWebsiteGenerator = ({ selectedContact, onWebsiteGenerated, onClose }) => {
  // Load contact-specific settings from server (fallback to local defaults)
  const loadSavedSettings = useCallback(async () => {
    if (!selectedContact?.id) {
      // If no contact is selected, use global defaults
      const globalSettings = localStorage.getItem('websiteGeneratorGlobalDefaults');
      if (globalSettings) {
        try { return JSON.parse(globalSettings); } catch {}
      }
      return {};
    }

    try {
      const resp = await fetch(`/api/contacts/${selectedContact.id}/settings`);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success) return data.settings || {};
      }
    } catch (e) {
      console.warn('Falling back to local defaults, settings fetch failed:', e);
    }

    // fallback to any locally cached settings
    const contactSettingsKey = `websiteGeneratorSettings_${selectedContact.id}`;
    const saved = localStorage.getItem(contactSettingsKey);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    const globalSettings = localStorage.getItem('websiteGeneratorGlobalDefaults');
    if (globalSettings) { try { return JSON.parse(globalSettings); } catch {} }
    return {};
  }, [selectedContact?.id]);

  // Load profile image override settings from the database
  const loadProfileImageSettings = useCallback(async () => {
    if (!selectedContact?.id) return { overrideProfileImage: false, profileImageUrl: '' };
    
    try {
      const response = await fetch(`/api/contacts/${selectedContact.id}`);
      if (response.ok) {
        const contact = await response.json();
        
        if (contact) {
          return {
            overrideProfileImage: contact.override_profile_image || false,
            profileImageUrl: contact.custom_profile_image_url || ''
          };
        }
      }
    } catch (error) {
      console.error('Error loading profile image settings from database:', error);
    }
    
    return { overrideProfileImage: false, profileImageUrl: '' };
  }, [selectedContact?.id]);

  const [savedSettings, setSavedSettings] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await loadSavedSettings();
      if (!mounted) return;
      setSavedSettings(s || {});
      // initialize dependent state only on first mount per contact
      setSelectedLayout(s?.selectedLayout || 'professional');
      setSelectedTheme(s?.selectedTheme || 'modern-professional');
      setActivationBanner(s?.activationBanner || false);
      setHeroImageSource(s?.heroImageSource || 'auto');
      setCustomHeroImageUrl(s?.customHeroImageUrl || '');
      setHeroOverlayOpacity(s?.heroOverlayOpacity !== undefined ? s.heroOverlayOpacity : 0.4);
      setHeroBlur(s?.heroBlur || 0);
      setHeroOverlayWhite(s?.heroOverlayWhite || false);
      setManualHeroTextColors(s?.manualHeroTextColors || false);
      setHeroTextColor(s?.heroTextColor || '#ffffff');
      setHeroTextSecondary(s?.heroTextSecondary || '#e5e5e5');
      setHeroAccentColor(s?.heroAccentColor || '#3b82f6');
    })();
    return () => { mounted = false; };
  }, [loadSavedSettings]);

  const [layouts, setLayouts] = useState([]);
  const [themes, setThemes] = useState([]);
  const [selectedLayout, setSelectedLayout] = useState(savedSettings.selectedLayout || 'professional');
  const [selectedTheme, setSelectedTheme] = useState(savedSettings.selectedTheme || 'modern-professional');
  const [activationBanner, setActivationBanner] = useState(savedSettings.activationBanner || false); // Banner option
  const [heroImageSource, setHeroImageSource] = useState(savedSettings.heroImageSource || 'auto'); // Hero image source
  const [customHeroImageUrl, setCustomHeroImageUrl] = useState(savedSettings.customHeroImageUrl || ''); // Custom hero image URL
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(savedSettings.heroOverlayOpacity || 0.4); // Hero overlay opacity
  const [heroBlur, setHeroBlur] = useState(savedSettings.heroBlur || 0); // Hero image blur amount (0-10px)
  const [heroOverlayWhite, setHeroOverlayWhite] = useState(savedSettings.heroOverlayWhite || false); // Use white overlay instead of black
  const [overrideProfileImage, setOverrideProfileImage] = useState(false); // Will be loaded from database
  const [profileImageUrl, setProfileImageUrl] = useState(''); // Will be loaded from database
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWebsite, setGeneratedWebsite] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDeployingNetlify, setIsDeployingNetlify] = useState(false);
  const [netlifyDeployment, setNetlifyDeployment] = useState(null);
  const [netlifyConfigured, setNetlifyConfigured] = useState(false);
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  const [showRegenerationControls, setShowRegenerationControls] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null); // Stores preview data separately
  const [finalWebsiteUrl, setFinalWebsiteUrl] = useState(null); // Stores the final website URL
  const [activeTab, setActiveTab] = useState('preview'); // 'final' or 'preview' - default to preview for editing
  const [livePreviewUrl, setLivePreviewUrl] = useState(null); // Separate URL for live preview
  const [initialPreviewAttempted, setInitialPreviewAttempted] = useState(false); // Track if we've attempted initial preview
  
  // Manual Hero Text Color Controls
  const [manualHeroTextColors, setManualHeroTextColors] = useState(savedSettings.manualHeroTextColors || false);
  const [heroTextColor, setHeroTextColor] = useState(savedSettings.heroTextColor || '#ffffff');
  const [heroTextSecondary, setHeroTextSecondary] = useState(savedSettings.heroTextSecondary || '#e5e5e5');
  const [heroAccentColor, setHeroAccentColor] = useState(savedSettings.heroAccentColor || '#3b82f6');

  // Available images across all contacts and project
  const [availableImages, setAvailableImages] = useState([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [imageFilter, setImageFilter] = useState('all'); // 'all', 'project', 'contact', 'property'
  
  // Flags to prevent repeated API calls during development
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Modal states for Review and Property Management
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);

  // ============================================================================
  // DEPLOYMENT HISTORY MANAGEMENT
  // ============================================================================
  
  // Deployment history state
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState(null); // ID of deployment to update, null for new
  const [showDeploymentSelector, setShowDeploymentSelector] = useState(false);
  const [customSiteName, setCustomSiteName] = useState(''); // For creating new deployments with custom names

  // Function to fetch all available images from contacts and project
  const fetchAvailableImages = async () => {
    // Don't fetch if we're already loading or already have images
  if (isLoadingImages || (availableImages && availableImages.length > 0)) {
      console.log('🚫 Skipping image fetch - already loading or have images');
      return;
    }

    setIsLoadingImages(true);
    try {
      const response = await fetch('/api/website/available-images');
      const data = await response.json();
      if (data.success) {
        const imgs = Array.isArray(data.images)
          ? data.images
          : (data.categories ? Object.values(data.categories).flat() : []);
        setAvailableImages(imgs);
        console.log('📸 Loaded available images:', imgs.length, 'from sources:', data.sources || []);
      } else {
        console.error('Failed to load available images:', data.error);
        // Don't throw error, just continue without images
        setAvailableImages([]);
      }
    } catch (error) {
      console.error('Error fetching available images:', error);
      // Don't throw error, just continue without images
      setAvailableImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleImageSelect = (imageUrl) => {
    console.log('🖼️ Image selected:', imageUrl);
    console.log('🔄 Before update - customHeroImageUrl:', customHeroImageUrl);
    console.log('🔄 Before update - heroImageSource:', heroImageSource);
    
    setCustomHeroImageUrl(imageUrl);
    setHeroImageSource('gallery');
    setShowImageGallery(false);
    
    // Small delay to ensure state updates before regenerating preview
    setTimeout(() => {
      console.log('⏰ After timeout - customHeroImageUrl should be:', imageUrl);
      generatePreview();
    }, 100);
  };

  const openImageGallery = () => {
    // Only fetch images if we don't have any and we're not already loading
    if (availableImages.length === 0 && !isLoadingImages) {
      fetchAvailableImages();
    }
    setShowImageGallery(true);
  };

  const getFilteredImages = () => {
    if (imageFilter === 'all') {
      return availableImages;
    }
    return availableImages.filter(image => image.source === imageFilter);
  };

  // Load existing website for the selected contact
  const loadExistingWebsite = useCallback(async () => {
    if (!selectedContact || !selectedContact.id) {
      return;
    }

    setIsLoadingExisting(true);
    try {
      const response = await fetch(`/api/website/existing/${selectedContact.id}`);
      
      // Handle different response statuses
      if (response.status === 500) {
        console.warn('Server error loading existing website, treating as new contact');
        // Treat as new contact
        setFinalWebsiteUrl(null);
        setPreviewUrl(null);
        setGeneratedWebsite(null);
        setActiveTab('preview');
        setShowRegenerationControls(true);
        setInitialPreviewAttempted(false);
        console.log('🆕 Server error - treating as new contact, effects will generate preview');
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.website) {
        setGeneratedWebsite(result.website);
        // Set both final website URL and current preview to the existing website
        const timestamp = Date.now();
        const websiteUrl = `http://localhost:3030${result.website.websiteUrl}?final=true&t=${timestamp}`;
        setFinalWebsiteUrl(websiteUrl);
        setPreviewUrl(websiteUrl);
        
        // Set layout and theme from existing website if available
        if (result.website.layout) setSelectedLayout(result.website.layout);
        if (result.website.theme) setSelectedTheme(result.website.theme);
        
        // Automatically generate live preview for editing
        const livePreviewUrl = `http://localhost:3030${result.website.websiteUrl}?preview=true&v=${timestamp}&t=${timestamp}`;
        setLivePreviewUrl(livePreviewUrl);
        setActiveTab('preview'); // Switch to preview tab for editing
      } else {
        // No existing website found - setup for new website generation
        setFinalWebsiteUrl(null);
        setPreviewUrl(null);
        setGeneratedWebsite(null);
        setActiveTab('preview'); // Start with preview for new websites
        setShowRegenerationControls(true); // Automatically show controls for new contacts
        setInitialPreviewAttempted(false); // Reset the attempt flag for new contact
        
        // The auto-update effects will handle generating the initial preview
        console.log('🆕 New contact detected - setup complete, effects will generate preview');
      }
    } catch (err) {
      console.error('Error loading existing website:', err);
      // Treat as new contact when there's an error
      setFinalWebsiteUrl(null);
      setPreviewUrl(null);
      setGeneratedWebsite(null);
      setActiveTab('preview');
      setShowRegenerationControls(true);
      setInitialPreviewAttempted(false);
      console.log('🆕 Error loading existing website - treating as new contact');
    } finally {
      setIsLoadingExisting(false);
    }
  }, [selectedContact]);

  // Load available layouts and themes
  useEffect(() => {
    // Prevent repeated calls during development hot reload
    if (hasLoadedInitialData) {
      return;
    }

    const loadOptions = async () => {
      try {
        // Fetch layouts
        const layoutsResponse = await fetch('/api/website/layouts');
        const layoutsData = await layoutsResponse.json();
        if (layoutsData.success) {
          setLayouts(layoutsData.layouts);
          setSelectedLayout(layoutsData.default || 'professional');
        }

        // Fetch themes
        console.log('🎨 Fetching themes from API...');
        const themesResponse = await fetch('/api/website/themes');
        const themesData = await themesResponse.json();
        console.log('🎨 Themes API response:', themesData);
        if (themesData.success) {
          console.log('🎨 Setting themes:', themesData.themes);
          setThemes(themesData.themes);
          // Only set default theme if no theme is currently selected
          if (!selectedTheme || selectedTheme === 'modern-professional') {
            setSelectedTheme(themesData.default || 'modern-professional');
          }
        } else {
          console.error('🎨 Failed to load themes:', themesData);
        }

        // Check Netlify configuration
        const netlifyResponse = await fetch('/api/website/netlify-config');
        const netlifyData = await netlifyResponse.json();
        if (netlifyData.success) {
          setNetlifyConfigured(netlifyData.configured);
        }

        // Load available images
        await fetchAvailableImages();

        // Mark as loaded to prevent repeated calls
        setHasLoadedInitialData(true);

        // Note: loadExistingWebsite is now handled in a separate useEffect
      } catch (err) {
        console.error('Error loading options:', err);
        // Don't block the UI for API errors, just log them
        // The component should still be functional even if some APIs fail
      }
    };

    loadOptions();
  }, []); // Only run once on mount

  // Save settings to server (and also cache in localStorage as a fallback)
  const saveSettings = useCallback(async () => {
    const settingsToSave = {
      selectedLayout,
      selectedTheme,
      activationBanner,
      heroImageSource,
      customHeroImageUrl,
      heroOverlayOpacity,
      heroBlur,
      heroOverlayWhite,
      overrideProfileImage,
      // profileImageUrl intentionally excluded - always starts empty
      manualHeroTextColors,
      heroTextColor,
      heroTextSecondary,
      heroAccentColor
    };
    
    try {
      if (selectedContact?.id) {
        // Save to server
        try {
          const resp = await fetch(`/api/contacts/${selectedContact.id}/settings`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settingsToSave)
          });
          if (!resp.ok) throw new Error(await resp.text());
          console.log(`💾 Saved contact-specific settings to server for ${selectedContact.id}`);
        } catch (e) {
          // cache locally if server fails
          const contactSettingsKey = `websiteGeneratorSettings_${selectedContact.id}`;
          localStorage.setItem(contactSettingsKey, JSON.stringify(settingsToSave));
          console.warn('Server save failed, cached locally:', e.message);
        }

        // ALSO save profile image override settings to database (agent fields)
        const profileSettingsUpdate = {
          override_profile_image: overrideProfileImage,
          custom_profile_image_url: (overrideProfileImage && profileImageUrl) ? profileImageUrl : null
        };
        
        try {
          const response = await fetch(`/api/contacts/${selectedContact.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileSettingsUpdate)
          });
          
          if (response.ok) {
            console.log(`✅ Saved profile override settings to database for ${selectedContact.id}:`, profileSettingsUpdate);
          } else {
            console.error('Failed to save profile settings to database:', await response.text());
          }
        } catch (dbError) {
          console.error('Error saving profile settings to database:', dbError);
        }
      } else {
        // Save as global defaults if no contact is selected
        localStorage.setItem('websiteGeneratorGlobalDefaults', JSON.stringify(settingsToSave));
        console.log('💾 Saved global default settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }, [selectedContact?.id, selectedLayout, selectedTheme, activationBanner, heroImageSource, customHeroImageUrl, heroOverlayOpacity, heroBlur, heroOverlayWhite, overrideProfileImage, profileImageUrl, manualHeroTextColors, heroTextColor, heroTextSecondary, heroAccentColor]);

  // ============================================================================
  // DEPLOYMENT HISTORY FUNCTIONS
  // ============================================================================
  
  // Load deployment history for the current contact
  const loadDeploymentHistory = useCallback(() => {
    if (!selectedContact?.id) {
      setDeploymentHistory([]);
      return;
    }
    
    try {
      const historyKey = `deploymentHistory_${selectedContact.id}`;
      const saved = localStorage.getItem(historyKey);
      
      if (saved) {
        const history = JSON.parse(saved);
        setDeploymentHistory(history);
        console.log(`📋 Loaded deployment history for contact ${selectedContact.id}:`, history);
      } else {
        setDeploymentHistory([]);
        console.log(`📋 No deployment history found for contact ${selectedContact.id}`);
      }
    } catch (err) {
      console.error('Error loading deployment history:', err);
      setDeploymentHistory([]);
    }
  }, [selectedContact?.id]);

  // Save deployment to history
  const saveDeploymentToHistory = useCallback((deployment) => {
    if (!selectedContact?.id || !deployment) return;
    
    try {
      const historyKey = `deploymentHistory_${selectedContact.id}`;
      const currentHistory = [...deploymentHistory];
      
      // Check if this is an update to existing deployment
      const existingIndex = currentHistory.findIndex(d => d.siteId === deployment.siteId);
      
      const deploymentRecord = {
        ...deployment,
        contactId: selectedContact.id,
        contactName: selectedContact.name || selectedContact.email || 'Unknown',
        deployedAt: new Date().toISOString(),
        isDefault: currentHistory.length === 0 && !selectedDeploymentId // First deployment becomes default
      };
      
      if (existingIndex >= 0) {
        // Update existing deployment
        currentHistory[existingIndex] = {
          ...currentHistory[existingIndex],
          ...deploymentRecord,
          updatedAt: new Date().toISOString(),
          deployCount: (currentHistory[existingIndex].deployCount || 1) + 1
        };
        console.log(`🔄 Updated existing deployment in history:`, currentHistory[existingIndex]);
      } else {
        // Add new deployment
        currentHistory.push(deploymentRecord);
        console.log(`✨ Added new deployment to history:`, deploymentRecord);
      }
      
      // Sort by most recent first
      currentHistory.sort((a, b) => new Date(b.deployedAt) - new Date(a.deployedAt));
      
      // Save to localStorage
      localStorage.setItem(historyKey, JSON.stringify(currentHistory));
      setDeploymentHistory(currentHistory);
      
      console.log(`💾 Saved deployment history for contact ${selectedContact.id}`);
    } catch (err) {
      console.error('Error saving deployment to history:', err);
    }
  }, [selectedContact?.id, deploymentHistory, selectedDeploymentId]);

  // Get the default/primary deployment for a contact
  const getDefaultDeployment = useCallback(() => {
    const defaultDeployment = deploymentHistory.find(d => d.isDefault);
    return defaultDeployment || deploymentHistory[0] || null;
  }, [deploymentHistory]);

  // Set a deployment as the default/primary one
  const setDefaultDeployment = useCallback((siteId) => {
    if (!selectedContact?.id) return;
    
    try {
      const updatedHistory = deploymentHistory.map(deployment => ({
        ...deployment,
        isDefault: deployment.siteId === siteId
      }));
      
      const historyKey = `deploymentHistory_${selectedContact.id}`;
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      setDeploymentHistory(updatedHistory);
      
      console.log(`⭐ Set deployment ${siteId} as default for contact ${selectedContact.id}`);
    } catch (err) {
      console.error('Error setting default deployment:', err);
    }
  }, [selectedContact?.id, deploymentHistory]);

  // Load deployment history when contact changes
  useEffect(() => {
    loadDeploymentHistory();
  }, [loadDeploymentHistory]);

  // Save settings whenever they change
  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  // Load contact-specific settings when selectedContact changes
  useEffect(() => {
    const loadAllSettings = async () => {
      if (selectedContact?.id) {
  const newSettings = await loadSavedSettings();
  console.log(`🔄 Loaded server settings for contact ${selectedContact.id}:`, newSettings);
        
        // Load profile image settings from database
        const profileSettings = await loadProfileImageSettings();
        console.log(`🔄 Loading database profile settings for contact ${selectedContact.id}:`, profileSettings);
        
        // Update all settings with contact-specific values or defaults
        setSelectedLayout(newSettings.selectedLayout || 'professional');
        setSelectedTheme(newSettings.selectedTheme || 'modern-professional');
        setActivationBanner(newSettings.activationBanner || false);
        setHeroImageSource(newSettings.heroImageSource || 'auto');
        setCustomHeroImageUrl(newSettings.customHeroImageUrl || '');
        setHeroOverlayOpacity(newSettings.heroOverlayOpacity !== undefined ? newSettings.heroOverlayOpacity : 0.4);
        setHeroBlur(newSettings.heroBlur || 0);
        setHeroOverlayWhite(newSettings.heroOverlayWhite || false);
        
        // Use database values for profile image settings
        setOverrideProfileImage(profileSettings.overrideProfileImage);
        setProfileImageUrl(profileSettings.profileImageUrl);
        
        setManualHeroTextColors(newSettings.manualHeroTextColors || false);
        setHeroTextColor(newSettings.heroTextColor || '#ffffff');
        setHeroTextSecondary(newSettings.heroTextSecondary || '#e5e5e5');
        setHeroAccentColor(newSettings.heroAccentColor || '#3b82f6');
      }
    };
    
    loadAllSettings();
  }, [selectedContact?.id, loadSavedSettings, loadProfileImageSettings]);

  const generatePreview = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      // Use sample contact data if no contact is selected
      const contactData = selectedContact || {
        id: 'preview-sample',
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        company: 'Premium Real Estate'
      };

      // Create optimized contact data (only essential fields to avoid payload size issues)
      const optimizedContactData = {
        id: contactData.id,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        company: contactData.company,
        // Include only first few reviews to avoid payload issues
        reviews: contactData.reviews ? {
          individual: contactData.reviews.individual ? contactData.reviews.individual.slice(0, 3) : [],
          recommendations: contactData.reviews.recommendations ? contactData.reviews.recommendations.slice(0, 3) : []
        } : null
      };

      const requestPayload = {
        contactId: optimizedContactData.id,
        contactData: optimizedContactData,
        layout: selectedLayout,
        theme: selectedTheme,
        activationBanner: activationBanner,
        heroImageSource: heroImageSource,
        heroImageUrl: (heroImageSource === 'custom' || heroImageSource === 'gallery') ? customHeroImageUrl : null,
        heroOverlayOpacity: heroOverlayOpacity,
        heroBlur: heroBlur,
        heroOverlayWhite: heroOverlayWhite,
        profileImageUrl: (overrideProfileImage && profileImageUrl) ? profileImageUrl : null,
        manualHeroTextColors: manualHeroTextColors,
        heroTextColor: manualHeroTextColors ? heroTextColor : null,
        heroTextSecondary: manualHeroTextColors ? heroTextSecondary : null,
        heroAccentColor: manualHeroTextColors ? heroAccentColor : null
      };

      console.log('🔄 GeneratePreview payload:', {
        heroImageSource,
        customHeroImageUrl,
        heroImageUrl: requestPayload.heroImageUrl,
        willUseCustomUrl: (heroImageSource === 'custom' || heroImageSource === 'gallery')
      });

      console.log('🎨 Generating preview...', { layout: selectedLayout, theme: selectedTheme });

      const response = await fetch('/api/website/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const result = await response.json();
      console.log('🎨 Preview generated successfully');
      if (result.success) {
        // Store preview data separately
        setPreviewVersion({
          layout: selectedLayout,
          theme: selectedTheme,
          activationBanner: activationBanner,
          heroImageSource: heroImageSource,
          heroImageUrl: (heroImageSource === 'custom' || heroImageSource === 'gallery') ? customHeroImageUrl : null,
          heroOverlayOpacity: heroOverlayOpacity,
          heroBlur: heroBlur,
          heroOverlayWhite: heroOverlayWhite,
          profileImageUrl: (overrideProfileImage && profileImageUrl) ? profileImageUrl : null,
          manualHeroTextColors: manualHeroTextColors,
          heroTextColor: manualHeroTextColors ? heroTextColor : null,
          heroTextSecondary: manualHeroTextColors ? heroTextSecondary : null,
          heroAccentColor: manualHeroTextColors ? heroAccentColor : null,
          websiteUrl: result.websiteUrl,
          fileName: result.fileName || `preview-${Date.now()}.html`
        });
        // Update live preview URL
        const timestamp = Date.now();
        setLivePreviewUrl(`http://localhost:3030${result.websiteUrl}?preview=true&v=${timestamp}&t=${timestamp}`);
        // Switch to preview tab automatically when preview is generated
        setActiveTab('preview');
      } else {
        console.error('Preview generation failed:', result.error);
        setError(`Preview generation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Preview generation error:', err);
      if (err.message.includes('413') || err.message.includes('Payload Too Large')) {
        setError('Request too large - try reducing image sizes or contact data');
      } else {
        setError(`Preview generation error: ${err.message}`);
      }
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedContact, selectedLayout, selectedTheme, activationBanner, heroImageSource, customHeroImageUrl, heroOverlayOpacity, heroBlur, heroOverlayWhite, overrideProfileImage, profileImageUrl, manualHeroTextColors, heroTextColor, heroTextSecondary, heroAccentColor]);

  // Load existing website when contact changes
  useEffect(() => {
    if (selectedContact) {
      loadExistingWebsite();
    }
  }, [selectedContact, loadExistingWebsite]);

  // Generate initial preview for new contacts after everything is loaded
  useEffect(() => {
    // Only generate initial preview if:
    // 1. We have a contact
    // 2. We have layout and theme selected
    // 3. Regeneration controls are shown (meaning it's a new contact)
    // 4. We don't have a live preview URL yet (meaning no preview generated)
    // 5. We're not currently loading anything
    // 6. We have layouts and themes loaded (ensuring API calls are complete)
    // 7. We haven't already attempted initial preview for this contact
    if (selectedContact && 
        selectedLayout && 
        selectedTheme && 
        showRegenerationControls && 
        !livePreviewUrl && 
        !isLoadingPreview && 
        !isLoadingExisting &&
        layouts.length > 0 &&
        themes.length > 0 &&
        !initialPreviewAttempted) {
      
      console.log('🆕 Generating initial preview for new contact:', {
        contact: selectedContact.name,
        layout: selectedLayout,
        theme: selectedTheme,
        showRegenControls: showRegenerationControls,
        layoutsLoaded: layouts.length,
        themesLoaded: themes.length
      });
      
      // Mark that we've attempted initial preview for this contact
      setInitialPreviewAttempted(true);
      
      // Small delay to ensure all state is settled
      const timeoutId = setTimeout(() => {
        generatePreview();
      }, 500); // Longer delay to ensure everything is settled

      return () => clearTimeout(timeoutId);
    }
  }, [selectedContact, selectedLayout, selectedTheme, showRegenerationControls, livePreviewUrl, isLoadingPreview, isLoadingExisting, layouts, themes, initialPreviewAttempted, generatePreview]);

  // Auto-update live preview when layout/theme/hero options change
  useEffect(() => {
    // Auto-update for existing previews OR generate initial preview for new contacts
    // Skip if we're already loading or have an error
    if (selectedContact && 
        selectedLayout && 
        selectedTheme && 
        !isLoadingPreview && 
        !isLoadingExisting &&
        !error) {
      
      console.log('🔄 Theme/layout changed, auto-updating preview...', { 
        selectedTheme, 
        selectedLayout,
        hasLivePreview: !!livePreviewUrl 
      });
      
      // Debounce the preview generation to avoid too many rapid calls
      const timeoutId = setTimeout(() => {
        generatePreview();
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayout, selectedTheme, heroImageSource, customHeroImageUrl, heroOverlayOpacity, heroBlur, heroOverlayWhite, overrideProfileImage, profileImageUrl, manualHeroTextColors, generatePreview]);

  // State for color auto-update tracking
  const [colorUpdateTimeout, setColorUpdateTimeout] = useState(null);
  const [isColorUpdatePending, setIsColorUpdatePending] = useState(false);

  // Auto-update colors with debouncing - separate effect for manual color changes
  useEffect(() => {
    // Clear any existing timeout
    if (colorUpdateTimeout) {
      clearTimeout(colorUpdateTimeout);
      setColorUpdateTimeout(null);
    }
    
    // Only auto-update colors if manual colors are enabled and we have a contact
    // But only if we're not in an error state and have attempted initial preview
    if (manualHeroTextColors && 
        selectedContact && 
        selectedLayout && 
        selectedTheme && 
        !isLoadingPreview && 
        !isLoadingExisting && 
        !error && 
        initialPreviewAttempted) {
      // Show pending indicator
      setIsColorUpdatePending(true);
      
      // Longer debounce for color changes to allow user to finish adjusting
      const timeoutId = setTimeout(() => {
        console.log('🎨 Auto-updating preview with new manual colors...');
        setIsColorUpdatePending(false);
        generatePreview();
      }, 1500); // 1.5 second debounce for color changes

      setColorUpdateTimeout(timeoutId);
      
      return () => {
        clearTimeout(timeoutId);
        setIsColorUpdatePending(false);
      };
    } else {
      setIsColorUpdatePending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroTextColor, heroTextSecondary, heroAccentColor]); // Only depend on color values when manual mode is active

  // Handle banner toggle - regenerate preview when banner option changes
  useEffect(() => {
    // Auto-regenerate if we have an existing preview OR can generate for new contact
    // But only if we're not in an error state and have attempted initial preview
    if (selectedContact && 
        !isLoadingPreview && 
        !isLoadingExisting && 
        !error && 
        initialPreviewAttempted) {
      // Debounce the preview regeneration to avoid too many rapid calls
      const timeoutId = setTimeout(() => {
        console.log(`🎯 Banner toggle: ${activationBanner ? 'enabled' : 'disabled'} - regenerating preview`);
        generatePreview();
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationBanner]); // Only depend on activationBanner changes

  // Handle manual color override toggle - regenerate preview immediately when toggled
  useEffect(() => {
    // Auto-regenerate if we have an existing preview OR can generate for new contact
    // But only if we're not in an error state and have attempted initial preview
    if (selectedContact && 
        !isLoadingPreview && 
        !isLoadingExisting && 
        !error && 
        initialPreviewAttempted) {
      // Immediate regeneration when manual colors are toggled
      console.log(`🎨 Manual color override: ${manualHeroTextColors ? 'enabled' : 'disabled'} - regenerating preview`);
      generatePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualHeroTextColors]); // Only depend on manualHeroTextColors changes

  const generateWebsite = async () => {
    if (!selectedContact || !selectedContact.id) {
      setError('Please select a contact first');
      return;
    }

    // Check if there's a preview to save
    if (!previewVersion) {
      setError('Please generate a preview first before saving the final website');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/website/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: selectedContact.id,
          layout: previewVersion.layout,
          theme: previewVersion.theme,
          activationBanner: previewVersion.activationBanner,
          heroImageSource: previewVersion.heroImageSource,
          heroImageUrl: previewVersion.heroImageUrl,
          heroOverlayOpacity: previewVersion.heroOverlayOpacity,
          heroBlur: previewVersion.heroBlur,
          heroOverlayWhite: previewVersion.heroOverlayWhite,
          profileImageUrl: previewVersion.profileImageUrl,
          manualHeroTextColors: previewVersion.manualHeroTextColors,
          heroTextColor: previewVersion.heroTextColor,
          heroTextSecondary: previewVersion.heroTextSecondary,
          heroAccentColor: previewVersion.heroAccentColor
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the final website data
        setGeneratedWebsite(result);
        const timestamp = Date.now();
        const finalUrl = `http://localhost:3030${result.websiteUrl}?final=true&saved=true&t=${timestamp}`;
        setFinalWebsiteUrl(finalUrl);
        setPreviewUrl(finalUrl);
        
        // Clear preview version since it's now saved
        setPreviewVersion(null);
        setLivePreviewUrl(null);
        
        // Switch to final tab to show the saved website
        setActiveTab('final');
        
        if (onWebsiteGenerated) {
          onWebsiteGenerated(result);
        }
      } else {
        setError(result.error || 'Failed to generate website');
      }
    } catch (err) {
      setError('Network error while generating website');
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const openGeneratedWebsite = () => {
    if (generatedWebsite && generatedWebsite.websiteUrl) {
      const fullUrl = `http://localhost:3030${generatedWebsite.websiteUrl}`;
      window.open(fullUrl, '_blank');
    }
  };

  const copyWebsiteUrl = () => {
    if (generatedWebsite && generatedWebsite.websiteUrl) {
      const fullUrl = `http://localhost:3030${generatedWebsite.websiteUrl}`;
      navigator.clipboard.writeText(fullUrl);
      // Could add toast notification here
    }
  };

  // Contact-specific settings management utilities
  const saveAsGlobalDefault = () => {
    const currentSettings = {
      selectedLayout,
      selectedTheme,
      activationBanner,
      heroImageSource,
      customHeroImageUrl,
      heroOverlayOpacity,
      heroBlur,
      heroOverlayWhite,
      profileImageUrl,
      manualHeroTextColors,
      heroTextColor,
      heroTextSecondary,
      heroAccentColor
    };
    
    try {
      localStorage.setItem('websiteGeneratorGlobalDefaults', JSON.stringify(currentSettings));
      console.log('💾 Saved current settings as global defaults');
      alert('Current settings saved as global defaults for new contacts!');
    } catch (err) {
      console.error('Error saving global defaults:', err);
      alert('Failed to save global defaults');
    }
  };

  const resetToGlobalDefaults = () => {
    try {
      const globalSettings = localStorage.getItem('websiteGeneratorGlobalDefaults');
      if (globalSettings) {
        const settings = JSON.parse(globalSettings);
        
        // Update all settings with global defaults
        setSelectedLayout(settings.selectedLayout || 'professional');
        setSelectedTheme(settings.selectedTheme || 'modern-professional');
        setActivationBanner(settings.activationBanner || false);
        setHeroImageSource(settings.heroImageSource || 'auto');
        setCustomHeroImageUrl(settings.customHeroImageUrl || '');
        setHeroOverlayOpacity(settings.heroOverlayOpacity !== undefined ? settings.heroOverlayOpacity : 0.4);
        setHeroBlur(settings.heroBlur || 0);
        setHeroOverlayWhite(settings.heroOverlayWhite || false);
        setOverrideProfileImage(settings.overrideProfileImage || false);
        setProfileImageUrl(settings.profileImageUrl || '');
        setManualHeroTextColors(settings.manualHeroTextColors || false);
        setHeroTextColor(settings.heroTextColor || '#ffffff');
        setHeroTextSecondary(settings.heroTextSecondary || '#e5e5e5');
        setHeroAccentColor(settings.heroAccentColor || '#3b82f6');
        
        console.log('🔄 Reset to global defaults');
        alert('Settings reset to global defaults!');
      } else {
        alert('No global defaults found. Save current settings as defaults first.');
      }
    } catch (err) {
      console.error('Error loading global defaults:', err);
      alert('Failed to reset to global defaults');
    }
  };

  const clearContactSettings = () => {
    if (selectedContact?.id) {
      // Clear on server
      fetch(`/api/contacts/${selectedContact.id}/settings`, { method: 'DELETE' })
        .catch(() => {})
        .finally(() => console.log(`🗑️ Cleared settings for contact ${selectedContact.id}`));
      const contactSettingsKey = `websiteGeneratorSettings_${selectedContact.id}`;
      localStorage.removeItem(contactSettingsKey);
      alert(`Settings cleared for ${selectedContact.name || selectedContact.id}!`);
      
      // Reload settings (will use global defaults if available)
      loadSavedSettings().then(newSettings => {
      setSelectedLayout(newSettings.selectedLayout || 'professional');
      setSelectedTheme(newSettings.selectedTheme || 'modern-professional');
      setActivationBanner(newSettings.activationBanner || false);
      setHeroImageSource(newSettings.heroImageSource || 'auto');
      setCustomHeroImageUrl(newSettings.customHeroImageUrl || '');
      setHeroOverlayOpacity(newSettings.heroOverlayOpacity !== undefined ? newSettings.heroOverlayOpacity : 0.4);
      setHeroBlur(newSettings.heroBlur || 0);
      setHeroOverlayWhite(newSettings.heroOverlayWhite || false);
      setOverrideProfileImage(false); // Reset override to disabled
      setProfileImageUrl(''); // Always reset to empty when clearing settings
      setManualHeroTextColors(newSettings.manualHeroTextColors || false);
      setHeroTextColor(newSettings.heroTextColor || '#ffffff');
      setHeroTextSecondary(newSettings.heroTextSecondary || '#e5e5e5');
      setHeroAccentColor(newSettings.heroAccentColor || '#3b82f6');
      });
    }
  };

  const handleRegenerateClick = () => {
    setShowRegenerationControls(true);
    // Keep the final website visible, don't clear preview
    // The preview will be updated when user manually generates it
    setError(null);
  };

  const handleManualPreviewGenerate = () => {
    // Clear any existing errors and reset attempt flag
    setError(null);
    setInitialPreviewAttempted(true); // Mark as attempted to prevent auto-effects from retrying
    // Call generate preview directly
    generatePreview();
  };

  const handleCancelRegenerate = () => {
    setShowRegenerationControls(false);
    setPreviewVersion(null); // Clear any unsaved preview
    // Keep the live preview active for continued editing
    setActiveTab('preview'); // Stay on preview tab for editing
    // Restore the final website view with fresh timestamp
    if (finalWebsiteUrl) {
      const timestamp = Date.now();
      const baseUrl = finalWebsiteUrl.split('?')[0];
      const restoredUrl = `${baseUrl}?final=true&restored=true&t=${timestamp}`;
      setPreviewUrl(restoredUrl);
      setFinalWebsiteUrl(restoredUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDeployClick = () => {
    setShowDeployConfirm(true);
  };

  const confirmDeploy = () => {
    setShowDeployConfirm(false);
    deployToNetlify();
  };

  const cancelDeploy = () => {
    setShowDeployConfirm(false);
  };

  const deployToNetlify = async () => {
    if (!selectedContact) {
      setError('Please select a contact first');
      return;
    }

    setIsDeployingNetlify(true);
    setError(null);

    try {
      let websiteToDeploy = generatedWebsite;

      // If there's a preview version but no final website, save preview first
      if (previewVersion && (!websiteToDeploy || !websiteToDeploy.filePath)) {
        console.log('🔄 Saving preview to final website before deployment...');
        
        const response = await fetch('/api/website/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactId: selectedContact.id,
            layout: previewVersion.layout,
            theme: previewVersion.theme,
          }),
        });

        const result = await response.json();

        if (result.success) {
          websiteToDeploy = result;
          setGeneratedWebsite(result);
          setFinalWebsiteUrl(`http://localhost:3030${result.websiteUrl}?t=${Date.now()}`);
          setPreviewVersion(null); // Clear preview since it's now saved
        } else {
          setError(result.error || 'Failed to save website before deployment');
          return;
        }
      }
      
      // If still no website, generate one first
      else if (!websiteToDeploy || !websiteToDeploy.filePath) {
        console.log('🔄 No website generated yet, generating one first...');
        
        const response = await fetch('/api/website/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactId: selectedContact.id,
            layout: selectedLayout,
            theme: selectedTheme,
          }),
        });

        const result = await response.json();

        if (result.success) {
          websiteToDeploy = result;
          setGeneratedWebsite(result); // Update the state
          console.log('✅ Website generated successfully for deployment');
        } else {
          setError(result.error || 'Failed to generate website for deployment');
          return;
        }
      }

      console.log('🚀 Proceeding with Netlify deployment...');

      // Determine deployment parameters based on selection
      let deploymentParams = {
        filePath: websiteToDeploy.filePath,
        contactData: selectedContact
      };

      // Check if we're updating an existing deployment or creating new
      if (selectedDeploymentId) {
        // Update existing deployment
        const existingDeployment = deploymentHistory.find(d => d.siteId === selectedDeploymentId);
        if (existingDeployment) {
          deploymentParams.siteId = existingDeployment.siteId;
          deploymentParams.siteName = existingDeployment.siteName;
          deploymentParams.isUpdate = true;
          console.log('🔄 Updating existing deployment:', existingDeployment.siteName);
        }
      } else if (customSiteName.trim()) {
        // Create new deployment with custom name
        deploymentParams.siteName = customSiteName.trim();
        console.log('✨ Creating new deployment with custom name:', customSiteName.trim());
      } else {
        // Create new deployment with auto-generated name
        deploymentParams.siteName = null; // Let backend auto-generate
        console.log('✨ Creating new deployment with auto-generated name');
      }

      // Deploy to Netlify
      const deployResponse = await fetch('/api/website/deploy-netlify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentParams),
      });

      const deployResult = await deployResponse.json();

      if (deployResult.success) {
        setNetlifyDeployment(deployResult.deployment);
        
        // Save deployment to history
        saveDeploymentToHistory(deployResult.deployment);
        
        // Reset deployment selection state
        setSelectedDeploymentId(null);
        setCustomSiteName('');
        setShowDeploymentSelector(false);
        
        console.log('✅ Netlify deployment successful:', deployResult.deployment);
      } else {
        if (deployResult.configRequired) {
          setError('Netlify not configured. Please add your NETLIFY_ACCESS_TOKEN to the server environment variables.');
        } else {
          setError(deployResult.error || 'Failed to deploy to Netlify');
        }
      }
    } catch (err) {
      setError('Network error while deploying to Netlify');
      console.error('Netlify deployment error:', err);
    } finally {
      setIsDeployingNetlify(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container-large">
        <div className="modular-website-generator">
          <div className="generator-header">
            <h3>🎨 Modular Website Generator</h3>
            
            <button 
              onClick={onClose}
              className="close-button"
              title="Close"
            >
              ✕
            </button>
            <p>Generate a professional website with customizable layouts and themes</p>
          </div>

          <div className="generator-content">
            {/* Left Panel - Controls */}
            <div className="generator-controls">
              {selectedContact ? (
                <>
                  <div className="contact-info">
                    <strong>Website for:</strong> {selectedContact.name || selectedContact.email || 'Unknown Contact'}
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedContact.company && `${selectedContact.company} • `}
                      {selectedContact.phone && `${selectedContact.phone} • `}
                      {selectedContact.email}
                    </div>
                  </div>

                  {/* Contact Data Management */}
                  <div className="contact-data-management">
                    <div className="section-header">
                      <h4>📊 Contact Data Management</h4>
                      <p>Manage reviews and properties that will appear on the website</p>
                    </div>
                    <div className="data-management-buttons">
                      <button 
                        onClick={() => setShowReviewModal(true)}
                        className="data-mgmt-btn"
                        title="Manage reviews and testimonials for this contact"
                      >
                        <span className="btn-icon">📝</span>
                        Review Management
                      </button>
                      <button 
                        onClick={() => setShowPropertyModal(true)}
                        className="data-mgmt-btn"
                        title="Manage property listings for this contact"
                      >
                        <span className="btn-icon">🏠</span>
                        Property Management
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-contact-warning">
                  ⚠️ No contact selected. Click "Generator" on any row to load contact data automatically.
                </div>
              )}

              {/* Show existing website info or regenerate button */}
              {!showRegenerationControls ? (
                <div className="existing-website-section">
                  {isLoadingExisting ? (
                    <div className="loading-existing">
                      <span className="spinner"></span>
                      Loading existing website...
                    </div>
                  ) : generatedWebsite ? (
                    <div className="existing-website-info">
                      <div className="section-header">
                        <h4>📄 Current Website</h4>
                        <p>Last generated website for this contact</p>
                      </div>
                      <div className="website-details">
                        <div className="detail-item">
                          <strong>Layout:</strong> {generatedWebsite.layout}
                        </div>
                        <div className="detail-item">
                          <strong>Theme:</strong> {generatedWebsite.theme}
                        </div>
                        <div className="detail-item">
                          <strong>File:</strong> {generatedWebsite.fileName}
                        </div>
                        <div className="detail-item">
                          <strong>Generated:</strong> {generatedWebsite.generatedAt ? new Date(generatedWebsite.generatedAt).toLocaleString() : 'Unknown'}
                        </div>
                      </div>
                      <div className="existing-actions">
                        <button onClick={openGeneratedWebsite} className="action-btn primary">
                          <span className="btn-icon">🌐</span>
                          Open Website
                        </button>
                        <button onClick={copyWebsiteUrl} className="action-btn secondary">
                          <span className="btn-icon">📋</span>
                          Copy URL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="no-website-info">
                      <div className="section-header">
                        <h4>🆕 No Website Found</h4>
                        <p>No existing website found for this contact</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Regenerate Website Button */}
                  <div className="regenerate-section">
                    <button 
                      onClick={handleRegenerateClick}
                      disabled={!selectedContact}
                      className="regenerate-btn"
                    >
                      <span className="btn-icon">🔄</span>
                      {generatedWebsite ? 'Regenerate Website' : 'Generate New Website'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="regeneration-controls">
                  <div className="section-header">
                    <h4>🎨 Website Generation {selectedContact?.name && <span className="contact-specific-badge">for {selectedContact.name}</span>}</h4>
                    <p>Choose layout and theme {selectedContact?.name ? 'for this contact' : 'for the new website'}</p>
                    {selectedContact?.name && (
                      <div className="contact-specific-notice">
                        <span className="notice-icon">👤</span>
                        Settings are saved per contact - changes only apply to {selectedContact.name}
                      </div>
                    )}
                  </div>

                  <div className="generator-options">
                    {/* Layout Selection */}
                    <div className="option-group">
                      <label className="option-label">
                        <span className="option-icon">📐</span>
                        Layout System
                      </label>
                      <select 
                        value={selectedLayout} 
                        onChange={(e) => setSelectedLayout(e.target.value)}
                        className="option-select"
                        disabled={isGenerating}
                      >
                        {layouts.map((layout) => (
                          <option key={layout.key} value={layout.key}>
                            {layout.name} - {layout.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Theme Selection */}
                    <div className="option-group">
                      <label className="option-label">
                        <span className="option-icon">🎨</span>
                        Theme System
                      </label>
                      <select 
                        value={selectedTheme} 
                        onChange={(e) => setSelectedTheme(e.target.value)}
                        className="option-select"
                        disabled={isGenerating}
                      >
                        {themes.map((theme) => (
                          <option key={theme.key} value={theme.key}>
                            {theme.name} - {theme.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Hero Image Configuration */}
                    <div className="option-group hero-image-group">
                      <label className="option-label">
                        <span className="option-icon">🖼️</span>
                        Hero Background Image
                        {isLoadingPreview && (
                          <span className="updating-indicator">
                            <span className="spinner-small"></span>
                            Updating...
                          </span>
                        )}
                      </label>
                      <select 
                        value={heroImageSource} 
                        onChange={(e) => setHeroImageSource(e.target.value)}
                        className="option-select"
                        disabled={isGenerating || isLoadingPreview}
                      >
                        <option value="auto">Auto-select from properties</option>
                        <option value="property_first">First property image</option>
                        <option value="property_featured">Featured property image</option>
                        <option value="gallery">Choose from image gallery ({availableImages.length} images)</option>
                        <option value="custom">Custom image URL</option>
                        <option value="none">No background image</option>
                      </select>
                      
                      {heroImageSource === 'gallery' && (
                        <div className="image-gallery-selection">
                          <button
                            type="button"
                            onClick={openImageGallery}
                            className="gallery-open-button"
                            disabled={isGenerating || isLoadingPreview}
                          >
                            <span className="button-icon">🖼️</span>
                            Open Image Gallery
                            {isLoadingImages && (
                              <span className="loading-indicator">
                                <span className="spinner-small"></span>
                              </span>
                            )}
                          </button>
                          {customHeroImageUrl && (
                            <div className="selected-image-preview">
                              <img 
                                src={customHeroImageUrl} 
                                alt="Selected hero image"
                                className="preview-thumbnail"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                              <span className="selected-image-info">
                                Currently selected: {customHeroImageUrl}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {heroImageSource === 'custom' && (
                        <div className="custom-image-url">
                          <input
                            type="url"
                            placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                            value={customHeroImageUrl}
                            onChange={(e) => setCustomHeroImageUrl(e.target.value)}
                            className="option-input"
                            disabled={isGenerating || isLoadingPreview}
                          />
                        </div>
                      )}
                      
                      <div className="overlay-opacity-control">
                        <label className="overlay-label">
                          Background Overlay Opacity: {Math.round(heroOverlayOpacity * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={heroOverlayOpacity}
                          onChange={(e) => setHeroOverlayOpacity(parseFloat(e.target.value))}
                          className="overlay-slider"
                          disabled={isGenerating || isLoadingPreview}
                        />
                        <div className="overlay-help">
                          <small>Higher values make text more readable over busy backgrounds</small>
                        </div>
                      </div>

                      <div className="blur-control">
                        <label className="overlay-label">
                          Background Blur: {heroBlur}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={heroBlur}
                          onChange={(e) => setHeroBlur(parseFloat(e.target.value))}
                          className="overlay-slider"
                          disabled={isGenerating || isLoadingPreview}
                        />
                        <div className="overlay-help">
                          <small>Blur the background image to reduce distraction from text</small>
                        </div>
                      </div>

                      <div className="overlay-color-control">
                        <label className="overlay-checkbox-label">
                          <input
                            type="checkbox"
                            checked={heroOverlayWhite}
                            onChange={(e) => setHeroOverlayWhite(e.target.checked)}
                            disabled={isGenerating || isLoadingPreview}
                            className="overlay-checkbox"
                          />
                          Use white overlay instead of black
                        </label>
                        <div className="overlay-help">
                          <small>White overlay with dark text works better on dark images. Text and button colors will automatically adjust for contrast.</small>
                          {manualHeroTextColors && heroOverlayWhite && (
                            <div className="overlay-conflict-warning">
                              <small>⚠️ Manual text colors override automatic contrast adjustment. Consider disabling manual colors for automatic contrast.</small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Profile Image Configuration */}
                    <div className="option-group profile-image-group">
                      <label className="option-label">
                        <span className="option-icon">👤</span>
                        Profile Picture Override
                        {isLoadingPreview && (
                          <span className="updating-indicator">
                            <span className="spinner-small"></span>
                            Updating...
                          </span>
                        )}
                      </label>
                      
                      <div className="profile-override-toggle">
                        <label className="overlay-checkbox-label">
                          <input
                            type="checkbox"
                            checked={overrideProfileImage}
                            onChange={(e) => setOverrideProfileImage(e.target.checked)}
                            disabled={isGenerating || isLoadingPreview}
                            className="overlay-checkbox"
                          />
                          Override profile picture from database
                          {overrideProfileImage && (
                            <span className="manual-mode-indicator">
                              🖼️ Override mode active
                            </span>
                          )}
                        </label>
                        <div className="overlay-help">
                          <small>By default, uses the profile picture from the contact database. Enable this to set a custom image.</small>
                        </div>
                      </div>

                      {overrideProfileImage && (
                        <>
                          <input
                            type="url"
                            placeholder="Enter profile image URL (e.g., https://example.com/profile.jpg)"
                            value={profileImageUrl}
                            onChange={(e) => setProfileImageUrl(e.target.value)}
                            className="option-input profile-image-input"
                            disabled={isGenerating || isLoadingPreview}
                          />
                          <div className="profile-image-help">
                            <small>Custom profile image URL will override the database image</small>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Manual Hero Text Color Controls */}
                    <div className="option-group manual-colors-group">
                      <label className="option-label">
                        <span className="option-icon">🎨</span>
                        Manual Hero Text Colors
                        {(isLoadingPreview || isColorUpdatePending) && (
                          <span className="updating-indicator">
                            <span className="spinner-small"></span>
                            {isColorUpdatePending ? 'Auto-updating in 1.5s...' : 'Updating...'}
                          </span>
                        )}
                      </label>
                      
                      <div className="manual-colors-toggle">
                        <label className="overlay-checkbox-label">
                          <input
                            type="checkbox"
                            checked={manualHeroTextColors}
                            onChange={(e) => setManualHeroTextColors(e.target.checked)}
                            disabled={isGenerating || isLoadingPreview}
                            className="overlay-checkbox"
                          />
                          Override automatic text colors
                          {manualHeroTextColors && (
                            <span className="manual-mode-indicator">
                              🎨 Manual mode active
                            </span>
                          )}
                        </label>
                        <div className="overlay-help">
                          <small>When enabled, you can manually set hero text colors. Changes auto-apply after 1.5 seconds.</small>
                          {manualHeroTextColors && heroOverlayWhite && (
                            <div className="overlay-conflict-warning">
                              <small>💡 Manual colors override automatic overlay detection. Consider disabling "Use white overlay" above for consistent results.</small>
                            </div>
                          )}
                        </div>
                      </div>

                      {manualHeroTextColors && (
                        <div className="color-controls">
                          <div className="color-control">
                            <label className="color-label">
                              Primary Text Color:
                            </label>
                            <div className="color-input-container">
                              <input
                                type="color"
                                value={heroTextColor}
                                onChange={(e) => setHeroTextColor(e.target.value)}
                                className="color-picker"
                                disabled={isGenerating || isLoadingPreview}
                              />
                              <input
                                type="text"
                                value={heroTextColor}
                                onChange={(e) => setHeroTextColor(e.target.value)}
                                className="color-text-input"
                                disabled={isGenerating || isLoadingPreview}
                                placeholder="#ffffff"
                              />
                            </div>
                          </div>

                          <div className="color-control">
                            <label className="color-label">
                              Secondary Text Color:
                            </label>
                            <div className="color-input-container">
                              <input
                                type="color"
                                value={heroTextSecondary}
                                onChange={(e) => setHeroTextSecondary(e.target.value)}
                                className="color-picker"
                                disabled={isGenerating || isLoadingPreview}
                              />
                              <input
                                type="text"
                                value={heroTextSecondary}
                                onChange={(e) => setHeroTextSecondary(e.target.value)}
                                className="color-text-input"
                                disabled={isGenerating || isLoadingPreview}
                                placeholder="#e5e5e5"
                              />
                            </div>
                          </div>

                          <div className="color-control">
                            <label className="color-label">
                              Accent Color:
                            </label>
                            <div className="color-input-container">
                              <input
                                type="color"
                                value={heroAccentColor}
                                onChange={(e) => setHeroAccentColor(e.target.value)}
                                className="color-picker"
                                disabled={isGenerating || isLoadingPreview}
                              />
                              <input
                                type="text"
                                value={heroAccentColor}
                                onChange={(e) => setHeroAccentColor(e.target.value)}
                                className="color-text-input"
                                disabled={isGenerating || isLoadingPreview}
                                placeholder="#3b82f6"
                              />
                            </div>
                          </div>

                          <div className="color-actions">
                            <button 
                              type="button"
                              onClick={generatePreview}
                              disabled={isGenerating || isLoadingPreview}
                              className="refresh-preview-btn"
                              title="Apply current color settings to preview"
                            >
                              {isLoadingPreview ? (
                                <>
                                  <span className="spinner-small"></span>
                                  Applying Colors...
                                </>
                              ) : (
                                <>
                                  🎨 Apply Colors
                                </>
                              )}
                            </button>
                            <div className="color-help">
                              <small>
                                {isColorUpdatePending 
                                  ? '⏱️ Color update pending - will apply automatically in 1.5 seconds...'
                                  : manualHeroTextColors 
                                    ? 'Colors will auto-update after 1.5 seconds of inactivity, or click "Apply Colors" for immediate update.'
                                    : 'Enable manual colors above to customize hero text colors.'
                                }
                              </small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Activation Banner Configuration */}
                    <div className="option-group">
                      <label className="option-label">
                        <span className="option-icon">💳</span>
                        Payment Banner
                      </label>
                      <label className="banner-toggle-label">
                        <input 
                          type="checkbox"
                          checked={activationBanner}
                          onChange={(e) => setActivationBanner(e.target.checked)}
                          className="banner-toggle-checkbox"
                        />
                        <span className="banner-toggle-text">
                          <strong>Show Activation Banner</strong>
                          <small>Display payment banner on website (uncheck if client has paid)</small>
                        </span>
                      </label>
                    </div>

                    {/* Contact-Specific Settings Management */}
                    {selectedContact?.name && (
                      <div className="option-group settings-management-group">
                        <label className="option-label">
                          <span className="option-icon">⚙️</span>
                          Settings Management
                        </label>
                        <div className="settings-management-controls">
                          <button 
                            onClick={saveAsGlobalDefault}
                            className="settings-btn save-default"
                            title="Save current settings as defaults for new contacts"
                          >
                            <span className="btn-icon">💾</span>
                            Save as Default
                          </button>
                          <button 
                            onClick={resetToGlobalDefaults}
                            className="settings-btn reset-defaults"
                            title="Reset to global default settings"
                          >
                            <span className="btn-icon">🔄</span>
                            Reset to Defaults
                          </button>
                          <button 
                            onClick={clearContactSettings}
                            className="settings-btn clear-settings"
                            title="Clear contact-specific settings"
                          >
                            <span className="btn-icon">🗑️</span>
                            Clear Settings
                          </button>
                        </div>
                        <div className="settings-help-text">
                          <small>Use these controls to manage contact-specific settings</small>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Generate Button */}
                  <div className="generator-actions">
                    <button 
                      onClick={generateWebsite}
                      disabled={isGenerating || !selectedContact}
                      className={`generate-btn ${isGenerating ? 'generating' : ''}`}
                      title={!selectedContact ? 'Select a contact first' : 'Generate final website'}
                    >
                      {isGenerating ? (
                        <>
                          <span className="spinner"></span>
                          Saving Website...
                        </>
                      ) : previewVersion ? (
                        <>
                          <span className="generate-icon">💾</span>
                          Save Preview to Final Website
                        </>
                      ) : (
                        <>
                          <span className="generate-icon">🚀</span>
                          Generate Final Website
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={handleCancelRegenerate}
                      disabled={isGenerating}
                      className="cancel-regenerate-btn"
                    >
                      <span className="btn-icon">❌</span>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Netlify Deployment Actions - Always Visible */}
              {netlifyConfigured && selectedContact && (
                <div className="netlify-actions-section">
                  <div className="section-header">
                    <h4>🚀 Netlify Deployment</h4>
                    <p>Deploy your generated website to a live URL</p>
                  </div>
                  <div className="netlify-actions">
                    <button 
                      onClick={handleDeployClick} 
                      disabled={isDeployingNetlify}
                      className={`action-btn netlify ${isDeployingNetlify ? 'deploying' : ''}`}
                    >
                      {isDeployingNetlify ? (
                        <>
                          <span className="spinner"></span>
                          Deploying...
                        </>
                      ) : (
                        <>
                          <span className="btn-icon">🚀</span>
                          Deploy to Netlify
                        </>
                      )}
                    </button>
                    {generatedWebsite && (
                      <span className="deployment-info">
                        Latest website: {generatedWebsite.fileName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="error-message">
                  <span className="error-icon">❌</span>
                  {error}
                </div>
              )}

              {/* Success Display - Only when regenerating */}
              {generatedWebsite && showRegenerationControls && (
                <div className="success-message">
                  <div className="success-header">
                    <span className="success-icon">✅</span>
                    Website Generated Successfully!
                  </div>
                  
                  <div className="website-details">
                    <div className="detail-item">
                      <strong>Layout:</strong> {generatedWebsite.layout}
                    </div>
                    <div className="detail-item">
                      <strong>Theme:</strong> {generatedWebsite.theme}
                    </div>
                    <div className="detail-item">
                      <strong>File:</strong> {generatedWebsite.fileName}
                    </div>
                  </div>

                  <div className="website-actions">
                    <button onClick={openGeneratedWebsite} className="action-btn primary">
                      <span className="btn-icon">🌐</span>
                      Open Website
                    </button>
                    <button onClick={copyWebsiteUrl} className="action-btn secondary">
                      <span className="btn-icon">📋</span>
                      Copy URL
                    </button>
                    <button 
                      onClick={() => setShowRegenerationControls(false)}
                      className="action-btn secondary"
                    >
                      <span className="btn-icon">✅</span>
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Netlify Deployment Success */}
              {netlifyDeployment && (
                <div className="netlify-success">
                  <div className="success-header">
                    <span className="success-icon">🚀</span>
                    Deployed to Netlify Successfully!
                  </div>
                  
                  <div className="netlify-details">
                    <div className="detail-item">
                      <strong>Site Name:</strong> {netlifyDeployment.siteName}
                    </div>
                    <div className="detail-item">
                      <strong>Status:</strong> {netlifyDeployment.state}
                    </div>
                    <div className="detail-item">
                      <strong>Deployed:</strong> {new Date(netlifyDeployment.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="netlify-actions">
                    <button 
                      onClick={() => window.open(netlifyDeployment.siteUrl, '_blank')}
                      className="action-btn primary netlify-live"
                    >
                      <span className="btn-icon">🌐</span>
                      View Live Site
                    </button>
                    <button 
                      onClick={() => navigator.clipboard.writeText(netlifyDeployment.siteUrl)}
                      className="action-btn secondary"
                    >
                      <span className="btn-icon">📋</span>
                      Copy Live URL
                    </button>
                    {netlifyDeployment.adminUrl && (
                      <button 
                        onClick={() => window.open(netlifyDeployment.adminUrl, '_blank')}
                        className="action-btn secondary"
                      >
                        <span className="btn-icon">⚙️</span>
                        Netlify Admin
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Deployment History Panel */}
              {deploymentHistory.length > 0 && (
                <div className="deployment-history-panel">
                  <div className="panel-header">
                    <span className="panel-icon">📋</span>
                    Deployment History ({deploymentHistory.length})
                  </div>
                  
                  <div className="history-list">
                    {deploymentHistory.slice(0, 3).map((deployment, index) => (
                      <div key={deployment.siteId} className="history-item">
                        <div className="history-info">
                          <div className="history-name">
                            {deployment.siteName}
                            {deployment.isDefault && <span className="default-indicator">⭐</span>}
                          </div>
                          <div className="history-url">
                            <a href={deployment.siteUrl} target="_blank" rel="noopener noreferrer">
                              {deployment.siteUrl}
                            </a>
                          </div>
                          <div className="history-date">
                            {new Date(deployment.deployedAt).toLocaleDateString()}
                            {deployment.deployCount && deployment.deployCount > 1 && (
                              <span> • {deployment.deployCount} updates</span>
                            )}
                          </div>
                        </div>
                        <div className="history-actions">
                          <button
                            onClick={() => window.open(deployment.siteUrl, '_blank')}
                            className="quick-action-btn"
                            title="Open live site"
                          >
                            🌐
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(deployment.siteUrl)}
                            className="quick-action-btn"
                            title="Copy URL"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {deploymentHistory.length > 3 && (
                      <div className="history-more">
                        <span>... and {deploymentHistory.length - 3} more deployment{deploymentHistory.length - 3 !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Netlify Configuration Info */}
              {!netlifyConfigured && generatedWebsite && (
                <div className="netlify-config-info">
                  <div className="config-header">
                    <span className="config-icon">⚠️</span>
                    Netlify Not Configured
                  </div>
                  <p>To enable Netlify deployment, add your NETLIFY_ACCESS_TOKEN to the server environment variables.</p>
                  <div className="config-steps">
                    <div className="step">1. Get your Personal Access Token from Netlify dashboard</div>
                    <div className="step">2. Add NETLIFY_ACCESS_TOKEN=your_token to .env file</div>
                    <div className="step">3. Restart the server</div>
                  </div>
                </div>
              )}

              {/* System Information */}
              <div className="system-info">
                <h4>🔧 System Features</h4>
                <ul>
                  <li><strong>Theme System:</strong> Controls visual styling and colors</li>
                  <li><strong>Smart Content:</strong> Only shows components when data is available</li>
                  <li><strong>Responsive Design:</strong> Optimized for mobile, tablet, and desktop</li>
                  <li><strong>Easy Swapping:</strong> Mix and match any layout with any theme</li>
                </ul>
              </div>
            </div>

            {/* Right Panel - Live Preview */}
            <div className="generator-preview">
              <div className="preview-header">
                <h4>
                  {previewVersion ? '🎨 Live Preview' : '🖥️ Final Website'}
                </h4>
                <div className="preview-info">
                  {previewVersion ? (
                    <span className="preview-combo preview-mode">
                      Preview: {previewVersion.layout} + {previewVersion.theme}
                    </span>
                  ) : generatedWebsite ? (
                    <span className="preview-combo final-mode">
                      Final: {generatedWebsite.layout} + {generatedWebsite.theme}
                    </span>
                  ) : selectedTheme && selectedLayout ? (
                    <span className="preview-combo">
                      Ready: {selectedLayout} + {selectedTheme}
                    </span>
                  ) : null}
                </div>
              </div>
              
              <div className="preview-container">
                {/* Tab Navigation - Always show tabs since live preview is always available */}
                <div className="preview-tabs">
                  <button 
                    className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preview')}
                    disabled={!livePreviewUrl && !isLoadingPreview && !isLoadingExisting}
                    title={livePreviewUrl ? 'Edit and preview changes in real-time' : 'Live preview will be available shortly'}
                  >
                    Live Preview
                  </button>
                  <button 
                    className={`tab-button ${activeTab === 'final' ? 'active' : ''}`}
                    onClick={() => setActiveTab('final')}
                    disabled={!finalWebsiteUrl && !isLoadingExisting}
                    title={finalWebsiteUrl ? 'View the final published website' : 'No final website available - generate one first'}
                  >
                    Final Website
                  </button>
                </div>

                {/* Loading States */}
                {isLoadingPreview && activeTab === 'preview' && (
                  <div className="preview-loading">
                    <div className="preview-spinner"></div>
                    <p>Generating preview...</p>
                  </div>
                )}
                
                {isLoadingExisting && activeTab === 'final' && (
                  <div className="preview-loading">
                    <div className="preview-spinner"></div>
                    <p>Loading existing website...</p>
                  </div>
                )}
                
                {/* Final Website Tab */}
                {activeTab === 'final' && finalWebsiteUrl && !isLoadingExisting ? (
                  <iframe
                    key={`final-${finalWebsiteUrl}`}
                    src={finalWebsiteUrl}
                    className="preview-iframe"
                    title="Final Website"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : null}
                
                {/* Live Preview Tab */}
                {activeTab === 'preview' && livePreviewUrl && !isLoadingPreview ? (
                  <iframe
                    key={`preview-${livePreviewUrl}`}
                    src={livePreviewUrl}
                    className="preview-iframe"
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : null}
                
                {/* Fallback to old preview URL for backward compatibility */}
                {activeTab === 'final' && !finalWebsiteUrl && previewUrl && !isLoadingPreview && !isLoadingExisting ? (
                  <iframe
                    key={previewUrl}
                    src={previewUrl}
                    className="preview-iframe"
                    title="Website Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : null}
                
                {/* Placeholder when no content to show */}
                {!finalWebsiteUrl && !livePreviewUrl && !previewUrl && !isLoadingPreview && !isLoadingExisting && (
                  <div className="preview-placeholder">
                    <div className="placeholder-content">
                      {!showRegenerationControls ? (
                        <>
                          <div className="placeholder-icon">📄</div>
                          <h4>Website Manager</h4>
                          {generatedWebsite ? (
                            <>
                              <p>Viewing existing website for this contact</p>
                              <div className="placeholder-steps">
                                <div className="step">🔍 Current website is displayed above</div>
                                <div className="step">🔄 Click "Regenerate Website" to create a new version</div>
                                <div className="step">🚀 Deploy to Netlify anytime</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <p>No existing website found for this contact</p>
                              <div className="placeholder-steps">
                                <div className="step">🆕 No website exists yet</div>
                                <div className="step">🔄 Click "Generate New Website" to create one</div>
                                <div className="step">🎨 Choose from multiple layouts and themes</div>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="placeholder-icon">🎨</div>
                          <h4>Website Generator</h4>
                          <p>Ready to create a new website</p>
                          <div className="placeholder-steps">
                            <div className="step">🎨 Select layout: {selectedLayout}</div>
                            <div className="step">🖌️ Select theme: {selectedTheme}</div>
                            <div className="step">🔍 Live preview will generate automatically</div>
                            <div className="step">🔄 Preview updates automatically when you change settings</div>
                            <div className="step">💾 Click "Save Preview to Final Website" when ready</div>
                          </div>
                          
                          {/* Manual Generate Button */}
                          <div className="placeholder-actions">
                            <button 
                              onClick={handleManualPreviewGenerate}
                              disabled={isLoadingPreview || !selectedContact}
                              className="generate-preview-btn"
                            >
                              {isLoadingPreview ? (
                                <>
                                  <span className="spinner-small"></span>
                                  Generating Preview...
                                </>
                              ) : (
                                <>
                                  🚀 Generate Preview Now
                                </>
                              )}
                            </button>
                            <small style={{marginTop: '10px', opacity: 0.7}}>
                              {error ? 
                                `Error: ${error}. Click to retry.` : 
                                'If preview doesn\'t generate automatically, click the button above'
                              }
                            </small>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {(previewUrl || showRegenerationControls) && (
                <div className="preview-actions">
                  {previewUrl && (
                    <button 
                      onClick={() => window.open(previewUrl, '_blank')}
                      className="preview-btn"
                    >
                      <span className="btn-icon">🔍</span>
                      Open Full Preview
                    </button>
                  )}
                  {showRegenerationControls && (
                    <button 
                      onClick={generatePreview}
                      className="preview-btn secondary"
                      disabled={isLoadingPreview}
                      title={previewVersion ? 'Updates automatically when you change settings' : 'Start live preview mode'}
                    >
                      <span className="btn-icon">🔄</span>
                      {isLoadingPreview ? 'Updating...' : previewVersion ? 'Update Preview' : 'Start Live Preview'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Netlify Deployment Confirmation Dialog */}
      {showDeployConfirm && (
        <div className="deploy-confirm-overlay">
          <div className="deploy-confirm-modal">
            <div className="confirm-header">
              <h3>🚀 Deploy to Netlify</h3>
              <p>Choose deployment option for this website</p>
            </div>
            
            <div className="confirm-details">
              <div className="detail-row">
                <strong>Contact:</strong> {selectedContact?.name || 'Unknown'}
              </div>
              <div className="detail-row">
                <strong>Layout:</strong> {selectedLayout}
              </div>
              <div className="detail-row">
                <strong>Theme:</strong> {selectedTheme}
              </div>
              {generatedWebsite ? (
                <div className="detail-row">
                  <strong>Website:</strong> {generatedWebsite.fileName}
                  <span className="status-ready">✅ Ready to deploy</span>
                </div>
              ) : (
                <div className="detail-row">
                  <strong>Website:</strong> Will be generated automatically
                  <span className="status-generate">🔄 Will generate first</span>
                </div>
              )}
            </div>

            {/* Deployment History Section */}
            {deploymentHistory.length > 0 && (
              <div className="deployment-history-section">
                <h4>📋 Existing Deployments</h4>
                <div className="deployment-list">
                  {deploymentHistory.map((deployment, index) => (
                    <div 
                      key={deployment.siteId} 
                      className={`deployment-item ${selectedDeploymentId === deployment.siteId ? 'selected' : ''}`}
                      onClick={() => setSelectedDeploymentId(deployment.siteId)}
                    >
                      <div className="deployment-info">
                        <div className="deployment-name">
                          {deployment.siteName}
                          {deployment.isDefault && <span className="default-badge">⭐ Default</span>}
                        </div>
                        <div className="deployment-url">
                          <a href={deployment.siteUrl} target="_blank" rel="noopener noreferrer">
                            {deployment.siteUrl}
                          </a>
                        </div>
                        <div className="deployment-meta">
                          Created: {new Date(deployment.deployedAt).toLocaleDateString()}
                          {deployment.deployCount && deployment.deployCount > 1 && (
                            <span> • Updated {deployment.deployCount - 1} times</span>
                          )}
                        </div>
                      </div>
                      <div className="deployment-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultDeployment(deployment.siteId);
                          }}
                          className="make-default-btn"
                          title="Set as default deployment"
                        >
                          ⭐
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deployment Options */}
            <div className="deployment-options">
              <div className="option-section">
                <label className="option-label">
                  <input
                    type="radio"
                    name="deploymentOption"
                    checked={selectedDeploymentId !== null}
                    onChange={() => {
                      const defaultDeployment = getDefaultDeployment();
                      setSelectedDeploymentId(defaultDeployment ? defaultDeployment.siteId : null);
                    }}
                    disabled={deploymentHistory.length === 0}
                  />
                  <span className="option-text">
                    🔄 Update existing deployment
                    {deploymentHistory.length === 0 && <span className="disabled-text"> (No deployments yet)</span>}
                  </span>
                </label>
              </div>
              
              <div className="option-section">
                <label className="option-label">
                  <input
                    type="radio"
                    name="deploymentOption"
                    checked={selectedDeploymentId === null}
                    onChange={() => setSelectedDeploymentId(null)}
                  />
                  <span className="option-text">✨ Create new deployment</span>
                </label>
                
                {selectedDeploymentId === null && (
                  <div className="custom-name-section">
                    <input
                      type="text"
                      placeholder="Custom site name (optional)"
                      value={customSiteName}
                      onChange={(e) => setCustomSiteName(e.target.value)}
                      className="custom-name-input"
                    />
                    <div className="input-help">
                      Leave empty for auto-generated name
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="confirm-warning">
              <p>
                {selectedDeploymentId 
                  ? "⚠️ This will update the existing website with new content."
                  : "⚠️ This will create a new public website that anyone can access with the URL."
                }
              </p>
            </div>

            <div className="confirm-actions">
              <button 
                onClick={cancelDeploy}
                className="action-btn secondary"
              >
                <span className="btn-icon">❌</span>
                Cancel
              </button>
              <button 
                onClick={confirmDeploy}
                className="action-btn netlify"
              >
                <span className="btn-icon">🚀</span>
                {selectedDeploymentId ? 'Update Website' : 'Deploy New Site'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div className="modal-overlay" onClick={() => setShowImageGallery(false)}>
          <div className="image-gallery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span className="modal-icon">🖼️</span>
                Choose Hero Background Image
              </h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowImageGallery(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              {isLoadingImages ? (
                <div className="loading-state">
                  <span className="spinner-large"></span>
                  <p>Loading images from all contacts and properties...</p>
                </div>
              ) : availableImages.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📷</span>
                  <p>No images found across contacts and properties.</p>
                  <button 
                    onClick={fetchAvailableImages}
                    className="retry-btn"
                    type="button"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : (
                <>
                  <div className="gallery-stats">
                    <span className="total-count">
                      {availableImages.length} images found
                    </span>
                    <div className="source-breakdown">
                      <span className="source-count contact">
                        {availableImages.filter(img => img.source === 'contact').length} from contacts
                      </span>
                      <span className="source-count property">
                        {availableImages.filter(img => img.source === 'property').length} from properties
                      </span>
                      <span className="source-count project">
                        {availableImages.filter(img => img.source === 'project').length} from project
                      </span>
                    </div>
                  </div>

                  <div className="gallery-filters">
                    <span className="filter-label">Filter by source:</span>
                    <div className="filter-buttons">
                      <button
                        className={`filter-btn ${imageFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setImageFilter('all')}
                        type="button"
                      >
                        All ({availableImages.length})
                      </button>
                      <button
                        className={`filter-btn project ${imageFilter === 'project' ? 'active' : ''}`}
                        onClick={() => setImageFilter('project')}
                        type="button"
                      >
                        📁 Project ({availableImages.filter(img => img.source === 'project').length})
                      </button>
                      <button
                        className={`filter-btn contact ${imageFilter === 'contact' ? 'active' : ''}`}
                        onClick={() => setImageFilter('contact')}
                        type="button"
                      >
                        👤 Contacts ({availableImages.filter(img => img.source === 'contact').length})
                      </button>
                      <button
                        className={`filter-btn property ${imageFilter === 'property' ? 'active' : ''}`}
                        onClick={() => setImageFilter('property')}
                        type="button"
                      >
                        🏠 Properties ({availableImages.filter(img => img.source === 'property').length})
                      </button>
                    </div>
                  </div>
                  
                  <div className="image-gallery-grid">
                    {getFilteredImages().map((image) => (
                      <div 
                        key={image.uniqueId || image.url} 
                        className={`gallery-image-item ${customHeroImageUrl === image.url ? 'selected' : ''}`}
                        onClick={() => handleImageSelect(image.url)}
                      >
                        <div className="image-container">
                          <img 
                            src={image.url}
                            alt={image.description}
                            className="gallery-image"
                            onError={(e) => {
                              e.target.parentElement.classList.add('error');
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="image-error" style={{ display: 'none' }}>
                            <span className="error-icon">❌</span>
                            <span className="error-text">Failed to load</span>
                          </div>
                        </div>
                        <div className="image-info">
                          <div className="image-description" title={image.description}>
                            {image.description}
                          </div>
                          <div className="image-source">
                            <span className={`source-badge ${image.source}`}>
                              {image.source === 'contact' && '👤'}
                              {image.source === 'property' && '🏠'}
                              {image.source === 'project' && '📁'}
                              {image.source}
                            </span>
                            {image.contactName && (
                              <span className="contact-name">{image.contactName}</span>
                            )}
                          </div>
                        </div>
                        {customHeroImageUrl === image.url && (
                          <div className="selected-indicator">
                            <span className="checkmark">✓</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowImageGallery(false)}
                type="button"
              >
                Cancel
              </button>
              <button 
                className="select-btn"
                onClick={() => setShowImageGallery(false)}
                disabled={!customHeroImageUrl}
                type="button"
              >
                Use Selected Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Management Modal */}
      {showReviewModal && (
        <ReviewManagementModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          contact={selectedContact}
          onReviewsUpdated={() => {
            // Optionally refresh data or regenerate preview
            console.log('Reviews updated for contact:', selectedContact?.name);
          }}
        />
      )}

      {/* Property Management Modal */}
      {showPropertyModal && (
        <PropertyManagementModal
          isOpen={showPropertyModal}
          onClose={() => setShowPropertyModal(false)}
          contact={selectedContact}
          onPropertiesUpdated={() => {
            // Optionally refresh data or regenerate preview
            console.log('Properties updated for contact:', selectedContact?.name);
          }}
        />
      )}
    </div>
  );
};

export default ModularWebsiteGenerator;
