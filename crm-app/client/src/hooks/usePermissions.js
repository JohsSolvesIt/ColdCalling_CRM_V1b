import { useUser } from '../contexts/UserContext';
import { PERMISSIONS } from '../utils/userRoles';

/**
 * Custom hook for permission-based UI logic
 * Provides easy access to common permission checks
 */
export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, currentUser, isAdmin, isSales } = useUser();

  return {
    // Basic permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Role checks
    isAdmin,
    isSales,
    
    // Common permission groups
    canImportExport: hasAnyPermission([PERMISSIONS.IMPORT_DATA, PERMISSIONS.EXPORT_DATA]),
    canManageData: hasAnyPermission([
      PERMISSIONS.IMPORT_DATA, 
      PERMISSIONS.EXPORT_DATA, 
      PERMISSIONS.SINGLE_URL_PROCESSING
    ]),
    canManageTags: hasAnyPermission([
      PERMISSIONS.ADD_TAGS, 
      PERMISSIONS.REMOVE_TAGS, 
      PERMISSIONS.MANAGE_TAGS
    ]),
    canManageDatabases: hasPermission(PERMISSIONS.MANAGE_DATABASES),
    canManageUsers: hasPermission(PERMISSIONS.MANAGE_USERS),
    canCommunicate: hasAnyPermission([PERMISSIONS.SEND_SMS, PERMISSIONS.MAKE_CALLS]),
    
    // Specific feature permissions
    canImport: hasPermission(PERMISSIONS.IMPORT_DATA),
    canExport: hasPermission(PERMISSIONS.EXPORT_DATA),
    canProcessSingleUrl: hasPermission(PERMISSIONS.SINGLE_URL_PROCESSING),
    canAddTags: hasPermission(PERMISSIONS.ADD_TAGS),
    canRemoveTags: hasPermission(PERMISSIONS.REMOVE_TAGS),
    canSendSMS: hasPermission(PERMISSIONS.SEND_SMS),
    canMakeCalls: hasPermission(PERMISSIONS.MAKE_CALLS),
    canViewDashboard: hasPermission(PERMISSIONS.VIEW_DASHBOARD),
    canDeleteContacts: hasPermission(PERMISSIONS.DELETE_CONTACTS),
    
    // User info
    currentUser,
    userRole: currentUser?.role,
    userName: currentUser?.name,
    userEmail: currentUser?.email
  };
};

export default usePermissions;
