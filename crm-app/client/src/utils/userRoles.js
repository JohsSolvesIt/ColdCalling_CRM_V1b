// User roles and permissions
export const USER_ROLES = {
  ADMIN: 'admin',
  SALES: 'sales'
};

export const PERMISSIONS = {
  // Data Management
  IMPORT_DATA: 'import_data',
  EXPORT_DATA: 'export_data',
  SINGLE_URL_PROCESSING: 'single_url_processing',
  
  // Database Management
  CREATE_DATABASE: 'create_database',
  DELETE_DATABASE: 'delete_database',
  MANAGE_DATABASES: 'manage_databases',
  
  // Contact Management
  VIEW_CONTACTS: 'view_contacts',
  EDIT_CONTACTS: 'edit_contacts',
  DELETE_CONTACTS: 'delete_contacts',
  
  // Tags Management
  ADD_TAGS: 'add_tags',
  REMOVE_TAGS: 'remove_tags',
  MANAGE_TAGS: 'manage_tags',
  
  // Communication
  SEND_SMS: 'send_sms',
  MAKE_CALLS: 'make_calls',
  BATCH_OPERATIONS: 'batch_operations',
  
  // Analytics
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_REPORTS: 'view_reports',
  
  // System Management
  MANAGE_USERS: 'manage_users',
  SYSTEM_SETTINGS: 'system_settings'
};

// Role-based permissions mapping
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    // Full access to everything
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.SINGLE_URL_PROCESSING,
    PERMISSIONS.CREATE_DATABASE,
    PERMISSIONS.DELETE_DATABASE,
    PERMISSIONS.MANAGE_DATABASES,
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.EDIT_CONTACTS,
    PERMISSIONS.DELETE_CONTACTS,
    PERMISSIONS.ADD_TAGS,
    PERMISSIONS.REMOVE_TAGS,
    PERMISSIONS.MANAGE_TAGS,
    PERMISSIONS.SEND_SMS,
    PERMISSIONS.MAKE_CALLS,
    PERMISSIONS.BATCH_OPERATIONS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.SYSTEM_SETTINGS
  ],
  
  [USER_ROLES.SALES]: [
    // Limited access - focused on sales activities
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.EDIT_CONTACTS,
    PERMISSIONS.SEND_SMS,
    PERMISSIONS.MAKE_CALLS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_REPORTS
    // No import/export, no tag management, no database management
  ]
};

// Default user configuration
export const DEFAULT_USERS = [
  {
    id: 'admin-altoids',
    name: 'ALTOIDS',
    email: 'admin@crm.local',
    username: 'ALTOIDS',
    password: 'ALTOIDS', // In production, this should be hashed
    role: USER_ROLES.ADMIN,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    isActive: true
  }
];

export const DEFAULT_USER = DEFAULT_USERS[0];
