import React from 'react';
import { useUser } from '../contexts/UserContext';

/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions
 */
const PermissionGuard = ({ 
  permission, 
  permissions = [], 
  requireAll = false, 
  fallback = null, 
  children 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useUser();

  // Single permission check
  if (permission) {
    return hasPermission(permission) ? children : fallback;
  }

  // Multiple permissions check
  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    return hasAccess ? children : fallback;
  }

  // No permissions specified, render children
  return children;
};

/**
 * Role Guard Component
 * Conditionally renders children based on user role
 */
export const RoleGuard = ({ 
  roles = [], 
  fallback = null, 
  children 
}) => {
  const { currentUser } = useUser();

  if (!currentUser) {
    return fallback;
  }

  const hasRole = roles.length === 0 || roles.includes(currentUser.role);
  return hasRole ? children : fallback;
};

/**
 * Admin Only Component
 * Only renders for admin users
 */
export const AdminOnly = ({ fallback = null, children }) => {
  const { isAdmin } = useUser();
  return isAdmin() ? children : fallback;
};

/**
 * Sales Only Component
 * Only renders for sales users
 */
export const SalesOnly = ({ fallback = null, children }) => {
  const { isSales } = useUser();
  return isSales() ? children : fallback;
};

/**
 * User Info Component
 * Displays current user information
 */
export const UserInfo = ({ className = '' }) => {
  const { currentUser } = useUser();

  if (!currentUser) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
        {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{currentUser.name}</span>
        <span className="text-xs text-slate-500 capitalize">{currentUser.role}</span>
      </div>
    </div>
  );
};

export default PermissionGuard;
