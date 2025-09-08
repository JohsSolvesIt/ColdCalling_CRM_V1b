export const DEFAULT_STATUS = "New";

export const DEFAULT_COLUMNS = [
  // Core identification
  "id", "agent_id",
  
  // Basic contact information  
  "name", "title", "company", "phone", "email", "address", "website", "url",
  
  // Professional details
  "bio", "experience_years", "license_number", "license_state",
  
  // Enhanced Chrome Extension fields
  "specializations", "languages", "certifications", "service_areas",
  "social_media", "ratings", "profile_image_url", "profile_image", "available_photos",
  
  // CRM integration fields
  "crm_notes", "crm_status", "last_contacted", "follow_up_at", 
  "texts_sent", "emails_sent", "follow_up_priority", "crm_data",
  
  // Property statistics
  "total_properties", "avg_property_price", "min_property_price", 
  "max_property_price", "cities_served",
  
  // Individual properties data
  "properties", "property_details", "property_count", "property_summary", "price_range",
  
  // Legacy CRM fields
  "Notes", "Status", "LastContacted", "LastTextSent", "FollowUpAt", 
  "TextsSent", "FollowUpPriority",
  
  // Timestamps
  "created_at", "updated_at", "last_scraped_at",
  
  // Metadata
  "source", "_dbType", "_dbName"
];

export const STATUS_OPTIONS = [
  "New",
  "No Answer",
  "Left Voicemail",
  "Callback Requested",
  "Initial Followup",
  "Interested",
  "Not Interested",
  "Wrong Number",
  "Do Not Call",
  "SENT TEXT",
  "Texted and Called",
  "SOLD!",
];
